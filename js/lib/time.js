// Time, formatting and the alarm-derived day plan.
// Phases follow CLAUDE.md §4: night = bedtime → wake, evening = 3 h before bedtime.
// The app adds "morning" (first 5 h after waking) to decide which page opens first.

const OFFSET_KEY = 'offhours:demo-offset';
let offset = 0;
try { offset = Number(sessionStorage.getItem(OFFSET_KEY)) || 0; } catch { /* private mode */ }
const listeners = new Set();

/** App clock. The demo panel shifts it to test any time of day. */
export const clock = {
  now: () => new Date(Date.now() + offset),
  get simulated() { return offset !== 0; },
  setOffset(ms) {
    offset = ms;
    try { sessionStorage.setItem(OFFSET_KEY, String(ms)); } catch { /* ignore */ }
    listeners.forEach((fn) => fn());
  },
  setMinuteOfDay(min) {
    const d = new Date();
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    this.setOffset(d.getTime() - Date.now());
  },
  reset() { this.setOffset(0); },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export const pad = (n) => String(n).padStart(2, '0');
export const minsOf = (d) => d.getHours() * 60 + d.getMinutes();
export const wrap = (m) => ((m % 1440) + 1440) % 1440;

/** 7 h 30 asleep + 15 min to fall asleep. */
export const SLEEP_WINDOW = 465;
export const bedMinOf = (wakeMin) => wrap(wakeMin - SLEEP_WINDOW);

export function fmtParts(min, h24 = true) {
  const m = wrap(Math.round(min));
  const h = Math.floor(m / 60);
  if (h24) return { time: `${pad(h)}:${pad(m % 60)}`, ampm: '' };
  return { time: `${h % 12 || 12}:${pad(m % 60)}`, ampm: h < 12 ? 'AM' : 'PM' };
}
export function fmtMin(min, h24 = true) {
  const p = fmtParts(min, h24);
  return p.ampm ? `${p.time} ${p.ampm}` : p.time;
}
export const fmtClock = (d, h24 = true) => fmtMin(minsOf(d), h24);

const NB = '\u00a0'; // keeps "7 h 24" on one line
/** "in 1 h 58 min" style durations. */
export function dur(m) {
  const t = Math.max(0, Math.round(m));
  if (t < 60) return `${t}${NB}min`;
  const h = Math.floor(t / 60);
  const r = t % 60;
  return r ? `${h}${NB}h${NB}${r}${NB}min` : `${h}${NB}h`;
}
/** Sleep estimates read like the device: "7 h 24". */
export const sleepDur = (m) => `${Math.floor(m / 60)}${NB}h${NB}${pad(Math.round(m) % 60)}`;

export const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const WEEK = [1, 2, 3, 4, 5, 6, 0]; // Monday first

export const longDate = (d) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function atMinute(d, min) { const x = new Date(d); x.setHours(Math.floor(min / 60), min % 60, 0, 0); return x; }

export function daysLabel(days) {
  const s = [...new Set(days)];
  if (!s.length) return 'Never';
  if (s.length === 7) return 'Every day';
  if (s.length === 5 && [1, 2, 3, 4, 5].every((d) => s.includes(d))) return 'Weekdays';
  if (s.length === 2 && s.includes(0) && s.includes(6)) return 'Weekends';
  return WEEK.filter((d) => s.includes(d)).map((d) => DAY_SHORT[d]).join(', ');
}

export function relativeDay(d, now) {
  const k = dayKey(d);
  if (k === dayKey(now)) return 'Today';
  if (k === dayKey(addDays(now, 1))) return 'Tomorrow';
  return DAY_LONG[d.getDay()];
}

/** Next time the alarm will actually ring, or null. */
export function nextAlarm(alarm, now) {
  if (!alarm.on || !alarm.days.length) return null;
  const d = atMinute(now, alarm.h * 60 + alarm.m);
  if (d <= now) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 8; i++) {
    if (alarm.days.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/**
 * Everything derived from the alarm for the coming night.
 * morning: next time the clock reads the alarm time. bedAt: morning − 7 h 45.
 */
export function plan(alarm, now) {
  const wakeMin = alarm.h * 60 + alarm.m;
  const morning = atMinute(now, wakeMin);
  if (morning <= now) morning.setDate(morning.getDate() + 1);
  const bedAt = new Date(morning.getTime() - SLEEP_WINDOW * 60000);
  const eveningAt = new Date(bedAt.getTime() - 180 * 60000);
  const lastWake = addDays(morning, -1);
  const t = now.getTime();
  let phase = 'day';
  if (t >= bedAt.getTime()) phase = 'night';
  else if (t >= eveningAt.getTime()) phase = 'evening';
  else if (t - lastWake.getTime() < 5 * 3600e3) phase = 'morning';
  return {
    morning,
    lastWake,
    bedAt,
    eveningAt,
    wakeMin,
    bedMin: bedMinOf(wakeMin),
    alarmSet: alarm.on && alarm.days.includes(morning.getDay()),
    phase,
    minsToBed: (bedAt.getTime() - t) / 60000,
    minsToWake: (morning.getTime() - t) / 60000,
  };
}

/** The next ring across all alarms: { at, alarm } or null. */
export function nextRing(alarms, now) {
  let best = null;
  for (const a of alarms) {
    const at = nextAlarm(a, now);
    if (at && (!best || at < best.at)) best = { at, alarm: a };
  }
  return best;
}

/**
 * The alarm that governs tonight: the next one to ring within 24 h. When nothing
 * rings by tomorrow, phases still follow the usual wake time, marked as not set.
 * Returns a plain { h, m, on, days, source } that plan() understands.
 */
export function tonightAlarm(alarms, now) {
  const next = nextRing(alarms, now);
  if (next && next.at - now <= 24 * 3600e3) {
    return { h: next.alarm.h, m: next.alarm.m, on: true, days: [next.at.getDay()], source: next.alarm };
  }
  const usual = alarms.find((a) => a.on) || alarms[0] || { h: 7, m: 0 };
  return { h: usual.h, m: usual.m, on: false, days: [], source: null };
}

/** plan() for the alarm that rings next. */
export const planFor = (alarms, now) => plan(tonightAlarm(alarms, now), now);

/** Format "night minutes" (minutes since the evening's midnight, so 01:10 = 1510). */
export const fmtNight = (m, h24 = true) => fmtMin(wrap(m), h24);

/** Default 12/24 h from the phone's locale (CLAUDE.md open question 4). */
export function localeUses24h() {
  try {
    const o = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions();
    if (o.hourCycle) return o.hourCycle === 'h23' || o.hourCycle === 'h24';
    return !o.hour12;
  } catch { return true; }
}
