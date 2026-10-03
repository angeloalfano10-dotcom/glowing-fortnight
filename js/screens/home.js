// Home: three calm pages, swiped like iOS Weather.
//   Last night (estimate) · Tonight (bed by, alarm) · Tomorrow (briefing preview)
// The header button holds the app's eyes; tap it to open your NOCTIS.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { clock, plan, fmtMin, fmtParts, dur, sleepDur, daysLabel, nextAlarm, relativeDay, DAY_LONG, dayKey } from '../lib/time.js';
import { makeSwitch, longPress } from '../ui/controls.js';
import { DeviceView } from '../ui/device-view.js';
import { Eyes } from '../ui/eyes.js';
import { island } from '../ui/island.js';
import { stageTo } from './stagehelp.js';

const LABELS = ['Last night', 'Tonight', 'Tomorrow'];

export function createHome({ page } = {}) {
  const { store, services } = ctx;
  const root = el(`<section class="screen home">
      <header class="topbar">
        <button class="logo wordmark" type="button" aria-label="offhours">offhours</button>
        <button class="eyesbtn" type="button" aria-label="Your NOCTIS"><span class="anchor" data-lid="var(--surface-solid)"></span></button>
      </header>
      <div class="pager">
        <section class="page p-night" aria-label="Last night"></section>
        <section class="page p-tonight" aria-label="Tonight"></section>
        <section class="page p-tomorrow" aria-label="Tomorrow"></section>
      </div>
      <nav class="dots" aria-label="Pages">
        ${LABELS.map((l, i) => `<button type="button" aria-label="${l}" data-i="${i}"><i></i></button>`).join('')}
      </nav>
    </section>`);
  const pager = root.querySelector('.pager');
  const pages = [...root.querySelectorAll('.page')];
  const dots = [...root.querySelectorAll('.dots button')];
  const anchor = root.querySelector('.eyesbtn .anchor');
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
    previewVisible(i === 2);
  }
  pager.addEventListener('scroll', () => {
    const i = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth));
    setCurrent(Math.max(0, Math.min(2, i)));
  }, { passive: true });
  dots.forEach((d) => d.addEventListener('click', () => goPage(Number(d.dataset.i), true)));

  const defaultPage = () => (plan(store.state.alarm, clock.now()).phase === 'morning' ? 0 : 1);

  /* ---------- Last night ---------- */
  const night = pages[0];
  let nightEyes = null;
  async function renderNight() {
    const s = store.state;
    const sensing = s.privacy.roomSensing;
    const est = sensing ? (await services.device.nights(1, clock.now()))[0] : null;
    if (!active && night.childElementCount) return;
    nightEyes?.destroy();
    nightEyes = null;
    if (est) {
      night.innerHTML = `
        <div class="page-main">
          <div class="hero">
            <div class="label">${iconStr('bed')}<span>Last night · estimate</span></div>
            <div class="numeral">${esc(sleepDur(est.sleepMin))}</div>
            <div class="t1">${est.snoringMin ? `Snoring about ${est.snoringMin} min` : 'No snoring heard'}</div>
            <div class="t2">Room ${est.roomTemp.toFixed(1)}° · ${est.humidity}% humidity</div>
          </div>
        </div>
        <div class="page-foot"><div class="caption">Estimated from sound in the room. Not a measurement.</div></div>`;
      ctx.lastNight = est;
    } else {
      night.innerHTML = `
        <div class="page-main">
          <div class="hero">
            <div class="empty-eyes"><div class="eyes-layer"></div></div>
            <div class="t1">${sensing ? 'No estimate yet.' : 'Room sensing is off.'}</div>
            <div class="t2">${sensing ? 'NOCTIS makes one after a night in the room.' : 'Turn it on in NOCTIS settings for a sleep estimate.'}</div>
          </div>
        </div>
        <div class="page-foot">${sensing ? '' : '<button class="pill ghost small" type="button" data-open>Settings</button>'}</div>`;
      const host = night.querySelector('.empty-eyes');
      nightEyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2 });
      nightEyes.snap('sleep', { closed: 1 });
      nightEyes.sleep();
      night.querySelector('[data-open]')?.addEventListener('click', () => ctx.go.noctis());
      ctx.lastNight = null;
    }
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
      </div>
    </div>
    <div class="page-foot">
      <div class="tile alarm-tile">
        <button class="alarm-open" type="button" aria-label="Edit alarm">
          <span class="circ" data-r="aic">${iconStr('alarm')}</span>
          <span class="alarm-txt"><span class="tl" data-r="days"></span><span class="clockface" data-r="time"></span></span>
        </button>
      </div>
    </div>`;
  const R = (k) => tonight.querySelector(`[data-r="${k}"]`);
  const sw = makeSwitch({
    big: true,
    label: 'Alarm',
    checked: store.state.alarm.on,
    onChange: (v) => {
      store.patch('alarm', { on: v });
      const a = store.state.alarm;
      island(v ? `Alarm on · ${fmtMin(a.h * 60 + a.m, store.state.display.clock24)}` : 'Alarm off', v ? 'alarm' : 'belloff');
    },
  });
  tonight.querySelector('.alarm-tile').append(sw);
  tonight.querySelector('.alarm-open').addEventListener('click', () => ctx.go.alarm());

  function renderTonight() {
    const s = store.state;
    const now = clock.now();
    const h24 = s.display.clock24;
    const p = plan(s.alarm, now);
    const big = R('big');
    const t1 = R('t1');
    if (p.alarmSet) {
      const parts = fmtParts(p.bedMin, h24);
      R('label').innerHTML = `${iconStr('bed')}<span>Bed by</span>`;
      big.hidden = false;
      t1.hidden = true;
      big.innerHTML = `${esc(parts.time)}${parts.ampm ? `<span class="ampm">${parts.ampm}</span>` : ''}`;
      let sub;
      if (p.minsToBed > 0) sub = `in ${dur(p.minsToBed)}`;
      else if (p.minsToBed > -60) sub = 'Now. NOCTIS has the alarm.';
      else sub = `Alarm in ${dur(p.minsToWake)}`;
      R('sub').textContent = sub;
    } else {
      const next = nextAlarm(s.alarm, now);
      R('label').textContent = DAY_LONG[p.morning.getDay()];
      big.hidden = true;
      t1.hidden = false;
      t1.textContent = 'No alarm.';
      R('sub').textContent = !s.alarm.on || !next
        ? 'Alarm is off.'
        : `Next one ${relativeDay(next, now).toLowerCase() === 'tomorrow' ? 'tomorrow' : DAY_LONG[next.getDay()]}, ${fmtMin(s.alarm.h * 60 + s.alarm.m, h24)}.`;
    }
    R('days').textContent = `Wake · ${daysLabel(s.alarm.days)}`;
    R('time').textContent = fmtMin(s.alarm.h * 60 + s.alarm.m, h24);
    R('time').classList.toggle('off', !s.alarm.on);
    R('aic').classList.toggle('on', s.alarm.on);
    sw.set(s.alarm.on);
  }

  /* ---------- Tomorrow ---------- */
  const tomorrow = pages[2];
  tomorrow.innerHTML = `
    <div class="page-main">
      <div class="label" data-b="label"></div>
      <div class="preview"></div>
      <div class="t2 bstatus" data-b="status"></div>
      <div class="caption bnote" data-b="note"></div>
    </div>
    <div class="page-foot pills">
      <button class="pill ghost" type="button" data-play>${iconStr('play')}<span>Play</span></button>
      <button class="pill solid" type="button" data-send><span>Send now</span></button>
    </div>`;
  const B = (k) => tomorrow.querySelector(`[data-b="${k}"]`);
  const preview = new DeviceView({
    body: false,
    theme: store.state.display.theme,
    tappable: true,
    source: () => ({ alarm: store.state.alarm, clock24: store.state.display.clock24, brightness: 1 }),
  });
  tomorrow.querySelector('.preview').append(preview.el);
  const playBtn = tomorrow.querySelector('[data-play]');
  const sendBtn = tomorrow.querySelector('[data-send]');
  let playing = false;
  let showing = false;

  function loopPreview() {
    if (!ctx.briefing) { preview.setMode('idle'); return; }
    preview.playBriefing(ctx.briefing, { loop: true });
  }
  function previewVisible(v) {
    showing = v;
    if (!active) return;
    if (v && !playing) loopPreview();
    if (!v) { playing = false; setPlayLabel(); preview.setMode('idle'); }
  }
  function setPlayLabel() {
    playBtn.innerHTML = playing ? `${iconStr('stop')}<span>Stop</span>` : `${iconStr('play')}<span>Play</span>`;
  }
  playBtn.addEventListener('click', () => {
    if (!ctx.briefing) return;
    if (playing) { playing = false; setPlayLabel(); loopPreview(); return; }
    playing = true;
    setPlayLabel();
    const s = store.state;
    preview.playBriefing(ctx.briefing, {
      speak: s.sound.on && s.sound.speak,
      volume: s.sound.volume,
      onEnd: () => { playing = false; setPlayLabel(); if (showing) loopPreview(); },
    });
  });
  sendBtn.addEventListener('click', () => ctx.sendBriefing({ manual: true }));

  function renderTomorrow() {
    const s = store.state;
    const now = clock.now();
    const p = plan(s.alarm, now);
    const b = ctx.briefing;
    const st = services.device.status();
    B('label').innerHTML = `${iconStr('calendar')}<span>Briefing · ${esc(relativeDay(p.morning, now))}</span>`;
    const sent = s.briefing.forDate === dayKey(p.morning) && s.briefing.wakeMin === p.wakeMin && s.briefing.sentAt;
    let status;
    if (!st.connected) status = 'NOCTIS is offline. It sends when it’s back.';
    else if (sent) status = `On NOCTIS since ${fmtMin(new Date(s.briefing.sentAt).getHours() * 60 + new Date(s.briefing.sentAt).getMinutes(), s.display.clock24)}`;
    else if (now < p.eveningAt) status = `Sends to NOCTIS at ${fmtMin(p.eveningAt.getHours() * 60 + p.eveningAt.getMinutes(), s.display.clock24)}`;
    else status = 'Sending to NOCTIS';
    B('status').textContent = status;
    const notes = [];
    if (b?.event?.beforeAlarm) notes.push(`${b.event.title} starts before your alarm.`);
    if (b?.weather.source === 'sample') notes.push('Sample weather. Live weather loads with a connection.');
    B('note').textContent = notes.join(' ');
    B('note').classList.toggle('accent', !!b?.event?.beforeAlarm);
    sendBtn.disabled = !st.connected || !b;
    sendBtn.innerHTML = sent ? `${iconStr('check')}<span>Sent</span>` : '<span>Send now</span>';
    sendBtn.classList.toggle('ghost', !!sent);
    sendBtn.classList.toggle('solid', !sent);
    playBtn.disabled = !b;
  }

  /* ---------- eyes in the header follow the device ---------- */
  function syncEyes() {
    if (!active) return;
    const st = services.device.status();
    const stage = ctx.stage;
    if (st.mode === 'sleep' || st.mode === 'off') {
      if (stage.mode !== 'sleep') stage.sleep();
    } else {
      const mood = plan(store.state.alarm, clock.now()).phase === 'evening' ? 'evening' : 'day';
      if (stage.mode !== 'idle' || stage.mood !== mood) stage.rest(mood);
      stage.usePool(mood === 'evening' ? null : 'calm', [4000, 9000]);
      if (st.mode === 'alarm') stage.run('startle');
    }
    stage.alpha.set(st.mode === 'off' ? 0.35 : 1, 200, 28);
  }

  function renderAll() {
    renderTonight();
    renderTomorrow();
  }

  const screen = {
    el: root,
    enter() {
      active = true;
      stageTo(anchor);
      syncEyes();
      renderAll();
      renderNight();
      requestAnimationFrame(() => {
        if (cur < 0) goPage(page ?? defaultPage());
        else previewVisible(cur === 2);
      });
      subs.push(
        store.on(['alarm', 'display', 'briefing', 'privacy'], (st, keys) => {
          renderAll();
          if (keys.includes('display')) preview.setTheme(st.display.theme);
          if (keys.includes('privacy') || keys.includes('alarm')) renderNight();
        }),
        services.device.on('mode', () => { syncEyes(); renderTomorrow(); }),
        services.device.on('status', () => { syncEyes(); renderTomorrow(); }),
        clock.onChange(() => { renderAll(); renderNight(); goPage(defaultPage()); syncEyes(); }),
      );
      const onBrief = () => { renderTomorrow(); if (showing && !playing) loopPreview(); };
      addEventListener('offhours:briefing', onBrief);
      subs.push(() => removeEventListener('offhours:briefing', onBrief));
      const iv = setInterval(() => { renderTonight(); renderTomorrow(); }, 20000);
      subs.push(() => clearInterval(iv));
    },
    leave() {
      active = false;
      subs.splice(0).forEach((u) => u());
      preview.setMode('idle');
      playing = false;
      setPlayLabel();
    },
    destroy() {
      preview.destroy();
      nightEyes?.destroy();
    },
    goPage,
  };
  return screen;
}
