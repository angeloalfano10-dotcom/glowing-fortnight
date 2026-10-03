// Your NOCTIS: a live mirror of the device (tap it: the eyes become the colon of
// the time) and every setting, in calm grouped lists.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { DeviceView, FINISHES } from '../ui/device-view.js';
import { makeSwitch, makeSegmented, makeSlider } from '../ui/controls.js';
import { actionSheet } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { push } from '../ui/stack.js';
import { group, row, navbar, bindNavbar } from './common.js';
import { openLocationSheet, openCalendarsSheet, openWifiSheet, openFinishSheet, openNameSheet, openAboutSheet } from './sheets.js';
import { createUpdate } from './update.js';
import { stageInto, stageOutOf } from './stagehelp.js';

export function createNoctis() {
  const { store, services } = ctx;
  const s = store.state;
  const nav = navbar(s.device.name);
  const root = el('<section class="screen grouped noctis"><div class="scroll"></div></section>');
  root.prepend(nav);
  const scroll = root.querySelector('.scroll');
  bindNavbar(nav, scroll, 250);

  const view = new DeviceView({ body: true, theme: s.display.theme, finish: s.device.finish, source: ctx.deviceSource });
  view.eyes.alpha.snap(0);
  const hero = el(`<div class="nx-hero">
      <div class="nx-hero-device"></div>
      <button class="nx-name" type="button" aria-label="Rename"></button>
      <div class="nx-status"><i class="dot"></i><span></span></div>
    </div>`);
  hero.querySelector('.nx-hero-device').append(view.el);
  scroll.append(hero);

  /* ---- controls ---- */
  const sliderRow = (sl) => { const r = el('<div class="row slider-row"></div>'); r.append(sl); return r; };
  const bright = makeSlider({ value: s.display.brightness, label: 'Brightness', iconA: iconStr('sunsm'), iconB: iconStr('sun'), onChange: (v) => store.patch('display', { brightness: v }) });
  const dimSw = makeSwitch({ label: 'Dim with the room', checked: s.display.dimWithRoom, onChange: (v) => store.patch('display', { dimWithRoom: v }) });
  const faceSeg = makeSegmented({ label: 'Resting face', value: s.display.face, options: [{ value: 'eyes', label: 'Eyes' }, { value: 'clock', label: 'Clock' }], onChange: (v) => store.patch('display', { face: v }) });
  const themeSeg = makeSegmented({ label: 'Theme', value: s.display.theme, options: [{ value: 'white', label: 'White' }, { value: 'warm', label: 'Warm' }], onChange: (v) => store.patch('display', { theme: v }) });
  const appearSeg = makeSegmented({ label: 'Appearance', value: s.display.appearance, options: [{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], onChange: (v) => store.patch('display', { appearance: v }) });
  const h24 = makeSwitch({ label: '24-hour time', checked: s.display.clock24, onChange: (v) => store.patch('display', { clock24: v }) });
  const soundSw = makeSwitch({ label: 'Sound', checked: s.sound.on, onChange: (v) => store.patch('sound', { on: v }) });
  const vol = makeSlider({ value: s.sound.volume, label: 'Volume', iconA: iconStr('bell'), iconB: '', onChange: (v) => store.patch('sound', { volume: v }) });
  const speakSw = makeSwitch({ label: 'Speak the briefing', checked: s.sound.speak, onChange: (v) => store.patch('sound', { speak: v }) });
  const senseSw = makeSwitch({ label: 'Room sensing', checked: s.privacy.roomSensing, onChange: (v) => store.patch('privacy', { roomSensing: v }) });
  const recSw = makeSwitch({ label: 'Save short snore clips', checked: s.privacy.recordings, onChange: (v) => store.patch('privacy', { recordings: v }) });
  const voiceSw = makeSwitch({ label: 'Ask NOCTIS', checked: s.privacy.voice, onChange: (v) => store.patch('privacy', { voice: v }) });
  const autoSw = makeSwitch({ label: 'Automatic updates', checked: s.updates.auto, onChange: (v) => store.patch('updates', { auto: v }) });

  const locRow = row({ ic: 'pin', label: 'Location', onClick: openLocationSheet });
  const calRow = row({ ic: 'calendar', label: 'Calendars', onClick: () => openCalendarsSheet() });
  const wifiRow = row({ ic: 'wifi3', label: 'Wi-Fi', onClick: openWifiSheet });
  const finishRow = row({ ic: 'palette', label: 'Finish', onClick: openFinishSheet });
  const updRow = row({ ic: 'update', label: 'Software update', onClick: () => push(createUpdate()) });

  scroll.append(
    group({ rows: [locRow, calRow] }),
    group({
      head: 'Display',
      rows: [
        sliderRow(bright),
        row({ ic: 'sunsm', label: 'Dim with the room', control: dimSw }),
        row({ ic: 'device', label: 'Resting face', control: faceSeg }),
        row({ ic: 'theme', label: 'Theme', control: themeSeg }),
        row({ ic: 'sun', label: 'Appearance', control: appearSeg }),
        row({ ic: 'clock', label: '24-hour time', control: h24 }),
      ],
    }),
    group({ head: 'Sound', rows: [row({ ic: 'bell', label: 'Sound', control: soundSw }), sliderRow(vol), row({ ic: 'wave', label: 'Speak the briefing', control: speakSw })] }),
    group({
      head: 'Privacy',
      rows: [
        row({ ic: 'wave', label: 'Room sensing', control: senseSw }),
        row({ ic: 'mic', label: 'Save short snore clips', control: recSw }),
        row({ ic: 'mic', label: 'Ask NOCTIS', control: voiceSw }),
        row({ ic: 'trash', label: 'Delete sleep data', chevron: false, cls: 'danger-l', onClick: confirmDelete }),
      ],
      foot: 'Microphone audio is processed on NOCTIS and never uploaded. Conversations aren’t stored. Snore clips stay off unless you turn them on, and are saved to this app only.',
    }),
    group({ head: 'NOCTIS', rows: [wifiRow, finishRow, row({ ic: 'update', label: 'Automatic updates', control: autoSw }), updRow, row({ ic: 'info', label: 'About', onClick: openAboutSheet })] }),
    group({ rows: [row({ label: 'Unpair NOCTIS', chevron: false, cls: 'danger', onClick: confirmUnpair })] }),
    el('<div class="caption footnote">NOCTIS is not a medical device. Sleep and snoring are estimates.</div>'),
  );

  hero.querySelector('.nx-name').addEventListener('click', openNameSheet);

  function confirmDelete() {
    actionSheet({
      title: 'Delete your sleep data?',
      message: 'Every night estimate and any saved clips are removed from NOCTIS and this phone.',
      actions: [{
        label: 'Delete sleep data',
        destructive: true,
        onClick: async () => {
          try {
            await services.device.deleteSleepData();
            ctx.sleepCleared = true;
            island('Sleep data deleted', 'trash');
            ctx.refreshNights();
          } catch { island('NOCTIS is offline', 'info'); }
        },
      }],
    });
  }
  function confirmUnpair() {
    actionSheet({
      title: 'Unpair NOCTIS?',
      message: 'It forgets its settings. You can set it up again at any time.',
      actions: [{ label: 'Unpair', destructive: true, onClick: async () => { await services.device.unpair(); ctx.unpaired(); } }],
    });
  }

  /* ---- render ---- */
  let upd = null;
  function render() {
    const st = store.state;
    const ds = services.device.status();
    hero.querySelector('.nx-name').textContent = st.device.name;
    nav.setTitle(st.device.name);
    const status = hero.querySelector('.nx-status');
    status.classList.toggle('off', !ds.connected);
    status.querySelector('span').textContent = ds.connected
      ? `Connected${ctx.room ? ` · room ${ctx.room.temp.toFixed(1)}°` : st.device.wifi ? ` · ${st.device.wifi}` : ''}`
      : 'Offline';
    locRow.setValue(st.location?.name || 'Not set');
    const acc = services.calendar.accounts();
    const names = services.calendar.providers().filter((p) => acc[p.id]).map((p) => p.name.split(' ')[0]);
    calRow.setValue(names.length ? names.join(', ') : 'None');
    wifiRow.setValue(st.device.wifi || 'Not set');
    finishRow.setValue(FINISHES[st.device.finish]?.name || '');
    const v = updRow.querySelector('.rv');
    if (upd?.available) v.innerHTML = '<i class="dot"></i>Available';
    else v.textContent = ds.firmware ? `NOCTIS OS ${ds.firmware}` : '';
    themeSeg.set(st.display.theme);
    appearSeg.set(st.display.appearance);
    faceSeg.set(st.display.face);
    view.setTheme(st.display.theme);
    view.setFinish(st.device.finish);
    view.refresh();
  }
  async function checkUpdate() {
    try { upd = await services.device.checkUpdate(); } catch { upd = null; }
    render();
  }

  let qi = 0;
  function showMode(mode) {
    if (mode === 'briefing') {
      view.setSleep(ctx.nights?.[0]);
      view.setMode('briefing', ctx.briefing);
    } else if (mode === 'voice') {
      const n = ctx.nights?.[0];
      const ev = ctx.briefing?.event;
      const qa = [
        { q: 'How did I sleep?', a: n ? `About ${Math.floor(n.sleepMin / 60)} h ${String(n.sleepMin % 60).padStart(2, '0')}, by my estimate.` : 'I don’t have an estimate yet.' },
        { q: 'What’s first tomorrow?', a: ev ? `${ev.title} at ${ev.start}.` : 'Nothing first thing.' },
        { q: 'What’s the weather tomorrow?', a: ctx.briefing ? `${ctx.briefing.weather.text}, up to ${ctx.briefing.weather.high}°.` : 'I can’t reach the forecast.' },
      ][qi++ % 3];
      view.setMode('voice', qa);
    } else if (mode === 'clock' && store.state.display.face === 'clock') {
      view.setMode('clock', { hold: true });
    } else {
      view.setMode(mode);
    }
  }

  const subs = [];
  let entered = false;
  return {
    el: root,
    kind: 'noctis',
    enter() {
      render();
      if (!entered) {
        entered = true;
        const mode = services.device.status().mode;
        showMode(mode);
        requestAnimationFrame(() => stageInto(view, { mode: view.mode }));
      } else {
        stageInto(view, { mode: view.mode });
      }
      checkUpdate();
      subs.push(
        store.on(['device', 'display', 'location', 'alarms', 'updates'], render),
        services.device.on('mode', (st) => { showMode(st.mode); render(); }),
        services.device.on('status', () => render()),
      );
      const onEv = () => render();
      ['offhours:briefing', 'offhours:room'].forEach((t) => { addEventListener(t, onEv); subs.push(() => removeEventListener(t, onEv)); });
    },
    leave() {
      subs.splice(0).forEach((u) => u());
      stageOutOf(view);
    },
    destroy() { view.destroy(); },
  };
}
