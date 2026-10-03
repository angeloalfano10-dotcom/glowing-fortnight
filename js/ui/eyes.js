// The eyes. Ported from noctis-os-prototype.html: two round eyes, no mouth,
// expression only through size, position, eyelid cover, squash and glow.
// One engine draws them everywhere: inside the device render (480 px screen units),
// in empty states, and as the app's single travelling pair ("stage eyes").

import { Spring, onFrame, prefersReducedMotion, rnd, pick, clamp } from '../lib/spring.js';

const ez = (x) => x * x * (3 - 2 * x);
const ezo = (x) => 1 - Math.pow(1 - x, 3);

/** Colon geometry, measured from Manrope by the device view. Relative to the rest centre. */
export const COLON = { cy: -9, gap: 27, size: 18 };

/** Poses relative to the rest centre, in device units (prototype screen centre is 240, 234). */
export const POSES = {
  idle: (h = 86) => [{ x: -58, y: 0, w: 70, h }, { x: 58, y: 0, w: 70, h }],
  sleep: () => [{ x: -56, y: 10, w: 64, h: 64 }, { x: 56, y: 10, w: 64, h: 64 }],
  voice: () => [{ x: -62, y: -30, w: 78, h: 96 }, { x: 62, y: -30, w: 78, h: 96 }],
  hello: () => [{ x: -58, y: -36, w: 72, h: 88 }, { x: 58, y: -36, w: 72, h: 88 }],
  header: () => [{ x: -17, y: -174, w: 15, h: 18 }, { x: 17, y: -174, w: 15, h: 18 }],
  colon: () => [
    { x: 0, y: COLON.cy - COLON.gap, w: COLON.size, h: COLON.size },
    { x: 0, y: COLON.cy + COLON.gap, w: COLON.size, h: COLON.size },
  ],
};

const LD = { lidT: [200, 24], lidB: [200, 24], sq: [260, 18], lift: [240, 18], wide: [220, 20] };

/* Each behaviour is a short timeline of [ms, targets]; null ends it. Same set as the device. */
const BEH = {
  glance: () => { const d = pick(); return [[0, { gx: d * rnd(8, 12), gy: rnd(-4, 4), blink: Math.random() < 0.4 }], [rnd(900, 1900), { gx: 0, gy: 0 }], [2300, null]]; },
  look: () => { const d = pick(); return [[0, { gx: d * 12, gy: 1 }], [1100, { gx: -d * 12, gy: -1 }], [2300, { gx: 0, gy: 0, blink: true }], [2900, null]]; },
  peek: () => { const d = pick(); return [[0, { gx: d * 30, gy: 5, sq: -0.12, gk: 70, gc: 14 }], [1500, { gx: d * 35, gy: 3 }], [2700, { gx: 0, gy: 0, sq: 0 }], [3000, { blink: true }], [3400, null]]; },
  fly: () => [[0, { fn: 'fly', wide: 0.35 }], [3400, { fn: null, gx: 0, gy: 0, wide: 0 }], [3500, { blink: true }], [4000, null]],
  hop: () => [[0, { sq: 0.45, k: 320, c: 18 }], [150, { sq: -0.3, lift: 16 }], [360, { sq: 0, lift: 0 }], [540, { sq: 0.3 }], [680, { sq: 0 }], [1200, null]],
  up: () => [[0, { gy: -10, wide: 0.25 }], [1700, { gy: 0, wide: 0 }], [2200, null]],
  squint: () => { const d = pick(); return [[0, { lidT: 0.3, lidB: 0.16, gx: d * 7 }], [1600, { lidT: 0, lidB: 0, gx: 0 }], [1900, { blink: true }], [2400, null]]; },
  shake: () => [[0, { fn: 'shake' }], [650, { fn: null }], [700, { blink: true }], [1200, null]],
  drowsy: () => [[0, { lidT: 0.5, gy: 4, k: 16, c: 8 }], [2400, { lidT: 0.68, k: 16, c: 8 }], [3600, { lidT: 0, gy: 0, wide: 0.3, k: 320, c: 22 }], [3700, { blink: true }], [4200, { wide: 0 }], [4800, null]],
  notice: () => [[0, { wide: 0.55, k: 420, c: 24 }], [450, { wide: 0, k: 120, c: 16 }], [900, null]],
  startle: () => { const d = pick(); return [[0, { wide: 0.75, gx: d * 15, gy: -3, k: 520, c: 26, gk: 300, gc: 24 }], [200, { blink: true }], [1000, { wide: 0 }], [1900, { gx: 0, gy: 0 }], [2400, null]]; },
  happy: () => [[0, { lidB: 0.42, lift: 5, k: 220, c: 20 }], [1100, { lidB: 0, lift: 0, k: 140, c: 18 }], [1500, null]],
};

