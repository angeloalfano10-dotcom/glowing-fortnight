// offhours: companion app for NOCTIS.
// Boot: theme, phone frame on desktop, navigation, device sync, night data,
// the evening briefing, splash, and the first screen.

import { $ } from './lib/dom.js';
import { ctx } from './ctx.js';
import { store } from './lib/store.js';
import { clock, tonightAlarm, fmtClock } from './lib/time.js';
import { services } from './services/index.js';
import { buildBriefing } from './services/briefing.js';
import { StageEyes } from './ui/eyes.js';
import { measureColon } from './ui/device-view.js';
import { mountStack, setRoot, push, top } from './ui/stack.js';
import { mountSheets, closeAllSheets } from './ui/sheet.js';
import { mountIsland, island } from './ui/island.js';
import { createHome } from './screens/home.js';
import { createSleep } from './screens/sleep.js';
import { createAlarms } from './screens/alarms.js';
import { createNoctis } from './screens/noctis.js';
import { createOnboarding } from './screens/onboarding.js';
import { createUpdate } from './screens/update.js';
import { openAlarmSheet } from './screens/alarm.js';
import { openDemo } from './screens/demo.js';
import { playSplash } from './screens/splash.js';

const html = document.documentElement;
const app = $('#app');
const frame = $('#frame');
const stack = $('#stack');

/* ---------- phone frame on desktop ---------- */
function decideFrame() {
  const q = new URLSearchParams(location.search).get('frame');
  if (q === '0') return false;
  if (q === '1') return true;
  if (matchMedia('(display-mode: standalone)').matches || navigator.standalone) return false;
  return matchMedia('(hover: hover) and (pointer: fine)').matches && innerWidth >= 600;
}
const framed = decideFrame();
html.classList.toggle('framed', framed);
function fitFrame() {
  if (!framed) { frame.style.transform = ''; return; }
  const k = Math.min(1, (innerHeight - 48) / 868, (innerWidth - 32) / 414);
  frame.style.transform = `translate(-50%, -50%) scale(${k})`;
}
addEventListener('resize', fitFrame);
fitFrame();
if (framed) {
  const t = $('[data-sim-time]');
  const tick = () => { t.textContent = fmtClock(clock.now(), true).replace(/^0/, ''); };
  tick();
  setInterval(tick, 5000);
  clock.onChange(tick);
}

/* ---------- look: theme × light/dark ---------- */
const darkQ = matchMedia('(prefers-color-scheme: dark)');
function applyLook() {
  const d = store.state.display;
  const scheme = d.appearance === 'auto' ? (darkQ.matches ? 'dark' : 'light') : d.appearance;
  html.dataset.theme = d.theme;
  html.dataset.scheme = scheme;
  const bg = getComputedStyle(html).getPropertyValue('--bg').trim();
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg || '#121311'));
}
applyLook();
store.on('display', applyLook);
darkQ.addEventListener?.('change', applyLook);

/* ---------- mounts ---------- */
mountStack(stack, app);
mountSheets(app, stack);
mountIsland(app);
ctx.root = app;
ctx.framed = framed;
ctx.stage = new StageEyes(app);
document.addEventListener('touchstart', () => {}, { passive: true }); // :active on iOS

/** What every device render needs to know. */
ctx.deviceSource = () => {
  const s = store.state;
  return { alarm: tonightAlarm(s.alarms, clock.now()), clock24: s.display.clock24, brightness: s.display.brightness, face: s.display.face };
};

/* ---------- navigation ---------- */
const pushOnce = (kind, make) => { if (top()?.kind !== kind) push(make()); };
ctx.go = {
  home: ({ page } = {}) => { store.patch('setup', { done: true }); closeAllSheets(); setRoot(createHome({ page })); },
  sleep: (opts) => pushOnce('sleep', () => createSleep(opts)),
  alarms: () => pushOnce('alarms', createAlarms),
  noctis: () => {
    if (!services.device.status().paired) { island('Pair NOCTIS first', 'info'); return; }
    pushOnce('noctis', createNoctis);
  },
  update: () => push(createUpdate()),
  onboarding: (start = 'welcome') => { closeAllSheets(); setRoot(createOnboarding({ start })); },
  alarm: (id) => openAlarmSheet(id),
  demo: () => openDemo(),
  splash: () => start({ replay: true }),
};
/** Back to home (keeping it if it is already the root), for demo jumps. */
ctx.ensureHome = () => {
  store.patch('setup', { done: true });
  closeAllSheets();
  if (top()?.kind !== 'home') setRoot(createHome());
};

