// Sleep: what the room heard, one night at a time or across the week.
// Pushed from Last night. Centred and quiet like home: one idea per section,
// one line that says what it means. Estimates only, never measurements.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { fmtNight, sleepDur, addDays } from '../lib/time.js';
import { clamp } from '../lib/spring.js';
import { makeSegmented, makeSwitch } from '../ui/controls.js';
import { Eyes } from '../ui/eyes.js';
import { nightChart, tempChart, weekChart, bedtimeChart, nightName } from '../ui/charts.js';
import { nightInsights, weekInsights, summarize } from '../services/insights.js';
import { navbar, bindNavbar } from './common.js';
import { stageAway } from './stagehelp.js';

const PATTERN_ICON = { room: 'thermo', bedtime: 'bed', consistency: 'clock', weekend: 'calendar', snoring: 'wave', trend: 'trend', target: 'moon' };
const dateOf = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const eveningOf = (n) => addDays(dateOf(n.date), -1).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');

export function createSleep({ view: startView = 'night' } = {}) {
  const { store } = ctx;
  const nav = navbar('Sleep');
  const root = el('<section class="screen sleep"><div class="scroll"><div class="sl-top"></div><div class="sl-body"></div></div></section>');
  root.prepend(nav);
  const scroll = root.querySelector('.scroll');
  bindNavbar(nav, scroll, 40);
  const top = root.querySelector('.sl-top');
  const body = root.querySelector('.sl-body');
  let view = startView;
  let idx = 0;
  let eyes = null;
  const t = (m) => fmtNight(m, store.state.display.clock24);

  const seg = makeSegmented({
    label: 'Show',
    value: view,
    options: [{ value: 'night', label: 'Night' }, { value: 'week', label: 'Week' }],
    onChange: (v) => { view = v; render(); },
  });
  top.append(seg);

  const section = (ic, label) => el(`<div class="sl-sec"><div class="label">${iconStr(ic)}<span>${esc(label)}</span></div></div>`);
  const line = (text, cls = '') => el(`<p class="sl-line ${cls}">${esc(text)}</p>`);
  const foot = () => el('<div class="caption sl-foot">Sleep time and snoring are estimates from sound in the room, not measurements. NOCTIS is not a medical device.</div>');

  function render() {
    eyes?.destroy();
    eyes = null;
    body.innerHTML = '';
    const list = ctx.nights;
    if (!list) return;
    top.hidden = !list.length;
    if (!list.length) { body.append(empty()); return; }
    seg.set(view);
    if (view === 'night') renderNight(list); else renderWeek(list);
  }

  /* ---------- one night ---------- */
  function renderNight(list) {
    idx = clamp(idx, 0, list.length - 1);
    const n = list[idx];
    const clock24 = store.state.display.clock24;
    const ni = nightInsights(n, list.slice(idx + 1, idx + 7), { clock24 });

    const hero = el(`<div class="sl-hero">
        <div class="stepper">
          <button class="iconbtn" type="button" data-older aria-label="Earlier night">${iconStr('chevl')}</button>
          <div class="label">${iconStr('bed')}<span>${esc(idx === 0 ? 'Last night' : `${nightName(n)} night`)} · estimate</span></div>
          <button class="iconbtn" type="button" data-newer aria-label="Later night">${iconStr('chev')}</button>
        </div>
        <div class="numeral">${esc(sleepDur(n.sleepMin))}</div>
        <div class="t1">${esc(ni.usual)}</div>
        <div class="t2">Night of ${esc(eveningOf(n))} · ${esc(t(n.asleep))} – ${esc(t(n.wake))}</div>
      </div>`);
    const older = hero.querySelector('[data-older]');
    const newer = hero.querySelector('[data-newer]');
    older.disabled = idx >= list.length - 1;
    newer.disabled = idx === 0;
    older.addEventListener('click', () => { idx++; render(); });
    newer.addEventListener('click', () => { idx--; render(); });

    const night = el('<div class="sl-block"></div>');
    night.append(nightChart(n, { clock24 }));
    [ni.asleep, ni.restless].filter(Boolean).forEach((x) => night.append(line(x)));

    const room = section('thermo', 'Room overnight');
    room.append(tempChart(n, { clock24 }));
    room.append(line(`${n.roomTemp.toFixed(1)}° average · ${n.humidity}% humidity · ${n.light.toLowerCase()}`, 'quiet'));
    room.append(line(ni.room));

    const snore = section('wave', 'Snoring · estimate');
    snore.append(el(`<div class="sl-val">${n.snoringMin ? `About ${n.snoringMin} min` : 'None heard'}</div>`));
    if (n.snoringMin) snore.append(line(ni.snoring));
    snore.append(clipsTile());

    body.append(hero, night, room, snore, foot());
  }

  const clipsText = (on) => (on ? 'Up to three a night, saved to this app only.' : 'Off. Listening stays on NOCTIS.');
  function clipsTile() {
    const on = store.state.privacy.recordings;
    const r = el(`<div class="tile sl-clips">
        <div class="sl-clips-t"><span class="sl-clips-l">Save short snore clips</span><span class="caption">${clipsText(on)}</span></div>
      </div>`);
    r.append(makeSwitch({
      label: 'Save short snore clips',
      checked: on,
      onChange: (v) => { r.querySelector('.caption').textContent = clipsText(v); store.patch('privacy', { recordings: v }); },
    }));
    return r;
  }

  /* ---------- the week ---------- */
  function renderWeek(list) {
    const week = list.slice(0, 7);
    const clock24 = store.state.display.clock24;
    const sum = summarize(week);
    const ins = weekInsights(week, { clock24 });

    const hero = el(`<div class="sl-hero">
        <div class="label">${iconStr('moon')}<span>Last ${week.length} nights · estimate</span></div>
        <div class="numeral">${esc(sleepDur(sum.avgSleep))}</div>
        <div class="t2">A night on average. The dashed line is 7 h 30.</div>
      </div>`);
    const chart = el('<div class="sl-block"></div>');
    const pick = el('<button class="sl-pick" type="button"><span></span>' + iconStr('chev') + '</button>');
    let sel = week[0].date;
    const showSel = (date) => {
      sel = date;
      const n = week.find((x) => x.date === date);
      pick.querySelector('span').textContent = `${nightName(n)} night · ${sleepDur(n.sleepMin)}, asleep around ${t(n.asleep)}`;
    };
    chart.append(weekChart(week, { selected: sel, onSelect: showSel, clock24 }), pick);
    showSel(sel);
    pick.addEventListener('click', () => {
      idx = list.findIndex((x) => x.date === sel);
      view = 'night';
      render();
      scroll.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const work = week.filter((n) => n.alarm != null);
    const bedLine = ins.find((i) => i.id === 'bedtime') || ins.find((i) => i.id === 'consistency') || ins.find((i) => i.id === 'weekend');
    const bed = section('bed', 'Bedtime');
    bed.append(el(`<div class="sl-val">Asleep around ${esc(t(sum.avgAsleep))}</div>`));
    bed.append(line(`Awake at ${t(sum.avgWake)}${work.length ? ' on work nights' : ''}.`, 'quiet'));
    bed.append(bedtimeChart(week, { clock24 }));
    if (bedLine) bed.append(line(bedLine.text));

    const pats = ins.filter((i) => i !== bedLine).slice(0, 2);
    const patterns = section('trend', 'Patterns');
    if (week.length < 4) patterns.append(line('NOCTIS needs a few more nights to spot patterns.'));
    else {
      patterns.append(el(`<ul class="sl-pats">${pats.map((p) => `<li><span class="circ">${iconStr(PATTERN_ICON[p.id] || 'dot3')}</span><span>${esc(p.text)}</span></li>`).join('')}</ul>`));
    }

    body.append(hero, chart, bed, patterns, foot());
  }

  /* ---------- nothing yet ---------- */
  function empty() {
    const s = store.state;
    const sensing = s.privacy.roomSensing;
    const cleared = !!ctx.sleepCleared;
    const c = el(`<div class="sl-hero sl-empty">
        <div class="empty-eyes"><div class="eyes-layer"></div></div>
        <div class="t1">${!sensing ? 'Room sensing is off.' : cleared ? 'Sleep data deleted.' : 'No estimates yet.'}</div>
        <div class="t2">${!sensing ? 'NOCTIS estimates sleep and snoring from sound in the room. Audio is processed on NOCTIS and never uploaded.' : cleared ? 'New estimates start after tonight.' : 'NOCTIS makes its first estimate after a night in the room.'}</div>
        ${!sensing ? '<button class="pill ghost small" type="button">Turn on room sensing</button>' : ''}
      </div>`);
    c.querySelector('.pill')?.addEventListener('click', () => store.patch('privacy', { roomSensing: true }));
    const host = c.querySelector('.empty-eyes');
    eyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2 });
    eyes.snap('sleep', { closed: 1 });
    eyes.sleep();
    return c;
  }

  const subs = [];
  return {
    el: root,
    kind: 'sleep',
    showWeek() { view = 'week'; render(); },
    enter() {
      stageAway();
      render();
      const on = (type, fn) => { addEventListener(type, fn); subs.push(() => removeEventListener(type, fn)); };
      on('offhours:nights', () => { idx = 0; render(); });
      // Redraw only when something the charts depend on changes (not for the clips switch).
      const sig = () => { const s = store.state; return `${s.display.clock24}|${s.display.theme}|${s.privacy.roomSensing}`; };
      let key = sig();
      subs.push(store.on(['display', 'privacy'], () => { const k = sig(); if (k !== key) { key = k; render(); } }));
    },
    leave() { subs.splice(0).forEach((u) => u()); },
    destroy() { eyes?.destroy(); },
  };
}
