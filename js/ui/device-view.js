// A live NOCTIS render: the timber body and the 480 × 480 screen from the OS
// prototype, scaled to fit. Used as the device mirror, the briefing preview and
// the finish picker. Tap it and the eyes become the colon of the time.

import { el, esc } from '../lib/dom.js';
import { Eyes, COLON } from './eyes.js';
import { iconStr } from './icons.js';
import { clock, fmtParts, fmtMin, minsOf, plan, dur, longDate } from '../lib/time.js';
import { prefersReducedMotion } from '../lib/spring.js';
import { speak, stopSpeaking } from '../lib/speech.js';

export const FINISHES = {
  maple: { name: 'Pale maple', w: ['#E4C8A0', '#D6B385', '#EBD3AE'] },
  ash: { name: 'Ash', w: ['#DCCDB2', '#CBB99A', '#E7DCC6'] },
  oak: { name: 'Oak', w: ['#CFA373', '#BE8F5E', '#D8B080'] },
  cherry: { name: 'Cherry', w: ['#B07457', '#9C6347', '#BE8565'] },
  walnut: { name: 'Walnut', w: ['#7C5538', '#6A4630', '#8A6243'] },
  black: { name: 'Black oak', w: ['#2C2723', '#231F1C', '#38322C'] },
};
export const FINISH_ORDER = ['maple', 'ash', 'oak', 'cherry', 'walnut', 'black'];
export const swatchBg = (key) => `linear-gradient(135deg, ${FINISHES[key].w[2]}, ${FINISHES[key].w[1]})`;

/* Eye colours on the device screen per theme and phase (from the prototype). */
const COL = {
  white: { day: ['#FFFFFF', 'rgba(255,255,255,.34)'], evening: ['#F2F2F4', 'rgba(242,242,244,.24)'], night: ['#8E8E93', 'rgba(142,142,147,.16)'], digit: ['#FFFFFF', 'rgba(255,255,255,.12)'] },
  warm: { day: ['#F2EEE7', 'rgba(250,248,244,.30)'], evening: ['#EADCC7', 'rgba(234,220,199,.22)'], night: ['#A88459', 'rgba(168,132,89,.18)'], digit: ['#FAF8F4', 'rgba(250,248,244,.12)'] },
};
export const deviceEye = (theme, key = 'day') => COL[theme][key];

/* Colon placement, measured from Manrope like the prototype does. */
const FS = 140;
const DTOP = 152;
export function measureColon() {
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.font = `600 ${FS}px Manrope`;
    const m = c.measureText('0');
    if (m.fontBoundingBoxAscent && m.actualBoundingBoxAscent) {
      const fa = m.fontBoundingBoxAscent;
      const fd = m.fontBoundingBoxDescent;
      const base = (FS - (fa + fd)) / 2 + fa;
      COLON.cy = DTOP + base - m.actualBoundingBoxAscent / 2 - 234;
      COLON.gap = Math.round(m.actualBoundingBoxAscent * 0.25);
    }
  } catch { /* keep defaults */ }
}

const CENTRE = { cx: 240, cy: 234, s: 1 };

