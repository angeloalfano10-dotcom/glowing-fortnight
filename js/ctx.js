// Shared app context, filled in by app.js. Screens import this instead of each other.

import { services } from './services/index.js';
import { store } from './lib/store.js';

export const ctx = {
  services,
  store,
  /** @type {import('./ui/eyes.js').StageEyes} */
  stage: null,
  root: null,
  framed: false,
  /** Named navigation, set by app.js: home, noctis, update, onboarding, alarm, demo … */
  go: {},
  /** Latest built briefing for the coming morning. */
  briefing: null,
};
