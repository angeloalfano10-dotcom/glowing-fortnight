// Springs and one shared frame loop. Same spring model as the NOCTIS OS prototype,
// so motion on the phone and on the device feels like one product.

export class Spring {
  constructor(v = 0, k = 170, c = 26) { this.v = v; this.t = v; this.vel = 0; this.k = k; this.c = c; }
  set(t, k, c) { this.t = t; if (k) this.k = k; if (c) this.c = c; }
  snap(t) { this.v = this.t = t; this.vel = 0; }
  step(dt) { const a = -this.k * (this.v - this.t) - this.c * this.vel; this.vel += a * dt; this.v += this.vel * dt; }
  get resting() { return Math.abs(this.v - this.t) < 0.01 && Math.abs(this.vel) < 0.01; }
}

const subs = new Set();
let raf = 0;
let last = 0;

function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  subs.forEach((fn) => fn(t, dt));
  raf = subs.size ? requestAnimationFrame(loop) : 0;
}

/** Run fn(t, dt) every frame until the returned function is called. */
export function onFrame(fn) {
  subs.add(fn);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  return () => subs.delete(fn);
}

const rm = matchMedia('(prefers-reduced-motion: reduce)');
export const prefersReducedMotion = () => rm.matches;

export const rnd = (a, b) => a + Math.random() * (b - a);
export const pick = () => (Math.random() < 0.5 ? -1 : 1);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
