// Charts for night estimates. Quiet by design: thin marks with rounded data ends,
// a 2px gap between bars, one accent for the thing that matters and a soft tone
// for context. Touch or drag to read a value; every chart also carries a text
// version for screen readers.

import { el, esc } from '../lib/dom.js';
import { fmtNight, sleepDur, DAY_LETTER, DAY_SHORT } from '../lib/time.js';
import { clamp } from '../lib/spring.js';
import { TARGET, bedByOf } from '../services/insights.js';

const pct = (v, lo, hi) => ((v - lo) / Math.max(1e-6, hi - lo)) * 100;
/** A night is named after the evening it starts: the night ending Saturday morning is Friday's. */
const eveningDay = (n) => (n.dow + 6) % 7;
export const nightName = (n) => DAY_SHORT[eveningDay(n)];

/** Tooltip that sits above the finger, kept inside the plot. */
function tipper(plot) {
  const tip = plot.querySelector('.vtip');
  let t = 0;
  return {
    show(text, xPct) {
      clearTimeout(t);
      tip.textContent = text;
      tip.classList.add('on');
      const w = plot.clientWidth;
      const tw = tip.offsetWidth;
      tip.style.left = `${clamp((xPct / 100) * w, tw / 2, Math.max(tw / 2, w - tw / 2))}px`;
    },
    hide(ms = 1600, after) {
      clearTimeout(t);
      t = setTimeout(() => { tip.classList.remove('on'); after?.(); }, ms);
    },
  };
}

/** Drag across a plot to scrub positions 0..n-1 (touch, mouse and arrow keys). */
function scrub(plot, n, onPick, onEnd) {
  let i = -1;
  const at = (e) => {
    const r = plot.getBoundingClientRect();
    return clamp(Math.floor(((e.clientX - r.left) / r.width) * n), 0, n - 1);
  };
  plot.addEventListener('pointerdown', (e) => { plot.setPointerCapture(e.pointerId); i = at(e); onPick(i); });
  plot.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'touch') { const j = at(e); if (j !== i) { i = j; onPick(i); } } });
  const end = () => onEnd();
  plot.addEventListener('pointerup', end);
  plot.addEventListener('pointercancel', end);
  plot.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    i = clamp((i < 0 ? 0 : i) + (e.key === 'ArrowRight' ? 1 : -1), 0, n - 1);
    onPick(i);
  });
  plot.addEventListener('blur', end);
}

/* ------------------------------------------------------------------ night */

/** Settled and restless spells across the night, with snoring underneath. */
export function nightChart(n, { compact = false, clock24 = true } = {}) {
  const t = (m) => fmtNight(m, clock24);
  const b = n.buckets;
  const end = n.asleep + b.length * 10;
  const runs = [];
  b.forEach((x) => {
    const s = x.restless ? 'Restless' : 'Settled';
    const last = runs[runs.length - 1];
    if (last && last.s === s) last.end = x.t + 10; else runs.push({ s, start: x.t, end: x.t + 10 });
  });
  const sr = `${runs.map((r) => `${r.s} ${t(r.start)} to ${t(r.end)}`).join('. ')}.${n.spells.length ? ` Snoring ${n.spells.map((s) => `${t(s.start)} to ${t(s.end)}`).join(', ')}.` : ''}`;
  const fig = el(`<figure class="viz vnight${compact ? ' compact' : ''}">
      <div class="vplot" ${compact ? '' : 'tabindex="0"'} role="img" aria-label="${esc(`Night estimate from ${t(n.asleep)} to ${t(n.wake)}`)}">
        <div class="nbars">${b.map((x, i) => `<i class="${x.restless ? 'r' : 's'}" style="--i:${i}"></i>`).join('')}</div>
        <div class="nsnore">${n.spells.map((s) => `<i style="left:${pct(s.start, n.asleep, end)}%;width:${Math.max(1.4, pct(s.end, n.asleep, end) - pct(s.start, n.asleep, end))}%"></i>`).join('')}</div>
        <div class="vtip" aria-hidden="true"></div>
      </div>
      ${compact ? '' : `
      <div class="vaxis" aria-hidden="true"><span>${t(n.asleep)}</span><span>${t(Math.round((n.asleep + end) / 20) * 10)}</span><span>${t(n.wake)}</span></div>
      <div class="vlegend" aria-hidden="true"><span><i class="k s"></i>Settled</span><span><i class="k r"></i>Restless</span><span><i class="k z"></i>Snoring</span></div>`}
      <p class="sr">${esc(sr)}</p>
    </figure>`);
  if (!compact) {
    const plot = fig.querySelector('.vplot');
    const bars = [...fig.querySelectorAll('.nbars i')];
    const tip = tipper(plot);
    scrub(plot, b.length, (i) => {
      plot.classList.add('active');
      bars.forEach((x, j) => x.classList.toggle('hot', j === i));
      const x = b[i];
      tip.show(`${t(x.t)} · ${x.restless ? 'Restless' : 'Settled'}${x.snore ? ' · snoring' : ''}`, ((i + 0.5) / b.length) * 100);
    }, () => tip.hide(1600, () => { plot.classList.remove('active'); bars.forEach((x) => x.classList.remove('hot')); }));
  }
  return fig;
}

