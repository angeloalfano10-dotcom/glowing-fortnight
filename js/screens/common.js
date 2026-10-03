// Building blocks shared by screens: grouped rows, nav bar, finish picker,
// Wi-Fi list and calendar consent.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { goBack } from '../ui/stack.js';
import { DeviceView, FINISHES, FINISH_ORDER, swatchBg } from '../ui/device-view.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { ctx } from '../ctx.js';

/** A grouped list section. rows: HTMLElement[] */
export function group({ head = '', foot = '', rows = [] }) {
  const wrap = document.createElement('section');
  if (head) wrap.append(el(`<div class="group-head">${esc(head)}</div>`));
  const g = document.createElement('div');
  g.className = 'group';
  rows.filter(Boolean).forEach((r) => g.append(r));
  wrap.append(g);
  if (foot) wrap.append(el(`<div class="group-foot">${esc(foot)}</div>`));
  return wrap;
}

/** One row. If onClick is set it is a button with a chevron. desc adds a quiet second line. */
export function row({ ic = '', label, desc = '', value = '', onClick, control = null, chevron = !!onClick, cls = '' }) {
  const tag = onClick ? 'button' : 'div';
  const r = el(`<${tag} class="row ${ic ? 'has-ic' : ''} ${desc ? 'has-desc' : ''} ${cls}" ${onClick ? 'type="button"' : ''}>
      ${ic ? `<span class="ric">${iconStr(ic)}</span>` : ''}
      ${desc ? `<span class="rl"><span class="rt">${esc(label)}</span><span class="rd">${esc(desc)}</span></span>` : `<span class="rl">${esc(label)}</span>`}
      <span class="rv">${esc(value)}</span>
      ${chevron ? iconStr('chev') : ''}
    </${tag}>`);
  if (control) r.querySelector('.rv').replaceWith(control);
  if (onClick) r.addEventListener('click', onClick);
  r.setValue = (v) => { const n = r.querySelector('.rv'); if (n) n.textContent = v; };
  r.setDesc = (v) => { const n = r.querySelector('.rd'); if (n) n.textContent = v; };
  return r;
}

/** Nav bar with a back chevron and a title that appears once the large title scrolls away. */
export function navbar(title = '') {
  const n = el(`<header class="navbar">
      <button class="iconbtn back" type="button" aria-label="Back">${iconStr('back')}</button>
      <div class="navtitle">${esc(title)}</div>
      <span style="width:44px"></span>
    </header>`);
  n.querySelector('.back').addEventListener('click', () => goBack());
  n.setTitle = (t) => { n.querySelector('.navtitle').textContent = t; };
  return n;
}

/** Make a nav bar solid once `scroller` passes `threshold` px. */
export function bindNavbar(nav, scroller, threshold = 120) {
  const upd = () => nav.classList.toggle('solid', scroller.scrollTop > threshold);
  scroller.addEventListener('scroll', upd, { passive: true });
  upd();
}

/* ---------- finish picker (onboarding + settings) ---------- */
export function finishPicker({ value, onChange, size = 220 }) {
  const s = ctx.store.state;
  const wrap = el(`<div class="finish">
      <div class="finish-device"></div>
      <div class="swatches" role="radiogroup" aria-label="Finish">
        ${FINISH_ORDER.map((k) => `<button class="sw" type="button" role="radio" data-k="${k}" aria-label="${esc(FINISHES[k].name)}" style="background:${swatchBg(k)}"></button>`).join('')}
      </div>
      <div class="t2 finish-name"></div>
    </div>`);
  const view = new DeviceView({
    body: true,
    theme: s.display.theme,
    finish: value,
    source: ctx.deviceSource,
  });
  view.el.style.width = `${size}px`;
  view.el.style.height = `${size}px`;
  wrap.querySelector('.finish-device').append(view.el);
  const name = wrap.querySelector('.finish-name');
  const set = (k) => {
    value = k;
    view.setFinish(k);
    name.textContent = FINISHES[k].name;
    wrap.querySelectorAll('.sw').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.k === k)));
  };
  wrap.querySelectorAll('.sw').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.k === value) return;
    haptic();
    set(b.dataset.k);
    if (!view.eyes.beh) view.eyes.run('notice');
    onChange?.(b.dataset.k);
  }));
  set(value);
  wrap.view = view;
  wrap.destroy = () => view.destroy();
  return wrap;
}

