// Scroll-wheel picker. Uses native scrolling with scroll-snap, so on iPhone it has
// real iOS momentum. Looping wheels repeat their values and quietly re-centre
// when the scroll comes to rest.

import { clamp } from '../lib/spring.js';

const ROW = 64;
const REPEAT = 9;

/**
 * @param {{values:string[], index?:number, loop?:boolean, label:string, cls?:string,
 *          onChange?:(i:number)=>void, onSettle?:(i:number)=>void}} o
 */
export function createWheel({ values, index = 0, loop = true, label, cls = '', onChange, onSettle }) {
  const n = values.length;
  const copies = loop ? REPEAT : 1;
  const mid = loop ? Math.floor(REPEAT / 2) : 0;
  const el = document.createElement('div');
  el.className = `wheel ${cls}`;
  el.tabIndex = 0;
  el.setAttribute('role', 'spinbutton');
  el.setAttribute('aria-label', label);
  const padTop = document.createElement('div');
  padTop.className = 'pad';
  el.append(padTop);
  const items = [];
  for (let c = 0; c < copies; c++) {
    values.forEach((v, i) => {
      const d = document.createElement('div');
      d.className = 'it';
      d.textContent = v;
      d.dataset.i = String(c * n + i);
      el.append(d);
      items.push(d);
    });
  }
  const padBot = document.createElement('div');
  padBot.className = 'pad';
  el.append(padBot);

  let current = index;
  let raf = 0;
  let settleT = 0;
  let ready = false;

  const posOf = (row) => row * ROW;
  const rowNow = () => el.scrollTop / ROW;

  function paint() {
    raf = 0;
    const r = rowNow();
    const lo = Math.max(0, Math.floor(r) - 4);
    const hi = Math.min(items.length - 1, Math.ceil(r) + 4);
    for (let i = lo; i <= hi; i++) {
      const d = items[i];
      const off = i - r;
      const a = Math.abs(off);
      d.style.transform = `translateY(${off * off * Math.sign(off) * -3}px) scale(${1 - Math.min(a, 3) * 0.075})`;
      d.style.opacity = String(clamp(1 - a * 0.32, 0, 1));
      d.classList.toggle('sel', a < 0.5);
    }
    const idx = ((Math.round(r) % n) + n) % n;
    if (ready && idx !== current) {
      current = idx;
      el.setAttribute('aria-valuenow', String(idx));
      el.setAttribute('aria-valuetext', values[idx]);
      onChange?.(idx);
    }
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

  function settle() {
    const row = Math.round(rowNow());
    if (loop) {
      const want = mid * n + (((row % n) + n) % n);
      if (Math.abs(want - row) >= n) el.scrollTop = posOf(want);
    }
    paint();
    onSettle?.(current);
  }

  el.addEventListener('scroll', () => {
    schedule();
    clearTimeout(settleT);
    settleT = setTimeout(settle, 140);
  }, { passive: true });

  // Mouse drag on desktop (touch uses native scrolling).
  let drag = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    drag = { y: e.clientY, top: el.scrollTop, moved: false };
    el.style.scrollSnapType = 'none';
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const k = el.getBoundingClientRect().height / el.offsetHeight || 1;
    const dy = (e.clientY - drag.y) / k;
    if (Math.abs(dy) > 3) drag.moved = true;
    el.scrollTop = drag.top - dy;
  });
  const endDrag = () => {
    if (!drag) return;
    drag = null;
    el.style.scrollSnapType = '';
    el.scrollTo({ top: posOf(Math.round(rowNow())), behavior: 'smooth' });
  };
  el.addEventListener('pointerup', endDrag);
  el.addEventListener('pointercancel', endDrag);

  // Tap a neighbouring value to move to it.
  el.addEventListener('click', (e) => {
    const it = e.target.closest('.it');
    if (!it) return;
    el.scrollTo({ top: posOf(Number(it.dataset.i)), behavior: 'smooth' });
  });

  el.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    const row = Math.round(rowNow()) + (e.key === 'ArrowDown' ? 1 : -1);
    el.scrollTo({ top: posOf(loop ? row : clamp(row, 0, n - 1)), behavior: 'smooth' });
  });

  const api = {
    el,
    get value() { return current; },
    set(i, smooth = false) {
      const row = mid * n + i;
      current = i;
      el.setAttribute('aria-valuenow', String(i));
      el.setAttribute('aria-valuetext', values[i]);
      if (smooth) el.scrollTo({ top: posOf(row), behavior: 'smooth' });
      else el.scrollTop = posOf(row);
      schedule();
    },
    /** Call once the wheel is in the DOM and laid out. */
    mount() {
      api.set(current);
      requestAnimationFrame(() => { api.set(current); ready = true; });
    },
  };
  return api;
}
