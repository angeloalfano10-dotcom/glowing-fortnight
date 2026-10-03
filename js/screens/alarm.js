// Alarm editor: scroll wheels, live "Bed by", repeat days, and how NOCTIS wakes
// you (light first, then a tone, then a quiet pulse). Used inline in onboarding
// (time and days only) and as a sheet from the Alarms tab.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { createWheel } from '../ui/wheel.js';
import { openSheet, sheetHead, textButton, actionSheet } from '../ui/sheet.js';
import { makeSegmented } from '../ui/controls.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { previewTone, stopTone, TONES } from '../lib/tones.js';
import { pad, fmtParts, fmtMin, bedMinOf, wrap, WEEK, DAY_LETTER, DAY_LONG } from '../lib/time.js';
import { newAlarm } from '../lib/store.js';
import { ctx } from '../ctx.js';

const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));
const H24 = Array.from({ length: 24 }, (_, i) => pad(i));
const H12 = Array.from({ length: 12 }, (_, i) => String(i + 1));

/**
 * @param {{alarm:object, clock24:boolean, full?:boolean, onChange?:(a:object)=>void}} o
 *   full: also show wake style, light timing and tone.
 */
export function alarmEditor({ alarm, clock24, full = true, onChange }) {
  const a = JSON.parse(JSON.stringify(alarm));
  a.m = (Math.round(a.m / 5) * 5) % 60;
  const root = el(`<div class="alarm-ed">
      <div class="picker"><div class="picker-band"></div></div>
      <div class="bedline t2">${iconStr('bed')}<span>Bed by <b data-bed></b></span></div>
      <div class="ed-sec">
        <div class="label">Repeat</div>
        <div class="days" role="group" aria-label="Repeat on">
          ${WEEK.map((d) => `<button class="day" type="button" data-d="${d}" aria-label="${DAY_LONG[d]}" aria-pressed="${a.days.includes(d)}">${DAY_LETTER[d]}</button>`).join('')}
        </div>
      </div>
      ${full ? `<div class="ed-sec">
        <div class="label">Wake with</div>
        <div class="wake">
          ${[['light', 'sun', 'Light'], ['sound', 'bell', 'Sound'], ['pulse', 'pulse', 'Pulse']].map(([k, ic, l]) =>
            `<button class="tile" type="button" data-w="${k}" aria-pressed="${a.wake[k]}"><span class="circ ${a.wake[k] ? 'on' : ''}">${iconStr(ic)}</span><span class="tl">${l}</span></button>`).join('')}
        </div>
      </div>
      <div class="ed-sec" data-sec="light">
        <div class="ed-row"><div class="label">Light starts, before the alarm</div><div data-lead></div></div>
        <div class="caption" data-leadnote></div>
      </div>
      <div class="ed-sec" data-sec="sound">
        <div class="label">Tone</div>
        <div class="group tones" role="radiogroup" aria-label="Tone">
          ${TONES.map((t) => `<button class="row" type="button" role="radio" data-tone="${t.id}" aria-checked="${a.tone === t.id}"><span class="rl">${esc(t.name)}</span><span class="rv tone-check">${iconStr('check')}</span></button>`).join('')}
        </div>
        <div class="caption">Tap a tone to hear it. On NOCTIS it starts softly and rises over about 25 seconds.</div>
      </div>` : ''}
    </div>`);

  const picker = root.querySelector('.picker');
  const sync = () => {
    const bed = fmtParts(bedMinOf(a.h * 60 + a.m), clock24);
    root.querySelector('[data-bed]').textContent = bed.ampm ? `${bed.time} ${bed.ampm}` : bed.time;
    if (full) {
      root.querySelector('[data-sec="light"]').hidden = !a.wake.light;
      root.querySelector('[data-sec="sound"]').hidden = !a.wake.sound;
      root.querySelector('[data-leadnote]').textContent = `The screen begins to glow at ${fmtMin(wrap(a.h * 60 + a.m - a.lead), clock24)}.`;
    }
    onChange?.(JSON.parse(JSON.stringify(a)));
  };

  let wh;
  let wap = null;
  if (clock24) {
    wh = createWheel({ values: H24, index: a.h, label: 'Hour', onChange: (i) => { a.h = i; sync(); } });
  } else {
    const to24 = () => { const h12 = wh.value + 1; a.h = (h12 % 12) + (wap.value ? 12 : 0); sync(); };
    wh = createWheel({ values: H12, index: (a.h % 12 || 12) - 1, label: 'Hour', onChange: to24 });
    wap = createWheel({ values: ['AM', 'PM'], index: a.h >= 12 ? 1 : 0, loop: false, label: 'AM or PM', cls: 'ampm', onChange: to24 });
  }
  const wm = createWheel({ values: MINUTES, index: a.m / 5, label: 'Minutes', onChange: (i) => { a.m = i * 5; sync(); } });
  picker.append(wh.el, el('<div class="picker-colon" aria-hidden="true"><i></i><i></i></div>'), wm.el);
  if (wap) picker.append(wap.el);

  root.querySelectorAll('.day').forEach((b) => b.addEventListener('click', () => {
    const d = Number(b.dataset.d);
    const on = !a.days.includes(d);
    a.days = on ? [...a.days, d] : a.days.filter((x) => x !== d);
    b.setAttribute('aria-pressed', String(on));
    haptic();
    sync();
  }));

  if (full) {
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
      sync();
    }));
    root.querySelector('[data-lead]').append(makeSegmented({
      label: 'Light starts',
      value: String(a.lead),
      options: [10, 20, 30].map((m) => ({ value: String(m), label: `${m} min` })),
      onChange: (v) => { a.lead = Number(v); sync(); },
    }));
    root.querySelectorAll('[data-tone]').forEach((b) => b.addEventListener('click', () => {
      a.tone = b.dataset.tone;
      root.querySelectorAll('[data-tone]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      previewTone(a.tone, ctx.store.state.sound.volume);
      sync();
    }));
  }

  sync();
  return {
    el: root,
    get value() { return JSON.parse(JSON.stringify(a)); },
    mount() { wh.mount(); wm.mount(); wap?.mount(); },
  };
}