const POOL = {
  day: [['glance', 5], ['look', 3], ['peek', 2], ['fly', 1.4], ['hop', 1.4], ['up', 1], ['squint', 1], ['shake', 0.6]],
  evening: [['glance', 4], ['look', 2], ['drowsy', 3.5], ['up', 0.6], ['squint', 0.8], ['hop', 0.4]],
  calm: [['glance', 5], ['look', 2], ['up', 1], ['squint', 0.6]],
  scan: [['look', 4], ['peek', 2], ['glance', 2]],
};

export class Eyes {
  /**
   * @param {HTMLElement} layer   Element the eye nodes are drawn into (absolutely positioned).
   * @param {{frame?:()=>{cx:number,cy:number,s:number}|null, minArc?:number, glow?:boolean, behave?:boolean}} opts
   */
  constructor(layer, { frame, minArc = 1.5, glow = true, behave = true } = {}) {
    this.layer = layer;
    this.frameFn = frame || (() => ({ cx: 0, cy: 0, s: 1 }));
    this.minArc = minArc;
    this.glow = glow;
    this.behave = behave;
    this.E = [this._mk(), this._mk()];
    this.gaze = { x: new Spring(0, 110, 16), y: new Spring(0, 110, 16) };
    this.L = {};
    for (const k in LD) this.L[k] = new Spring(0, LD[k][0], LD[k][1]);
    this.amp = new Spring(0, 260, 22);
    this.alpha = new Spring(1, 200, 28);
    this.springs = [this.gaze.x, this.gaze.y, this.amp, this.alpha, ...Object.values(this.L)];
    this.E.forEach((e) => this.springs.push(e.x, e.y, e.w, e.h, e.cl, e.op));
    this.mode = 'idle';
    this.mood = 'day';
    this.pool = null;
    this.gap = [2200, 6000];
    this.face = true;
    this.opening = false;
    this.bT = -1;
    this.bDbl = false;
    this.nextB = performance.now() + rnd(900, 2600);
    this.beh = null;
    this.nextBeh = performance.now() + rnd(1500, 3200);
    this.prevBeh = '';
    this.rawX = 0;
    this.hover = false;
    this.pressing = false;
    this.speaking = false;
    this.paused = false;
    this.timers = [];
    this._glow = [-1, -1];
    this._hidden = false;
    this._unsub = onFrame((t, dt) => this._tick(t, dt));
  }

  _mk() {
    const node = (c) => { const d = document.createElement('div'); d.className = c; this.layer.append(d); return d; };
    const ring = node('ring'); const f = node('eye'); const a = node('arc'); const lt = node('lid t'); const lb = node('lid b');
    return { ring, f, a, lt, lb, x: new Spring(0), y: new Spring(0), w: new Spring(70), h: new Spring(86), cl: new Spring(0), op: new Spring(0) };
  }

