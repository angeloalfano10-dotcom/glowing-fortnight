// The app after setup: five tabs behind a floating Liquid Glass tab bar.
//   Today · Sleep · Alarms · NOCTIS · Profile
// The glass lens behind the current tab follows your finger: press and slide
// across the bar to move between tabs, like iOS. The bar tucks itself smaller
// while you scroll down and comes back when you scroll up.
// Tabs keep their scroll position. Tapping the current tab scrolls it to the top.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { haptic } from '../lib/haptics.js';
import { Spring, onFrame, clamp, prefersReducedMotion } from '../lib/spring.js';
import { staggerIn, EASE_OUT } from '../ui/motion.js';
import { ctx } from '../ctx.js';
import { createToday } from './today.js';
import { createSleep } from './sleep.js';
import { createAlarms } from './alarms.js';
import { createNoctisTab } from './noctis.js';
import { createProfile } from './profile.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'house' },
  { id: 'sleep', label: 'Sleep', icon: 'moon' },
  { id: 'alarms', label: 'Alarms', icon: 'alarm' },
  { id: 'noctis', label: 'NOCTIS', icon: 'device' },
  { id: 'profile', label: 'Profile', icon: 'person' },
];
const MAKE = { today: createToday, sleep: createSleep, alarms: createAlarms, noctis: createNoctisTab, profile: createProfile };

