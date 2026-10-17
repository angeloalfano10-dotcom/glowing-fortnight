// Account: passwordless sign-in. Apple, Google, or an emailed six-digit code.
// Nothing here collects a password. In this prototype the sign-in is simulated
// (services.account), and the screens say so quietly, the way the calendar sheet does.
//
//   authButtons({ onDone })   the three buttons, used in setup and in the Profile sheet
//   openSignInSheet()         the same, as a sheet
//   openEmailSheet(onDone)    email → code
//   accountLine(acc)          what to show for "who am I signed in as"

import { el, esc, wait } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { ctx } from '../ctx.js';

export const PROVIDER_NAME = { apple: 'Apple', google: 'Google', email: 'email' };

/** { primary, sub } for an account, in plain words. */
export function accountLine(acc) {
  if (!acc) return { primary: 'Not signed in', sub: 'Everything stays on this phone.' };
  const via = acc.provider === 'email' ? 'Signed in with email' : `Signed in with ${PROVIDER_NAME[acc.provider]}`;
  const who = acc.hideEmail || !acc.email ? 'Email hidden by Apple' : acc.email;
  return { primary: who, sub: via };
}

/** After any successful sign-in: keep the profile name if there is one, borrow one if there isn't. */
function adopt(acc) {
  const { store } = ctx;
  if (acc.name && !(store.state.profile.name || '').trim()) store.patch('profile', { name: acc.name });
  island(acc.provider === 'email' ? 'Signed in' : `Signed in with ${PROVIDER_NAME[acc.provider]}`, 'check');
  haptic();
}

/**
 * The three sign-in buttons. onDone(account) fires once, after the success tick.
 * Apple and Google "connect" for a moment (the system sheet in a real app); email opens a sheet.
 */
export function authButtons({ onDone, emailFirst = false } = {}) {
  const { services } = ctx;
  const n = el(`<div class="auth">
      <button class="auth-btn apple" type="button" data-p="apple"><span class="auth-ic">${iconStr('apple')}</span><span class="auth-t">Continue with Apple</span></button>
      <button class="auth-btn google" type="button" data-p="google"><span class="auth-ic">${iconStr('google')}</span><span class="auth-t">Continue with Google</span></button>
      <button class="auth-btn email" type="button" data-p="email"><span class="auth-ic">${iconStr('mail')}</span><span class="auth-t">Continue with email</span></button>
    </div>`);
  const btns = [...n.querySelectorAll('.auth-btn')];
  const lock = (v) => btns.forEach((b) => { b.disabled = v; });
  btns.forEach((b) => b.addEventListener('click', async () => {
    const p = b.dataset.p;
    haptic();
    if (p === 'email') {
      openEmailSheet((acc) => onDone?.(acc));
      return;
    }
    lock(true);
    b.classList.add('busy');
    const label = b.querySelector('.auth-t');
    const was = label.textContent;
    label.textContent = 'Connecting';
    try {
      const acc = await services.account.signIn(p);
      b.classList.remove('busy');
      b.classList.add('ok');
      label.textContent = 'Signed in';
      adopt(acc);
      await wait(650);
      onDone?.(acc);
    } catch {
      label.textContent = was;
      b.classList.remove('busy');
      island('Couldn’t sign in. Try again', 'info');
    } finally {
      lock(false);
    }
  }));
  n.reset = () => btns.forEach((b) => { b.classList.remove('ok', 'busy'); b.querySelector('.auth-t').textContent = `Continue with ${PROVIDER_NAME[b.dataset.p].replace('email', 'email')}`; });
  return n;
}

/** The sign-in options as a sheet (Profile, and anywhere else that needs an account). */
export function openSignInSheet({ onDone } = {}) {
  const body = el(`<div class="sheet-pad signin">
      <div class="signin-mark"><i class="moon" aria-hidden="true"></i></div>
      <h2 class="title">Keep your setup.</h2>
      <p class="t2">Sign in and your alarms and settings follow you to a new phone. No password, ever.</p>
      <div data-auth></div>
      <p class="caption">This prototype simulates sign-in and stores nothing but a label on this phone.</p>
    </div>`);
  let sheet = null;
  const cancel = textButton('Not now');
  const auth = authButtons({ onDone: (acc) => { sheet.close(); onDone?.(acc); } });
  body.querySelector('[data-auth]').append(auth);
  sheet = openSheet({ content: body, head: sheetHead({ title: '', left: cancel }), size: 'auto', label: 'Sign in' });
  cancel.addEventListener('click', () => sheet.close());
  return sheet;
}

