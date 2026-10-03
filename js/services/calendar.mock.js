// Simulated calendars. A native app replaces connect() with EventKit permission
// (Apple) or Google OAuth via a small backend, and firstEvent() with a real query.
// NOCTIS only ever needs the first timed event of a morning.

import { storage } from './storage.local.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const PROVIDERS = [
  { id: 'apple', name: 'Apple Calendar' },
  { id: 'google', name: 'Google Calendar' },
];

const CALENDARS = {
  apple: [{ id: 'home', name: 'Home', on: true }, { id: 'family', name: 'Family', on: true }],
  google: [{ id: 'work', name: 'Work', on: true }, { id: 'personal', name: 'Personal', on: true }],
};

// [weekday] → [hour, minute, title, provider, calendar]
const WEEK = {
  1: [[9, 0, 'Design review', 'google', 'work'], [12, 30, 'Lunch with Max', 'google', 'personal']],
  2: [[8, 30, 'Standup', 'google', 'work'], [18, 0, 'Gym', 'apple', 'home']],
  3: [[10, 0, 'Client call', 'google', 'work'], [7, 45, 'School run', 'apple', 'family']],
  4: [[9, 0, 'Design review', 'google', 'work'], [17, 30, 'Gym', 'apple', 'home']],
  5: [[8, 45, 'Dentist', 'apple', 'home'], [11, 0, 'Team retro', 'google', 'work']],
  6: [[10, 30, 'Market', 'apple', 'home']],
  0: [[11, 0, 'Brunch with Nick', 'google', 'personal']],
};

/** @returns {import('./contracts.js').CalendarService & { setEmpty:Function, empty:boolean }} */
export function createMockCalendar() {
  let state = { apple: null, google: null, empty: false, ...storage.get('mock.calendar', {}) };
  const save = () => storage.set('mock.calendar', state);

  return {
    kind: 'mock',
    providers: () => PROVIDERS,

    accounts: () => ({ apple: state.apple, google: state.google }),

    async connect(id) {
      await wait(900 + Math.random() * 500);
      state[id] = {
        account: id === 'apple' ? 'On this iPhone' : 'Demo account',
        calendars: CALENDARS[id].map((c) => ({ ...c })),
      };
      save();
      return state[id];
    },

    async disconnect(id) {
      await wait(300);
      state[id] = null;
      save();
    },

    setCalendar(id, calId, on) {
      const acc = state[id];
      if (!acc) return;
      acc.calendars = acc.calendars.map((c) => (c.id === calId ? { ...c, on } : c));
      save();
    },

    async firstEvent(date) {
      await wait(120);
      if (state.empty) return null;
      const list = (WEEK[date.getDay()] || [])
        .filter(([, , , p, cal]) => state[p]?.calendars.some((c) => c.id === cal && c.on))
        .map(([h, m, title, provider, calendar]) => ({ title, startMin: h * 60 + m, provider, calendar }))
        .sort((a, b) => a.startMin - b.startMin);
      return list[0] || null;
    },

    // demo hook
    get empty() { return state.empty; },
    setEmpty(v) { state.empty = v; save(); },
  };
}