export class DeviceView {
  /**
   * @param {{body?:boolean, theme?:string, finish?:string, tappable?:boolean,
   *          source?:()=>{alarm:object, clock24:boolean, brightness:number, place?:string}}} o
   */
  constructor({ body = true, theme = 'warm', finish = 'maple', tappable = true, source } = {}) {
    this.body = body;
    this.base = body ? 576 : 480;
    this.source = source || (() => ({ alarm: { h: 7, m: 0, on: true, days: [1, 2, 3, 4, 5] }, clock24: true, brightness: 0.8 }));
    this.mode = 'idle';
    this.theme = theme;
    this.flow = 0;
    this.timers = [];

    const screen = `
      <div class="nx-screen" data-theme="${esc(theme)}" data-mode="idle" data-eyes="device">
        <section class="nx-clock">
          <div class="date" data-k="date"></div>
          <div class="alabel">Alarm</div>
          <div class="hh" data-k="hh"></div>
          <div class="mm" data-k="mm"></div>
          <div class="status"><span data-k="sico"></span><span data-k="status"></span></div>
        </section>
        <div class="nx-alarm"><div class="nx-dawn"></div></div>
        <div class="nx-brief">
          <div class="nx-bcard"><div class="hello" data-k="greet">Good morning.</div><div class="b2" style="top:348px" data-k="bdate"></div></div>
          <div class="nx-bcard"><div class="city" data-k="bplace"></div><div class="big" style="top:124px;font-size:150px;padding-left:.1em" data-k="btemp"></div><div class="b1" style="top:286px;font-size:22px" data-k="bcond"></div><div class="b1" style="top:320px;font-size:22px" data-k="bhl"></div></div>
          <div class="nx-bcard"><div class="lab">${iconStr('calendar')}<span data-k="bcap">First up</span></div><div class="big" style="top:134px;font-size:112px;font-weight:300" data-k="btime"></div><div class="b1" style="top:272px" data-k="btitle"></div><div class="b2" style="top:314px" data-k="bleft"></div></div>
          <div class="nx-bcard"><div class="lab">${iconStr('bed')}<span>Last night · estimate</span></div><div class="big" style="top:134px;font-size:112px;font-weight:300" data-k="bsleep"></div><div class="b1" style="top:272px" data-k="bsnore"></div><div class="b2" style="top:314px">Estimated from sound in the room</div></div>
          <div class="nx-segs"><div class="nx-seg"><i></i></div><div class="nx-seg"><i></i></div><div class="nx-seg"><i></i></div><div class="nx-seg"><i></i></div></div>
        </div>
        <div class="nx-edge"></div>
        <div class="eyes-layer nx-eyes" aria-hidden="true"></div>
        <div class="nx-voice"><div class="nx-vq"></div><div class="nx-va"></div></div>
        <div class="nx-actions"><div class="nx-pill ghost">Snooze</div><div class="nx-pill solid">Stop</div></div>
        <div class="nx-boot"><div class="word">NOCTIS</div></div>
        <div class="nx-dim"></div>
        <div class="nx-sheen"></div>
      </div>`;
    this.el = el(`
      <div class="nx ${body ? '' : 'nx-bare'}" role="img" aria-label="NOCTIS">
        <div class="nx-scale">${body ? `<div class="nx-body">${screen}</div>` : screen}</div>
        ${tappable ? '<button class="nx-tap" type="button" aria-label="Show the time on NOCTIS"></button>' : ''}
      </div>`);
    this.scr = this.el.querySelector('.nx-screen');
    this.scaleEl = this.el.querySelector('.nx-scale');
    this.dimEl = this.el.querySelector('.nx-dim');
    this.k = {};
    this.el.querySelectorAll('[data-k]').forEach((n) => { (this.k[n.dataset.k] ||= []).push(n); });

    this.eyes = new Eyes(this.el.querySelector('.nx-eyes'), { frame: () => CENTRE, minArc: 2.5 });
    this.eyes.snap('idle', { op: 1 });
    this.setTheme(theme);
    this.setFinish(finish);

    this.ro = new ResizeObserver(() => this._fit());
    this.ro.observe(this.el);
    // Pause the eyes while off screen (another pager page, a covered screen).
    this.visible = true;
    this.visT = setInterval(() => this._checkVisible(), 300);
    requestAnimationFrame(() => this._checkVisible());
    this.tickT = setInterval(() => this.visible && this.refresh(), 1000);

    if (tappable) {
      this.el.querySelector('.nx-tap').addEventListener('click', () => this.tap());
    }
    this.refresh();
  }

  _checkVisible() {
    const r = this.el.getBoundingClientRect();
    const vis = this.el.isConnected && r.width > 0 && r.right > 0 && r.bottom > 0
      && r.left < innerWidth && r.top < innerHeight && !this.el.closest('.inert');
    this.visible = vis;
    this.eyes.paused = !vis;
  }

  _fit() {
    const w = this.el.clientWidth;
    if (w) this.scaleEl.style.setProperty('--k', String(w / this.base));
  }

