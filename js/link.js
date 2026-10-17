// Link to NOCTIS OS when the app and the device prototype run side by side
// (showcase.html relays these messages between the two frames). On a real phone
// this is the Bluetooth / Wi-Fi channel; here it is postMessage.
//   app → device: alarm, screen theme, resting face, brightness
//   device → app: alarm changes made on NOCTIS, and what its screen is showing

import { store } from './lib/store.js';
import { clock, tonightAlarm, planFor } from './lib/time.js';
import { services } from './services/index.js';

const embedded = window.parent !== window;
// Alarm sync is last-writer-wins: every alarm change carries the time it was made,
// and a side only accepts a change newer than its own. No echo, no ping-pong.
let alarmT = 0;
let applying = false;
const out = (m) => { try { parent.postMessage({ source: 'offhours', ...m }, '*'); } catch { /* not reachable */ } };

/** Push the settings NOCTIS cares about. Cheap to call often. */
export function sendConfig() {
  if (!embedded) return;
  const s = store.state;
  const t = tonightAlarm(s.alarms, clock.now());
  out({
    type: 'config',
    alarm: { h: t.h, m: t.m, on: t.on, at: alarmT },
    theme: s.display.theme,
    face: s.display.face,
    brightness: s.display.brightness,
    online: services.device.status().connected,
  });
}

// What NOCTIS shows, mapped to the modes the app's device mirror understands.
const MODE = { boot: 'boot', idle: 'idle', clock: 'clock', sleep: 'sleep', alarm: 'alarm', briefing: 'briefing', voice: 'voice', controls: 'idle', picker: 'idle' };

function onAlarm(d) {
  if (!(d.at > alarmT)) return;
  const now = clock.now();
  const t = tonightAlarm(store.state.alarms, now);
  const src = t.source || store.state.alarms[0];
  if (!src) return;
  applying = true;
  alarmT = d.at;
  if (d.on) {
    if (t.on && t.h === d.h && t.m === d.m) { applying = false; return; }
    const day = planFor(store.state.alarms, now).morning.getDay();
    store.set('alarms', store.state.alarms.map((a) => (a.id === src.id
      ? { ...a, h: d.h, m: d.m, on: true, days: a.days.includes(day) ? a.days : [...a.days, day] }
      : a)));
  } else if (t.on) {
    store.set('alarms', store.state.alarms.map((a) => (a.id === src.id ? { ...a, on: false } : a)));
  }
  applying = false;
}

export function startLink() {
  if (!embedded) return;
  addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.source !== 'noctis') return;
    if (d.type === 'ready') sendConfig();
    else if (d.type === 'alarm') onAlarm(d);
    else if (d.type === 'mode') services.device.mirror?.(MODE[d.mode] || 'idle');
  });
  store.on('alarms', () => { if (!applying) alarmT = Date.now(); sendConfig(); });
  store.on('display', sendConfig);
  services.device.on('status', sendConfig);
  out({ type: 'ready' });
}
