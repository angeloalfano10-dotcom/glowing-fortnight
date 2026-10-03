// Home: two calm pages, swiped like iOS Weather.
//   Last night (estimate) · Tonight (bed by, alarm)
// Tomorrow's briefing lives on NOCTIS only; the app builds and sends it quietly.
// The header button holds the app's eyes; tap it to open your NOCTIS.
// Each page keeps to one idea, with one line that says what it means for you.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { clock, planFor, nextRing, fmtMin, fmtParts, dur, sleepDur, daysLabel, relativeDay, DAY_LONG, wrap } from '../lib/time.js';
import { makeSwitch, longPress } from '../ui/controls.js';
import { Eyes } from '../ui/eyes.js';
import { island } from '../ui/island.js';
import { nightChart } from '../ui/charts.js';
import { nightInsights, weekInsights, roomNow, roomPattern } from '../services/insights.js';
import { stageTo } from './stagehelp.js';

const LABELS = ['Last night', 'Tonight'];

export function createHome({ page } = {}) {
  const { store, services } = ctx;
  const root = el(`<section class="screen home">
      <header class="topbar">
        <button class="logo wordmark" type="button" aria-label="offhours. Press and hold for the demo panel.">offhours</button>
        <button class="eyesbtn" type="button" aria-label="Your NOCTIS"><span class="anchor" data-lid="var(--surface-solid)"></span></button>
      </header>
      <div class="pager">
        <section class="page p-night" aria-label="Last night"></section>
        <section class="page p-tonight" aria-label="Tonight"></section>
      </div>
      <nav class="dots" aria-label="Pages">
        ${LABELS.map((l, i) => `<button type="button" aria-label="${l}" data-i="${i}"><i></i></button>`).join('')}
      </nav>
    </section>`);
  const pager = root.querySelector('.pager');
  const pages = [...root.querySelectorAll('.page')];
  const dots = [...root.querySelectorAll('.dots button')];
  const anchor = root.querySelector('.eyesbtn .anchor');
  const h24 = () => store.state.display.clock24;
  const fmt = (m) => fmtMin(m, h24());
  const subs = [];
  let active = false;
  let cur = -1;

  longPress(root.querySelector('.logo'), () => ctx.go.demo(), { onTap: () => goPage(1, true) });
  root.querySelector('.eyesbtn').addEventListener('click', () => ctx.go.noctis());

  /* ---------- pager ---------- */
  function goPage(i, smooth = false) {
    const w = pager.clientWidth;
    if (!w) return;
    pager.scrollTo({ left: i * w, behavior: smooth ? 'smooth' : 'auto' });
    setCurrent(i);
  }
  function setCurrent(i) {
    if (i === cur) return;
    cur = i;
    dots.forEach((d, n) => d.setAttribute('aria-current', String(n === i)));
    pages.forEach((p, n) => p.setAttribute('aria-hidden', String(n !== i)));
  }
  pager.addEventListener('scroll', () => {
    const i = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
    setCurrent(Math.max(0, Math.min(pages.length - 1, i)));
  }, { passive: true });
  dots.forEach((d) => d.addEventListener('click', () => goPage(Number(d.dataset.i), true)));

  const defaultPage = () => (planFor(store.state.alarms, clock.now()).phase === 'morning' ? 0 : 1);

  /* ---------- Last night ---------- */
  const night = pages[0];
  let nightEyes = null;
  function renderNight() {
    const list = ctx.nights;
    if (!list) return;
    nightEyes?.destroy();
    nightEyes = null;
    const n = list[0];
    if (n) {
      const ni = nightInsights(n, list.slice(1, 7), { clock24: h24() });
      night.innerHTML = `
        <div class="page-main">
          <button class="hero hero-link" type="button" aria-label="Sleep details">
            <span class="label">${iconStr('bed')}<span>Last night · estimate</span>${iconStr('chev')}</span>
            <span class="numeral">${esc(sleepDur(n.sleepMin))}</span>
            <span class="mini"></span>
            <span class="t1">${esc(ni.usual)}</span>
            <span class="t2">${esc(n.snoringMin ? `Snoring about ${n.snoringMin} min` : 'No snoring heard')} · room ${esc(n.roomTemp.toFixed(1))}°</span>
          </button>
        </div>
        <div class="page-foot"><div class="caption">Estimated from sound in the room. Not a measurement.</div></div>`;
      night.querySelector('.mini').append(nightChart(n, { compact: true, clock24: h24() }));
      night.querySelector('.hero-link').addEventListener('click', () => ctx.go.sleep());
      return;
    }
    const sensing = store.state.privacy.roomSensing;
    const cleared = !!ctx.sleepCleared;
    night.innerHTML = `
      <div class="page-main">
        <div class="hero">
          <div class="empty-eyes"><div class="eyes-layer"></div></div>
          <div class="t1">${!sensing ? 'Room sensing is off.' : cleared ? 'Sleep data deleted.' : 'No estimate yet.'}</div>
          <div class="t2">${!sensing ? 'Turn it on in NOCTIS settings for a sleep estimate.' : cleared ? 'New estimates start after tonight.' : 'NOCTIS makes one after a night in the room.'}</div>
        </div>
      </div>
      <div class="page-foot">${sensing ? '' : '<button class="pill ghost small" type="button" data-open>Settings</button>'}</div>`;
    const host = night.querySelector('.empty-eyes');
    nightEyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2 });
    nightEyes.snap('sleep', { closed: 1 });
    nightEyes.sleep();
    night.querySelector('[data-open]')?.addEventListener('click', () => ctx.go.noctis());
  }

  /* ---------- Tonight ---------- */
  const tonight = pages[1];
  tonight.innerHTML = `
    <div class="page-main">
      <div class="hero">
        <div class="label" data-r="label"></div>
        <div class="numeral" data-r="big"></div>
        <div class="t1" data-r="t1" hidden></div>
        <div class="t2" data-r="sub"></div>
        <p class="note" data-r="note" hidden></p>
      </div>
    </div>
    <div class="page-foot">
      <div class="tile alarm-tile">
        <button class="alarm-open" type="button" aria-label="Alarms">
          <span class="circ" data-r="aic">${iconStr('alarm')}</span>
          <span class="alarm-txt"><span class="tl" data-r="days"></span><span class="clockface" data-r="time"></span></span>
        </button>
      </div>
    </div>`;
  const R = (k) => tonight.querySelector(`[data-r="${k}"]`);
  let tileAlarm = null;
  const sw = makeSwitch({
    big: true,
    label: 'Alarm',
    checked: true,
    onChange: (v) => {
      const a = tileAlarm;
      if (!a) { ctx.go.alarms(); sw.set(false); return; }
      if (v && !a.days.length) { ctx.go.alarm(a.id); return; }
      store.saveAlarm({ ...a, on: v });
      island(v ? `Alarm on · ${fmt(a.h * 60 + a.m)}` : 'Alarm off', v ? 'alarm' : 'belloff');
    },
  });
  tonight.querySelector('.alarm-tile').append(sw);
  tonight.querySelector('.alarm-open').addEventListener('click', () => ctx.go.alarms());

  /** The one line under Tonight: the room right now if it runs warm, else the bedtime pattern. */
  function tonightNote(p) {
    if (p.phase === 'night' || !ctx.nights?.length) return '';
    const week = ctx.nights.slice(0, 7);
    const pat = roomPattern(week);
    if (ctx.room && pat && ctx.room.temp > pat.thr) return roomNow(ctx.room.temp, week);
    return weekInsights(week, { clock24: h24() }).find((i) => i.id === 'bedtime')?.text || '';
  }

  function renderTonight() {
    const s = store.state;
    const now = clock.now();
    const p = planFor(s.alarms, now);
    const big = R('big');
    const t1 = R('t1');
    const note = R('note');
    const setBig = (min) => {
      const parts = fmtParts(min, h24());
      big.innerHTML = `${esc(parts.time)}${parts.ampm ? `<span class="ampm">${parts.ampm}</span>` : ''}`;
    };
    if (p.alarmSet) {
      big.hidden = false;
      t1.hidden = true;
      if (p.phase === 'night' && p.minsToBed < -30) {
        R('label').innerHTML = `${iconStr('alarm')}<span>Alarm</span>`;
        setBig(p.wakeMin);
        R('sub').textContent = `in ${dur(p.minsToWake)}. NOCTIS has it from here.`;
      } else {
        R('label').innerHTML = `${iconStr('bed')}<span>Bed by</span>`;
        setBig(p.bedMin);
        const when = p.minsToBed > 0 ? `in ${dur(p.minsToBed)}` : 'Now';
        R('sub').textContent = s.bedtime.remind && p.minsToBed > s.bedtime.lead
          ? `${when} · NOCTIS dims at ${fmt(wrap(p.bedMin - s.bedtime.lead))}`
          : when;
      }
    } else {
      const next = nextRing(s.alarms, now);
      R('label').textContent = DAY_LONG[p.morning.getDay()];
      big.hidden = true;
      t1.hidden = false;
      t1.textContent = 'No alarm.';
      const when = next && relativeDay(next.at, now) === 'Tomorrow' ? 'tomorrow' : next ? DAY_LONG[next.at.getDay()] : '';
      R('sub').textContent = next ? `Next one ${when}, ${fmt(next.alarm.h * 60 + next.alarm.m)}.` : 'Sleep in. Add an alarm any time.';
    }
    const text = tonightNote(p);
    note.hidden = !text;
    note.textContent = text;

    // the tile shows the alarm that rings next (or the first one)
    const next = nextRing(s.alarms, now);
    tileAlarm = next?.alarm || s.alarms[0] || null;
    if (tileAlarm) {
      const a = tileAlarm;
      const extra = s.alarms.length > 1 ? ` · ${s.alarms.length} alarms` : '';
      R('days').textContent = `Wake · ${daysLabel(a.days)}${extra}`;
      R('time').textContent = fmt(a.h * 60 + a.m);
      R('time').classList.toggle('off', !a.on);
      R('aic').classList.toggle('on', a.on);
      sw.hidden = false;
      sw.set(a.on);
    } else {
      R('days').textContent = 'Wake';
      R('time').textContent = 'No alarm';
      R('time').classList.add('off');
      R('aic').classList.remove('on');
      sw.hidden = true;
    }
  }

  /* ---------- eyes in the header follow the device ---------- */
  function syncEyes() {
    if (!active) return;
    const st = services.device.status();
    const stage = ctx.stage;
    if (st.mode === 'sleep' || st.mode === 'off') {
      if (stage.mode !== 'sleep') stage.sleep();
    } else {
      const mood = planFor(store.state.alarms, clock.now()).phase === 'evening' ? 'evening' : 'day';
      if (stage.mode !== 'idle' || stage.mood !== mood) stage.rest(mood);
      stage.usePool(mood === 'evening' ? null : 'calm', [4000, 9000]);
      if (st.mode === 'alarm') stage.run('startle');
    }
    stage.alpha.set(st.mode === 'off' ? 0.35 : 1, 200, 28);
  }


  const screen = {
    el: root,
    kind: 'home',
    goPage,
    enter() {
      active = true;
      stageTo(anchor);
      syncEyes();
      renderTonight();
      renderNight();
      requestAnimationFrame(() => { if (cur < 0) goPage(page ?? defaultPage()); });
      const on = (type, fn) => { addEventListener(type, fn); subs.push(() => removeEventListener(type, fn)); };
      subs.push(
        store.on(['alarms', 'bedtime', 'display', 'privacy'], (st, keys) => {
          renderTonight();
          if (keys.includes('display') || keys.includes('privacy')) renderNight();
        }),
        services.device.on('mode', syncEyes),
        services.device.on('status', syncEyes),
        clock.onChange(() => { renderTonight(); goPage(defaultPage()); syncEyes(); }),
      );
      on('offhours:nights', () => { renderNight(); renderTonight(); });
      on('offhours:room', renderTonight);
      const iv = setInterval(renderTonight, 20000);
      subs.push(() => clearInterval(iv));
    },
    leave() {
      active = false;
      subs.splice(0).forEach((u) => u());
    },
    destroy() { nightEyes?.destroy(); },
  };
  return screen;
}
