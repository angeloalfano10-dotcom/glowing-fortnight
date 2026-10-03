// Line icons, 24 × 24, drawn to match the NOCTIS OS prototype.
import { raw } from '../lib/dom.js';

const S = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICONS = {
  alarm: S('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M5 3.5 2.5 6M19 3.5 21.5 6"/>', 2.2),
  bed: S('<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M7 9V6.5A1.5 1.5 0 0 1 8.5 5h7A1.5 1.5 0 0 1 17 6.5V9"/>', 2.2),
  moon: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1z"/></svg>',
  bell: S('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>', 2.2),
  belloff: S('<path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8M10 21h4M4 4l16 16"/>', 2.2),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  sun: S('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.5 1.5M17.2 17.2l1.5 1.5M5.3 18.7l1.5-1.5M17.2 6.8l1.5-1.5"/>', 2.2),
  sunsm: S('<circle cx="12" cy="12" r="3.4"/><path d="M12 4v1.5M12 18.5V20M4 12h1.5M18.5 12H20M6.4 6.4l1 1M16.6 16.6l1 1M6.4 17.6l1-1M16.6 7.4l1-1"/>', 2.2),
  pulse: S('<rect x="8" y="4" width="8" height="16" rx="2.5"/><path d="M4 9v6M20 9v6"/>', 2.2),
  calendar: S('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  house: S('<path d="M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5"/>'),
  person: S('<circle cx="12" cy="8.2" r="3.7"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>', 2.1),
  lockon: S('<rect x="5" y="10.5" width="14" height="10" rx="2.6"/><path d="M8.3 10.5V8a3.7 3.7 0 0 1 7.4 0v2.5"/>', 2.1),
  wifi1: S('<path d="M12 18.5h.01" stroke-width="3.2"/><path d="M9.2 15.6a4 4 0 0 1 5.6 0" opacity=".9"/><path d="M6.3 12.7a8 8 0 0 1 11.4 0" opacity=".25"/><path d="M3.4 9.7a12 12 0 0 1 17.2 0" opacity=".25"/>'),
  wifi2: S('<path d="M12 18.5h.01" stroke-width="3.2"/><path d="M9.2 15.6a4 4 0 0 1 5.6 0"/><path d="M6.3 12.7a8 8 0 0 1 11.4 0"/><path d="M3.4 9.7a12 12 0 0 1 17.2 0" opacity=".25"/>'),
  wifi3: S('<path d="M12 18.5h.01" stroke-width="3.2"/><path d="M9.2 15.6a4 4 0 0 1 5.6 0"/><path d="M6.3 12.7a8 8 0 0 1 11.4 0"/><path d="M3.4 9.7a12 12 0 0 1 17.2 0"/>'),
  lock: S('<rect x="5.5" y="10.5" width="13" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>'),
  pin: S('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  locate: S('<path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7z"/>'),
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.86l10.6-6.4a1 1 0 0 0 0-1.72L9.5 4.74A1 1 0 0 0 8 5.6z"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>',
  send: S('<path d="M12 19V5M6 11l6-6 6 6"/>', 2.4),
  search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>', 2.2),
  update: S('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>', 2.2),
  info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8h.01"/>', 2.2),
  shield: S('<path d="M12 3.5 5 6v5.5c0 4.4 3 7.9 7 9 4-1.1 7-4.6 7-9V6z"/>'),
  mic: S('<rect x="9" y="3.5" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5"/>'),
  wave: S('<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 11v2"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  palette: S('<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M4 13c4-1 6 1 8 3s5 2 8 0" />'),
  theme: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/>'),
  chev: '<svg class="chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5 6.5 7l-5 5.5"/></svg>',
  back: '<svg viewBox="0 0 13 22" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 2 2 11l9 9"/></svg>',
  close: S('<path d="M6 6l12 12M18 6 6 18"/>', 2.4),
  thermo: S('<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/>'),
  device: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.8" y="3.8" width="16.4" height="16.4" rx="4.6"/><ellipse cx="9.4" cy="12" rx="1.45" ry="1.8" fill="currentColor" stroke="none"/><ellipse cx="14.6" cy="12" rx="1.45" ry="1.8" fill="currentColor" stroke="none"/></svg>',
  plus: S('<path d="M12 5v14M5 12h14"/>', 2.2),
  trash: S('<path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7"/>'),
  cloud: S('<path d="M7 18h10a4 4 0 0 0 .4-8A5.5 5.5 0 0 0 6.7 9.6 4.2 4.2 0 0 0 7 18z"/>'),
  trend: S('<path d="M3.5 16.5 9 11l3.5 3.5L20.5 6.5M15 6.5h5.5V12"/>'),
  chevl: '<svg viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 1.5 1.5 7l5 5.5"/></svg>',
  dot3: S('<circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>'),
};

export const icon = (name) => raw(ICONS[name] || '');
export const iconStr = (name) => ICONS[name] || '';
