// Building blocks shared by screens: grouped rows, nav bar, finish picker,
// Wi-Fi list and calendar consent.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { goBack } from '../ui/stack.js';
import { DeviceView, FINISHES, FINISH_ORDER, swatchBg } from '../ui/device-view.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { clock, planFor, fmtMin } from '../lib/time.js';
import { makeSwitch } from '../ui/controls.js';
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

/**
 * A tab panel: quiet label, large title, and a compact header that fades in once
 * the title scrolls away (iOS large-title behaviour).
 */
export function panel({ cls = '', label = '', title = '', action = null, top = null }) {
  const p = el(`<section class="panel ${cls}">
      <header class="phead glass-bar" aria-hidden="true"><div class="phead-t"></div></header>
      <div class="scroll pscroll">
        <div class="ptop"></div>
        <div class="ptitle">
          <div class="ptitle-t"><div class="plabel"></div><h1 class="pbig"></h1></div>
          <div class="ptitle-a"></div>
        </div>
        <div class="pbody"></div>
        <div class="tabpad"></div>
      </div>
    </section>`);
  const head = p.querySelector('.phead');
  const scroll = p.querySelector('.pscroll');
  const titleEl = p.querySelector('.ptitle');
  // The glass header fades in as the large title scrolls under it, tied to the
  // scroll position rather than a switch, like iOS.
  const from = top ? 72 : 30;
  const upd = () => {
    const y = scroll.scrollTop;
    const k = Math.max(0, Math.min(1, (y - from) / 34));
    head.style.opacity = String(k);
    head.classList.toggle('on', k > 0.5);
    titleEl.style.opacity = String(1 - Math.max(0, Math.min(1, (y - from) / 46)) * 0.85);
  };
  scroll.addEventListener('scroll', upd, { passive: true });
  if (top) p.querySelector('.ptop').append(top); else p.querySelector('.ptop').remove();
  if (action) p.querySelector('.ptitle-a').append(action);
  const api = {
    el: p,
    scroll,
    body: p.querySelector('.pbody'),
    setTitle(t, short = t) {
      p.querySelector('.pbig').textContent = t;
      p.querySelector('.phead-t').textContent = short;
    },
    setLabel(l) { p.querySelector('.plabel').textContent = l; },
    toTop() { scroll.scrollTo({ top: 0, behavior: 'smooth' }); },
  };
  api.setTitle(title);
  api.setLabel(label);
  return api;
}

