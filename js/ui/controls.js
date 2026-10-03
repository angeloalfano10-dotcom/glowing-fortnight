// Switch, segmented control, slider and long-press. iOS behaviour, offhours look.

import { haptic } from '../lib/haptics.js';
import { clamp } from '../lib/spring.js';
import { esc } from '../lib/dom.js';

/** iOS-style switch on a real button[role=switch]. */
export function makeSwitch({ checked = false, label, onChange, big = false }) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `switch${big ? ' big' : ''}`;
  b.setAttribute('role', 'switch');
  b.setAttribute('aria-label', label);
  const set = (v) => b.setAttribute('aria-checked', String(!!v));
  set(checked);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    const v = b.getAttribute('aria-checked') !== 'true';
    set(v);
    haptic();
    onChange?.(v);
  });
  b.set = set;
  return b;
}

/** Segmented control with a sliding thumb. */
export function makeSegmented({ options, value, label, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'seg';
  wrap.setAttribute('role', 'radiogroup');
  wrap.setAttribute('aria-label', label);
  wrap.innerHTML = `<span class="seg-thumb"></span>${options
    .map((o) => `<button type="button" role="radio" data-v="${esc(o.value)}">${esc(o.label)}</button>`)
    .join('')}`;
  const thumb = wrap.firstElementChild;
  const btns = [...wrap.querySelectorAll('button')];
  const place = () => {
    const i = Math.max(0, options.findIndex((o) => o.value === value));
    const w = (wrap.clientWidth - 4) / options.length;
    thumb.style.width = `${w}px`;
    thumb.style.transform = `translateX(${i * w}px)`;
    btns.forEach((b, n) => b.setAttribute('aria-checked', String(n === i)));
  };
  btns.forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.v === value) return;
    value = b.dataset.v;
    place();
    haptic();
    onChange?.(value);
  }));
  new ResizeObserver(place).observe(wrap);
  wrap.set = (v) => { value = v; place(); };
  return wrap;
}

/** Horizontal slider, heavy like Control Centre. */
export function makeSlider({ value = 0.5, min = 0.05, label, iconA = '', iconB = '', onChange, onCommit }) {
  const el = document.createElement('div');
  el.className = 'slider';
  el.tabIndex = 0;
  el.setAttribute('role', 'slider');
  el.setAttribute('aria-label', label);
  el.setAttribute('aria-valuemin', '0');
  el.setAttribute('aria-valuemax', '100');
  el.innerHTML = `<div class="slider-fill"></div><span class="slider-ic a">${iconA}</span><span class="slider-ic b">${iconB}</span>`;
  const fill = el.firstElementChild;
  const paint = () => {
    fill.style.width = `${value * 100}%`;
    el.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  };
  const fromX = (x) => {
    const r = el.getBoundingClientRect();
    value = clamp((x - r.left) / r.width, min, 1);
    paint();
    onChange?.(value);
  };
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, v: value };
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = el.getBoundingClientRect();
    value = clamp(drag.v + (e.clientX - drag.x) / r.width, min, 1);
    paint();
    onChange?.(value);
  });
  const end = (e) => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) < 3) fromX(e.clientX);
    drag = null;
    onCommit?.(value);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    value = clamp(value + (e.key === 'ArrowRight' ? 0.05 : -0.05), min, 1);
    paint();
    onChange?.(value);
    onCommit?.(value);
  });
  paint();
  el.set = (v) => { value = v; paint(); };
  return el;
}

/** Press and hold (default 600 ms). Cancels if the finger moves. */
export function longPress(el, fn, { ms = 600, onTap } = {}) {
  let t = 0;
  let start = null;
  let fired = false;
  const cancel = () => { clearTimeout(t); el.classList.remove('holding'); start = null; };
  el.addEventListener('pointerdown', (e) => {
    fired = false;
    start = { x: e.clientX, y: e.clientY };
    el.classList.add('holding');
    t = setTimeout(() => { fired = true; cancel(); haptic(); fn(); }, ms);
  });
  el.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) cancel();
  });
  el.addEventListener('pointerup', () => { const wasHolding = !!start; cancel(); if (wasHolding && !fired) onTap?.(); });
  el.addEventListener('pointercancel', cancel);
  el.addEventListener('pointerleave', cancel);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}
