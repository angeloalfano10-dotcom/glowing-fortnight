// Insights from the user's own nights. Real logic, not a mock: it works on any
// NightEstimate list the device reports.
//
// Rules this file keeps:
// - Every sentence that quantifies sleep or snoring says "estimate(d)".
// - Observations only. No scores, no health claims, no promises to improve sleep.
// - Compare like with like. Free mornings (no alarm) run later and longer, so
//   comparisons about the room or bedtime use alarm nights only.
// - Only say something when the difference is big enough to notice.

import { dur, fmtNight } from '../lib/time.js';

/** 7 h 30 asleep: the same target the bedtime is built from. */
export const TARGET = 450;

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const split = (list, pred) => {
  const yes = [];
  const no = [];
  list.forEach((n) => (pred(n) ? yes : no).push(n));
  return [yes, no];
};
const workNights = (nights) => nights.filter((n) => n.alarm != null);
/** Bed-by for that night, in night minutes (alarm − 7 h 45). */
export const bedByOf = (n) => (n.alarm == null ? null : 1440 + n.alarm - 465);
const deg = (v) => `${Number.isInteger(v) ? v : v.toFixed(1)}°`;
/** Rounded to 5 min, for the "about" figures. */
const about = (m) => dur(Math.max(5, Math.round(m / 5) * 5));

/* ---------------------------------------------------------------- week */

/** Averages for the week card. */
export function summarize(nights) {
  if (!nights.length) return null;
  const work = workNights(nights);
  return {
    n: nights.length,
    avgSleep: Math.round(mean(nights.map((n) => n.sleepMin))),
    avgAsleep: Math.round(mean((work.length ? work : nights).map((n) => n.asleep))),
    avgWake: Math.round(mean((work.length ? work : nights).map((n) => n.wake))),
    avgSnore: Math.round(mean(nights.map((n) => n.snoringMin))),
    onTarget: nights.filter((n) => n.sleepMin >= TARGET - 10).length,
  };
}

/** How the room relates to sleep. Also returns the threshold for the Today card. */
export function roomPattern(nights) {
  const work = workNights(nights);
  if (nights.length < 4) return null;
  let best = null;
  for (const thr of [20.5, 21, 21.5, 22, 22.5, 23]) {
    const [cool, warm] = split(work, (n) => n.roomTemp < thr);
    if (cool.length >= 2 && warm.length >= 2) {
      const diff = mean(cool.map((n) => n.sleepMin)) - mean(warm.map((n) => n.sleepMin));
      if (diff >= 15 && (!best || diff > best.diff)) best = { kind: 'sleep', thr, diff };
    }
  }
  if (best) return best;
  for (const thr of [21, 21.5, 22, 22.5, 23]) {
    const [cool, warm] = split(nights, (n) => n.roomTemp < thr);
    if (cool.length >= 2 && warm.length >= 2) {
      const diff = mean(warm.map((n) => n.restlessMin)) - mean(cool.map((n) => n.restlessMin));
      if (diff >= 15 && (!best || diff > best.diff)) best = { kind: 'restless', thr, diff };
    }
  }
  return best;
}

/**
 * Ranked observations for a week of nights (newest first).
 * @returns {{id:string, text:string, score:number}[]}
 */
export function weekInsights(nights, { clock24 = true } = {}) {
  const out = [];
  if (nights.length < 4) return out;
  const t = (m) => fmtNight(m, clock24);
  const work = workNights(nights);

  const room = roomPattern(nights);
  if (room?.kind === 'sleep') {
    out.push({ id: 'room', score: room.diff / 20, text: `On work nights under ${deg(room.thr)}, you slept an estimated ${about(room.diff)} longer.` });
  } else if (room?.kind === 'restless') {
    out.push({ id: 'room', score: room.diff / 25, text: `Nights above ${deg(room.thr)} had about ${Math.round(room.diff)} more restless minutes, by estimate.` });
  }

  if (work.length >= 4) {
    const [onTime, late] = split(work, (n) => n.asleep <= bedByOf(n) + 30);
    if (onTime.length >= 2 && late.length >= 2) {
      const diff = mean(onTime.map((n) => n.sleepMin)) - mean(late.map((n) => n.sleepMin));
      if (diff >= 15) {
        out.push({ id: 'bedtime', score: diff / 20 + 0.3, text: `Nights you were asleep within 30 min of bed-by ran an estimated ${about(diff)} longer.` });
      }
    }
    const asleep = work.map((n) => n.asleep);
    const range = Math.max(...asleep) - Math.min(...asleep);
    if (range <= 35) out.push({ id: 'consistency', score: 0.9, text: `Your weeknight bedtime stayed within ${range} min.` });
    else if (range >= 70) out.push({ id: 'consistency', score: range / 80, text: `Your weeknight bedtime moved by up to ${dur(range)}, from ${t(Math.min(...asleep))} to ${t(Math.max(...asleep))}.` });
  }

  const free = nights.filter((n) => n.alarm == null);
  if (free.length >= 1 && work.length >= 2) {
    const shift = mean(free.map((n) => n.asleep)) - mean(work.map((n) => n.asleep));
    if (shift >= 40) out.push({ id: 'weekend', score: (shift / 60) * 0.8, text: `Before free mornings you fall asleep about ${about(shift)} later.` });
  }

  const mid = median(nights.map((n) => n.asleep));
  const [later, earlier] = split(nights, (n) => n.asleep > mid);
  if (later.length >= 2 && earlier.length >= 2) {
    const diff = mean(later.map((n) => n.snoringMin)) - mean(earlier.map((n) => n.snoringMin));
    if (diff >= 5) out.push({ id: 'snoring', score: (diff / 7) * 0.8, text: `Estimated snoring ran about ${Math.round(diff)} min higher after your later nights.` });
  }

  if (nights.length >= 7) {
    const diff = mean(nights.slice(0, 3).map((n) => n.sleepMin)) - mean(nights.slice(3, 7).map((n) => n.sleepMin));
    if (Math.abs(diff) >= 25) {
      out.push({ id: 'trend', score: (Math.abs(diff) / 30) * 0.9, text: `Your last three nights were an estimated ${about(Math.abs(diff))} ${diff < 0 ? 'shorter' : 'longer'} than the four before.` });
    }
  }

  const k = nights.filter((n) => n.sleepMin >= TARGET - 10).length;
  out.push({ id: 'target', score: 0.4, text: `${k} of ${nights.length} nights reached an estimated 7 h 30.` });

  return out.sort((a, b) => b.score - a.score);
}

