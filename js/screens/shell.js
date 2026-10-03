// The app after setup: four tabs behind a floating tab bar.
//   Today · Sleep · Alarms · NOCTIS
// Tabs keep their scroll position. Tapping the current tab scrolls it to the top.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { haptic } from '../lib/haptics.js';
import { prefersReducedMotion } from '../lib/spring.js';
import { ctx } from '../ctx.js';
import { createToday } from './today.js';
import { createSleep } from './sleep.js';
import { createAlarms } from './alarms.js';
import { createNoctisTab } from './noctis.js';

const TABS = [
  { id: 'today', label: 'Today', icon: 'house' },
  { id: 'sleep', label: 'Sleep', icon: 'moon' },
  { id: 'alarms', label: 'Alarms', icon: 'alarm' },
  { id: 'noctis', label: 'NOCTIS', icon: 'device' },
];
const MAKE = { today: createToday, sleep: createSleep, alarms: createAlarms, noctis: createNoctisTab };
const STEP = 60; // tab width + gap

export function createShell({ tab = 'today' } = {}) {
  const root = el(`<section class="screen shell">
      <div class="panels"></div>
      <nav class="tabbar" role="tablist" aria-label="Sections">
        <span class="tabind" aria-hidden="true"></span>
        ${TABS.map((t) => `<button class="tab" type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="false" aria-label="${t.label}" data-tab="${t.id}">${iconStr(t.icon)}</button>`).join('')}
      </nav>
    </section>`);
  const panelsEl = root.querySelector('.panels');
  const ind = root.querySelector('.tabind');
  const tabs = [...root.querySelectorAll('.tab')];
  const panels = {};
  let current = null;
  let active = false;

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
    if (id === current) { if (toTop) panels[id].toTop?.(); return; }
    const prev = current ? panels[current] : null;
    const next = ensure(id);
    if (active) prev?.leave?.();
    next.el.hidden = false;
    if (prev) prev.el.hidden = true;
    if (prev && !prefersReducedMotion()) {
      next.el.style.opacity = '0';
      void next.el.offsetWidth;
      next.el.style.transition = 'opacity .22s ease';
      next.el.style.opacity = '1';
      setTimeout(() => { next.el.style.transition = ''; next.el.style.opacity = ''; }, 260);
    }
    current = id;
    tabs.forEach((b, i) => {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(on));
      if (on) ind.style.transform = `translateX(${i * STEP}px)`;
    });
    if (active) next.enter?.();
  }

  tabs.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.tab !== current) haptic();
    select(b.dataset.tab, { toTop: true });
  }));

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
      active = true;
      ctx.shell = screen;
      if (!current) select(tab);
      else panels[current]?.enter?.();
    },
    leave() {
      active = false;
      panels[current]?.leave?.();
    },
    destroy() {
      Object.values(panels).forEach((p) => p.destroy?.());
      if (ctx.shell === screen) ctx.shell = null;
    },
  };
  return screen;
}
