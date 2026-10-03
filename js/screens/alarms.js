// Alarms: every alarm as a calm card, the next one marked with its bed-by time
// and a heads-up when the first event sits close to it. Bedtime settings below.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { clock, nextRing, planFor, fmtMin, fmtParts, daysLabel, relativeDay, DAY_LONG, wrap, bedMinOf } from '../lib/time.js';
import { makeSwitch, makeSegmented } from '../ui/controls.js';
import { island } from '../ui/island.js';
import { toneName } from '../lib/tones.js';
import { Eyes } from '../ui/eyes.js';
import { popIn } from '../ui/motion.js';
import { panel, group, row } from './common.js';
import { openAlarmSheet } from './alarm.js';
import { stageAway } from './stagehelp.js';

export function createAlarms(shell) {
  const { store } = ctx;
  const add = el(`<button class="roundbtn glass" type="button" aria-label="New alarm">${iconStr('plus')}</button>`);
  add.addEventListener('click', () => openAlarmSheet());
  const P = panel({ cls: 'alarms', label: '', title: 'Alarms', action: add });
  const list = el('<div class="alarm-list"></div>');
  const newCard = el(`<button class="card addcard" type="button">${iconStr('plus')}<span>New alarm</span></button>`);
  newCard.addEventListener('click', () => openAlarmSheet());
  const fmt = (m) => fmtMin(m, store.state.display.clock24);
  let eyes = null;
  let known = null; // alarm ids already shown, so only new ones pop in

  /* ---------- bedtime settings ---------- */
  const remindSw = makeSwitch({ label: 'Wind-down reminder', checked: store.state.bedtime.remind, onChange: (v) => store.patch('bedtime', { remind: v }) });
  const leadSeg = makeSegmented({
    label: 'Remind me',
    value: String(store.state.bedtime.lead),
    options: [15, 30, 45].map((m) => ({ value: String(m), label: `${m} min` })),
    onChange: (v) => store.patch('bedtime', { lead: Number(v) }),
  });
  const remindRow = row({ ic: 'moon', label: 'Wind-down reminder', desc: 'NOCTIS dims and shows bed-by.', control: remindSw });
  const leadRow = row({ label: 'Before bed-by', control: leadSeg });
  const bedtime = group({
    head: 'Bedtime',
    rows: [remindRow, leadRow],
    foot: 'Bed-by is 7\u00a0h\u00a045 before the alarm that rings next: 7\u00a0h\u00a030 asleep, plus 15\u00a0minutes to drift off.',
  });

  P.body.append(list, newCard, bedtime);

  function render() {
    eyes?.destroy();
    eyes = null;
    const s = store.state;
    const now = clock.now();
    const next = nextRing(s.alarms, now);
    P.setLabel(next ? `Next · ${relativeDay(next.at, now)} ${fmt(next.alarm.h * 60 + next.alarm.m)}` : 'No alarm set');
    list.innerHTML = '';
    if (!s.alarms.length) {
      const c = el(`<article class="card empty">
          <div class="empty-eyes"><div class="eyes-layer"></div></div>
          <div class="t1">No alarms.</div>
          <div class="t2">NOCTIS will let you sleep. Add one for the mornings that need it.</div>
        </article>`);
      list.append(c);
      const host = c.querySelector('.empty-eyes');
      eyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2, glow: false });
      eyes.snap('sleep', { closed: 1 });
      eyes.sleep();
    }
    const p = planFor(s.alarms, now);
    const ev = ctx.briefing?.event;
    s.alarms.forEach((a) => {
      const isNext = next && next.alarm.id === a.id;
      const t = fmtParts(a.h * 60 + a.m, s.display.clock24);
      const meta = [];
      if (a.wake.light) meta.push(`${iconStr('sun')}<span>Light from ${esc(fmt(wrap(a.h * 60 + a.m - a.lead)))}</span>`);
      if (a.wake.sound) meta.push(`${iconStr('bell')}<span>${esc(toneName(a.tone))}</span>`);
      if (a.wake.pulse) meta.push(`${iconStr('pulse')}<span>Pulse</span>`);
      let note = '';
      if (isNext && p.alarmSet && ev) {
        const gap = ev.startMin - (a.h * 60 + a.m);
        if (gap < 0) note = `${ev.title} starts at ${ev.start}, before this alarm.`;
        else if (gap < 45) note = `${ev.title} at ${ev.start}, ${gap} min after waking.`;
      }
      const c = el(`<article class="card alarm-card${a.on ? '' : ' off'}">
          <button class="cmain" type="button" aria-label="${esc(`Edit alarm ${t.time}${t.ampm ? ` ${t.ampm}` : ''}, ${daysLabel(a.days)}`)}">
            <div class="clockface big">${esc(t.time)}${t.ampm ? `<span class="ampm">${t.ampm}</span>` : ''}</div>
            <div class="t2">${esc(daysLabel(a.days))}${isNext ? ` · ${esc(relativeDay(next.at, now) === 'Tomorrow' ? 'tomorrow' : DAY_LONG[next.at.getDay()])}` : ''}</div>
            <div class="ameta">${meta.map((m) => `<span>${m}</span>`).join('')}</div>
            ${isNext ? `<div class="anext">${iconStr('bed')}<span>Rings next · bed by ${esc(fmt(bedMinOf(a.h * 60 + a.m)))}</span></div>` : ''}
            ${note ? `<div class="anote">${iconStr('calendar')}<span>${esc(note)}</span></div>` : ''}
          </button>
        </article>`);
      const sw = makeSwitch({
        big: true,
        label: `Alarm ${t.time}`,
        checked: a.on,
        onChange: (v) => {
          if (v && !a.days.length) { openAlarmSheet(a.id); return; }
          store.saveAlarm({ ...a, on: v });
          island(v ? `Alarm on · ${fmt(a.h * 60 + a.m)}` : 'Alarm off', v ? 'alarm' : 'belloff');
        },
      });
      sw.classList.add('card-sw');
      c.append(sw);
      c.querySelector('.cmain').addEventListener('click', () => openAlarmSheet(a.id));
      list.append(c);
      if (known && !known.has(a.id)) popIn(c, { delay: 120 });
    });
    known = new Set(s.alarms.map((a) => a.id));
    remindSw.set(s.bedtime.remind);
    leadSeg.set(String(s.bedtime.lead));
    leadRow.hidden = !s.bedtime.remind;
    remindRow.setDesc(s.bedtime.remind && p.alarmSet
      ? `NOCTIS dims at ${fmt(wrap(p.bedMin - s.bedtime.lead))} and shows bed-by.`
      : s.bedtime.remind ? 'NOCTIS dims and shows bed-by before the next alarm.' : 'Off.');
  }

  const subs = [];
  return {
    el: P.el,
    toTop: P.toTop,
    enter() {
      stageAway();
      render();
      subs.push(store.on(['alarms', 'bedtime', 'display'], render), clock.onChange(render));
      const on = () => render();
      addEventListener('offhours:briefing', on);
      subs.push(() => removeEventListener('offhours:briefing', on));
    },
    leave() { subs.splice(0).forEach((u) => u()); },
    destroy() { eyes?.destroy(); },
  };
}