/* ---------------------------------------------------------------- night */

/** The hour with the most restless spells, and what the room did then. */
function restlessWindow(n) {
  const b = n.buckets;
  let best = -1;
  let bestCount = 0;
  // Skip the first half hour: some restlessness while falling asleep is normal.
  for (let i = 3; i + 6 <= b.length; i++) {
    const c = b.slice(i, i + 6).filter((x) => x.restless).length;
    if (c > bestCount) { bestCount = c; best = i; }
  }
  if (best < 0 || bestCount < 2) return null;
  const start = b[best].t;
  const end = start + 60;
  const temps = n.temps.filter((x) => x.t >= start && x.t <= end).map((x) => x.v);
  if (!temps.length) return { start, end, temp: null, trend: 'flat' };
  const temp = Math.max(...temps);
  const rising = temps[temps.length - 1] - temps[0] >= 0.3;
  const warm = temp >= n.tempMin + 0.8;
  return { start, end, temp, trend: rising && warm ? 'warming' : warm ? 'warm' : 'flat' };
}

/**
 * Lines about one night. history: the nights before it (newest first).
 * @returns {{usual:string, asleep:string|null, restless:string|null, room:string, snoring:string}}
 */
export function nightInsights(n, history = [], { clock24 = true } = {}) {
  const t = (m) => fmtNight(m, clock24);
  let usual = 'NOCTIS is still learning your usual.';
  if (history.length >= 3) {
    const diff = n.sleepMin - mean(history.map((x) => x.sleepMin));
    usual = Math.abs(diff) < 10
      ? 'About your usual, by estimate.'
      : `An estimated ${dur(Math.abs(diff))} ${diff > 0 ? 'more' : 'less'} than your usual.`;
  }

  let asleep = null;
  const bedBy = bedByOf(n);
  if (bedBy != null) {
    const late = n.asleep - bedBy;
    if (late > 40) asleep = `Asleep around ${t(n.asleep)}, ${dur(late)} after bed-by.`;
    else if (late <= 25) asleep = `Asleep around ${t(n.asleep)}, close to your bed-by time.`;
    else asleep = `Asleep around ${t(n.asleep)}.`;
  } else {
    asleep = `A free morning. Asleep around ${t(n.asleep)}.`;
  }

  const w = restlessWindow(n);
  let restless = null;
  if (w) {
    restless = w.trend === 'warming'
      ? `Most restless ${t(w.start)}–${t(w.end)}, as the room warmed to ${deg(w.temp)}.`
      : w.trend === 'warm'
        ? `Most restless ${t(w.start)}–${t(w.end)}, while the room was still around ${deg(w.temp)}.`
        : `Most restless around ${t(w.start)}.`;
  }

  const coolest = n.temps.filter((x) => x.t >= n.asleep && x.t <= n.wake).reduce((a, b) => (b.v < a.v ? b : a));
  const lastT = n.temps[n.temps.length - 1].v;
  const room = lastT - coolest.v >= 0.6
    ? `Coolest around ${t(coolest.t)} at ${deg(coolest.v)}, then ${deg(Math.round((lastT - coolest.v) * 10) / 10)} warmer by morning.`
    : `Steady through the night, around ${deg(n.roomTemp)}.`;

  let snoring = 'No snoring heard, by estimate.';
  if (n.spells.length) {
    const mid = median(n.spells.map((s) => s.start));
    const word = ['', 'One short spell', 'Two short spells', 'Three short spells', 'Four short spells'][n.spells.length] || `${n.spells.length} short spells`;
    snoring = `${word}, ${n.spells.length > 1 ? 'mostly ' : ''}around ${t(Math.round(mid / 10) * 10)}.`;
  }
  return { usual, asleep, restless, room, snoring };
}

/** A note for the room right now, against the user's own pattern. */
export function roomNow(nowTemp, nights) {
  const p = roomPattern(nights);
  if (!p || nowTemp == null) return null;
  const which = p.kind === 'sleep' ? 'longer work nights' : 'calmer nights';
  return nowTemp > p.thr
    ? `Your ${which} were under ${deg(p.thr)}. It’s ${deg(nowTemp)} now.`
    : `In the range of your ${which}, under ${deg(p.thr)}.`;
}
