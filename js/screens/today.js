// Today: what matters now, in the order it matters. The cards reorder through
// the day: last night first in the morning, tonight first in the evening.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { clock, planFor, nextRing, fmtMin, fmtParts, dur, sleepDur, longDate, relativeDay, DAY_LONG, wrap } from '../lib/time.js';
import { makeSwitch, longPress } from '../ui/controls.js';
import { DeviceView } from '../ui/device-view.js';
import { Eyes } from '../ui/eyes.js';
import { nightChart } from '../ui/charts.js';
import { nightInsights, weekInsights, roomNow } from '../services/insights.js';
import { speak, stopSpeaking } from '../lib/speech.js';
import { panel, card } from './common.js';
import { stageInto, stageOutOf } from './stagehelp.js';

const ORDER = {
  morning: ['night', 'brief', 'tonight', 'device'],
  day: ['tonight', 'night', 'brief', 'device'],
  evening: ['tonight', 'brief', 'device', 'night'],
  night: ['tonight', 'device', 'brief', 'night'],
};
const chev = iconStr('chev');

export function createToday(shell) {
  const { store, services } = ctx;
  const logo = el('<button class="logo wordmark" type="button" aria-label="offhours. Press and hold for the demo panel.">offhours</button>');
  longPress(logo, () => ctx.go.demo());
  const P = panel({ cls: 'today', top: logo });
  const h24 = () => store.state.display.clock24;
  const fmt = (m) => fmtMin(m, h24());

  /* ---------- Tonight ---------- */
  const tonight = card('c-tonight');
  tonight.querySelector('.cmain').innerHTML = `
    <div class="clabel"><span data-r="lab">Tonight</span>${chev}</div>
    <div class="ckey" data-r="key"></div>
    <div class="numeral" data-r="big"></div>
    <div class="t1" data-r="t1" hidden></div>
    <div class="t2" data-r="sub"></div>
    <p class="insight" data-r="ins" hidden></p>`;
  tonight.querySelector('.cmain').addEventListener('click', () => shell.select('alarms'));
  const foot = el('<div class="cfoot"><div class="cfoot-t"><span class="cfoot-l">Wind-down reminder</span><span class="cfoot-d" data-r="remind"></span></div></div>');
  const remindSw = makeSwitch({ label: 'Wind-down reminder', checked: store.state.bedtime.remind, onChange: (v) => store.patch('bedtime', { remind: v }) });
  foot.append(remindSw);
  tonight.append(foot);
  const T = (k) => tonight.querySelector(`[data-r="${k}"]`);

  function renderTonight() {
    const s = store.state;
    const now = clock.now();
    const p = planFor(s.alarms, now);
    const big = T('big');
    const ins = T('ins');
    const setBig = (min) => {
      const parts = fmtParts(min, h24());
      big.innerHTML = `${esc(parts.time)}${parts.ampm ? `<span class="ampm">${parts.ampm}</span>` : ''}`;
    };
    ins.hidden = true;
    foot.hidden = true;
    if (p.alarmSet) {
      T('lab').textContent = 'Tonight';
      big.hidden = false;
      T('t1').hidden = true;
      if (p.phase === 'night' && p.minsToBed < -30) {
        T('key').textContent = 'Alarm';
        setBig(p.wakeMin);
        T('sub').textContent = `in ${dur(p.minsToWake)}. NOCTIS has it from here.`;
      } else {
        T('key').textContent = 'Bed by';
        setBig(p.bedMin);
        T('sub').textContent = p.minsToBed > 0 ? `in ${dur(p.minsToBed)} · alarm ${fmt(p.wakeMin)}` : `Now · alarm ${fmt(p.wakeMin)}`;
        const tip = ctx.nights?.length ? weekInsights(ctx.nights.slice(0, 7), { clock24: h24() }).find((i) => i.id === 'bedtime') : null;
        if (tip) { ins.textContent = tip.text; ins.hidden = false; }
        foot.hidden = false;
        T('remind').textContent = s.bedtime.remind ? `NOCTIS dims at ${fmt(wrap(p.bedMin - s.bedtime.lead))}` : 'Off';
        remindSw.set(s.bedtime.remind);
      }
    } else {
      const next = nextRing(s.alarms, now);
      T('lab').textContent = relativeDay(p.morning, now);
      T('key').textContent = '';
      big.hidden = true;
      T('t1').hidden = false;
      T('t1').textContent = 'No alarm.';
      const when = next && relativeDay(next.at, now) === 'Tomorrow' ? 'tomorrow' : next ? `on ${DAY_LONG[next.at.getDay()]}` : '';
      T('sub').textContent = next ? `Next one ${when} at ${fmt(next.alarm.h * 60 + next.alarm.m)}.` : 'Sleep in. Add an alarm any time.';
    }
  }

  /* ---------- Last night ---------- */
  const night = card('c-night');
  night.querySelector('.cmain').addEventListener('click', () => shell.select('sleep'));
  let nightEyes = null;
  function renderNight() {
    const m = night.querySelector('.cmain');
    const list = ctx.nights;
    if (!list) return;
    nightEyes?.destroy();
    nightEyes = null;
    const n = list[0];
    if (!n) {
      const sensing = store.state.privacy.roomSensing;
      m.innerHTML = `<div class="clabel"><span>Last night</span>${chev}</div>
        <div class="cempty"><div class="empty-eyes sm"><div class="eyes-layer"></div></div>
          <div><div class="t1">${sensing ? 'No estimate yet.' : 'Room sensing is off.'}</div>
          <div class="t2">${sensing ? 'NOCTIS estimates after a night in the room.' : 'Turn it on for a sleep estimate.'}</div></div></div>`;
      const host = m.querySelector('.empty-eyes');
      nightEyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 1.5, glow: false });
      nightEyes.snap('sleep', { closed: 1 });
      nightEyes.sleep();
      return;
    }
    const ni = nightInsights(n, list.slice(1, 7), { clock24: h24() });
    m.innerHTML = `<div class="clabel"><span>Last night · estimate</span>${chev}</div>
      <div class="numeral">${esc(sleepDur(n.sleepMin))}</div>`;
    m.append(nightChart(n, { compact: true, clock24: h24() }));
    m.append(el(`<p class="insight">${esc(ni.usual)}</p>`));
  }

  /* ---------- Briefing ---------- */
  const brief = card('c-brief');
  brief.querySelector('.cmain').addEventListener('click', () => ctx.go.briefing());
  const play = el(`<button class="playbtn" type="button" aria-label="Play the briefing">${iconStr('play')}</button>`);
  brief.append(play);
  let speaking = false;
  const setPlay = () => {
    play.innerHTML = iconStr(speaking ? 'stop' : 'play');
    play.setAttribute('aria-label', speaking ? 'Stop' : 'Play the briefing');
    play.classList.toggle('on', speaking);
  };
  play.addEventListener('click', () => {
    if (speaking) { stopSpeaking(); speaking = false; setPlay(); return; }
    const b = ctx.briefing;
    if (!b) return;
    speaking = true;
    setPlay();
    speak(b.speech, { volume: store.state.sound.volume, onend: () => { speaking = false; setPlay(); } });
  });
  function renderBrief() {
    const b = ctx.briefing;
    const now = clock.now();
    const p = planFor(store.state.alarms, now);
    const day = relativeDay(p.morning, now);
    const label = day === 'Tomorrow' ? 'Tomorrow’s briefing' : day === 'Today' ? 'This morning’s briefing' : `${day}’s briefing`;
    const m = brief.querySelector('.cmain');
    if (!b) { m.innerHTML = `<div class="clabel"><span>${esc(label)}</span></div><div class="t2">Getting the forecast</div>`; return; }
    m.innerHTML = `<div class="clabel"><span>${esc(label)}</span></div>
      <div class="t1">${esc(`${b.weather.text}, up to ${b.weather.high}°`)}</div>
      <div class="t2">${esc(b.event ? `${b.event.title} at ${b.event.start}${b.event.beforeAlarm ? ', before your alarm' : ''}` : 'Nothing in the calendar first thing')}</div>
      <div class="caption cstatus">${esc(ctx.briefingStatus())}</div>`;
  }

  /* ---------- Your NOCTIS ---------- */
  const dev = card('c-device');
  const thumb = new DeviceView({ body: true, tappable: false, theme: store.state.display.theme, finish: store.state.device.finish, source: ctx.deviceSource });
  dev.querySelector('.cmain').innerHTML = `
    <div class="drow">
      <div class="dthumb"></div>
      <div class="dinfo">
        <div class="clabel"><span data-r="name"></span>${chev}</div>
        <div class="dstatus"><i class="dot"></i><span data-r="status"></span></div>
        <div class="dstats">
          <div><b data-r="temp">–</b><span>Room</span></div>
          <div><b data-r="hum">–</b><span>Humidity</span></div>
          <div><b data-r="light">–</b><span>Light</span></div>
        </div>
      </div>
    </div>
    <p class="insight" data-r="ins" hidden></p>`;
  dev.querySelector('.dthumb').append(thumb.el);
  dev.querySelector('.cmain').addEventListener('click', () => shell.select('noctis'));
  const D = (k) => dev.querySelector(`[data-r="${k}"]`);
  function renderDevice() {
    const s = store.state;
    const st = services.device.status();
    D('name').textContent = s.device.name;
    D('status').textContent = st.connected ? `Online${s.device.wifi ? ` · ${s.device.wifi}` : ''}` : 'Offline';
    dev.querySelector('.dstatus').classList.toggle('off', !st.connected);
    const r = ctx.room;
    if (r) {
      D('temp').textContent = `${r.temp.toFixed(1)}°`;
      D('hum').textContent = `${r.humidity}%`;
      D('light').textContent = r.light;
    }
    const note = r && ctx.nights?.length ? roomNow(r.temp, ctx.nights.slice(0, 7)) : null;
    D('ins').hidden = !note;
    if (note) D('ins').textContent = note;
    thumb.setTheme(s.display.theme);
    thumb.setFinish(s.device.finish);
  }
  function syncThumb() {
    const mode = services.device.status().mode;
    if (mode !== thumb.mode) thumb.setMode(mode === 'briefing' ? 'briefing' : mode, mode === 'briefing' ? ctx.briefing : undefined);
  }

  /* ---------- header, order ---------- */
  const map = { tonight, night, brief, device: dev };
  let lastPhase = '';
  function renderHeader() {
    const now = clock.now();
    const p = planFor(store.state.alarms, now);
    const h = now.getHours();
    const greet = p.phase === 'night' ? 'Good night' : h < 12 && h >= 4 ? 'Good morning' : h < 18 && h >= 12 ? 'Good afternoon' : 'Good evening';
    P.setTitle(`${greet}.`, greet);
    P.setLabel(longDate(now));
    if (p.phase !== lastPhase) {
      lastPhase = p.phase;
      ORDER[p.phase].forEach((k) => P.body.append(map[k]));
    }
  }
  function renderAll() {
    renderHeader();
    renderTonight();
    renderNight();
    renderBrief();
    renderDevice();
  }
  renderAll();

  const subs = [];
  let active = false;
  return {
    el: P.el,
    toTop: P.toTop,
    enter() {
      active = true;
      renderAll();
      syncThumb();
      stageInto(thumb, { mode: thumb.mode });
      const on = (type, fn) => { addEventListener(type, fn); subs.push(() => removeEventListener(type, fn)); };
      subs.push(
        store.on(['alarms', 'bedtime', 'display', 'device', 'privacy', 'briefing'], () => { renderAll(); }),
        services.device.on('mode', () => { syncThumb(); renderDevice(); }),
        services.device.on('status', () => { renderDevice(); renderBrief(); }),
        clock.onChange(() => { lastPhase = ''; renderAll(); }),
      );
      on('offhours:nights', () => { renderNight(); renderTonight(); renderDevice(); });
      on('offhours:briefing', renderBrief);
      on('offhours:room', renderDevice);
      const iv = setInterval(() => { if (active) { renderHeader(); renderTonight(); renderBrief(); } }, 20000);
      subs.push(() => clearInterval(iv));
    },
    leave() {
      active = false;
      subs.splice(0).forEach((u) => u());
      if (speaking) { stopSpeaking(); speaking = false; setPlay(); }
      stageOutOf(thumb);
    },
    destroy() {
      thumb.destroy();
      nightEyes?.destroy();
    },
  };
}
