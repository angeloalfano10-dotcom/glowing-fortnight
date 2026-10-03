// Splash: a dark screen, two closed eyes open, the wordmark arrives, then the
// eyes fly to wherever the app needs them next.

import { el, wait } from '../lib/dom.js';
import { prefersReducedMotion } from '../lib/spring.js';

export async function playSplash(root, stage, { short = false } = {}) {
  const s = el(`<div class="splash" aria-hidden="true">
      <span class="anchor splash-anchor"></span>
      <div class="wordmark splash-word">offhours</div>
    </div>`);
  root.append(s);
  const anchor = s.querySelector('.anchor');
  stage.attach(anchor, { fly: false, eye: 'var(--splash-eye)', glow: 'rgba(250,248,244,.3)' });
  stage.layer.style.setProperty('--lid', 'var(--splash)');
  stage.setMode('awake');
  stage.snap('idle', { closed: 1, op: 1 });
  stage.alpha.snap(0);
  stage.alpha.set(1, 90, 19);
  const rm = prefersReducedMotion();
  await wait(short ? 220 : 420);
  stage.wake();
  await wait(short ? 380 : 620);
  s.classList.add('word-on');
  await wait(short ? 520 : 1000);
  if (!rm) stage.blink();
  await wait(short ? 120 : 260);
  return {
    finish() {
      s.classList.add('out');
      setTimeout(() => s.remove(), 700);
    },
  };
}