  /* ---------- poses ---------- */
  to(targets, o = {}) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const { k = 170, c = 24, stagger = 0, closed = 0, op = 1, ck = 120, cc = 20 } = o;
    targets.forEach((t, i) => {
      const fn = () => {
        const e = this.E[i];
        e.x.set(t.x, k, c); e.y.set(t.y, k, c); e.w.set(t.w, k, c); e.h.set(t.h, k, c);
        e.cl.set(closed, ck, cc); e.op.set(op, 140, 24);
      };
      if (i && stagger) this.timers.push(setTimeout(fn, stagger)); else fn();
    });
  }
  pose(name, o, arg) { this.to(POSES[name](arg), o); }
  snap(name, { closed = 0, op = 1 } = {}, arg) {
    POSES[name](arg).forEach((t, i) => {
      const e = this.E[i];
      e.x.snap(t.x); e.y.snap(t.y); e.w.snap(t.w); e.h.snap(t.h); e.cl.snap(closed); e.op.snap(op);
    });
  }
  /** idle: blinks and behaviours · awake: blinks only · colon · sleep */
  setMode(m) {
    this.mode = m;
    this.face = m !== 'colon';
    this.endBeh();
    this.nextBeh = performance.now() + rnd(1200, 3000);
  }
  setMood(m) { this.mood = m; }

  /** Common states */
  rest(mood = this.mood, o = {}) {
    this.mood = mood;
    this.setMode('idle');
    this.pose('idle', { k: 150, c: 21, stagger: 55, ...o }, mood === 'evening' ? 74 : 86);
  }
  sleep(o = {}) {
    this.setMode('sleep');
    this.pose('sleep', { k: 60, c: 15, closed: 1, ck: 40, cc: 13, stagger: 80, ...o });
  }
  wake() {
    this.opening = true;
    this.E.forEach((e, i) => this.timers.push(setTimeout(() => e.cl.set(0, 70, 13), i * 60)));
    this.timers.push(setTimeout(() => { this.opening = false; }, 700));
  }

  /* ---------- life ---------- */
  blink(t = performance.now()) { this.bT = t; this.bDbl = Math.random() < 0.2; }
  _blinkOpen(t) {
    if (this.bT < 0) return 1;
    const d = t - this.bT;
    if (d < 0) return 1;
    if (d < 80) return 1 - 0.94 * ez(d / 80);
    if (d < 250) return 0.06 + 0.94 * ezo((d - 80) / 170);
    if (this.bDbl) { this.bDbl = false; this.bT = t + 110; return 1; }
    this.bT = -1;
    return 1;
  }

  run(name, t = performance.now()) {
    this.endBeh();
    const steps = BEH[name]();
    this.beh = { name, steps, i: 0, t0: t, fn: null, fnT: t };
    this.prevBeh = name;
    this._stepBeh(t);
    return steps[steps.length - 1][0];
  }
  /** Hold a set of targets until release() (used for "thinking" while waiting). */
  hold(step) {
    this.endBeh();
    const t = performance.now();
    this.beh = { name: 'hold', steps: [[0, step], [1e12, null]], i: 0, t0: t, fn: null, fnT: t };
    this._stepBeh(t);
  }
  release() { this.endBeh(); }
  endBeh() {
    this.beh = null;
    this.rawX = 0;
    for (const k in this.L) this.L[k].set(0, LD[k][0], LD[k][1]);
    this.gaze.x.set(0, 110, 16);
    this.gaze.y.set(0, 110, 16);
  }
  lookAt(gx, gy, k = 110, c = 16) { this.gaze.x.set(gx, k, c); this.gaze.y.set(gy, k, c); }
  press(on) {
    this.pressing = on;
    if (on) this.endBeh();
    this.L.sq.set(on ? 0.16 : 0, 300, 20);
  }

  _apply(s, t) {
    for (const key in s) {
      const v = s[key];
      if (key in this.L) { const d = LD[key]; this.L[key].set(v, s.k || d[0], s.c || d[1]); }
      else if (key === 'gx') this.gaze.x.set(v, s.gk || 110, s.gc || 16);
      else if (key === 'gy') this.gaze.y.set(v, s.gk || 110, s.gc || 16);
      else if (key === 'blink' && v) this.blink(t);
      else if (key === 'fn') { this.beh.fn = v ? this._fn(v) : null; this.beh.fnT = t; if (!v) this.rawX = 0; }
    }
  }
  _fn(name) {
    if (name === 'fly') return (el) => { this.gaze.x.set(Math.sin(el / 300) * 13 + Math.sin(el / 137) * 3, 200, 20); this.gaze.y.set(Math.sin(el / 420 + 1) * 7 - 2, 200, 20); };
    if (name === 'shake') return (el) => { this.rawX = Math.sin(el / 42) * 7 * Math.max(0, 1 - el / 650); };
    return null;
  }
  _stepBeh(t) {
    if (!this.beh) return;
    const el = t - this.beh.t0;
    while (this.beh && this.beh.i < this.beh.steps.length && el >= this.beh.steps[this.beh.i][0]) {
      const s = this.beh.steps[this.beh.i][1];
      this.beh.i++;
      if (s === null) { this.endBeh(); return; }
      this._apply(s, t);
    }
    if (this.beh && this.beh.fn) this.beh.fn(t - this.beh.fnT);
  }
  _choose() {
    const pool = (this.pool || POOL[this.mood === 'evening' ? 'evening' : 'day']).filter((p) => p[0] !== this.prevBeh);
    let r = Math.random() * pool.reduce((a, p) => a + p[1], 0);
    for (const p of pool) { r -= p[1]; if (r <= 0) return p[0]; }
    return pool[0][0];
  }
  usePool(name, gap) { this.pool = name ? POOL[name] : null; this.gap = gap || [2200, 6000]; this.nextBeh = performance.now() + 400; }

  _life(t) {
    const m = this.mode;
    const canBlink = (m === 'idle' || m === 'awake' || m === 'colon') && !this.opening;
    if (canBlink && t > this.nextB) { this.blink(t); this.nextB = t + (m === 'colon' ? rnd(5000, 12000) : rnd(2400, 7200)); }
    if (m === 'idle' && this.behave && !this.hover && !this.pressing && !prefersReducedMotion() && !this.beh && t > this.nextBeh) {
      const d = this.run(this._choose(), t);
      this.nextBeh = t + d + rnd(this.gap[0], this.gap[1]);
    }
    this._stepBeh(t);
    this.amp.set(this.speaking ? 0.3 + 0.7 * Math.abs(Math.sin(t / 88) * Math.sin(t / 231 + 1)) : 0);
  }

  /* ---------- frame ---------- */
  _tick(t, dt) {
    if (this.paused) return;
    const steps = Math.max(1, Math.ceil(dt * 240));
    const h = dt / steps;
    for (let s = 0; s < steps; s++) for (const sp of this.springs) sp.step(h);
    this._life(t);
    this._render(t);
  }

  _render(t) {
    const A = clamp(this.alpha.v, 0, 1);
    if (A < 0.004 && this.alpha.t === 0) {
      if (!this._hidden) { this.layer.style.visibility = 'hidden'; this._hidden = true; }
      return;
    }
    const F = this.frameFn();
    if (!F) return;
    if (this._hidden) { this.layer.style.visibility = ''; this._hidden = false; }
    const { cx, cy, s } = F;
    const rm = prefersReducedMotion();
    const open = this._blinkOpen(t);
    const br = this.mode === 'idle' && !rm ? Math.sin(t / 1400) * 0.012 : 0;
    const bob = this.mode === 'sleep' && !rm ? Math.sin(t / 1900) * 1.6 : 0;
    const face = this.face;
    const tx = clamp(this.gaze.x.v / 14, -1.4, 1.4);
    const sqv = this.L.sq.v;
    const wd = 1 + this.L.wide.v * 0.1;
    const lidT = clamp(this.L.lidT.v, 0, 0.9);
    const lidB = clamp(this.L.lidB.v, 0, 0.9);
    this.E.forEach((e, i) => {
      const side = i ? 1 : -1;
      const cl = clamp(e.cl.v, 0, 1);
      const op = clamp(e.op.v, 0, 1) * A;
      const sc = (1 + br + this.amp.v * 0.07) * wd;
      const turn = face ? 1 - side * tx * 0.09 : 1; // the eye looking sideways grows slightly: a head turn
      const baseH = Math.max(0, e.h.v * sc);
      const w = Math.max(0, e.w.v * sc * turn * (1 + sqv * 0.22));
      const fullH = Math.max(0, baseH * (1 - sqv * 0.22) * (face ? 1 - Math.abs(tx) * 0.03 : 1));
      const hh = Math.max(0.6, fullH * open * (1 - cl * 0.9));
      const x = cx + s * (e.x.v + this.gaze.x.v + (face ? -side * Math.abs(tx) * 4 : 0) + this.rawX);
      const y = cy + s * (e.y.v + this.gaze.y.v + bob - this.L.lift.v + (baseH - fullH) / 2);
      const W = w * s;
      const H = hh * s;
      const f = e.f.style;
      f.transform = `translate3d(${x - W / 2}px,${y - H / 2}px,0)`;
      f.width = `${W}px`;
      f.height = `${H}px`;
      f.opacity = op * (1 - cl);
      if (this.glow) {
        // The lids are drawn in the background colour, so the glow fades as they close.
        const lidFade = clamp(1 - Math.max(lidT, lidB) * 2.6, 0, 1);
        const g = Math.round(Math.max(lidFade > 0.05 ? 3 : 0, W * (0.5 + this.amp.v * 0.45) * lidFade));
        if (g !== this._glow[i]) { this._glow[i] = g; f.boxShadow = g ? `0 0 ${g}px var(--eye-glow)` : 'none'; }
      }
      const a = e.a.style;
      if (cl > 0.01) {
        const aw = e.w.v * 0.92 * s;
        const ah = aw * 0.36;
        a.transform = `translate3d(${x - aw / 2}px,${y - ah * 0.45}px,0)`;
        a.width = `${aw}px`;
        a.height = `${ah}px`;
        a.borderBottomWidth = `${Math.max(this.minArc, aw * 0.055)}px`;
      }
      a.opacity = op * cl;
      const lw = W * 1.5 + 8 * s;
      const pad2 = W * 0.6;
      const top = y - H / 2;
      const bot = y + H / 2;
      const T = e.lt.style;
      if (face && lidT > 0.005) {
        const lh = H * lidT + pad2;
        T.opacity = op; T.width = `${lw}px`; T.height = `${lh}px`;
        T.transform = `translate3d(${x - lw / 2}px,${top + H * lidT - lh}px,0)`;
      } else T.opacity = 0;
      const B = e.lb.style;
      if (face && lidB > 0.005) {
        const lh = H * lidB + pad2;
        B.opacity = op; B.width = `${lw}px`; B.height = `${lh}px`;
        B.transform = `translate3d(${x - lw / 2}px,${bot - H * lidB}px,0)`;
      } else B.opacity = 0;
      if (this.listening) {
        const r = e.ring.style;
        r.transform = `translate3d(${x - W / 2}px,${y - (fullH * s) / 2}px,0)`;
        r.width = `${W}px`;
        r.height = `${fullH * s}px`;
      }
    });
  }

  set listening(v) { this._listening = v; this.layer.classList.toggle('listening', v); }
  get listening() { return this._listening; }

  destroy() {
    this._unsub();
    this.timers.forEach(clearTimeout);
    this.E.forEach((e) => [e.ring, e.f, e.a, e.lt, e.lb].forEach((n) => n.remove()));
  }
}

