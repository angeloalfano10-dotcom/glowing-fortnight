// StorageService backed by localStorage. Every read and write is guarded so the app
// still runs in private mode or when storage is blocked.

const NS = 'offhours:';

/** @type {import('./contracts.js').StorageService} */
export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(NS + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(NS + key, JSON.stringify(value)); } catch { /* full or blocked */ }
  },
  remove(key) {
    try { localStorage.removeItem(NS + key); } catch { /* ignore */ }
  },
  clear() {
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
      Object.keys(sessionStorage).filter((k) => k.startsWith(NS)).forEach((k) => sessionStorage.removeItem(k));
    } catch { /* ignore */ }
  },
};