/* ---------- Wi-Fi ---------- */
export function wifiRows(networks, onPick) {
  const rows = networks.map((n) =>
    row({
      label: n.ssid,
      value: '',
      chevron: false,
      onClick: () => onPick(n),
      control: el(`<span class="rv wifi-ic">${n.secure ? iconStr('lock') : ''}${iconStr(`wifi${n.signal}`)}</span>`),
    }));
  rows.push(row({ label: 'Other network…', chevron: false, onClick: () => onPick(null), cls: 'muted' }));
  return group({ rows });
}

/** Ask for a Wi-Fi password (or a name and password for another network). Resolves {ssid,password} or null. */
export function askWifi(network, { error = '' } = {}) {
  return new Promise((resolve) => {
    const other = !network;
    const body = el(`<form class="sheet-pad wifi-form" autocomplete="off">
        ${other ? '<input class="field" name="ssid" placeholder="Network name" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next">' : ''}
        <input class="field" name="pw" type="password" placeholder="Password" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="join">
        <div class="error" aria-live="polite">${esc(error)}</div>
        <div class="caption">NOCTIS keeps the password. It is not stored in this app.</div>
      </form>`);
    let result = null;
    const join = textButton('Join', { strong: true });
    const cancel = textButton('Cancel');
    const sheet = openSheet({
      content: body,
      head: sheetHead({ title: other ? 'Other network' : network.ssid, left: cancel, right: join }),
      size: 'auto',
      label: 'Wi-Fi password',
      onClose: () => resolve(result),
    });
    const submit = (e) => {
      e?.preventDefault();
      const ssid = other ? body.ssid.value.trim() : network.ssid;
      if (!ssid) return;
      result = { ssid, password: body.pw.value };
      sheet.close();
    };
    cancel.addEventListener('click', () => sheet.close());
    join.addEventListener('click', submit);
    body.addEventListener('submit', submit);
    setTimeout(() => (other ? body.ssid : body.pw).focus(), 420);
  });
}

/* ---------- calendar consent (demo stand-in for EventKit / Google OAuth) ---------- */
export function connectCalendar(id) {
  const p = ctx.services.calendar.providers().find((x) => x.id === id);
  return new Promise((resolve) => {
    const isApple = id === 'apple';
    const body = el(`<div class="sheet-pad consent">
        <div class="consent-ic">${iconStr('calendar')}</div>
        <h2 class="title">${esc(p.name)}</h2>
        <p class="t2">offhours reads event titles and start times to build your morning briefing. It never changes your calendar.</p>
        <div class="caption">${isApple ? 'In the app, iOS asks for calendar access here.' : 'In the app, Google sign-in opens here.'} This prototype simulates it.</div>
        <button class="pill solid block" type="button" data-allow>Allow</button>
        <button class="pill quiet block" type="button" data-cancel>Not now</button>
      </div>`);
    let ok = false;
    const sheet = openSheet({ content: body, size: 'auto', label: p.name, onClose: () => resolve(ok) });
    body.querySelector('[data-cancel]').addEventListener('click', () => sheet.close());
    const allow = body.querySelector('[data-allow]');
    allow.addEventListener('click', async () => {
      allow.disabled = true;
      allow.textContent = 'Connecting';
      await ctx.services.calendar.connect(id);
      ok = true;
      island(`${p.name} connected`, 'calendar');
      sheet.close();
    });
  });
}

export function calendarRows(onChange) {
  const acc = ctx.services.calendar.accounts();
  return ctx.services.calendar.providers().map((p) => {
    const on = !!acc[p.id];
    const r = row({
      ic: 'calendar',
      label: p.name,
      value: on ? 'Connected' : 'Connect',
      onClick: async () => {
        if (ctx.services.calendar.accounts()[p.id]) { onChange?.(p.id, 'open'); return; }
        const ok = await connectCalendar(p.id);
        if (ok) onChange?.(p.id, 'connected');
      },
      chevron: on,
    });
    if (!on) r.querySelector('.rv').classList.add('accent');
    return r;
  });
}