export function createShell({ tab = 'today' } = {}) {
  const root = el(`<section class="screen shell">
      <div class="panels"></div>
      <nav class="tabbar glass" role="tablist" aria-label="Sections">
        <span class="tablens" aria-hidden="true"></span>
        ${TABS.map((t) => `<button class="tab" type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="false" data-tab="${t.id}">${iconStr(t.icon)}<span class="tab-l">${t.label}</span></button>`).join('')}
      </nav>
    </section>`);
  const panelsEl = root.querySelector('.panels');
  const bar = root.querySelector('.tabbar');
  const lens = root.querySelector('.tablens');
  const tabs = [...root.querySelectorAll('.tab')];
  const panels = {};
  let current = null;
  let active = false;

  /* ---------- the glass lens ---------- */
  const x = new Spring(0, 260, 25);
  const lift = new Spring(1, 340, 22);
  let stopLoop = null;
  const tabX = (i) => tabs[i].offsetLeft;
  const idxOf = (id) => TABS.findIndex((t) => t.id === id);
  function draw() {
    const stretch = 1 + clamp(Math.abs(x.vel) / 2600, 0, 0.28);
    lens.style.width = `${tabs[0].offsetWidth}px`;
    lens.style.transform = `translateX(${x.v}px) scale(${lift.v * stretch}, ${lift.v / Math.sqrt(stretch)})`;
  }
  function run() {
    if (stopLoop) return;
    stopLoop = onFrame((t, dt) => {
      x.step(dt);
      lift.step(dt);
      draw();
      if (x.resting && lift.resting) { x.snap(x.t); lift.snap(lift.t); draw(); stopLoop(); stopLoop = null; }
    });
  }
  function moveLens(i, { snap = false } = {}) {
    if (snap || prefersReducedMotion()) { x.snap(tabX(i)); draw(); return; }
    x.set(tabX(i), 260, 25);
    run();
  }

  // Press and slide across the bar.
  let press = null;
  let lastPointer = 0;
  const tabAt = (clientX) => {
    const r = bar.getBoundingClientRect();
    const k = (clientX - r.left) / r.width;
    return clamp(Math.floor(k * TABS.length), 0, TABS.length - 1);
  };
  bar.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    bar.setPointerCapture(e.pointerId);
    press = { x0: e.clientX, i: tabAt(e.clientX), drag: false, over: tabAt(e.clientX) };
    bar.classList.add('pressing');
    lift.set(1.16, 420, 20);
    if (press.i === idxOf(current)) run();
    else { x.set(tabX(press.i), 420, 30); run(); }
  });
  bar.addEventListener('pointermove', (e) => {
    if (!press) return;
    if (!press.drag && Math.abs(e.clientX - press.x0) > 6) press.drag = true;
    if (!press.drag) return;
    const r = bar.getBoundingClientRect();
    const scale = r.width / bar.offsetWidth;
    const w = tabs[0].offsetWidth;
    x.set(clamp((e.clientX - r.left) / scale - w / 2, tabX(0), tabX(TABS.length - 1)), 700, 42);
    run();
    const over = tabAt(e.clientX);
    if (over !== press.over) { press.over = over; haptic(); }
  });
  const release = (e) => {
    if (!press) return;
    const i = press.drag ? press.over : tabAt(e.clientX);
    const wasCurrent = TABS[i].id === current;
    press = null;
    lastPointer = performance.now();
    bar.classList.remove('pressing');
    lift.set(1, 300, 18);
    if (!wasCurrent) haptic();
    select(TABS[i].id, { toTop: wasCurrent });
    moveLens(i);
  };
  bar.addEventListener('pointerup', release);
  bar.addEventListener('pointercancel', (e) => { if (press) release(e); });
  // Keyboard and assistive tech still click the buttons.
  tabs.forEach((b) => b.addEventListener('click', () => {
    if (performance.now() - lastPointer < 500) return;
    select(b.dataset.tab, { toTop: true });
  }));

  /* ---------- tuck the bar while scrolling down ---------- */
  const lastY = new WeakMap();
  panelsEl.addEventListener('scroll', (e) => {
    const sc = e.target;
    if (sc.nodeType !== 1 || !panels[current]?.el.contains(sc)) return;
    const y = sc.scrollTop;
    const dy = y - (lastY.get(sc) ?? y);
    lastY.set(sc, y);
    if (y < 40 || dy < -6) bar.classList.remove('min');
    else if (dy > 6 && y > 90) bar.classList.add('min');
  }, { capture: true, passive: true });

  /* ---------- panels ---------- */
  function ensure(id) {
    if (!panels[id]) {
      const p = MAKE[id](api);
      p.el.id = `panel-${id}`;
      p.el.setAttribute('role', 'tabpanel');
      p.el.setAttribute('aria-labelledby', `tab-${id}`);
      p.el.hidden = true;
      panelsEl.append(p.el);
      panels[id] = p;
    }
    return panels[id];
  }

  function select(id, { toTop = false } = {}) {
    if (!MAKE[id]) return;
    if (id === current) { if (toTop) { panels[id].toTop?.(); bar.classList.remove('min'); } return; }
    const prev = current ? panels[current] : null;
    const next = ensure(id);
    if (active) prev?.leave?.();
    if (prev) prev.el.hidden = true;
    next.el.hidden = false;
    current = id;
    bar.classList.remove('min');
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    if (!press) moveLens(idxOf(id), { snap: !prev });
    if (active) next.enter?.();
    if (prev && !prefersReducedMotion()) {
      next.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE_OUT });
      staggerIn(next.el.querySelectorAll('.ptitle, .pbody > *'), { step: 40, dur: 560, y: 14 });
    }
  }

  const api = {
    select,
    get current() { return current; },
    panel: (id) => panels[id],
  };

  const screen = {
    el: root,
    kind: 'shell',
    select,
    panel: (id) => panels[id],
    get current() { return current; },
    enter() {
      const first = !current;
      active = true;
      ctx.shell = screen;
      if (first) {
        select(tab);
        // First arrival: the cards rise in and the bar floats up.
        requestAnimationFrame(() => {
          moveLens(idxOf(current), { snap: true });
          if (prefersReducedMotion()) return;
          staggerIn(panels[current].el.querySelectorAll('.ptitle, .pbody > *'), { step: 55, delay: 80 });
          bar.animate([{ opacity: 0, transform: 'translateX(-50%) translateY(30px) scale(.9)' }, { opacity: 1, transform: 'translateX(-50%)' }], { duration: 700, delay: 160, easing: 'cubic-bezier(.3,1.25,.5,1)', fill: 'backwards' });
        });
      } else panels[current]?.enter?.();
    },
    leave() {
      active = false;
      panels[current]?.leave?.();
    },
    destroy() {
      stopLoop?.();
      Object.values(panels).forEach((p) => p.destroy?.());
      if (ctx.shell === screen) ctx.shell = null;
    },
  };
  addEventListener('resize', () => { if (current) moveLens(idxOf(current), { snap: true }); });
  return screen;
}
