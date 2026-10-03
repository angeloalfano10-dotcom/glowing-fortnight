// Tomorrow's briefing. Built on the phone every evening and sent to NOCTIS, which
// only displays and speaks it (CLAUDE.md §3). The sleep estimate is added by the
// device itself in the morning, so it is not part of what the phone sends.

import { planFor, fmtMin, longDate, dayKey, pad } from '../lib/time.js';

const spokenClock = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}:${pad(m)}` : `${h} o'clock`;
};
const spokenDur = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const hs = h ? `${h} hour${h > 1 ? 's' : ''}` : '';
  const ms = m ? `${m} minute${m > 1 ? 's' : ''}` : '';
  return [hs, ms].filter(Boolean).join(' ') || 'a moment';
};

/** @returns {import('./contracts.js').Briefing} */
export function composeBriefing({ morning, wakeMin, weather, event, place, clock24 }) {
  const ev = event
    ? {
        title: event.title,
        start: fmtMin(event.startMin, clock24),
        startMin: event.startMin,
        inMin: event.startMin - wakeMin,
        beforeAlarm: event.startMin < wakeMin,
      }
    : null;
  const greeting = wakeMin < 12 * 60 ? 'Good morning.' : 'Good afternoon.';
  const evLine = !ev
    ? 'Your calendar is clear this morning.'
    : ev.beforeAlarm
      ? `${ev.title} starts at ${spokenClock(ev.startMin)}, before your alarm.`
      : `First up, ${ev.title} at ${spokenClock(ev.startMin)}, in ${spokenDur(ev.inMin)}.`;
  const speechParts = [
    `${greeting} It's ${spokenClock(wakeMin)}.`,
    `${weather.text}, ${weather.temp} degrees, up to ${weather.high}.`,
    evLine,
  ];
  return {
    forDate: dayKey(morning),
    wakeAt: fmtMin(wakeMin, clock24),
    greeting,
    dateLine: longDate(morning),
    weather: { ...weather, place: place?.name || '' },
    event: ev,
    speech: speechParts.join(' '),
    speechParts,
    builtAt: Date.now(),
  };
}

export async function buildBriefing({ state, services, now }) {
  const p = planFor(state.alarms, now);
  const [weather, event] = await Promise.all([
    services.weather.morning(state.location, p.morning),
    services.calendar.firstEvent(p.morning),
  ]);
  return composeBriefing({
    morning: p.morning,
    wakeMin: p.wakeMin,
    weather,
    event,
    place: state.location,
    clock24: state.display.clock24,
  });
}
