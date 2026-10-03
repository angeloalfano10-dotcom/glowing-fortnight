// Navigation stack with iOS push and pop, browser history for the back gesture,
// and an interactive edge swipe when installed to the Home Screen.
// A screen is { el, enter?(), leave?(), destroy?() }.

import { prefersReducedMotion } from '../lib/spring.js';
import { sheetsOpen } from './sheet.js';

let stackEl = null;
let rootEl = null;
const screens = [];
const backs = [];
let internal = 0;
const DUR = 500;
const EASE = 'cubic-bezier(.2,.9,.2,1)';

export const top = () => screens[screens.length - 1];
export const depth = () => screens.length;

function onPop() {
  const handler = backs.pop();
  if (!handler) return;
  const animated = internal > 0;
  if (internal) internal--;
  handler(animated);
}

export function mountStack(stack, root) {
  stackEl = stack;
  rootEl = root;
  try { history.replaceState({ d: 0 }, ''); } catch { /* sandboxed */ }
  addEventListener('popstate', onPop);
  setupEdgeSwipe();
}

/** Register a back step (screen push or onboarding step). */
export function enterStep(handler) {
  backs.push(handler);
  try { history.pushState({ d: backs.length }, ''); } catch { /* sandboxed */ }
}
/** In-app back: animates, then lets history catch up. */
export function goBack() {
  if (!backs.length) return;
  internal++;
  try { history.back(); } catch { onPop(); }
}
function resetSteps() {
  backs.length = 0;
  internal = 0;
  try { history.replaceState({ d: 0 }, ''); } catch { /* ignore */ }
}

const clearAnim = (el) => { el.style.transition = ''; el.style.transform = ''; el.style.opacity = ''; };

/** Replace everything with one screen, crossfading. */
export function setRoot(screen, { fade = true } = {}) {
  const old = screens.splice(0);
  resetSteps();
  stackEl.append(screen.el);
  screens.push(screen);
  if (fade && old.length) {
    screen.el.style.opacity = '0';
    void screen.el.offsetWidth;
    screen.el.style.transition = 'opacity .45s ease';
    screen.el.style.opacity = '1';
    setTimeout(() => clearAnim(screen.el), 480);
  }
  old.forEach((s) => s.leave?.());
  screen.enter?.();
  old.forEach((s) => setTimeout(() => { s.destroy?.(); s.el.remove(); }, fade ? 460 : 0));
}

export function push(screen) {
  const prev = top();
  stackEl.append(screen.el);
  screens.push(screen);
  const rm = prefersReducedMotion();
  if (rm) {
    screen.el.style.opacity = '0';
    void screen.el.offsetWidth;
    screen.el.style.transition = 'opacity .25s';
    screen.el.style.opacity = '1';
  } else {
    screen.el.style.transform = 'translateX(100%)';
    void screen.el.offsetWidth;
    screen.el.style.transition = `transform ${DUR}ms ${EASE}`;
    screen.el.style.transform = 'translateX(0)';
    if (prev) {
      prev.el.style.transition = `transform ${DUR}ms ${EASE}`;
      prev.el.style.transform = 'translateX(-28%)';
    }
  }
  prev?.el.classList.add('under');
  prev?.leave?.();
  screen.enter?.();
  setTimeout(() => {
    if (top() !== screen) return;
    prev?.el.classList.add('inert');
    clearAnim(screen.el);
  }, DUR + 20);
  enterStep((animated) => pop(screen, animated));
}

function pop(screen, animated) {
  const i = screens.indexOf(screen);
  if (i < 0) return;
  screens.splice(i, 1);
  const prev = top();
  const rm = prefersReducedMotion();
  if (prev) {
    prev.el.classList.remove('inert', 'under');
    if (animated && !rm) {
      prev.el.style.transition = `transform ${DUR}ms ${EASE}`;
      if (!prev.el.style.transform) prev.el.style.transform = 'translateX(-28%)';
      void prev.el.offsetWidth;
      prev.el.style.transform = 'translateX(0)';
    } else clearAnim(prev.el);
  }
  if (animated && !rm) {
    screen.el.style.transition = `transform ${DUR}ms ${EASE}`;
    screen.el.style.transform = 'translateX(100%)';
  } else if (animated) {
    screen.el.style.transition = 'opacity .25s';
    screen.el.style.opacity = '0';
  }
  screen.leave?.();
  prev?.enter?.();
  setTimeout(() => {
    screen.destroy?.();
    screen.el.remove();
    if (prev && top() === prev) clearAnim(prev.el);
  }, animated ? DUR + 20 : 0);
}

/* ---------- interactive edge swipe (Home Screen app only) ---------- */
function standalone() {
  return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
function setupEdgeSwipe() {
  let sw = null;
  stackEl.addEventListener('touchstart', (e) => {
    if (!standalone() || screens.length < 2 || sheetsOpen() || prefersReducedMotion()) return;
    const t = e.touches[0];
    const R = rootEl.getBoundingClientRect();
    if (t.clientX - R.left > 24) return;
    sw = { x: t.clientX, y: t.clientY, k: R.width / rootEl.offsetWidth || 1, w: rootEl.offsetWidth, dx: 0, t: performance.now(), on: false };
  }, { passive: true });
  stackEl.addEventListener('touchmove', (e) => {
    if (!sw) return;
    const t = e.touches[0];
    const dx = (t.clientX - sw.x) / sw.k;
    const dy = (t.clientY - sw.y) / sw.k;
    if (!sw.on) {
      if (Math.abs(dy) > Math.abs(dx)) { sw = null; return; }
      if (dx < 8) return;
      sw.on = true;
      const cur = top();
      const prev = screens[screens.length - 2];
      sw.cur = cur; sw.prev = prev;
      cur.el.style.transition = 'none';
      prev.el.style.transition = 'none';
      prev.el.classList.remove('inert');
    }
    e.preventDefault();
    sw.dx = Math.max(0, dx);
    sw.cur.el.style.transform = `translateX(${sw.dx}px)`;
    sw.prev.el.style.transform = `translateX(${-0.28 * (sw.w - sw.dx)}px)`;
  }, { passive: false });
  const end = () => {
    if (!sw) return;
    const s = sw;
    sw = null;
    if (!s.on) return;
    const v = s.dx / Math.max(1, performance.now() - s.t);
    if (s.dx > s.w * 0.35 || v > 0.45) {
      goBack();
    } else {
      s.cur.el.style.transition = `transform 350ms ${EASE}`;
      s.prev.el.style.transition = `transform 350ms ${EASE}`;
      s.cur.el.style.transform = 'translateX(0)';
      s.prev.el.style.transform = 'translateX(-28%)';
      setTimeout(() => { s.prev.el.classList.add('inert'); clearAnim(s.cur.el); }, 360);
    }
  };
  stackEl.addEventListener('touchend', end);
  stackEl.addEventListener('touchcancel', end);
}