/* ---------- email → six-digit code ---------- */
export function openEmailSheet(onDone) {
  const { services } = ctx;
  const body = el('<div class="sheet-pad emailflow"></div>');
  let sheet = null;
  let email = '';
  let tickT = 0;
  const cancel = textButton('Cancel');
  cancel.addEventListener('click', () => sheet.close());
  sheet = openSheet({ content: body, head: sheetHead({ title: '', left: cancel }), size: 'auto', label: 'Sign in with email', onClose: () => clearInterval(tickT) });

  /* step 1: the address */
  function askEmail(error = '') {
    clearInterval(tickT);
    body.innerHTML = `
      <h2 class="title">What’s your email?</h2>
      <p class="t2">We’ll send a six-digit code. No password to remember.</p>
      <form class="stack-form" autocomplete="on" novalidate>
        <input class="field" name="email" type="email" inputmode="email" placeholder="you@example.com" value="${esc(email)}" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="send" aria-label="Email">
        <div class="error" aria-live="polite">${esc(error)}</div>
        <button class="pill primary block" type="submit">Send code</button>
      </form>`;
    const form = body.querySelector('form');
    const input = form.email;
    const err = body.querySelector('.error');
    const btn = form.querySelector('.pill');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      email = input.value.trim();
      btn.disabled = true;
      btn.textContent = 'Sending';
      try {
        await services.account.requestCode(email);
        askCode();
      } catch (x) {
        err.textContent = x.message;
        btn.disabled = false;
        btn.textContent = 'Send code';
        input.classList.remove('shake');
        void input.offsetWidth;
        input.classList.add('shake');
        input.focus();
      }
    });
    setTimeout(() => input.focus(), 450);
  }

  /* step 2: the code */
  function askCode() {
    body.innerHTML = `
      <h2 class="title">Check your email.</h2>
      <p class="t2">We sent a code to <b>${esc(email)}</b>.</p>
      <label class="codebox" aria-label="Six-digit code">
        <input class="code-in" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" enterkeyhint="done">
        ${Array.from({ length: 6 }, () => '<i class="code-d"></i>').join('')}
      </label>
      <div class="error" aria-live="polite"></div>
      <div class="code-foot">
        <button class="link" type="button" data-resend>Send again</button>
        <button class="link" type="button" data-back>Different email</button>
      </div>
      <p class="caption">Prototype: any six digits work, except 000000.</p>`;
    const input = body.querySelector('.code-in');
    const boxes = [...body.querySelectorAll('.code-d')];
    const err = body.querySelector('.error');
    const box = body.querySelector('.codebox');
    const resend = body.querySelector('[data-resend]');
    const paint = () => {
      const v = input.value;
      boxes.forEach((b, i) => { b.textContent = v[i] || ''; b.classList.toggle('on', i === Math.min(v.length, 5)); b.classList.toggle('fill', !!v[i]); });
    };
    let left = 30;
    const tick = () => {
      resend.disabled = left > 0;
      resend.textContent = left > 0 ? `Send again in ${left}s` : 'Send again';
      if (left > 0) left -= 1;
    };
    tick();
    clearInterval(tickT);
    tickT = setInterval(tick, 1000);
    resend.addEventListener('click', async () => {
      if (left > 0) return;
      left = 30;
      tick();
      await services.account.requestCode(email);
      island('Code sent again', 'mail');
    });
    body.querySelector('[data-back]').addEventListener('click', () => askEmail());
    let busy = false;
    input.addEventListener('input', async () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 6);
      err.textContent = '';
      paint();
      if (input.value.length < 6 || busy) return;
      busy = true;
      box.classList.add('busy');
      input.blur();
      try {
        const acc = await services.account.verifyCode(email, input.value);
        box.classList.remove('busy');
        box.classList.add('ok');
        adopt(acc);
        await wait(600);
        sheet.close();
        onDone?.(acc);
      } catch (x) {
        box.classList.remove('busy');
        err.textContent = x.message;
        box.classList.remove('shake');
        void box.offsetWidth;
        box.classList.add('shake');
        input.value = '';
        paint();
        busy = false;
        input.focus();
      }
    });
    paint();
    setTimeout(() => input.focus(), 450);
  }

  askEmail();
}