/** Edit an alarm (id) or create a new one (no id). */
export function openAlarmSheet(id = null) {
  const { store } = ctx;
  const s = store.state;
  const existing = id ? s.alarms.find((x) => x.id === id) : null;
  const base = existing || newAlarm({ h: s.alarms[0]?.h ?? 7, m: s.alarms[0]?.m ?? 0, days: [0, 1, 2, 3, 4, 5, 6] });
  const ed = alarmEditor({ alarm: base, clock24: s.display.clock24 });
  if (existing) {
    const del = el('<div class="ed-sec"><div class="group"><button class="row danger" type="button"><span class="rl">Delete alarm</span></button></div></div>');
    ed.el.append(del);
    del.querySelector('button').addEventListener('click', () => {
      actionSheet({
        title: 'Delete this alarm?',
        actions: [{ label: 'Delete alarm', destructive: true, onClick: () => { store.removeAlarm(existing.id); island('Alarm deleted', 'belloff'); sheet.close(); } }],
      });
    });
  }
  const cancel = textButton('Cancel');
  const save = textButton('Save', { strong: true });
  const sheet = openSheet({
    content: ed.el,
    head: sheetHead({ title: existing ? 'Alarm' : 'New alarm', left: cancel, right: save }),
    size: 'large',
    label: existing ? 'Edit alarm' : 'New alarm',
    onClose: stopTone,
  });
  ed.mount();
  cancel.addEventListener('click', () => sheet.close());
  save.addEventListener('click', () => {
    const a = ed.value;
    a.on = a.days.length > 0;
    store.saveAlarm(a);
    haptic();
    island(a.on ? `Alarm set for ${fmtMin(a.h * 60 + a.m, s.display.clock24)}` : 'Alarm off', a.on ? 'alarm' : 'belloff');
    sheet.close();
  });
  return sheet;
}
