// App settings and state. One plain object, saved to storage on every change,
// with per-key subscriptions.

import { storage } from '../services/storage.local.js';
import { localeUses24h } from './time.js';

const VERSION = 1;

export const DEFAULTS = () => ({
  v: VERSION,
  setup: { done: false },
  device: { id: null, name: 'Bedroom', finish: 'maple', wifi: null, firmware: null },
  alarm: { h: 7, m: 0, on: true, days: [1, 2, 3, 4, 5], wake: { light: true, sound: true, pulse: true } },
  display: { theme: 'warm', appearance: 'auto', brightness: 0.8, clock24: localeUses24h() },
  sound: { on: true, volume: 0.6, speak: true },
  privacy: { roomSensing: true, recordings: false, voice: true },
  location: null, // { name, lat, lon, auto }
  briefing: { forDate: null, sentAt: null, wakeMin: null },
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

function load() {
  const saved = storage.get('state');
  if (!saved || saved.v !== VERSION) return DEFAULTS();
  return merge(DEFAULTS(), saved);
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