  set(k, v) {
    (this.k[k] || []).forEach((n) => { if (n.textContent !== v) n.textContent = v; });
  }
  setHTML(k, v) {
    (this.k[k] || []).forEach((n) => { if (n.innerHTML !== v) n.innerHTML = v; });
  }

  setTheme(theme) {
    this.theme = theme;
    this.scr.dataset.theme = theme;
    this._eyeColor(this.eyeKey || 'day');
  }
  setFinish(key) {
    const f = FINISHES[key] || FINISHES.maple;
    const b = this.el.querySelector('.nx-body');
    if (!b) return;
    b.style.setProperty('--w1', f.w[0]);
    b.style.setProperty('--w2', f.w[1]);
    b.style.setProperty('--w3', f.w[2]);
  }
  _eyeColor(key) {
    this.eyeKey = key;
    const c = COL[this.theme][key];
    const s = this.eyes.layer.style;
    s.setProperty('--eye', c[0]);
    s.setProperty('--eye-glow', c[1]);
    s.setProperty('--lid', 'var(--scr)');
  }
  get phase() {
    const { alarm } = this.source();
    return plan(alarm, clock.now()).phase;
  }

  /** Update time, status line and brightness. Called every second while visible. */
  refresh() {
    const { alarm, clock24, brightness = 0.8 } = this.source();
    const now = clock.now();
    const p = plan(alarm, now);
    const t = fmtParts(minsOf(now), clock24);
    this.set('hh', t.time.split(':')[0]);
    this.set('mm', t.time.split(':')[1]);
    this.set('date', longDate(now));
    let ico = 'alarm';
    let txt = alarm.on ? fmtMin(p.wakeMin, clock24) : 'No alarm';
    if (!alarm.on) ico = 'belloff';
    if (p.phase === 'evening') { ico = 'bed'; txt = `Bed by ${fmtMin(p.bedMin, clock24)} · ${dur(p.minsToBed)}`; }
    else if (p.phase === 'night' && p.alarmSet) txt = `${fmtMin(p.wakeMin, clock24)} · in ${dur(p.minsToWake)}`;
    this.set('status', txt);
    if (this._ico !== ico) { this._ico = ico; this.setHTML('sico', iconStr(ico)); }
    const night = p.phase === 'night' && !['alarm', 'briefing'].includes(this.mode);
    this.scr.classList.toggle('night', night);
    let f = 1;
    if (['alarm', 'briefing', 'boot'].includes(this.mode)) f = 1;
    else if (p.phase === 'night') f = this.mode === 'sleep' ? 0.36 : 0.5;
    else if (p.phase === 'evening') f = 0.74;
    this.dimEl.style.opacity = this.mode === 'off' ? '' : (1 - f * (0.3 + 0.7 * brightness)).toFixed(3);
  }

  _cancel() {
    this.flow++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.scr.classList.remove('listening', 'speaking', 'alarm-ready', 'show-time');
    this.eyes.listening = false;
    this.eyes.speaking = false;
    if (this._speaking) { stopSpeaking(); this._speaking = false; }
  }
  _later(ms, fn) {
    const tok = this.flow;
    this.timers.push(setTimeout(() => { if (tok === this.flow) fn(); }, ms));
  }
  _setMode(m) {
    this._checkVisible();
    this.mode = m;
    this.scr.dataset.mode = m;
    this.refresh();
  }

