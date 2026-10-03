// Simulated NOCTIS. Behaves like the real device would over BLE and Wi-Fi:
// latency, a scan, pairing steps, 2.4 GHz networks, a wrong-password error,
// firmware updates and night estimates. Its memory lives in its own storage key,
// separate from the app, as if it were another machine.

import { storage } from './storage.local.js';
import { clock, plan, dayKey, addDays } from '../lib/time.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const jitter = (a, b) => wait(a + Math.random() * (b - a));

export class DeviceError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

const NETWORKS = [
  { ssid: 'Home', secure: true, signal: 3 },
  { ssid: 'Home Guest', secure: false, signal: 3 },
  { ssid: 'Studio 2.4', secure: true, signal: 2 },
  { ssid: 'Vodafone-7A21', secure: true, signal: 1 },
];

const FIRMWARE = '0.4.0';
const NEXT = { version: '0.5.0', notes: ['Softer light at wake-up.', 'The briefing starts sooner after Stop.'] };

const fresh = () => ({ paired: false, id: null, firmware: FIRMWARE, wifi: null, config: {}, briefing: null });

// Small seeded random so the same night always gives the same estimate.
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** @returns {import('./contracts.js').DeviceService & { simulate:Function, setOnline:Function, flags:Object }} */
export function createMockDevice() {
  let mem = { ...fresh(), ...storage.get('mock.device', {}) };
  const flags = { updateAvailable: true, nights: true, ...storage.get('mock.flags', {}) };
  const save = () => storage.set('mock.device', mem);
  const saveFlags = () => storage.set('mock.flags', flags);

  let online = true;
  let override = null; // demo-forced mode
  let overrideT = 0;
  const subs = { status: new Set(), mode: new Set() };
  const emit = (type) => subs[type].forEach((fn) => fn(api.status()));

  function restMode() {
    const alarm = mem.config.alarm;
    if (!alarm) return 'idle';
    return plan(alarm, clock.now()).phase === 'night' ? 'sleep' : 'idle';
  }
  function mode() {
    if (!mem.paired) return 'off';
    if (!online) return 'off';
    return override || restMode();
  }

  const ensure = () => {
    if (!mem.paired) throw new DeviceError('not-paired', 'NOCTIS is not paired.');
    if (!online) throw new DeviceError('offline', 'NOCTIS is offline.');
  };

  const api = {
    kind: 'mock',
    flags,

    status() {
      return { paired: mem.paired, connected: mem.paired && online, mode: mode(), firmware: mem.paired ? mem.firmware : null, wifi: mem.wifi };
    },

    async scan() {
      await jitter(1800, 2600);
      return { id: 'NOCTIS-4F2A', name: 'NOCTIS', rssi: -48 };
    },

    async pair(id, onStep) {
      onStep?.('connecting');
      await jitter(700, 1000);
      onStep?.('securing');
      await jitter(800, 1100);
      mem = { ...fresh(), paired: true, id };
      save();
      online = true;
      emit('status');
      return api.status();
    },

    async wifiNetworks() {
      await jitter(700, 1200);
      return NETWORKS.map((n) => ({ ...n }));
    },

    async joinWifi(ssid, password = '') {
      await jitter(1800, 2400);
      const net = NETWORKS.find((n) => n.ssid === ssid);
      const secure = net ? net.secure : password.length > 0;
      if (secure && password.length < 8) throw new DeviceError('wrong-password', 'Wrong password.');
      mem.wifi = ssid;
      save();
      emit('status');
    },

    async configure(patch) {
      ensure();
      await jitter(60, 160);
      mem.config = { ...mem.config, ...patch };
      save();
      emit('mode');
    },

    async sendBriefing(briefing) {
      ensure();
      await jitter(500, 900);
      mem.briefing = { ...briefing, receivedAt: Date.now() };
      save();
      return { at: Date.now() };
    },

    async nights(count, now) {
      await jitter(150, 350);
      if (!mem.paired || !flags.nights) return [];
      if (mem.config.privacy && !mem.config.privacy.roomSensing) return [];
      const alarm = mem.config.alarm || { h: 7, m: 0 };
      const last = plan(alarm, now).lastWake;
      const out = [];
      for (let i = 0; i < count; i++) {
        const d = addDays(last, -i);
        const r = seeded(dayKey(d));
        out.push({
          date: dayKey(d),
          sleepMin: Math.round(450 + (r() - 0.55) * 70),
          snoringMin: r() < 0.25 ? 0 : Math.round(4 + r() * 22),
          roomTemp: Math.round((20.6 + r() * 2.4) * 10) / 10,
          humidity: Math.round(41 + r() * 14),
        });
      }
      return out;
    },

    async checkUpdate() {
      ensure();
      await jitter(900, 1400);
      if (flags.updateAvailable && mem.firmware !== NEXT.version) return { available: true, ...NEXT };
      return { available: false, version: mem.firmware };
    },

    async installUpdate(onProgress) {
      ensure();
      for (let p = 0; p <= 100; p += 4) {
        onProgress?.(p);
        await wait(p < 60 ? 90 : 140);
      }
      mem.firmware = NEXT.version;
      save();
      emit('status');
      return { version: mem.firmware };
    },

    async unpair() {
      await jitter(600, 900);
      mem = fresh();
      save();
      override = null;
      emit('status');
      emit('mode');
    },

    on(type, fn) {
      subs[type].add(fn);
      return () => subs[type].delete(fn);
    },

    // ---- demo hooks (not part of the contract) ----
    simulate(m) {
      clearTimeout(overrideT);
      override = m === 'rest' ? null : m;
      emit('mode');
      // Transient states end on their own, like on the device. Alarm → (Stop) → briefing.
      const next = { clock: [7500, 'rest'], alarm: [14000, 'briefing'], briefing: [17500, 'rest'], voice: [9000, 'rest'], boot: [4200, 'rest'] }[m];
      if (next) overrideT = setTimeout(() => api.simulate(next[1]), next[0]);
    },
    setOnline(v) {
      online = v;
      emit('status');
      emit('mode');
    },
    setFlag(k, v) {
      flags[k] = v;
      saveFlags();
      if (k === 'updateAvailable' && v && mem.firmware === NEXT.version) { mem.firmware = FIRMWARE; save(); }
      emit('status');
    },
    get briefing() { return mem.briefing; },
    get config() { return mem.config; },
  };

  // The rest mode follows the clock (idle by day, asleep at night).
  let lastRest = restMode();
  setInterval(() => {
    const r = restMode();
    if (r !== lastRest) { lastRest = r; if (!override) emit('mode'); }
  }, 5000);
  clock.onChange(() => { lastRest = restMode(); emit('mode'); });

  return api;
}
