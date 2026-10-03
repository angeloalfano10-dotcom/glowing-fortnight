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
import { finishPicker, wifiRows, askWifi, calendarRows, group } from './common.js';
import { alarmEditor } from './alarm.js';
import { stageTo, stageInto, stageOutOf } from './stagehelp.js';

export const STEPS = ['welcome', 'pair', 'wifi', 'finish', 'name', 'calendars', 'alarm', 'ready'];
const PROGRESS = ['pair', 'wifi', 'finish', 'name', 'calendars', 'alarm'];

export function createOnboarding({ start = 'welcome' } = {}) {
  const { store, stage } = ctx;
  const root = el(`<section class="screen onboarding">
      <header class="ob-head">
        <button class="iconbtn back" type="button" aria-label="Back">${iconStr('back')}</button>
        <button class="logo wordmark" type="button" aria-label="offhours">offhours</button>
        <span class="ob-spacer"></span>
      </header>
      <div class="segs ob-segs" aria-hidden="true">${PROGRESS.map(() => '<i></i>').join('')}</div>
      <div class="ob-stage"></div>
    </section>`);
  const stageEl = root.querySelector('.ob-stage');
  const backBtn = root.querySelector('.back');
  const segs = [...root.querySelectorAll('.ob-segs i')];
  longPress(root.querySelector('.logo'), () => ctx.go.demo());
  backBtn.addEventListener('click', () => goBack());

  let current = null;
  let currentName = '';
  let active = false;

  function chrome(name, step) {
    const pi = PROGRESS.indexOf(name);
    segs.forEach((s, i) => s.classList.toggle('on', i <= pi));
    root.querySelector('.ob-segs').style.opacity = pi >= 0 ? '1' : '0';
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
      ctx.go.home({ fromOnboarding: true });
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
      <div class="ob-eyes"><span class="anchor" style="width:200px;height:110px"></span></div>
      <div class="ob-copy">
        <h1 class="title">Own your off hours.</h1>
        <p class="t2">Let’s set up NOCTIS. It takes about two minutes.</p>
      </div>
      <div class="ob-foot"><button class="pill solid block" type="button">Begin</button></div>`, 'center');
    n.querySelector('.pill').addEventListener('click', () => { haptic(); api.next(); });
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() { ctx.stage.usePool(null); ctx.stage.rest('day'); },
    };
  },

  pair(api) {
    const n = stepEl(`
      <div class="ob-eyes"><span class="anchor" style="width:170px;height:100px"></span></div>
      <div class="ob-copy">
        <h1 class="title" data-t>Plug in NOCTIS.</h1>
        <p class="t2" data-s>Keep your phone close by.</p>
      </div>
      <div class="ob-foot"><button class="pill solid block" type="button" data-go hidden>Pair</button></div>`, 'center');
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
      set('Pairing.', 'One moment.');
      stage.setMode('awake');
      stage.hold({ lidT: 0.22, gy: -5, gx: 5 });
      await ctx.services.device.pair(found.id, (s) => { if (alive && s === 'securing') S.textContent = 'Almost there.'; });
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
      <div class="ob-foot"><button class="pill solid block" type="button">Continue</button></div>`, 'center finish-step');
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
      <div class="ob-foot"><button class="pill solid block" type="button">Continue</button></div>`, 'top');
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
      <div class="ob-foot"><button class="pill solid block" type="button" data-go>Not now</button></div>`, 'top');
    const list = n.querySelector('.ob-list');
    const go = n.querySelector('[data-go]');
    const render = () => {
      list.innerHTML = '';
      list.append(group({ rows: calendarRows((id, what) => { if (what === 'connected') { ctx.stage.run('hop'); render(); } }) }));
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
    let draft = s.alarm;
    const n = stepEl(`
      <div class="ob-copy left">
        <h1 class="title">When do you wake?</h1>
      </div>
      <div class="ob-alarm"></div>
      <div class="ob-foot"><button class="pill solid block" type="button">Continue</button></div>`, 'top');
    const ed = alarmEditor({ alarm: s.alarm, clock24: s.display.clock24, wake: false, onChange: (a) => { draft = a; } });
    n.querySelector('.ob-alarm').append(ed.el);
    n.querySelector('.pill').addEventListener('click', () => {
      ctx.store.set('alarm', { ...draft, on: draft.days.length > 0 });
      haptic();
      api.next();
    });
    return {
      el: n,
      enter() { ed.mount(); },
    };
  },

  ready(api) {
    const n = stepEl(`
      <div class="ob-eyes"><span class="anchor" style="width:200px;height:110px"></span></div>
      <div class="ob-copy">
        <h1 class="title">NOCTIS is ready.</h1>
        <p class="t2">Leave your phone in another room tonight.</p>
      </div>
      <div class="ob-foot"><button class="pill solid block" type="button">Done</button></div>`, 'center');
    n.querySelector('.pill').addEventListener('click', () => { haptic(); api.finish(); });
    let t = 0;
    return {
      el: n,
      anchor: n.querySelector('.anchor'),
      enter() {
        ctx.stage.rest('day');
        t = setTimeout(() => ctx.stage.run('hop'), 650);
      },
      leave() { clearTimeout(t); },
    };
  },
};