  /** Switch what the screen shows. */
  setMode(m, data) {
    if (m === this.mode && !data && m !== 'clock') return;
    this._cancel();
    const night = this.phase === 'night';
    const evening = this.phase === 'evening';
    switch (m) {
      case 'idle':
        this._eyeColor(evening ? 'evening' : 'day');
        this._setMode('idle');
        this.eyes.rest(evening ? 'evening' : 'day');
        break;
      case 'sleep':
        this._eyeColor('night');
        this._setMode('sleep');
        this.eyes.sleep();
        break;
      case 'clock':
        this._eyeColor(night ? 'night' : 'digit');
        this._setMode('clock');
        this.scr.classList.add('show-time');
        this.eyes.setMode('colon');
        this.eyes.pose('colon', { k: 210, c: 23, stagger: 45, ck: 170, cc: 24 });
        this._later(night ? 6000 : 7000, () => this.rest());
        break;
      case 'alarm': this._alarm(); break;
      case 'briefing': this.playBriefing(data || this.briefing, { loop: false }); break;
      case 'voice': this.ask(data); break;
      case 'boot': this._boot(); break;
      case 'off':
        this._setMode('off');
        this.eyes.setMode('sleep');
        this.eyes.to(this.eyes.E.map((e) => ({ x: e.x.t, y: e.y.t, w: e.w.t, h: e.h.t })), { op: 0, closed: 1 });
        break;
      default: this.rest();
    }
  }
  rest() { this.setMode(this.phase === 'night' ? 'sleep' : 'idle'); }
  tap() {
    if (this.mode === 'idle' || this.mode === 'sleep') this.setMode('clock');
    else if (this.mode === 'clock') this.rest();
    else if (this.mode === 'briefing' && this._next) this._next();
  }

  _boot() {
    this._eyeColor('day');
    this._setMode('boot');
    this.eyes.E.forEach((e) => e.op.snap(0));
    const b = this.el.querySelector('.nx-boot');
    b.classList.remove('on');
    void b.offsetWidth;
    b.classList.add('on');
    this._later(2250, () => { this.eyes.snap('idle', { closed: 1, op: 0 }); this.eyes.E.forEach((e) => e.op.set(1, 70, 17)); });
    this._later(2900, () => this.eyes.wake());
    this._later(3800, () => { b.classList.remove('on'); this.rest(); });
  }

  _alarm() {
    this._eyeColor('day');
    this._setMode('alarm');
    this.eyes.setMode('awake');
    this.eyes.opening = true;
    this.eyes.snap('sleep', { closed: 1 });
    this.eyes.pose('idle', { k: 46, c: 13, closed: 0, ck: 20, cc: 8, stagger: 120 });
    this._later(2000, () => {
      this.eyes.opening = false;
      this._eyeColor('digit');
      this.scr.classList.add('show-time');
      this.eyes.setMode('colon');
      this.eyes.pose('colon', { k: 190, c: 22, stagger: 50 });
    });
    this._later(2600, () => this.scr.classList.add('alarm-ready'));
  }

  /** Fill the four briefing cards. */
  fillBriefing(b, sleep) {
    this.briefing = b;
    if (!b) return;
    this.set('greet', b.greeting);
    this.set('bdate', b.dateLine);
    this.set('bplace', b.weather.place || 'Weather');
    this.set('btemp', `${b.weather.temp}°`);
    this.set('bcond', b.weather.text);
    this.set('bhl', `H:${b.weather.high}°  L:${b.weather.low}°`);
    if (b.event) {
      this.set('bcap', 'First up');
      this.set('btime', b.event.start);
      this.set('btitle', b.event.title);
      this.set('bleft', b.event.beforeAlarm ? 'Before your alarm' : `in ${dur(b.event.inMin)}`);
    } else {
      this.set('bcap', 'Calendar');
      this.set('btime', '');
      this.set('btitle', 'Nothing first thing');
      this.set('bleft', 'Your morning is clear');
    }
    if (sleep) {
      this.set('bsleep', `${Math.floor(sleep.sleepMin / 60)} h ${String(sleep.sleepMin % 60).padStart(2, '0')}`);
      this.set('bsnore', sleep.snoringMin ? `Snoring about ${sleep.snoringMin} min` : 'No snoring heard');
    } else {
      this.set('bsleep', '');
      this.set('bsnore', 'Added in the morning');
    }
  }

