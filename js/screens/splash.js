// Splash: a sunset-dark sky, the moon rises, the wordmark arrives. The app's
// eyes stay asleep until a screen needs them (the device on Today, onboarding).

import { el, wait } from '../lib/dom.js';

export async function playSplash(root, stage, { short = false } = {}) {
  const s = el(`<div class="splash" aria-hidden="true">
      <span class="anchor splash-anchor"></span>
      <i class="splash-moon"></i>
      <div class="wordmark splash-word">offhours</div>
      <div class="splash-line">Own your off hours.</div>
    </div>`);
  root.append(s);
  // The eyes sleep behind the splash and open when a screen first needs them.
  stage.setMode('awake');
  stage.snap('idle', { closed: 1, op: 1 });
  stage.alpha.snap(0);
  await wait(short ? 120 : 260);
  s.classList.add('moon-on');
  await wait(short ? 380 : 700);
  s.classList.add('word-on');
  await wait(short ? 560 : 1250);
  stage.wake();
  return {
    finish() {
      s.classList.add('out');
      setTimeout(() => s.remove(), 700);
    },
  };
}
