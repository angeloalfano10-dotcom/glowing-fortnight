// Onboarding: one idea per step. The same pair of eyes travels through every step,
// scanning while it looks for NOCTIS, thinking while it pairs, hopping when done.
//   welcome → pair → wifi → finish → name → calendars → alarm → ready

import { el, esc, wait } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { enterStep, goBack } from '../ui/stack.js';
import { longPress } from '../ui/controls.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { prefersReducedMotion } from '../lib/spring.js';
import { finishPicker, wifiRows, askWifi, providerCards, progressBar, tick } from './common.js';
import { clock, planFor, fmtMin, DAY_LONG } from '../lib/time.js';
import { alarmEditor } from './alarm.js';
import { newAlarm } from '../lib/store.js';
import { stageTo, stageInto, stageOutOf } from './stagehelp.js';
import { authButtons } from './account.js';
import { openCalendarsSheet } from './sheets.js';

export const STEPS = ['welcome', 'account', 'pair', 'wifi', 'finish', 'name', 'calendars', 'alarm', 'ready'];
const PROGRESS = ['pair', 'wifi', 'finish', 'name', 'calendars', 'alarm'];

export function createOnboarding({ start = 'welcome' } = {}) {
  const { store, stage } = ctx;
  const root = el(`<section class="screen onboarding">
      <header class="ob-head">
        <button class="iconbtn back" type="button" aria-label="Back">${iconStr('back')}</button>
        <button class="logo brandmark" type="button" aria-label="offhours"><i class="moon" aria-hidden="true"></i><span class="wordmark">offhours</span></button>
        <span class="ob-spacer"></span>
      </header>
      <div class="ob-prog"><div class="ob-bar"></div><div class="ob-meta"><span data-step></span><span data-left></span></div></div>
      <div class="ob-stage"></div>
    </section>`);
  const stageEl = root.querySelector('.ob-stage');
  const backBtn = root.querySelector('.back');
  const bar = progressBar(0, { tall: true });
  root.querySelector('.ob-bar').append(bar);
  const progEl = root.querySelector('.ob-prog');
  const stepTxt = root.querySelector('[data-step]');
  const leftTxt = root.querySelector('[data-left]');
  longPress(root.querySelector('.logo'), () => ctx.go.demo());
  backBtn.addEventListener('click', () => goBack());

  let current = null;
  let currentName = '';
  let active = false;

  function chrome(name, step) {
    const pi = PROGRESS.indexOf(name);
    // Endowed progress: the bar starts already moving, and each step is about 25 s.
    const N = PROGRESS.length;
    const left = Math.max(0, N - pi - 1);
    bar.set(pi >= 0 ? 0.1 + 0.9 * ((pi + 1) / N) : 0);
    stepTxt.textContent = pi >= 0 ? `Step ${pi + 1} of ${N}` : '';
    leftTxt.textContent = pi < 0 ? '' : left === 0 ? 'Last step' : left * 25 < 60 ? 'Under a minute left' : `About ${Math.round((left * 25) / 60)} min left`;
    progEl.style.opacity = pi >= 0 ? '1' : '0';
    const canBack = STEPS.indexOf(name) > 0 && name !== 'ready' && !step.busy;
    backBtn.style.visibility = canBack ? 'visible' : 'hidden';
  }

  function show(name, dir = 1) {
    const make = FACTORY[name];
    const step = make(api);
    step.name = name;
    const old = current;
    current = step;
    currentName = name;
    const n = step.el;
    n.classList.add('ob-step');
    stageEl.append(n);
    const rm = prefersReducedMotion();
    if (old) {
      n.style.opacity = '0';
      n.style.transform = rm ? '' : `translateX(${dir * 28}px)`;
      void n.offsetWidth;
      n.style.transition = 'opacity .4s ease, transform .55s cubic-bezier(.2,.8,.2,1)';
      n.style.opacity = '1';
      n.style.transform = 'none';
      old.el.style.transition = 'opacity .25s ease, transform .55s cubic-bezier(.2,.8,.2,1)';
      old.el.style.opacity = '0';
      old.el.style.transform = rm ? '' : `translateX(${-dir * 28}px)`;
      old.el.style.pointerEvents = 'none';
      old.leave?.();
      setTimeout(() => { old.destroy?.(); old.el.remove(); }, 560);
    }
    chrome(name, step);
    if (active) enterStep_(step);
  }
  function enterStep_(step) {
    if (step.anchor) stageTo(step.anchor);
    else if (!step.ownsEyes) stage.detach();
    step.enter?.();
  }

  const api = {
    next() {
      const i = STEPS.indexOf(currentName);
      const from = currentName;
      enterStep(() => { if (STEPS.indexOf(currentName) > STEPS.indexOf(from)) show(from, -1); });
      show(STEPS[i + 1], 1);
    },
    refreshChrome() { chrome(currentName, current); },
    finish() {
      store.patch('setup', { done: true });
      ctx.go.home();
    },
  };

  return {
    el: root,
    enter() {
      active = true;
      if (!current) show(start, 1);
      else enterStep_(current);
    },
    leave() { active = false; current?.leave?.(); },
    destroy() { current?.destroy?.(); },
  };
}