  /**
   * Play the briefing card by card, like the device does after Stop.
   * @param {{loop?:boolean, speak?:boolean, volume?:number, onEnd?:Function}} o
   */
  playBriefing(b, { loop = false, speak: talk = false, volume = 1, onEnd } = {}) {
    if (b) this.fillBriefing(b, this._sleep);
    this._cancel();
    const tok = this.flow;
    this._eyeColor('day');
    this._setMode('briefing');
    const cards = [...this.el.querySelectorAll('.nx-bcard')];
    const segs = [...this.el.querySelectorAll('.nx-seg i')];
    cards.forEach((c) => c.classList.remove('on'));
    segs.forEach((i) => { i.style.transition = 'none'; i.style.width = '0'; });
    this.eyes.setMode('awake');
    let i = -1;
    const parts = this.briefing?.speechParts || [];
    const next = () => {
      if (tok !== this.flow) return;
      i++;
      if (i >= cards.length) {
        if (loop) { this._later(600, () => this.playBriefing(null, { loop, speak: false })); return; }
        onEnd?.();
        this.rest();
        return;
      }
      cards.forEach((c, n) => c.classList.toggle('on', n === i));
      if (i === 0) {
        this.eyes.pose('hello', { k: 150, c: 20, stagger: 40 });
        if (!prefersReducedMotion()) this._later(600, () => this.eyes.run('happy'));
      } else {
        this.eyes.endBeh();
        this.eyes.pose('header', { k: 170, c: 24, stagger: 40 });
      }
      const seg = segs[i];
      const minT = talk ? 2600 : 3400;
      const start = performance.now();
      let done = false;
      const advance = () => {
        if (done || tok !== this.flow) return;
        done = true;
        this._next = null;
        seg.style.transition = 'width .3s';
        seg.style.width = '100%';
        this._later(320, next);
      };
      this._next = advance;
      seg.style.transition = `width ${minT}ms linear`;
      requestAnimationFrame(() => requestAnimationFrame(() => { seg.style.width = '100%'; }));
      if (talk && parts[i]) {
        this._later(350, () => {
          this._speaking = true;
          this.eyes.speaking = true;
          this.scr.classList.add('speaking');
          speak(parts[i], {
            volume,
            onend: () => {
              this._speaking = false;
              this.eyes.speaking = false;
              this.scr.classList.remove('speaking');
              this._later(Math.max(700, minT - (performance.now() - start)), advance);
            },
          });
        });
      } else {
        this._later(minT, advance);
      }
    };
    next();
  }
  setSleep(estimate) { this._sleep = estimate; if (this.briefing) this.fillBriefing(this.briefing, estimate); }

  /** Ask NOCTIS: eyes enlarge, the edge glows, the question appears word by word. */
  ask({ q = 'What’s first today?', a = 'Nothing until ten.' } = {}) {
    this._cancel();
    const tok = this.flow;
    this._eyeColor(this.phase === 'night' ? 'night' : 'day');
    this._setMode('voice');
    this.scr.classList.add('listening');
    this.eyes.listening = true;
    this.eyes.setMode('awake');
    this.eyes.pose('voice', { k: 170, c: 20, stagger: 40, ck: 140, cc: 20 });
    const vq = this.el.querySelector('.nx-vq');
    const va = this.el.querySelector('.nx-va');
    va.classList.remove('on');
    vq.textContent = '';
    q.split(' ').forEach((w, k) => { if (k) vq.append(' '); const s = document.createElement('span'); s.textContent = w; vq.append(s); });
    vq.classList.add('on');
    const spans = [...vq.querySelectorAll('span')];
    spans.forEach((s, k) => this._later(520 + k * 170, () => s.classList.add('on')));
    const thinkAt = 520 + spans.length * 170 + 200;
    this._later(thinkAt, () => this.eyes.hold({ lidT: 0.22, gy: -5, gx: 5 }));
    this._later(thinkAt + 420, () => {
      if (tok !== this.flow) return;
      this.eyes.release();
      this.scr.classList.remove('listening');
      this.eyes.listening = false;
      vq.classList.remove('on');
      va.textContent = a;
      va.classList.add('on');
      this.eyes.speaking = true;
      this.scr.classList.add('speaking');
      this._later(2600, () => { this.eyes.speaking = false; this.scr.classList.remove('speaking'); });
      this._later(4600, () => { va.classList.remove('on'); this.rest(); });
    });
  }

  destroy() {
    this._cancel();
    clearInterval(this.tickT);
    clearInterval(this.visT);
    this.ro.disconnect();
    this.eyes.destroy();
    this.el.remove();
  }
}
