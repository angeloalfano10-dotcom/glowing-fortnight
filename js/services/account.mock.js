// Simulated sign-in. A native app replaces this with Sign in with Apple, Google
// Sign-In, and an emailed one-time code through a small backend. No password is
// ever collected: there is nothing to forget, and nothing to leak.

import { storage } from './storage.local.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class AccountError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const PROVIDERS = {
  apple: { label: 'Apple', email: null, name: '' },
  google: { label: 'Google', email: 'you@gmail.com', name: '' },
  email: { label: 'Email', email: null, name: '' },
};

/** @returns {import('./contracts.js').AccountService} */
export function createMockAccount() {
  let acc = storage.get('mock.account', null);
  const save = () => (acc ? storage.set('mock.account', acc) : storage.remove('mock.account'));
  const nameFromEmail = (e) => cap((e.split('@')[0] || '').replace(/[._\-+\d]+/g, ' ').trim().split(' ')[0] || '');

  return {
    kind: 'mock',
    providers: () => Object.entries(PROVIDERS).map(([id, p]) => ({ id, label: p.label })),
    current: () => acc,

    /** Apple and Google: the system sheet does the work. */
    async signIn(provider) {
      await wait(1100 + Math.random() * 500);
      const p = PROVIDERS[provider];
      acc = { provider, email: p.email, hideEmail: provider === 'apple', name: p.name, at: Date.now() };
      save();
      return acc;
    },

    /** Email: send a six-digit code. Rejects with code 'invalid-email'. */
    async requestCode(email) {
      await wait(800);
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email.trim())) throw new AccountError('invalid-email', 'That email doesn’t look right.');
      return { sent: true };
    },

    /** Check the code. In this prototype any six digits work, except 000000. */
    async verifyCode(email, code) {
      await wait(700);
      if (!/^\d{6}$/.test(code) || code === '000000') throw new AccountError('wrong-code', 'That code didn’t work. Try again.');
      acc = { provider: 'email', email: email.trim().toLowerCase(), hideEmail: false, name: nameFromEmail(email), at: Date.now() };
      save();
      return acc;
    },

    async signOut() {
      await wait(300);
      acc = null;
      save();
    },
  };
}