/* ---------- step helpers ---------- */
const stepEl = (inner, cls = '') => el(`<div class="${cls}">${inner}</div>`);

/* ---------- steps ---------- */
const FACTORY = {
  welcome(api) {
    const n = stepEl(`
      <div class="horizon-art" aria-hidden="true">
        <svg viewBox="0 0 390 300" preserveAspectRatio="xMidYMax slice">
          <defs><radialGradient id="hsun" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#FFF1D8"/><stop offset=".5" stop-color="#FFD6A6"/><stop offset="1" stop-color="#FF9857"/></radialGradient></defs>
          <circle class="h-sun" cx="272" cy="166" r="46" fill="url(#hsun)"/>
          <path class="h-r1" d="M0 190c60-30 110-20 170 0s120 16 220-18v128H0z"/>
          <path class="h-r2" d="M0 224c70-26 120-18 190 4s130 8 200-14v86H0z"/>
          <path class="h-r3" d="M0 256c80-20 150-8 220 6s110 2 170-10v48H0z"/>
        </svg>
      </div>
      <div class="ob-eyes"><span class="anchor" style="width:200px;height:110px"></span></div>
      <div class="ob-copy">
        <h1 class="title">Own your <span class="grad">off hours.</span></h1>
        <p class="t2">Let’s set up NOCTIS. It takes about two minutes.</p>
      </div>
      <div class="ob-foot"><button class="pill primary block" type="button">Begin</button><p class="caption ob-legal">Sleep and snoring are always estimates. NOCTIS is not a medical device.</p></div>`, 'center welcome');
    n.querySelector('.pill').addEventListener('click', () => { haptic(); api.next(); });
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() { ctx.stage.usePool(null); ctx.stage.rest('day'); },
    };
  },

  account(api) {
    const n = stepEl(`
      <div class="ob-eyes small"><span class="anchor" style="width:96px;height:56px"></span></div>
      <div class="ob-copy left">
        <h1 class="title">Save your setup.</h1>
        <p class="t2">Sign in and your alarms and settings follow you to a new phone. No password, ever.</p>
      </div>
      <div class="ob-auth"></div>
      <div class="ob-foot">
        <button class="pill quiet block" type="button" data-skip>Skip for now</button>
        <p class="caption ob-legal">By continuing you agree to the Terms and Privacy Policy. Prototype: sign-in is simulated and stores only a label on this phone.</p>
      </div>`, 'top account');
    const go = () => api.next();
    n.querySelector('.ob-auth').append(authButtons({ onDone: go }));
    n.querySelector('[data-skip]').addEventListener('click', () => { haptic(); go(); });
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() { ctx.stage.rest('day'); ctx.stage.usePool('calm', [2000, 5000]); },
      leave() { ctx.stage.usePool(null); },
    };
  },

  pair(api) {
    const n = stepEl(`
      <div class="ob-eyes"><span class="anchor" style="width:170px;height:100px"></span></div>
      <div class="ob-copy">
        <h1 class="title" data-t>Plug in NOCTIS.</h1>
        <p class="t2" data-s>Keep your phone close by.</p>
      </div>
      <div class="ob-foot"><button class="pill primary block" type="button" data-go hidden>Pair</button></div>`, 'center');
    const T = n.querySelector('[data-t]');
    const S = n.querySelector('[data-s]');
    const go = n.querySelector('[data-go]');
    let alive = true;
    let found = null;
    const stage = ctx.stage;
    const set = (t, s) => { T.textContent = t; S.textContent = s; };
    const step = {
      el: n,
      anchor: n.querySelector('.anchor'),
      async enter() {
        stage.rest('day');
        stage.usePool('scan', [200, 700]);
        set('Plug in NOCTIS.', 'Keep your phone close by.');
        go.hidden = true;
        try {
          found = await ctx.services.device.scan();
        } catch {
          if (!alive) return;
          set('Can’t find NOCTIS.', 'Check it’s plugged in, then try again.');
          go.textContent = 'Try again';
          go.hidden = false;
          return;
        }
        if (!alive) return;
        stage.usePool(null);
        stage.run('notice');
        set('NOCTIS is here.', 'Ready to pair.');
        go.textContent = 'Pair';
        go.hidden = false;
      },
      leave() { alive = false; stage.usePool(null); stage.release(); },
    };
    go.addEventListener('click', async () => {
      if (!found) { step.enter(); return; }
      haptic();
      go.hidden = true;
      step.busy = true;
      api.refreshChrome();
      // Pairing is quick, but a secure handshake should feel like one: show each stage.
      const t0 = Date.now();
      set('Pairing.', 'Connecting to NOCTIS.');
      const work = ctx.services.device.pair(found.id, (s) => { if (alive && s === 'securing') S.textContent = 'Securing the connection.'; });
      await wait(1100);
      if (alive) S.textContent = 'Securing the connection.';
      await work;
      if (alive && Date.now() - t0 < 2600) { S.textContent = 'Checking it can reach you.'; await wait(2600 - (Date.now() - t0)); }
      if (!alive) return;
      stage.release();
      stage.setMode('idle');
      stage.run('hop');
      ctx.store.patch('device', { id: found.id });
      set('Paired.', '');
      haptic();
      step.busy = false;
      await wait(1300);
      if (alive) api.next();
    });
    return step;
  },

  wifi(api) {
    const n = stepEl(`
      <div class="ob-eyes small"><span class="anchor" style="width:96px;height:56px"></span></div>
      <div class="ob-copy left">
        <h1 class="title" data-t>Choose Wi-Fi.</h1>
        <p class="t2" data-s>NOCTIS works on 2.4 GHz networks.</p>
      </div>
      <div class="ob-list"></div>`, 'top');
    const T = n.querySelector('[data-t]');
    const S = n.querySelector('[data-s]');
    const list = n.querySelector('.ob-list');
    const stage = ctx.stage;
    let alive = true;
    let nets = [];

    async function join(ssid, password, net) {
      list.style.opacity = '0';
      list.style.pointerEvents = 'none';
      T.textContent = `Joining ${ssid}.`;
      S.textContent = 'This takes a few seconds.';
      step.busy = true;
      api.refreshChrome();
      stage.setMode('awake');
      stage.hold({ lidT: 0.22, gy: -5, gx: 5 });
      try {
        await ctx.services.device.joinWifi(ssid, password);
        if (!alive) return;
        stage.release();
        stage.setMode('idle');
        stage.run('hop');
        T.textContent = 'Connected.';
        S.textContent = '';
        ctx.store.patch('device', { wifi: ssid });
        island(`Connected to ${ssid}`, 'wifi3');
        haptic();
        await wait(1200);
        if (alive) api.next();
      } catch (e) {
        if (!alive) return;
        stage.release();
        stage.setMode('idle');
        stage.run('shake');
        step.busy = false;
        api.refreshChrome();
        T.textContent = 'Choose Wi-Fi.';
        S.textContent = 'NOCTIS works on 2.4 GHz networks.';
        list.style.opacity = '';
        list.style.pointerEvents = '';
        const again = await askWifi(net, { error: e.code === 'wrong-password' ? 'Wrong password. Try again.' : 'That didn’t work. Try again.' });
        if (again && alive) join(again.ssid, again.password, net);
      }
    }
    async function pick(net) {
      if (net && !net.secure) { join(net.ssid, '', net); return; }
      const r = await askWifi(net);
      if (r && alive) join(r.ssid, r.password, net);
    }
    const step = {
      el: n,
      anchor: n.querySelector('.anchor'),
      async enter() {
        stage.rest('day');
        stage.usePool('calm', [1500, 4000]);
        if (nets.length) return;
        list.innerHTML = '<div class="caption ob-loading">Looking for networks</div>';
        nets = await ctx.services.device.wifiNetworks();
        if (!alive) return;
        list.innerHTML = '';
        list.append(wifiRows(nets, pick));
        stage.run('glance');
      },
      leave() { alive = false; stage.usePool(null); stage.release(); },
    };
    return step;
  },

  finish(api) {
    const s = ctx.store.state;
    const n = stepEl(`
      <div class="ob-copy">
        <h1 class="title">Which finish is yours?</h1>
      </div>
      <div class="ob-finish"></div>
      <div class="ob-foot"><button class="pill primary block" type="button">Continue</button></div>`, 'center finish-step');
    const picker = finishPicker({
      value: s.device.finish,
      size: 228,
      onChange: (k) => ctx.store.patch('device', { finish: k }),
    });
    n.querySelector('.ob-finish').append(picker);
    picker.view.eyes.alpha.snap(0); // the travelling eyes land here, then hand over
    n.querySelector('.pill').addEventListener('click', () => { haptic(); api.next(); });
    return {
      el: n,
      ownsEyes: true,
      enter() { requestAnimationFrame(() => stageInto(picker.view, { mode: 'idle' })); },
      leave() { stageOutOf(picker.view); },
      destroy() { picker.destroy(); },
    };
  },

  name(api) {
    const s = ctx.store.state;
    const n = stepEl(`
      <div class="ob-eyes small"><span class="anchor" style="width:96px;height:56px"></span></div>
      <div class="ob-copy left">
        <h1 class="title">Name it.</h1>
        <p class="t2">Handy if there’s more than one.</p>
      </div>
      <form class="ob-form" autocomplete="off">
        <input class="field" name="n" maxlength="24" value="${esc(s.device.name)}" aria-label="Name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done">
        <div class="chips">${['Bedroom', 'Bedside', 'Guest room'].map((c) => `<button class="chip" type="button">${c}</button>`).join('')}</div>
      </form>
      <div class="ob-foot"><button class="pill primary block" type="button">Continue</button></div>`, 'top');
    const input = n.querySelector('input');
    const done = () => {
      const v = input.value.trim() || 'Bedroom';
      ctx.store.patch('device', { name: v });
      input.blur();
      haptic();
      api.next();
    };
    n.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); done(); });
    n.querySelector('.ob-foot .pill').addEventListener('click', done);
    n.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => { input.value = c.textContent; haptic(); ctx.stage.run('notice'); }));
    input.addEventListener('focus', () => { ctx.stage.setMode('awake'); ctx.stage.lookAt(4, 7); });
    input.addEventListener('blur', () => { ctx.stage.lookAt(0, 0); ctx.stage.setMode('idle'); });
    input.addEventListener('input', () => { if (Math.random() < 0.25) ctx.stage.blink(); });
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() { ctx.stage.rest('day'); ctx.stage.usePool('calm', [2000, 5000]); },
      leave() { ctx.stage.usePool(null); },
    };
  },

  calendars(api) {
    const n = stepEl(`
      <div class="ob-eyes small"><span class="anchor" style="width:96px;height:56px"></span></div>
      <div class="ob-copy left">
        <h1 class="title">Connect your calendar.</h1>
        <p class="t2">NOCTIS reads only your first event each morning.</p>
      </div>
      <div class="ob-list"></div>
      <div class="ob-foot"><button class="pill primary block" type="button" data-go>Not now</button></div>`, 'top');
    const list = n.querySelector('.ob-list');
    const go = n.querySelector('[data-go]');
    const render = () => {
      list.innerHTML = '';
      list.append(providerCards((id, what) => { if (what === 'connected') { ctx.stage.run('hop'); render(); } else if (what === 'open') openCalendarsSheet({ onClose: render }); }));
      const any = Object.values(ctx.services.calendar.accounts()).some(Boolean);
      go.textContent = any ? 'Continue' : 'Not now';
      go.classList.toggle('solid', any);
      go.classList.toggle('ghost', !any);
    };
    render();
    go.addEventListener('click', () => { haptic(); api.next(); });
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() { ctx.stage.rest('day'); ctx.stage.usePool('calm', [2000, 5000]); },
      leave() { ctx.stage.usePool(null); },
    };
  },

  alarm(api) {
    const s = ctx.store.state;
    const first = s.alarms[0] || newAlarm({ id: 'a1' });
    let draft = first;
    const n = stepEl(`
      <div class="ob-copy left">
        <h1 class="title">When do you wake?</h1>
      </div>
      <div class="ob-alarm"></div>
      <div class="ob-foot"><button class="pill primary block" type="button">Continue</button></div>`, 'top');
    const ed = alarmEditor({ alarm: first, clock24: s.display.clock24, full: false, onChange: (a) => { draft = a; } });
    n.querySelector('.ob-alarm').append(ed.el);
    n.querySelector('.pill').addEventListener('click', () => {
      ctx.store.set('alarms', [{ ...draft, on: draft.days.length > 0 }, ...ctx.store.state.alarms.slice(1)]);
      haptic();
      api.next();
    });
    return {
      el: n,
      enter() { ed.mount(); },
    };
  },

  ready(api) {
    const st = ctx.store.state;
    const h24 = st.display.clock24;
    const plan = planFor(st.alarms, clock.now());
    const next = st.alarms.find((a) => a.on);
    const cal = Object.values(ctx.services.calendar.accounts()).some(Boolean);
    const tomorrow = next ? fmtMin(next.h * 60 + next.m, h24) : null;
    const items = [
      ['NOCTIS paired', `${st.device.name}${st.device.wifi ? ` · ${st.device.wifi}` : ''}`],
      ['Alarm set', next ? `${tomorrow}${plan.alarmSet ? ` · bed by ${fmtMin(plan.bedMin, h24)}` : ''}` : 'Add one any time'],
      cal && ['Calendar connected', 'First event in your briefing'],
    ].filter(Boolean);
    const n = stepEl(`
      <div class="ob-eyes"><span class="anchor" style="width:200px;height:110px"></span></div>
      <div class="ob-copy">
        <h1 class="title">NOCTIS is ready.</h1>
        <p class="t2">Leave your phone in another room tonight.</p>
      </div>
      <ul class="ready-list" aria-label="What is set">${items.map(([a, b]) => `<li><span class="rk"></span><span class="rt"><b>${esc(a)}</b><span>${esc(b)}</span></span></li>`).join('')}</ul>
      <div class="ob-foot"><button class="pill primary block" type="button">Go to Today</button></div>`, 'center ready');
    const ticks = items.map((_, i) => { const t = tick(false); n.querySelectorAll('.rk')[i].append(t); return t; });
    n.querySelector('.pill').addEventListener('click', () => { haptic(); api.finish(); });
    let timers = [];
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() {
        ctx.stage.rest('day');
        // The peak of the whole setup: the eyes hop, then each thing you set ticks in.
        timers.push(setTimeout(() => { ctx.stage.run('hop'); haptic(); }, 500));
        n.querySelectorAll('.ready-list li').forEach((li, i) => {
          timers.push(setTimeout(() => { li.classList.add('in'); ticks[i].set(true); if (i === items.length - 1) haptic(); }, 1000 + i * 420));
        });
      },
      leave() { timers.forEach(clearTimeout); timers = []; },
    };
  },
};