/* ------------------------------------------------------------------- room */

/** Room temperature overnight: one line, a soft wash, the coolest point labelled. */
export function tempChart(n, { clock24 = true } = {}) {
  const t = (m) => fmtNight(m, clock24);
  const pts = n.temps.filter((x) => x.t >= n.asleep - 15 && x.t <= n.wake + 5);
  const t0 = pts[0].t;
  const t1 = pts[pts.length - 1].t;
  const vs = pts.map((p) => p.v);
  const lo = Math.min(...vs) - 0.6;
  const hi = Math.max(...vs) + 0.6;
  const X = (tt) => pct(tt, t0, t1);
  const Y = (v) => 100 - pct(v, lo, hi);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(2)},${Y(p.v).toFixed(2)}`).join(' ');
  const area = `${line} L100,100 L0,100 Z`;
  const avg = n.roomTemp;
  const coolest = pts.reduce((a, b) => (b.v < a.v ? b : a));
  const sr = `Room temperature ${pts[0].v}° at ${t(t0)}, coolest ${coolest.v}° at ${t(coolest.t)}, ${pts[pts.length - 1].v}° at ${t(t1)}. Average ${avg}°.`;
  const fig = el(`<figure class="viz vtemp">
      <div class="vplot" tabindex="0" role="img" aria-label="${esc(sr)}">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path class="area" d="${area}"/>
          <line class="avg" x1="0" x2="100" y1="${Y(avg)}" y2="${Y(avg)}"/>
          <path class="line" d="${line}"/>
        </svg>
        <span class="vdot low" style="left:${X(coolest.t)}%;top:${Y(coolest.v)}%"></span>
        <span class="vlab low" style="left:${X(coolest.t)}%;top:${Y(coolest.v)}%">${esc(`${coolest.v}°`)}</span>
        <span class="vavg" style="top:${Y(avg)}%">avg ${esc(`${avg}°`)}</span>
        <span class="vhair" aria-hidden="true"></span>
        <span class="vdot hot" aria-hidden="true"></span>
        <div class="vtip" aria-hidden="true"></div>
      </div>
      <div class="vaxis" aria-hidden="true"><span>${t(t0)}</span><span>${t(t1)}</span></div>
      <p class="sr">${esc(sr)}</p>
    </figure>`);
  const plot = fig.querySelector('.vplot');
  const hair = fig.querySelector('.vhair');
  const dot = fig.querySelector('.vdot.hot');
  const tip = tipper(plot);
  scrub(plot, pts.length, (i) => {
    const p = pts[i];
    plot.classList.add('active');
    hair.style.left = `${X(p.t)}%`;
    dot.style.left = `${X(p.t)}%`;
    dot.style.top = `${Y(p.v)}%`;
    tip.show(`${t(p.t)} · ${p.v}°`, X(p.t));
  }, () => tip.hide(1600, () => plot.classList.remove('active')));
  return fig;
}

/* ------------------------------------------------------------------- week */

/**
 * Seven nights of estimated sleep, oldest on the left. The selected night is the
 * accent; a dashed line marks 7 h 30.
 */
export function weekChart(nights, { selected, onSelect, clock24 = true } = {}) {
  const list = [...nights].reverse();
  const max = Math.max(540, ...list.map((n) => n.sleepMin + 20));
  const H = (m) => pct(m, 0, max);
  const fig = el(`<figure class="viz vweek">
      <div class="vplot" role="group" aria-label="Estimated sleep, last ${list.length} nights">
        <div class="wtarget" style="bottom:${H(TARGET)}%" aria-hidden="true"></div>
        <div class="wcols">
          ${list.map((n, i) => `<button class="wcol" type="button" style="--h:${H(n.sleepMin)}%;--i:${i}" data-date="${n.date}" aria-label="${esc(`${nightName(n)} night, an estimated ${sleepDur(n.sleepMin)}, asleep around ${fmtNight(n.asleep, clock24)}`)}"><i></i><b class="wlab">${esc(sleepDur(n.sleepMin))}</b></button>`).join('')}
        </div>
      </div>
      <div class="wdays" aria-hidden="true">${list.map((n) => `<span>${DAY_LETTER[eveningDay(n)]}</span>`).join('')}</div>
    </figure>`);
  const cols = [...fig.querySelectorAll('.wcol')];
  const set = (date) => cols.forEach((c) => { const on = c.dataset.date === date; c.classList.toggle('on', on); c.setAttribute('aria-pressed', String(on)); });
  set(selected || list[list.length - 1]?.date);
  cols.forEach((c) => c.addEventListener('click', () => { set(c.dataset.date); onSelect?.(c.dataset.date); }));
  fig.set = set;
  return fig;
}

/* ---------------------------------------------------------------- bedtime */

/**
 * When you fell asleep each night (earlier is higher), against bed-by.
 * Work nights are filled; free mornings are rings.
 */
export function bedtimeChart(nights, { clock24 = true } = {}) {
  const t = (m) => fmtNight(m, clock24);
  const list = [...nights].reverse();
  const work = list.filter((n) => n.alarm != null);
  const bedBys = work.map(bedByOf);
  const bedBy = bedBys.length ? bedBys.sort((a, b) => bedBys.filter((x) => x === a).length - bedBys.filter((x) => x === b).length).pop() : null;
  const vals = list.map((n) => n.asleep).concat(bedBy != null ? [bedBy] : []);
  const lo = Math.min(...vals) - 25;
  const hi = Math.max(...vals) + 25;
  const Y = (m) => pct(m, lo, hi);
  const latest = list.reduce((a, b) => (b.asleep > a.asleep ? b : a));
  const sr = list.map((n) => `${nightName(n)} night: asleep around ${t(n.asleep)}${n.alarm == null ? ', free morning after' : ''}`).join('. ');
  const fig = el(`<figure class="viz vbed">
      <div class="vplot" role="img" aria-label="${esc(`When you fell asleep, last ${list.length} nights${bedBy != null ? `, against bed-by ${t(bedBy)}` : ''}`)}">
        ${bedBy != null ? `<div class="bline" style="top:${Y(bedBy)}%"><span>Bed-by ${esc(t(bedBy))}</span></div>` : ''}
        ${list.map((n, i) => `<span class="bdot${n.alarm == null ? ' free' : ''}" style="--i:${i};left:${((i + 0.5) / list.length) * 100}%;top:${Y(n.asleep)}%"></span>`).join('')}
        <span class="vlab late" style="left:${((list.indexOf(latest) + 0.5) / list.length) * 100}%;top:${Y(latest.asleep)}%">${esc(t(latest.asleep))}</span>
      </div>
      <div class="wdays" aria-hidden="true">${list.map((n) => `<span>${DAY_LETTER[eveningDay(n)]}</span>`).join('')}</div>
      <div class="vlegend" aria-hidden="true"><span><i class="k dot"></i>Work night</span><span><i class="k ring"></i>Free morning</span>${bedBy != null ? '<span><i class="k dash"></i>Bed-by</span>' : ''}</div>
      <p class="sr">${esc(sr)}</p>
    </figure>`);
  return fig;
}
