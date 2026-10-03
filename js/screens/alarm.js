// Alarm editor: scroll wheels, live "Bed by", repeat days and wake style.
// Used inline in onboarding and as a sheet from Tonight.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { createWheel } from '../ui/wheel.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { pad, fmtParts, fmtMin, bedMinOf, WEEK, DAY_LETTER, DAY_LONG } from '../lib/time.js';
import { ctx } from '../ctx.js';

const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));
const H24 = Array.from({ length: 24 }, (_, i) => pad(i));
const H12 = Array.from({ length: 12 }, (_, i) => String(i + 1));

/**
 * @param {{alarm:object, clock24:boolean, days?:boolean, wake?:boolean, onChange?:(a:object)=>void}} o
 */
export function alarmEditor({ alarm, clock24, days = true, wake = true, onChange }) {
  const a = JSON.parse(JSON.stringify(alarm));
  a.m = Math.round(a.m / 5) * 5 % 60;
  const root = el(`<div class="alarm-ed">
      <div class="picker"><div class="picker-band"></div></div>
      <div class="bedline t2">${iconStr('bed')}<span>Bed by <b data-bed></b></span></div>
      ${days ? `<div class="ed-sec">
        <div class="label">Repeat</div>
        <div class="days" role="group" aria-label="Repeat on">
          ${WEEK.map((d) => `<button class="day" type="button" data-d="${d}" aria-label="${DAY_LONG[d]}" aria-pressed="${a.days.includes(d)}">${DAY_LETTER[d]}</button>`).join('')}
        </div>
      </div>` : ''}
      ${wake ? `<div class="ed-sec">
        <div class="label">Wake with</div>
        <div class="wake">
          ${[['light', 'sun', 'Light'], ['sound', 'bell', 'Sound'], ['pulse', 'pulse', 'Pulse']].map(([k, ic, l]) =>
            `<button class="tile" type="button" data-w="${k}" aria-pressed="${a.wake[k]}"><span class="circ ${a.wake[k] ? 'on' : ''}">${iconStr(ic)}</span><span class="tl">${l}</span></button>`).join('')}
        </div>
        <div class="caption">Light rises first. Sound follows, softly, over about 25 seconds.</div>
      </div>` : ''}
    </div>`);

  const picker = root.querySelector('.picker');
  const emit = () => {
    const bed = fmtParts(bedMinOf(a.h * 60 + a.m), clock24);
    root.querySelector('[data-bed]').textContent = bed.ampm ? `${bed.time} ${bed.ampm}` : bed.time;
    onChange?.(JSON.parse(JSON.stringify(a)));
  };

  let wh;
  let wap = null;
  if (clock24) {
    wh = createWheel({ values: H24, index: a.h, label: 'Hour', onChange: (i) => { a.h = i; emit(); } });
  } else {
    const pm = a.h >= 12;
    const to24 = () => { const h12 = wh.value + 1; a.h = (h12 % 12) + (wap.value ? 12 : 0); emit(); };
    wh = createWheel({ values: H12, index: (a.h % 12 || 12) - 1, label: 'Hour', onChange: to24 });
    wap = createWheel({ values: ['AM', 'PM'], index: pm ? 1 : 0, loop: false, label: 'AM or PM', cls: 'ampm', onChange: to24 });
  }
  const wm = createWheel({ values: MINUTES, index: a.m / 5, label: 'Minutes', onChange: (i) => { a.m = i * 5; emit(); } });
  const colon = el('<div class="picker-colon" aria-hidden="true"><i></i><i></i></div>');
  picker.append(wh.el, colon, wm.el);
  if (wap) picker.append(wap.el);

  root.querySelectorAll('.day').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.d);
    const on = !a.days.includes(d);
    a.days = on ? [...a.days, d] : a.days.filter((x) => x !== d);
    b.setAttribute('aria-pressed', String(on));
    haptic();
    emit();
  }));
  root.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.w;
    const on = !a.wake[k];
    if (!on && Object.values(a.wake).filter(Boolean).length === 1) {
      island('NOCTIS needs one way to wake you', 'info');
      return;
    }
    a.wake[k] = on;
    b.setAttribute('aria-pressed', String(on));
    b.querySelector('.circ').classList.toggle('on', on);
    haptic();
    emit();
  }));

  emit();
  return {
    el: root,
    get value() { return JSON.parse(JSON.stringify(a)); },
    mount() { wh.mount(); wm.mount(); wap?.mount(); },
  };
}

export function openAlarmSheet() {
  const { store } = ctx;
  const s = store.state;
  const ed = alarmEditor({ alarm: s.alarm, clock24: s.display.clock24 });
  const cancel = textButton('Cancel');
  const save = textButton('Save', { strong: true });
  const sheet = openSheet({
    content: ed.el,
    head: sheetHead({ title: 'Alarm', left: cancel, right: save }),
    size: 'large',
    label: 'Alarm',
  });
  ed.mount();
  cancel.addEventListener('click', () => sheet.close());
  save.addEventListener('click', () => {
    const a = ed.value;
    a.on = a.days.length > 0;
    store.set('alarm', a);
    haptic();
    island(a.on ? `Alarm set for ${fmtMin(a.h * 60 + a.m, s.display.clock24)}` : 'Alarm off', a.on ? 'alarm' : 'belloff');
    sheet.close();
  });
  return sheet;
}

