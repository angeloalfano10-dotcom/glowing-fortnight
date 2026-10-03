// Hidden demo panel (press and hold the offhours wordmark). Jump to any screen,
// change the time of day, trigger NOCTIS states and switch sample data.

import { el, esc } from '../lib/dom.js';
import { ctx } from '../ctx.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { makeSwitch, makeSegmented } from '../ui/controls.js';
import { island } from '../ui/island.js';
import { clock, plan, fmtClock, nextAlarm, atMinute, SLEEP_WINDOW } from '../lib/time.js';
import { group, row } from './common.js';

export function openDemo() {
  const { store, services } = ctx;
  const body = el('<div class="sheet-pad demo"></div>');
  let sheet = null;
  const close = () => sheet?.close();

  const chips = (items, onPick, current) => {
    const c = el('<div class="chips"></div>');
    items.forEach(([key, label]) => {
      const b = el(`<button class="chip" type="button" aria-pressed="${current === key}">${esc(label)}</button>`);
      b.addEventListener('click', () => onPick(key, b, c));
      c.append(b);
    });
    return c;
  };
  const sec = (title, node, note = '') => {
    const s = el(`<section class="demo-sec"><div class="label">${esc(title)}</div>${note ? `<div class="caption">${esc(note)}</div>` : ''}</section>`);
    s.append(node);
    body.append(s);
    return s;
  };

  /* screens */
  sec('Screens', chips([
    ['splash', 'Splash'], ['welcome', 'Welcome'], ['pair', 'Pair'], ['wifi', 'Wi-Fi'], ['finish', 'Finish'],
    ['name', 'Name'], ['calendars', 'Calendars'], ['alarm-ob', 'Wake time'], ['ready', 'Ready'],
    ['p0', 'Last night'], ['p1', 'Tonight'], ['p2', 'Tomorrow'], ['alarm', 'Alarm sheet'], ['noctis', 'NOCTIS'], ['update', 'Update'],
  ], (k) => {
    close();
    setTimeout(() => {
      if (k === 'splash') ctx.go.splash();
      else if (k === 'alarm-ob') ctx.go.onboarding('alarm');
      else if (['welcome', 'pair', 'wifi', 'finish', 'name', 'calendars', 'ready'].includes(k)) ctx.go.onboarding(k);
      else if (k[0] === 'p') { store.patch('setup', { done: true }); ctx.go.home({ page: Number(k[1]) }); }
      else if (k === 'alarm') { ctx.ensureHome(); setTimeout(() => ctx.go.alarm(), 300); }
      else if (k === 'noctis') { ctx.ensureHome(); setTimeout(() => ctx.go.noctis(), 300); }
      else if (k === 'update') { ctx.ensureHome(); setTimeout(() => { ctx.go.noctis(); setTimeout(() => ctx.go.update(), 650); }, 300); }
    }, 320);
  }));

  /* time of day */
  const timeNote = el('<div class="caption"></div>');
  const showTime = () => { timeNote.textContent = `${clock.simulated ? 'Simulated' : 'Live'} · ${fmtClock(clock.now(), store.state.display.clock24)}`; };
  showTime();
  const tsec = sec('Time of day', chips([['live', 'Live'], ['morning', 'Morning'], ['day', 'Afternoon'], ['evening', 'Evening'], ['night', 'Night']], (k, b, c) => {
    // Jump around the next real alarm, so evening and night always have one.
    clock.reset();
    const a = store.state.alarm;
    const wake = nextAlarm(a, clock.now()) || plan(a, clock.now()).morning;
    const at = (d) => clock.setOffset(d.getTime() - Date.now());
    const min = 60000;
    if (k === 'morning') at(new Date(wake.getTime() + 25 * min));
    else if (k === 'day') at(atMinute(new Date(wake.getTime() - 24 * 60 * min), 14 * 60 + 20));
    else if (k === 'evening') at(new Date(wake.getTime() - (SLEEP_WINDOW + 95) * min));
    else if (k === 'night') at(new Date(wake.getTime() - (SLEEP_WINDOW - 50) * min));
    c.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    showTime();
  }));
  tsec.querySelector('.label').after(timeNote);

  /* device states */
  sec('NOCTIS', chips([['rest', 'Rest'], ['clock', 'Time'], ['alarm', 'Alarm'], ['briefing', 'Briefing'], ['voice', 'Ask'], ['offline', 'Offline'], ['online', 'Back online'], ['boot', 'Restart']], (k) => {
    if (!services.device.status().paired) { island('Pair NOCTIS first', 'info'); return; }
    close();
    setTimeout(() => {
      if (k === 'offline') { services.device.setOnline(false); return; }
      if (k === 'online') { services.device.setOnline(true); return; }
      ctx.go.noctis();
      setTimeout(() => services.device.simulate(k), 700);
    }, 320);
  }), 'Opens your NOCTIS and plays the state on its screen.');

  /* sample data */
  const sw = (label, checked, fn) => row({ label, control: makeSwitch({ label, checked, onChange: fn }) });
  body.append(group({
    head: 'Sample data',
    rows: [
      sw('Update available', services.device.flags.updateAvailable, (v) => services.device.setFlag('updateAvailable', v)),
      sw('Calendar events', !services.calendar.empty, (v) => { services.calendar.setEmpty(!v); ctx.rebuildBriefing(); }),
      sw('Sleep estimates', services.device.flags.nights, (v) => { services.device.setFlag('nights', v); store.patch('privacy', {}); }),
      sw('Live weather', !services.weather.forceSample, (v) => { services.weather.setForceSample(!v); ctx.rebuildBriefing(); }),
    ],
  }));

  /* look */
  body.append(group({
    head: 'Look',
    rows: [
      row({ label: 'Theme', control: makeSegmented({ label: 'Theme', value: store.state.display.theme, options: [{ value: 'white', label: 'White' }, { value: 'warm', label: 'Warm' }], onChange: (v) => store.patch('display', { theme: v }) }) }),
      row({ label: 'Appearance', control: makeSegmented({ label: 'Appearance', value: store.state.display.appearance, options: [{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], onChange: (v) => store.patch('display', { appearance: v }) }) }),
    ],
  }));

  body.append(group({
    rows: [row({ label: 'Start over', chevron: false, cls: 'danger', onClick: () => ctx.startOver() })],
    foot: 'Everything here is sample data. Bluetooth, the device and calendar sign-in are simulated. Weather is live when there is a connection.',
  }));

  const done = textButton('Done', { strong: true, onClick: close });
  sheet = openSheet({ content: body, head: sheetHead({ title: 'Demo', right: done }), size: 'large', label: 'Demo panel' });
  return sheet;
}

