// Alarms: pushed from the Tonight tile. Every alarm in one calm list (big light
// time, repeat days, a switch), then the wind-down reminder before bed-by.

import { el, esc } from '../lib/dom.js';
import { ctx } from '../ctx.js';
import { clock, nextRing, planFor, fmtMin, fmtParts, daysLabel, relativeDay, DAY_LONG, wrap } from '../lib/time.js';
import { makeSwitch, makeSegmented } from '../ui/controls.js';
import { island } from '../ui/island.js';
import { Eyes } from '../ui/eyes.js';
import { group, row, navbar, bindNavbar } from './common.js';
import { openAlarmSheet } from './alarm.js';
import { stageAway } from './stagehelp.js';

export function createAlarms() {
  const { store } = ctx;
  const nav = navbar('Alarms');
  const root = el('<section class="screen grouped alarms"><div class="scroll"></div></section>');
  root.prepend(nav);
  const scroll = root.querySelector('.scroll');
  bindNavbar(nav, scroll, 70);
  const fmt = (m) => fmtMin(m, store.state.display.clock24);
  let eyes = null;

  const hero = el(`<div class="al-hero">
      <div class="empty-eyes" hidden><div class="eyes-layer"></div></div>
      <h1 class="nx-name">Alarms</h1>
      <div class="nx-status"><i class="dot"></i><span></span></div>
    </div>`);
  const listWrap = el('<div></div>');

  /* ---------- bedtime ---------- */
  const remindSw = makeSwitch({ label: 'Wind-down reminder', checked: store.state.bedtime.remind, onChange: (v) => store.patch('bedtime', { remind: v }) });
  const leadSeg = makeSegmented({
    label: 'Before bed-by',
    value: String(store.state.bedtime.lead),
    options: [15, 30, 45].map((m) => ({ value: String(m), label: `${m} min` })),
    onChange: (v) => store.patch('bedtime', { lead: Number(v) }),
  });
  const remindRow = row({ ic: 'moon', label: 'Wind-down reminder', desc: 'Off', control: remindSw });
  const leadRow = row({ label: 'Before bed-by', control: leadSeg });
  const bedtime = group({
    head: 'Bedtime',
    rows: [remindRow, leadRow],
    foot: 'Bed-by is 7 h 45 before the alarm that rings next: 7 h 30 asleep, plus 15 minutes to drift off.',
  });

  scroll.append(hero, listWrap, bedtime);

  function render() {
    const s = store.state;
    const now = clock.now();
    const next = nextRing(s.alarms, now);
    const p = planFor(s.alarms, now);

    // hero: when the next one rings, or sleeping eyes when there are none
    eyes?.destroy();
    eyes = null;
    const host = hero.querySelector('.empty-eyes');
    host.hidden = s.alarms.length > 0;
    if (!s.alarms.length) {
      eyes = new Eyes(host.firstElementChild, { frame: () => ({ cx: host.clientWidth / 2, cy: host.clientHeight / 2, s: host.clientWidth / 186 }), minArc: 2 });
      eyes.snap('sleep', { closed: 1 });
      eyes.sleep();
    }
    const status = hero.querySelector('.nx-status');
    status.classList.toggle('off', !next);
    const day = next ? (relativeDay(next.at, now) === 'Tomorrow' ? 'tomorrow' : relativeDay(next.at, now) === 'Today' ? 'today' : DAY_LONG[next.at.getDay()]) : '';
    status.querySelector('span').textContent = next
      ? `Rings ${day} at ${fmt(next.alarm.h * 60 + next.alarm.m)}`
      : s.alarms.length ? 'All off. NOCTIS lets you sleep in.' : 'None yet. NOCTIS lets you sleep in.';

    // the list
    const rows = s.alarms.map((a) => {
      const tp = fmtParts(a.h * 60 + a.m, s.display.clock24);
      const isNext = next && next.alarm.id === a.id;
      const r = el(`<div class="row al-row${a.on ? '' : ' off'}">
          <button class="al-open" type="button" aria-label="${esc(`Edit alarm ${tp.time}${tp.ampm ? ` ${tp.ampm}` : ''}, ${daysLabel(a.days)}`)}">
            <span class="al-time">${esc(tp.time)}${tp.ampm ? `<span class="ampm">${tp.ampm}</span>` : ''}</span>
            <span class="al-days">${esc(daysLabel(a.days))}${isNext ? ` · ${esc(day)}` : ''}</span>
          </button>
        </div>`);
      r.append(makeSwitch({
        label: `Alarm ${tp.time}`,
        checked: a.on,
        onChange: (v) => {
          if (v && !a.days.length) { openAlarmSheet(a.id); return; }
          store.saveAlarm({ ...a, on: v });
          island(v ? `Alarm on · ${fmt(a.h * 60 + a.m)}` : 'Alarm off', v ? 'alarm' : 'belloff');
        },
      }));
      r.querySelector('.al-open').addEventListener('click', () => openAlarmSheet(a.id));
      return r;
    });
    const add = row({ ic: 'plus', label: 'New alarm', chevron: false, cls: 'al-add', onClick: () => openAlarmSheet() });

    // one heads-up when the first event sits close to the next alarm
    let note = '';
    const ev = ctx.briefing?.event;
    if (next && p.alarmSet && ev) {
      const gap = ev.startMin - (next.alarm.h * 60 + next.alarm.m);
      if (gap < 0) note = `${ev.title} starts at ${ev.start}, before your alarm.`;
      else if (gap < 45) note = `${ev.title} is at ${ev.start}, ${gap} min after you wake.`;
    }
    listWrap.replaceChildren(group({ rows: [...rows, add], foot: note }));
    if (note) listWrap.querySelector('.group-foot').classList.add('accent');

    remindSw.set(s.bedtime.remind);
    leadSeg.set(String(s.bedtime.lead));
    leadRow.hidden = !s.bedtime.remind;
    remindRow.setDesc(!s.bedtime.remind ? 'Off'
      : p.alarmSet ? `NOCTIS dims at ${fmt(wrap(p.bedMin - s.bedtime.lead))}, bed by ${fmt(p.bedMin)}`
        : 'NOCTIS dims before bed-by');
  }

  const subs = [];
  return {
    el: root,
    kind: 'alarms',
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