/** A card that is one big button, with optional extra content after it. */
export function card(cls = '') {
  return el(`<article class="card ${cls}"><button class="cmain" type="button"></button></article>`);
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

/* ---------- connect a calendar ----------
   Why (what it reads, what it never does) → connecting, in honest steps → what you got:
   the calendars it found, and the first event NOCTIS will tell you about tomorrow.
   A native app replaces the simulated permission with EventKit or Google OAuth. */
export function connectCalendar(id) {
  const svc = ctx.services.calendar;
  const p = svc.providers().find((x) => x.id === id);
  const isApple = id === 'apple';
  const glyph = isApple ? 'apple' : 'google';
  return new Promise((resolve) => {
    const body = el('<div class="sheet-pad cal-flow"></div>');
    let ok = false;
    let sheet = null;
    const close = () => sheet.close();
    sheet = openSheet({ content: body, size: 'auto', label: p.name, onClose: () => resolve(ok) });

    const why = () => {
      body.innerHTML = `
        <div class="cal-ic ${id}">${iconStr(glyph)}</div>
        <h2 class="title">Let NOCTIS see tomorrow.</h2>
        <p class="t2">Connect ${esc(p.name)} so your briefing can tell you what comes first.</p>
        <div class="cal-sample" aria-label="Example of what NOCTIS reads">
          <div class="cs-k">What NOCTIS reads</div>
          <div class="cs-ev"><i class="cs-bar"></i><div class="cs-t"><b>Standup</b><span>9:00 AM</span></div></div>
          <div class="cs-no">Notes · guests · locations · links</div>
        </div>
        <ul class="cal-pts">
          <li><span class="pt-ic">${iconStr('check')}</span><span><b>Reads one thing</b>The title and start time of your first event each morning.</span></li>
          <li><span class="pt-ic">${iconStr('check')}</span><span><b>Changes nothing</b>NOCTIS can’t add, edit or share your events.</span></li>
          <li><span class="pt-ic">${iconStr('check')}</span><span><b>Stays close</b>It goes from this phone to NOCTIS, and nowhere else.</span></li>
        </ul>
        <button class="pill primary block" type="button" data-allow>Allow access</button>
        <button class="pill quiet block" type="button" data-cancel>Not now</button>
        <p class="caption">${isApple ? 'On iPhone, iOS asks for calendar access here.' : 'Google sign-in opens here.'} This prototype simulates it and collects no credentials.</p>`;
      body.querySelector('[data-cancel]').addEventListener('click', close);
      body.querySelector('[data-allow]').addEventListener('click', () => { haptic(); working(); });
    };

    const working = async () => {
      body.innerHTML = `
        <div class="cal-ic ${id} pulse">${iconStr(glyph)}</div>
        <h2 class="title" data-t>Connecting</h2>
        <p class="t2" data-s>Asking ${esc(p.name)}</p>
        <div class="cal-bar"></div>`;
      const bar = progressBar(0.08);
      body.querySelector('.cal-bar').append(bar);
      const T = body.querySelector('[data-t]');
      const S = body.querySelector('[data-s]');
      const work = svc.connect(id);
      const steps = [['Connecting', `Asking ${p.name}`, 0.3], ['Finding your calendars', 'Home, work, family', 0.62], ['Looking at tomorrow', 'Just the first event', 0.9]];
      for (const [t, s, k] of steps) {
        T.textContent = t; S.textContent = s; bar.set(k);
        await new Promise((r) => setTimeout(r, 750));
      }
      let acc;
      try { acc = await work; } catch { acc = null; }
      bar.set(1);
      if (!acc) { island('Couldn’t connect. Try again', 'info'); why(); return; }
      ok = true;
      done(acc);
    };

    const done = async (acc) => {
      const now = clock.now();
      const morning = planFor(ctx.store.state.alarms, now).morning;
      const h24 = ctx.store.state.display.clock24;
      body.innerHTML = `
        <div class="cal-ok" aria-hidden="true"></div>
        <h2 class="title">Connected.</h2>
        <p class="t2">${esc(p.name)} · ${esc(acc.account)}</p>
        <div class="cal-prev" aria-live="polite"><span class="cp-k">First up tomorrow</span><span class="cp-v">Looking</span></div>
        <div class="group cal-list"></div>
        <button class="pill primary block" type="button" data-done>Done</button>`;
      body.querySelector('.cal-ok').append(tick(false));
      requestAnimationFrame(() => body.querySelector('.tick').classList.add('done'));
      island(`${p.name} connected`, 'calendar');
      haptic();
      const prev = body.querySelector('.cal-prev');
      const refresh = async () => {
        const ev = await svc.firstEvent(morning);
        prev.querySelector('.cp-v').innerHTML = ev ? `<b>${esc(ev.title)}</b> at ${esc(fmtMin(ev.startMin, h24))}` : 'Nothing booked yet';
        ctx.rebuildBriefing?.();
      };
      refresh();
      const list = body.querySelector('.cal-list');
      acc.calendars.forEach((cal) => list.append(row({
        label: cal.name,
        control: makeSwitch({ checked: cal.on, label: cal.name, onChange: (v) => { svc.setCalendar(id, cal.id, v); refresh(); } }),
      })));
      body.querySelector('[data-done]').addEventListener('click', close);
    };

    why();
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


/* ---------- progress (goal gradient) ---------- */

/** A thin progress bar. Returns an element with .set(p) (0 to 1). */
export function progressBar(p = 0, { tall = false, onHero = false } = {}) {
  const b = el(`<div class="pbar ${tall ? 'tall' : ''} ${onHero ? 'on-hero' : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100"><i></i></div>`);
  b.set = (v) => {
    const k = Math.max(0, Math.min(1, v));
    b.style.setProperty('--p', String(k));
    b.setAttribute('aria-valuenow', String(Math.round(k * 100)));
  };
  b.set(p);
  return b;
}

/** A progress ring with a slot in the middle. Returns an element with .set(p) and .mid. */
export function progressRing(p = 0, size = 148) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const n = el(`<div class="pring" style="width:${size}px;height:${size}px">
      <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="trk" cx="60" cy="60" r="${r}"/><circle class="arc" cx="60" cy="60" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>
      <div class="mid"></div>
    </div>`);
  const arc = n.querySelector('.arc');
  n.mid = n.querySelector('.mid');
  n.set = (v) => { arc.style.strokeDashoffset = String(c * (1 - Math.max(0.02, Math.min(1, v)))); };
  // start empty, then fill on the next frame so it draws in
  requestAnimationFrame(() => requestAnimationFrame(() => n.set(p)));
  return n;
}

/** A round tick that draws itself when `done`. */
export function tick(done = false) {
  const t = el(`<span class="tick ${done ? 'done' : ''}" aria-hidden="true">${iconStr('check')}</span>`);
  t.set = (v) => t.classList.toggle('done', !!v);
  return t;
}

/* ---------- brand: the moon and the wordmark ---------- */

/** The offhours mark: gradient crescent plus the lowercase wordmark. */
export function brandMarkHTML() {
  return '<i class="moon" aria-hidden="true"></i><span class="wordmark">offhours</span>';
}

/**
 * The sky behind the Tonight card. The sun sinks as bed-by gets closer (goal gradient),
 * then a moon holds the sky while the dawn glow builds toward the alarm.
 * Returns an element with .set(progress 0..1, night:boolean).
 */
export function skyScene() {
  const n = el(`<div class="sky-scene" aria-hidden="true">
      <i class="stars"></i><i class="sun"></i><i class="crescent"></i><i class="horizon"></i>
    </div>`);
  n.set = (p, night = false) => {
    n.style.setProperty('--p', String(Math.max(0, Math.min(1, p))));
    n.classList.toggle('is-night', !!night);
  };
  return n;
}

/** Big, friendly provider cards for setup: one tap to connect, a tick when it is. */
export function providerCards(onChange) {
  const svc = ctx.services.calendar;
  const acc = svc.accounts();
  const wrap = el('<div class="prov-list"></div>');
  svc.providers().forEach((p) => {
    const a = acc[p.id];
    const n = a ? a.calendars.filter((x) => x.on).length : 0;
    const b = el(`<button class="prov ${a ? 'on' : ''}" type="button">
        <span class="prov-ic ${p.id}">${iconStr(p.id === 'apple' ? 'apple' : 'google')}</span>
        <span class="prov-t"><b>${esc(p.name)}</b><span>${a ? `${esc(a.account)} · ${n} calendar${n === 1 ? '' : 's'}` : (p.id === 'apple' ? 'Events on this iPhone' : 'Your Google account')}</span></span>
        <span class="prov-s">${a ? '' : 'Connect'}</span>
      </button>`);
    if (a) b.querySelector('.prov-s').append(tick(true));
    b.addEventListener('click', async () => {
      haptic();
      if (ctx.services.calendar.accounts()[p.id]) { onChange?.(p.id, 'open'); return; }
      if (await connectCalendar(p.id)) onChange?.(p.id, 'connected');
    });
    wrap.append(b);
  });
  return wrap;
}
