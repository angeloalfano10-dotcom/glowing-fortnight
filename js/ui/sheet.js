// Bottom sheets (iOS card modal: the screen behind scales back) and action sheets.
// Drag the grabber or header down, or pull down from the top of the content, to close.

import { prefersReducedMotion } from '../lib/spring.js';

let root = null;
let stackEl = null;
const open = [];

export function mountSheets(appRoot, stack) {
  root = appRoot;
  stackEl = stack;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open.length) open[open.length - 1].close();
  });
}
export const sheetsOpen = () => open.length > 0;
export function closeAllSheets() { [...open].reverse().forEach((s) => s.close()); }

const scaleOf = () => {
  const r = root.getBoundingClientRect();
  return r.height / (root.offsetHeight || r.height) || 1;
};

/**
 * @param {{content:HTMLElement, head?:HTMLElement, size?:'large'|'auto', label?:string, onClose?:Function}} o
 */
export function openSheet({ content, head = null, size = 'large', label = '', onClose }) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const sheet = document.createElement('div');
  sheet.className = `sheet ${size}`;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  if (label) sheet.setAttribute('aria-label', label);
  sheet.tabIndex = -1;
  const grab = document.createElement('div');
  grab.className = 'grabber';
  grab.innerHTML = '<i></i>';
  const body = document.createElement('div');
  body.className = 'sheet-body';
  body.append(content);
  sheet.append(grab);
  if (head) sheet.append(head);
  sheet.append(body);
  root.append(scrim, sheet);

  const below = open[open.length - 1];
  const large = size === 'large';
  if (large) {
    if (below) below.el.classList.add('behind');
    else stackEl.classList.add('behind');
  }

  let closed = false;
  const api = {
    el: sheet,
    body,
    close() {
      if (closed) return;
      closed = true;
      const i = open.indexOf(api);
      if (i >= 0) open.splice(i, 1);
      sheet.classList.remove('on');
      scrim.classList.remove('on');
      if (large) {
        if (below && open.includes(below)) below.el.classList.remove('behind');
        else if (!open.some((s) => s.el.classList.contains('large'))) stackEl.classList.remove('behind');
      }
      setTimeout(() => { sheet.remove(); scrim.remove(); }, 520);
      onClose?.();
    },
  };
  open.push(api);
  scrim.addEventListener('click', () => api.close());
  requestAnimationFrame(() => requestAnimationFrame(() => {
    scrim.classList.add('on');
    sheet.classList.add('on');
    sheet.focus({ preventScroll: true });
  }));

  // ---- drag to dismiss ----
  let d = null;
  const begin = (y) => {
    d = { y, t: performance.now(), dy: 0, k: scaleOf(), h: sheet.offsetHeight };
    sheet.classList.add('dragging');
    scrim.style.transition = 'none';
  };
  const move = (y) => {
    let dy = (y - d.y) / d.k;
    if (dy < 0) dy *= 0.12;
    d.dy = dy;
    sheet.style.transform = `translateY(${dy}px)`;
    scrim.style.opacity = String(Math.max(0, 1 - dy / d.h));
  };
  const end = () => {
    if (!d) return;
    const v = d.dy / Math.max(1, performance.now() - d.t);
    const dismiss = d.dy > 120 || (v > 0.5 && d.dy > 30);
    sheet.classList.remove('dragging');
    scrim.style.transition = '';
    scrim.style.opacity = '';
    sheet.style.transform = '';
    d = null;
    if (dismiss) api.close();
  };
  const handles = [grab, head].filter(Boolean);
  handles.forEach((h) => {
    h.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button,input')) return;
      h.setPointerCapture(e.pointerId);
      begin(e.clientY);
    });
    h.addEventListener('pointermove', (e) => { if (d) move(e.clientY); });
    h.addEventListener('pointerup', end);
    h.addEventListener('pointercancel', end);
  });
  // pull down from the top of the scrolled content
  let ts = null;
  body.addEventListener('touchstart', (e) => { ts = { y: e.touches[0].clientY, top: body.scrollTop }; }, { passive: true });
  body.addEventListener('touchmove', (e) => {
    if (!ts || prefersReducedMotion()) return;
    const y = e.touches[0].clientY;
    if (!d) {
      if (ts.top <= 0 && body.scrollTop <= 0 && y - ts.y > 6 && !e.target.closest('.wheel,.slider')) begin(y);
      else return;
    }
    e.preventDefault();
    move(y);
  }, { passive: false });
  body.addEventListener('touchend', () => { ts = null; end(); });
  body.addEventListener('touchcancel', () => { ts = null; end(); });

  return api;
}

/**
 * iOS action sheet.
 * @param {{title?:string, message?:string, actions:{label:string, destructive?:boolean, onClick:Function}[]}} o
 */
export function actionSheet({ title = '', message = '', actions }) {
  const scrim = document.createElement('div');
  scrim.className = 'scrim';
  const box = document.createElement('div');
  box.className = 'actions';
  box.setAttribute('role', 'alertdialog');
  box.setAttribute('aria-modal', 'true');
  const g1 = document.createElement('div');
  g1.className = 'group';
  if (title || message) {
    const m = document.createElement('div');
    m.className = 'msg';
    m.innerHTML = `${title ? '<b></b>' : ''}${message ? '<span></span>' : ''}`;
    if (title) m.querySelector('b').textContent = title;
    if (message) m.querySelector('span').textContent = message;
    g1.append(m);
  }
  const close = () => {
    box.classList.remove('on');
    scrim.classList.remove('on');
    setTimeout(() => { box.remove(); scrim.remove(); }, 480);
  };
  actions.forEach((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `row${a.destructive ? ' danger' : ''}`;
    b.textContent = a.label;
    b.addEventListener('click', () => { close(); a.onClick?.(); });
    g1.append(b);
  });
  const g2 = document.createElement('div');
  g2.className = 'group';
  const c = document.createElement('button');
  c.type = 'button';
  c.className = 'row cancel';
  c.textContent = 'Cancel';
  c.addEventListener('click', close);
  g2.append(c);
  box.append(g1, g2);
  root.append(scrim, box);
  scrim.addEventListener('click', close);
  requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('on'); box.classList.add('on'); c.focus({ preventScroll: true }); }));
  return { close };
}

/** Standard sheet header: [Cancel]  Title  [Done]. */
export function sheetHead({ title = '', left = null, right = null }) {
  const h = document.createElement('div');
  h.className = 'sheet-head';
  const l = document.createElement('div');
  const t = document.createElement('div');
  t.className = 'sheet-title';
  t.textContent = title;
  const r = document.createElement('div');
  if (left) l.append(left);
  if (right) r.append(right);
  h.append(l, t, r);
  return h;
}

export function textButton(label, { strong = false, onClick } = {}) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `textbtn${strong ? ' strong' : ''}`;
  b.textContent = label;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}