/* ---------- settings → NOCTIS ---------- */
let syncT = 0;
function pushConfig() {
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    const s = store.state;
    if (!services.device.status().connected) return;
    services.device.configure({
      name: s.device.name,
      finish: s.device.finish,
      theme: s.display.theme,
      face: s.display.face,
      dimWithRoom: s.display.dimWithRoom,
      alarms: s.alarms,
      bedtime: s.bedtime,
      brightness: s.display.brightness,
      clock24: s.display.clock24,
      sound: s.sound,
      privacy: s.privacy,
      autoUpdate: s.updates.auto,
    }).catch(() => { /* resent on reconnect */ });
  }, 200);
}
store.on(['device', 'display', 'alarms', 'bedtime', 'sound', 'privacy', 'updates'], pushConfig);
pushConfig();

/* ---------- nights and the room ---------- */
ctx.nights = null;
ctx.room = null;
let nightsBusy = 0;
ctx.refreshNights = async () => {
  const mine = ++nightsBusy;
  const list = await services.device.nights(14, clock.now());
  if (mine !== nightsBusy) return;
  ctx.nights = list;
  if (list.length) ctx.sleepCleared = false;
  dispatchEvent(new Event('offhours:nights'));
};
ctx.refreshRoom = async () => {
  if (!services.device.status().connected) return;
  ctx.room = await services.device.room();
  dispatchEvent(new Event('offhours:room'));
};
store.on('privacy', (s, k) => ctx.refreshNights());
clock.onChange(() => { ctx.refreshNights(); ctx.refreshRoom(); });
setInterval(() => ctx.refreshRoom(), 5 * 60e3);

/* ---------- tomorrow's briefing ----------
   NOCTIS is on Wi-Fi and syncs its briefing by itself (calendar, weather, alarm).
   The app keeps a local copy of the same briefing only to mirror what NOCTIS
   shows and says (the device preview, Ask NOCTIS answers, the alarm heads-up). */
let building = 0;
ctx.rebuildBriefing = async () => {
  const mine = ++building;
  const b = await buildBriefing({ state: store.state, services, now: clock.now() });
  if (mine !== building) return;
  ctx.briefing = b;
  dispatchEvent(new Event('offhours:briefing'));
};
let rbT = 0;
const rebuildSoon = () => { clearTimeout(rbT); rbT = setTimeout(() => ctx.rebuildBriefing(), 300); };
store.on(['alarms', 'location', 'display'], rebuildSoon);
clock.onChange(rebuildSoon);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  rebuildSoon();
  ctx.refreshRoom();
});

/* ---------- NOCTIS events → quiet confirmations ---------- */
let lastMode = services.device.status().mode;
let lastOnline = services.device.status().connected;
let lastPaired = services.device.status().paired;
services.device.on('mode', (st) => {
  if (st.mode !== lastMode) {
    if (st.mode === 'alarm') island('Alarm ringing on NOCTIS', 'alarm');
    else if (st.mode === 'briefing' && lastMode === 'alarm') island('Stopped. Briefing playing', 'sun');
    lastMode = st.mode;
  }
});
services.device.on('status', (st) => {
  if (st.paired && lastPaired && st.connected !== lastOnline) {
    island(st.connected ? 'NOCTIS is back online' : 'NOCTIS is offline', st.connected ? 'check' : 'info');
    if (st.connected) { pushConfig(); ctx.refreshRoom(); }
  }
  if (st.paired && !lastPaired) { pushConfig(); setTimeout(() => { ctx.refreshNights(); ctx.refreshRoom(); }, 400); }
  lastOnline = st.connected;
  lastPaired = st.paired;
});

/* ---------- unpair / start over ---------- */
function resetKeepingLook() {
  const { display, location } = store.state;
  store.reset();
  store.set('display', display);
  store.set('location', location);
}
ctx.unpaired = () => {
  ctx.stage.sleep();
  island('NOCTIS unpaired', 'info');
  resetKeepingLook();
  ctx.briefing = null;
  ctx.nights = [];
  setTimeout(() => ctx.go.onboarding('welcome'), 700);
};
ctx.startOver = () => {
  services.storage.clear();
  try { sessionStorage.clear(); } catch { /* ignore */ }
  location.reload();
};

/* ---------- start ---------- */
async function start({ replay = false } = {}) {
  closeAllSheets();
  const first = !store.state.setup.done || !services.device.status().paired;
  const sp = await playSplash(app, ctx.stage, { short: !first && !replay });
  if (first && !replay) setRoot(createOnboarding({ start: 'welcome' }), { fade: false });
  else if (replay && top()) { top().leave?.(); top().enter?.(); }
  else setRoot(createHome(), { fade: false });
  sp.finish();
}

(async () => {
  if (document.fonts?.load) document.fonts.load('600 140px Manrope').then(measureColon).catch(() => {});
  if (!store.state.location) {
    services.weather.guess().then((p) => { if (!store.state.location) store.set('location', p); });
  }
  ctx.rebuildBriefing();
  ctx.refreshNights();
  ctx.refreshRoom();
  await start();
})();

/* ---------- offline support ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}

// Handy when testing from the browser console.
window.offhours = ctx;
