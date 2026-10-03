// Sleep: estimates from the room. One night at a time (step back through
// earlier nights) or the week, always with what the numbers mean for you.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { fmtNight, sleepDur, addDays } from '../lib/time.js';
import { clamp, prefersReducedMotion } from '../lib/spring.js';
import { staggerIn, countTo, EASE_OUT } from '../ui/motion.js';
import { makeSegmented, makeSwitch } from '../ui/controls.js';
import { Eyes } from '../ui/eyes.js';
import { nightChart, tempChart, weekChart, bedtimeChart, nightName } from '../ui/charts.js';
import { nightInsights, weekInsights, summarize } from '../services/insights.js';
import { panel } from './common.js';
import { stageAway } from './stagehelp.js';

const PATTERN_ICON = { room: 'thermo', bedtime: 'bed', consistency: 'clock', weekend: 'calendar', snoring: 'wave', trend: 'trend', target: 'moon' };
const DISCLAIMER = 'Sleep time and snoring are estimates from sound in the room, not measurements. NOCTIS is not a medical device.';
const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const eveningOf = (n) => addDays(dateOf(n.date), -1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

export function createSleep(shell) {
  const { store } = ctx;
  const P = panel({ cls: 'sleep', label: 'Estimated from your room', title: 'Sleep' });
  let view = 'night';
  let idx = 0;
  let eyes = null;
  const t = (m) => fmtNight(m, store.state.display.clock24);

  const seg = makeSegmented({
    label: 'Show',
    value: view,
    options: [{ value: 'night', label: 'Night' }, { value: 'week', label: 'Week' }],
    onChange: (v) => { view = v; animate = true; render(); },
  });
  const segWrap = el('<div class="segwrap"></div>');
  segWrap.append(seg);
  const content = el('<div class="sleep-body"></div>');
  P.body.append(segWrap, content);

  const disclaimer = () => el(`<p class="disclaimer">${iconStr('info')}<span>${esc(DISCLAIMER)}</span></p>`);

  function render() {
    eyes?.destroy();
    eyes = null;
    content.innerHTML = '';
    const list = ctx.nights;
    if (!list) return;
    if (!list.length) { segWrap.hidden = true; content.append(emptyCard()); return; }
    segWrap.hidden = false;
    seg.set(view);
    if (view === 'night') renderNight(list); else renderWeek(list);
    // Durations count up into place; cards rise in after a switch.
    content.querySelectorAll('.numeral[data-min]').forEach((n) => countTo(n, Number(n.dataset.min), sleepDur, { from: Math.max(0, Number(n.dataset.min) - 90), dur: 800 }));
    if (animate) staggerIn(content.children, { step: 45, y: 14 });
    animate = false;
  }
  let animate = false;

  /* ---------- one night ---------- */
  function renderNight(list) {
    idx = clamp(idx, 0, list.length - 1);
    const n = list[idx];
    const clock24 = store.state.display.clock24;
    const ni = nightInsights(n, list.slice(idx + 1, idx + 7), { clock24 });

    const stepper = el(`<div class="stepper">
        <button class="iconbtn" type="button" data-older aria-label="Earlier night">${iconStr('chevl')}</button>
        <div class="step-t"><div class="step-name">${esc(idx === 0 ? 'Last night' : `${nightName(n)} night`)}</div><div class="caption">Night of ${esc(eveningOf(n))}</div></div>
        <button class="iconbtn" type="button" data-newer aria-label="Later night">${iconStr('chev')}</button>
      </div>`);
    const older = stepper.querySelector('[data-older]');
    const newer = stepper.querySelector('[data-newer]');
    older.disabled = idx >= list.length - 1;
    newer.disabled = idx === 0;
    older.addEventListener('click', () => { idx++; slide = 1; render(); });
    newer.addEventListener('click', () => { idx--; slide = -1; render(); });

    const asleep = el(`<article class="card">
        <div class="clabel"><span>Time asleep · estimate</span></div>
        <div class="numeral" data-min="${n.sleepMin}">${esc(sleepDur(n.sleepMin))}</div>
        <div class="t2">Around ${esc(t(n.asleep))} – ${esc(t(n.wake))}</div>
      </article>`);
    asleep.append(nightChart(n, { clock24 }));
    asleep.append(el(`<ul class="ins">${[ni.usual, ni.asleep, ni.restless].filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`));

    const room = el(`<article class="card">
        <div class="clabel"><span>Room overnight</span></div>
      </article>`);
    room.append(tempChart(n, { clock24 }));
    room.append(el(`<div class="stats3">
        <div><b>${esc(`${n.roomTemp.toFixed(1)}°`)}</b><span>Average</span></div>
        <div><b>${n.humidity}%</b><span>Humidity</span></div>
        <div><b>${esc(n.light)}</b><span>Light</span></div>
      </div>`));
    room.append(el(`<p class="insight">${esc(ni.room)}</p>`));

    const snore = el(`<article class="card">
        <div class="clabel"><span>Snoring · estimate</span></div>
        ${n.snoringMin ? `<div class="numeral md">~${n.snoringMin} min</div>` : '<div class="t1">None heard.</div>'}
        <div class="t2">${esc(ni.snoring)}</div>
      </article>`);
    snore.append(clipsRow());

    content.append(stepper, asleep, room, snore, disclaimer());
    if (slide) {
      // Step through nights like pages: the cards slide in from the side you came from.
      const dx = slide * -26;
      slide = 0;
      if (!prefersReducedMotion()) [asleep, room, snore].forEach((c, i) => c.animate([{ opacity: 0, transform: `translateX(${dx}px)` }, { opacity: 1, transform: 'none' }], { duration: 460, delay: i * 40, easing: EASE_OUT, fill: 'backwards' }));
    }
  }
  let slide = 0;

  const clipsText = (on) => (on
    ? 'On. Up to three short clips a night, saved to this app only.'
    : 'Off. Listening stays on NOCTIS. Nothing is recorded unless you turn this on.');
  function clipsRow() {
    const on = store.state.privacy.recordings;
    const r = el(`<div class="cfoot clips">
        <div class="cfoot-t"><span class="cfoot-l">Save short snore clips</span><span class="cfoot-d">${clipsText(on)}</span></div>
      </div>`);
    r.append(makeSwitch({
      label: 'Save short snore clips',
      checked: on,
      onChange: (v) => { r.querySelector('.cfoot-d').textContent = clipsText(v); store.patch('privacy', { recordings: v }); },
    }));
    return r;
  }

  /* ---------- the week ---------- */
  function renderWeek(list) {
    const week = list.slice(0, 7);
    const clock24 = store.state.display.clock24;
    const sum = summarize(week);
    const ins = weekInsights(week, { clock24 });

    const avg = el(`<article class="card">
        <div class="clabel"><span>Nightly average · estimate</span></div>
        <div class="numeral" data-min="${sum.avgSleep}">${esc(sleepDur(sum.avgSleep))}</div>
        <div class="t2">Dashed line is 7 h 30, what bed-by plans for.</div>
      </article>`);
    const detail = el('<div class="wsel"><span class="wsel-t"></span><button class="link" type="button">Open night</button></div>');
    let sel = week[0].date;
    const showSel = (date) => {
      sel = date;
      const n = week.find((x) => x.date === date);
      detail.querySelector('.wsel-t').textContent = `${nightName(n)} night · an estimated ${sleepDur(n.sleepMin)}, asleep around ${t(n.asleep)}`;
    };
    avg.append(weekChart(week, { selected: sel, onSelect: showSel, clock24 }));
    avg.append(detail);
    showSel(sel);
    detail.querySelector('.link').addEventListener('click', () => {
      idx = list.findIndex((x) => x.date === sel);
      view = 'night';
      seg.set('night');
      animate = true;
      render();
      P.toTop();
    });

    const work = week.filter((n) => n.alarm != null);
    const bedLine = ins.find((i) => i.id === 'bedtime') || ins.find((i) => i.id === 'consistency') || ins.find((i) => i.id === 'weekend');
    const bed = el(`<article class="card">
        <div class="clabel"><span>Bedtime</span></div>
        <div class="t1">Usually asleep around ${esc(t(sum.avgAsleep))}</div>
        <div class="t2">and awake at ${esc(t(sum.avgWake))}${work.length ? ' on work nights' : ''}.</div>
      </article>`);
    bed.append(bedtimeChart(week, { clock24 }));
    if (bedLine) bed.append(el(`<p class="insight">${esc(bedLine.text)}</p>`));

    const pats = ins.filter((i) => i !== bedLine).slice(0, 2);
    const patterns = el(`<section class="patterns">
        <div class="sublabel">Patterns</div>
        ${week.length < 4
          ? '<article class="card pattern"><p>NOCTIS needs a few more nights to spot patterns.</p></article>'
          : pats.map((p) => `<article class="card pattern"><span class="pic">${iconStr(PATTERN_ICON[p.id] || 'dot3')}</span><p>${esc(p.text)}</p></article>`).join('')}
      </section>`);

    content.append(avg, bed, patterns, disclaimer());
  }

  /* ---------- nothing yet ---------- */
  function emptyCard() {
    const s = store.state;
    const sensing = s.privacy.roomSensing;
    const cleared = !!ctx.sleepCleared;
    const c = el(`<article class="card empty">
        <div class="empty-eyes"><div class="eyes-layer"></div></div>
        <div class="t1">${!sensing ? 'Room sensing is off.' : cleared ? 'Sleep data deleted.' : 'No estimates yet.'}</div>
        <div class="t2">${!sensing ? 'NOCTIS estimates sleep and snoring from sound in the room. Audio is processed on NOCTIS and never uploaded.' : cleared ? 'New estimates start after tonight.' : 'NOCTIS makes its first estimate after a night in the room.'}</div>
        ${!sensing ? '<button class="pill solid small" type="button">Turn on room sensing</button>' : ''}
      </article>`);
    c.querySelector('.pill')?.addEventListener('click', () => store.patch('privacy', { roomSensing: true }));
    const host = c.querySelector('.empty-eyes');
    eyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2, glow: false });
    eyes.snap('sleep', { closed: 1 });
    eyes.sleep();
    return c;
  }

  const subs = [];
  return {
    el: P.el,
    toTop: P.toTop,
    showNight(i = 0) { idx = i; view = 'night'; render(); },
    showWeek() { view = 'week'; render(); },
    enter() {
      stageAway();
      render();
      const on = (type, fn) => { addEventListener(type, fn); subs.push(() => removeEventListener(type, fn)); };
      on('offhours:nights', () => { idx = 0; render(); });
      // Re-draw only when something the charts depend on changes (not for the clips switch).
      let key = '';
      const sig = () => { const s = store.state; return `${s.display.clock24}|${s.display.theme}|${s.privacy.roomSensing}`; };
      key = sig();
      subs.push(store.on(['display', 'privacy'], () => { const k = sig(); if (k !== key) { key = k; render(); } }));
    },
    leave() { subs.splice(0).forEach((u) => u()); },
    destroy() { eyes?.destroy(); },
  };
}
