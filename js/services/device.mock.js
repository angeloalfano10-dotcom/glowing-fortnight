// Simulated NOCTIS. Behaves like the real device would over BLE and Wi-Fi:
// latency, a scan, pairing steps, 2.4 GHz networks, a wrong-password error,
// firmware updates and night estimates. Its memory lives in its own storage key,
// separate from the app, as if it were another machine.

import { storage } from './storage.local.js';
import { clock, plan, dayKey, addDays, tonightAlarm } from '../lib/time.js';

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

const fresh = () => ({ paired: false, id: null, firmware: FIRMWARE, wifi: null, config: {}, briefing: null, routine: null });

// Small seeded random so the same night always gives the same estimate.
function seeded(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * One night of estimates, as NOCTIS would report it from room sensing.
 * Times are "night minutes": minutes since the evening's midnight, so 23:40 is
 * 1420 and 07:10 the next morning is 1870. The simulation has real structure in
 * it (warmer rooms mean more restless spells, later nights a little more
 * snoring, free mornings run later) so the insights have something to find.
 */
function simulateNight(morning, wakeFor) {
  const key = dayKey(morning);
  const r = seeded(`night:${key}`);
  const ring = wakeFor(morning); // alarm minute that morning, or null for a free morning
  const wake = 1440 + (ring != null ? ring + Math.round(r() * 7) : 505 + Math.round(r() * 70));
  const target = ring != null ? 1440 + ring - 450 : 1440 + 15;
  const lateness = ring != null ? Math.round(-14 + r() * 62 + (r() < 0.2 ? 35 : 0)) : Math.round(10 + r() * 50);
  const asleep = target + lateness;
  const span = wake - asleep;

  // room: cools through the night, warms again before morning
  const T0 = 20.2 + r() * 3;
  const temps = [];
  for (let t = asleep - 30; t <= wake; t += 15) {
    const p = (t - asleep) / span;
    temps.push({ t, v: round1(T0 + 0.75 * Math.cos(2 * Math.PI * p * 0.85) + (r() - 0.5) * 0.16) });
  }
  const tempAt = (t) => temps.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).v;
  const inNight = temps.filter((x) => x.t >= asleep && x.t <= wake).map((x) => x.v);

  // restless spells: more in a warm room, and when it warms
  const restlessMin = Math.round(8 + r() * 10 + Math.max(0, T0 - 21.3) * 24);
  const n = Math.floor(span / 10);
  const weight = Array.from({ length: n }, (_, i) => 0.35 + Math.max(0, tempAt(asleep + i * 10 + 5) - (T0 - 0.2)) * 1.6 + r() * 0.6 + (i < 2 ? 0.4 : 0));
  const chosen = new Set();
  let k = Math.min(n - 4, Math.round(restlessMin / 10));
  while (k > 0) {
    let best = -1;
    weight.forEach((w, i) => { if (!chosen.has(i) && (best < 0 || w > weight[best])) best = i; });
    if (best < 0) break;
    chosen.add(best);
    weight[best] = -1;
    k--;
    const nb = best + (r() < 0.5 ? 1 : -1);
    if (k > 0 && nb >= 0 && nb < n && !chosen.has(nb) && r() < 0.55) { chosen.add(nb); weight[nb] = -1; k--; }
  }

  // snoring: a few short spells in the middle of the night, a bit more after late nights
  let snore = r() < 0.18 ? 0 : 3 + r() * 13;
  if (lateness > 35) snore += 6 + r() * 5;
  snore = Math.round(snore);
  const spells = [];
  const count = snore ? Math.min(4, 1 + Math.floor(snore / 6)) : 0;
  for (let i = 0; i < count; i++) {
    const len = Math.max(2, Math.round(snore / count));
    const start = asleep + 110 + Math.round(((i + r() * 0.7) / count) * 200);
    spells.push({ start, end: start + len });
  }

  const buckets = Array.from({ length: n }, (_, i) => {
    const t = asleep + i * 10;
    return { t, restless: chosen.has(i), snore: spells.some((s) => s.start < t + 10 && s.end > t) };
  });
  return {
    date: key,
    dow: morning.getDay(),
    alarm: ring,
    asleep,
    wake,
    sleepMin: Math.round(span - restlessMin * 0.55 - r() * 6),
    restlessMin,
    snoringMin: snore,
    spells,
    buckets,
    temps,
    roomTemp: round1(inNight.reduce((a, b) => a + b, 0) / inNight.length),
    tempMin: Math.min(...inNight),
    tempMax: Math.max(...inNight),
    humidity: Math.round(40 + r() * 15),
    light: 'Dark',
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
    const alarms = mem.config.alarms;
    if (!alarms) return 'idle';
    if (plan(tonightAlarm(alarms, clock.now()), clock.now()).phase === 'night') return 'sleep';
    return mem.config.face === 'clock' ? 'clock' : 'idle';
  }

  // The routine NOCTIS has seen, used to simulate past nights. Fixed at the first
  // sync, so editing an alarm today does not rewrite history.
  function wakeFor(date) {
    const routine = mem.routine || [{ h: 7, m: 0, on: true, days: [1, 2, 3, 4, 5] }];
    const mins = routine.filter((a) => a.on && a.days.includes(date.getDay())).map((a) => a.h * 60 + a.m);
    return mins.length ? Math.min(...mins) : null;
  }
  /** The morning that ended the most recent complete night. */
  function lastMorning(now) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const w = wakeFor(today) ?? 9 * 60;
    return now.getTime() >= today.getTime() + (w + 10) * 60000 ? today : addDays(today, -1);
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
      if (patch.alarms && !mem.routine) mem.routine = patch.alarms.map(({ h, m, on, days }) => ({ h, m, on, days }));
      save();
      emit('mode');
    },

    async nights(count, now) {
      await jitter(120, 260);
      if (!mem.paired || !flags.nights) return [];
      if (mem.config.privacy && !mem.config.privacy.roomSensing) return [];
      const last = lastMorning(now);
      return Array.from({ length: count }, (_, i) => simulateNight(addDays(last, -i), wakeFor));
    },

    async room() {
      await jitter(60, 140);
      const now = clock.now();
      const h = now.getHours() + now.getMinutes() / 60;
      const r = seeded(`room:${dayKey(now)}:${now.getHours()}`);
      return {
        temp: round1(21.6 + 1.1 * Math.sin(((h - 12) / 24) * 2 * Math.PI) + (r() - 0.5) * 0.3),
        humidity: Math.round(45 + r() * 7),
        light: h >= 7.5 && h < 18.5 ? 'Bright' : h >= 18.5 && h < 22 ? 'Dim' : 'Dark',
      };
    },

    async deleteSleepData() {
      ensure();
      await jitter(400, 700);
      flags.nights = false;
      saveFlags();
      emit('status');
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
