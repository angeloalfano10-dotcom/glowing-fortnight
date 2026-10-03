// iOS-style motion helpers: things rise into place one after another, numbers
// roll instead of jumping, durations count up. All of it steps aside for
// prefers-reduced-motion.

import { prefersReducedMotion } from '../lib/spring.js';

export const EASE_OUT = 'cubic-bezier(.2, .9, .2, 1)';
export const EASE_SPRING = 'cubic-bezier(.3, 1.3, .5, 1)';

/** Elements rise and fade in, one after another (iOS list appearance). */
export function staggerIn(els, { y = 18, scale = 0.97, step = 50, dur = 620, delay = 0 } = {}) {
  if (prefersReducedMotion()) return;
  [...els].forEach((e, i) => e.animate?.([
    { opacity: 0, transform: `translateY(${y}px) scale(${scale})` },
    { opacity: 1, transform: 'none' },
  ], { duration: dur, delay: delay + i * step, easing: EASE_OUT, fill: 'backwards' }));
}

/** One element pops in with a soft overshoot (a new alarm, a confirmation). */
export function popIn(e, { delay = 0 } = {}) {
  if (prefersReducedMotion() || !e.animate) return;
  e.animate([
    { opacity: 0, transform: 'scale(.9)' },
    { opacity: 1, transform: 'none' },
  ], { duration: 520, delay, easing: EASE_SPRING, fill: 'backwards' });
}

/**
 * iOS numericText: set text so that only the characters that changed roll in.
 * after: trusted HTML appended after the digits (e.g. an AM/PM span).
 */
export function setNumeric(el, text, after = '', { dir = 1 } = {}) {
  const old = el.dataset.num;
  if (old === text && el.dataset.after === after) return;
  el.dataset.num = text;
  el.dataset.after = after;
  const chars = [...text];
  el.innerHTML = chars.map((c) => `<span class="dg">${c === ' ' || c === ' ' ? ' ' : c.replace(/[<>&]/g, '')}</span>`).join('') + after;
  if (old == null || prefersReducedMotion()) return;
  const prev = [...old];
  const spans = el.querySelectorAll('.dg');
  // Align from the right so "9:55" → "10:05" rolls the right digits.
  for (let i = 1; i <= chars.length; i++) {
    if (chars[chars.length - i] === prev[prev.length - i]) continue;
    spans[chars.length - i].animate?.([
      { transform: `translateY(${dir * 42}%)`, opacity: 0 },
      { transform: 'none', opacity: 1 },
    ], { duration: 460, delay: (chars.length - i) * 18, easing: EASE_SPRING, fill: 'backwards' });
  }
}

/** Count a value up to its target, formatting each frame (durations, temperatures). */
export function countTo(el, to, fmt, { from = null, dur = 900 } = {}) {
  const start = from ?? Number(el.dataset.count ?? NaN);
  el.dataset.count = String(to);
  if (prefersReducedMotion() || !Number.isFinite(start) || start === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const ease = (x) => 1 - (1 - x) ** 4;
  const tick = (t) => {
    if (el.dataset.count !== String(to)) return; // a newer target took over
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(Math.round(start + (to - start) * ease(k)));
    if (k < 1) requestAnimationFrame(tick);
  };
  el.textContent = fmt(Math.round(start));
  requestAnimationFrame(tick);
}
