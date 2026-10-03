// App settings and state. One plain object, saved to storage on every change,
// with per-key subscriptions.

import { storage } from '../services/storage.local.js';
import { localeUses24h } from './time.js';

const VERSION = 2;

/** A new alarm with calm defaults: light first, then sound, then a quiet pulse. */
export function newAlarm(over = {}) {
  const base = {
    id: `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`,
    h: 7,
    m: 0,
    on: true,
    days: [1, 2, 3, 4, 5],
    wake: { light: true, sound: true, pulse: true },
    lead: 20, // light starts rising this many minutes before
    tone: 'dawn',
  };
  return { ...base, ...over, wake: { ...base.wake, ...(over.wake || {}) } };
}

export const DEFAULTS = () => ({
  v: VERSION,
  setup: { done: false },
  device: { id: null, name: 'Bedroom', finish: 'maple', wifi: null, firmware: null },
  alarms: [newAlarm({ id: 'a1' })],
  bedtime: { remind: true, lead: 30 },
  display: { theme: 'warm', appearance: 'auto', brightness: 0.8, clock24: localeUses24h(), dimWithRoom: true, face: 'eyes' },
  sound: { on: true, volume: 0.6, speak: true },
  privacy: { roomSensing: true, recordings: false, voice: true },
  updates: { auto: true },
  location: null, // { name, lat, lon, auto }
});

function merge(base, over) {
  if (!over || typeof over !== 'object' || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    const b = base?.[k];
    out[k] = b && typeof b === 'object' && !Array.isArray(b) ? merge(b, over[k]) : over[k];
  }
  return out;
}

/** v1 had a single `alarm`; v2 keeps a list. */
function migrate(saved) {
  if (saved.v === 1) {
    const { alarm, ...rest } = saved;
    return { ...rest, v: 2, alarms: [newAlarm({ ...(alarm || {}), id: 'a1' })] };
  }
  return saved;
}

function load() {
  let saved = storage.get('state');
  if (!saved) return DEFAULTS();
  saved = migrate(saved);
  if (saved.v !== VERSION) return DEFAULTS();
  const s = merge(DEFAULTS(), saved);
  s.alarms = (Array.isArray(s.alarms) ? s.alarms : []).map((a) => newAlarm(a));
  return s;
}

let state = load();
const subs = new Set();

function emit(keys) {
  subs.forEach((s) => {
    if (s.keys === '*' || keys.some((k) => s.keys.includes(k))) s.fn(state, keys);
  });
}

export const store = {
  get state() { return state; },
  get(key) { return state[key]; },
  /** Replace a top-level key. */
  set(key, value) {
    state = { ...state, [key]: value };
    storage.set('state', state);
    emit([key]);
  },
  /** Shallow-merge into a top-level object key. */
  patch(key, partial) {
    this.set(key, { ...(state[key] || {}), ...partial });
  },
  /** Add or replace one alarm by id. */
  saveAlarm(alarm) {
    const list = state.alarms.some((a) => a.id === alarm.id)
      ? state.alarms.map((a) => (a.id === alarm.id ? alarm : a))
      : [...state.alarms, alarm];
    this.set('alarms', list.sort((a, b) => a.h * 60 + a.m - (b.h * 60 + b.m)));
  },
  removeAlarm(id) { this.set('alarms', state.alarms.filter((a) => a.id !== id)); },
  /** Subscribe to one or more top-level keys ('*' for all). Returns unsubscribe. */
  on(keys, fn) {
    const s = { keys: keys === '*' ? '*' : [].concat(keys), fn };
    subs.add(s);
    return () => subs.delete(s);
  },
  reset() {
    state = DEFAULTS();
    storage.set('state', state);
    emit(Object.keys(state));
  },
};