/**
 * The app's one travelling pair. It is drawn above the screen stack and follows an
 * anchor element. Moving to a new anchor springs from where the eyes are now, so
 * they fly between places: splash → header button → into the device screen.
 * Anchor width = the span of both eyes (186 device units). An anchor marked
 * data-eyes="device" is a 480 × 480 device screen.
 */
export class StageEyes extends Eyes {
  constructor(root) {
    const layer = document.createElement('div');
    layer.className = 'eyes-layer stage-eyes';
    layer.setAttribute('aria-hidden', 'true');
    root.append(layer);
    super(layer, { minArc: 1.5 });
    this.root = root;
    this.anchor = null;
    this.ox = new Spring(0, 120, 19);
    this.oy = new Spring(0, 120, 19);
    this.os = new Spring(0, 120, 19);
    this.springs.push(this.ox, this.oy, this.os);
    this.alpha.snap(0);
    this._last = null;
    this._lastAnchor = null;
    this.frameFn = () => this._frame();
  }

  frameOf(a) {
    if (!a || !a.isConnected) return null;
    const R = this.root.getBoundingClientRect();
    const k = R.width / (this.root.offsetWidth || R.width) || 1;
    const r = a.getBoundingClientRect();
    if (!r.width) return null;
    if (a.dataset.eyes === 'device') {
      const u = r.width / 480 / k;
      return { cx: (r.left - R.left) / k + 240 * u, cy: (r.top - R.top) / k + 234 * u, s: u };
    }
    return { cx: (r.left - R.left + r.width / 2) / k, cy: (r.top - R.top + r.height / 2) / k, s: r.width / k / 186 };
  }

  _frame() {
    const f = this.frameOf(this.anchor) || this._lastAnchor;
    if (!f) return null;
    this._lastAnchor = f;
    this._last = { cx: f.cx + this.ox.v, cy: f.cy + this.oy.v, s: f.s * Math.exp(this.os.v) };
    return this._last;
  }

  /**
   * Move the eyes to an anchor.
   * @param {HTMLElement} anchor
   * @param {{fly?:boolean, from?:HTMLElement, eye?:string, glow?:string, k?:number, c?:number}} o
   *   from: start from another anchor, or a frame measured earlier (e.g. leaving a device screen).
   *   eye/glow: colour override while on this anchor (e.g. light eyes on a dark screen).
   */
  attach(anchor, { fly = true, from = null, eye = null, glow = null, k = 120, c = 19 } = {}) {
    let prev = null;
    if (from) prev = from.cx != null ? from : this.frameOf(from);
    else if (this._last && this.alpha.v > 0.05) prev = this._last;
    this.anchor = anchor;
    this._lastAnchor = null;
    const next = this.frameOf(anchor);
    if (prev && next && fly && !prefersReducedMotion()) {
      this.ox.snap(prev.cx - next.cx);
      this.oy.snap(prev.cy - next.cy);
      this.os.snap(Math.log(prev.s / next.s));
      [this.ox, this.oy, this.os].forEach((sp) => sp.set(0, k, c));
      if (from) this.alpha.snap(1);
    } else {
      [this.ox, this.oy, this.os].forEach((sp) => sp.snap(0));
      if (!prev) this.alpha.snap(0);
    }
    this.alpha.set(1, 200, 28);
    const st = this.layer.style;
    st.setProperty('--lid', anchor.dataset.lid || 'var(--bg)');
    if (eye) st.setProperty('--eye', eye); else st.removeProperty('--eye');
    if (glow) st.setProperty('--eye-glow', glow); else st.removeProperty('--eye-glow');
  }

  get flying() {
    return Math.abs(this.ox.v) > 0.6 || Math.abs(this.oy.v) > 0.6 || Math.abs(this.os.v) > 0.01;
  }
  /** Resolves when the eyes have landed on their anchor. */
  landed(timeout = 1600) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const check = () => {
        if (!this.flying || performance.now() - t0 > timeout) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  }
  detach({ now = false } = {}) {
    if (now) this.alpha.snap(0); else this.alpha.set(0, 260, 30);
  }
}
