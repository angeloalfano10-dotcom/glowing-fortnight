// Your NOCTIS: a live mirror of the device (tap it and the eyes become the colon
// of the time) and every setting, in calm grouped lists.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { DeviceView, FINISHES } from '../ui/device-view.js';
import { makeSwitch, makeSegmented, makeSlider } from '../ui/controls.js';
import { actionSheet } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { push } from '../ui/stack.js';
import { group, row, panel } from './common.js';
import { openLocationSheet, openCalendarsSheet, openWifiSheet, openFinishSheet, openNameSheet, openAboutSheet } from './sheets.js';
import { createUpdate } from './update.js';
import { stageInto, stageOutOf } from './stagehelp.js';

export function createNoctisTab() {
  const { store, services } = ctx;
  const s = store.state;
  const P = panel({ cls: 'noctis', label: 'Your NOCTIS', title: s.device.name });
  P.el.querySelector('.pbig').addEventListener('click', openNameSheet);
  P.el.querySelector('.pbig').setAttribute('role', 'button');
  P.el.querySelector('.pbig').tabIndex = 0;

  const view = new DeviceView({ body: true, theme: s.display.theme, finish: s.device.finish, source: ctx.deviceSource });
  view.eyes.alpha.snap(0);
  const hero = el(`<article class="card nx-hero">
      <div class="nx-hero-device"></div>
      <div class="nx-status"><i class="dot"></i><span></span></div>
      <div class="caption">Tap NOCTIS to see the time.</div>
    </article>`);
  hero.querySelector('.nx-hero-device').append(view.el);

  /* ---- display ---- */
  const brightVal = el('<span class="rv"></span>');
  const bright = makeSlider({
    value: s.display.brightness,
    label: 'Brightness',
    iconA: iconStr('sunsm'),
    iconB: iconStr('sun'),
    onChange: (v) => { store.patch('display', { brightness: v }); },
  });
  const brightRow = el('<div class="row slider-row"><div class="slider-head"><span class="rl">Brightness</span></div></div>');
  brightRow.querySelector('.slider-head').append(brightVal);
  brightRow.append(bright);
  const dimSw = makeSwitch({ label: 'Dim with the room', checked: s.display.dimWithRoom, onChange: (v) => store.patch('display', { dimWithRoom: v }) });
  const faceSeg = makeSegmented({
    label: 'Resting face',
    value: s.display.face,
    options: [{ value: 'eyes', label: 'Eyes' }, { value: 'clock', label: 'Clock' }],
    onChange: (v) => store.patch('display', { face: v }),
  });
  const themeSeg = makeSegmented({
    label: 'Theme',
    value: s.display.theme,
    options: [{ value: 'white', label: 'White' }, { value: 'warm', label: 'Warm' }],
    onChange: (v) => store.patch('display', { theme: v }),
  });
  const appearSeg = makeSegmented({
    label: 'Appearance',
    value: s.display.appearance,
    options: [{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }],
    onChange: (v) => store.patch('display', { appearance: v }),
  });
  const h24 = makeSwitch({ label: '24-hour time', checked: s.display.clock24, onChange: (v) => store.patch('display', { clock24: v }) });

  /* ---- sound ---- */
  const soundSw = makeSwitch({ label: 'Sound', checked: s.sound.on, onChange: (v) => store.patch('sound', { on: v }) });
  const vol = makeSlider({ value: s.sound.volume, label: 'Volume', iconA: iconStr('bell'), iconB: '', onChange: (v) => store.patch('sound', { volume: v }) });
  const volRow = el('<div class="row slider-row"></div>');
  volRow.append(vol);
  const speakSw = makeSwitch({ label: 'Speak the briefing', checked: s.sound.speak, onChange: (v) => store.patch('sound', { speak: v }) });

  /* ---- connections ---- */
  const calRow = row({ ic: 'calendar', label: 'Calendars', onClick: () => openCalendarsSheet() });
  const locRow = row({ ic: 'cloud', label: 'Weather', desc: 'Used only for the forecast', onClick: openLocationSheet });

  /* ---- privacy ---- */
  const senseSw = makeSwitch({ label: 'Room sensing', checked: s.privacy.roomSensing, onChange: (v) => store.patch('privacy', { roomSensing: v }) });
  const recSw = makeSwitch({ label: 'Save short snore clips', checked: s.privacy.recordings, onChange: (v) => store.patch('privacy', { recordings: v }) });
  const voiceSw = makeSwitch({ label: 'Ask NOCTIS', checked: s.privacy.voice, onChange: (v) => store.patch('privacy', { voice: v }) });

  /* ---- updates ---- */
  const autoSw = makeSwitch({ label: 'Automatic updates', checked: s.updates.auto, onChange: (v) => store.patch('updates', { auto: v }) });
  const updRow = row({ ic: 'update', label: 'Software update', onClick: () => push(createUpdate()) });

  const wifiRow = row({ ic: 'wifi3', label: 'Wi-Fi', onClick: openWifiSheet });
  const finishRow = row({ ic: 'palette', label: 'Finish', onClick: openFinishSheet });

  P.body.append(
    hero,
    group({
      head: 'Display',
      rows: [
        brightRow,
        row({ ic: 'sunsm', label: 'Dim with the room', desc: 'Follows the light sensor, so it never glares at night.', control: dimSw }),
        row({ ic: 'device', label: 'Resting face', control: faceSeg }),
        row({ ic: 'theme', label: 'Theme', control: themeSeg }),
        row({ ic: 'sun', label: 'Appearance', control: appearSeg }),
        row({ ic: 'clock', label: '24-hour time', control: h24 }),
      ],
    }),
    group({ head: 'Sound', rows: [row({ ic: 'bell', label: 'Sound', control: soundSw }), volRow, row({ ic: 'wave', label: 'Speak the briefing', control: speakSw })] }),
    group({ head: 'Connections', rows: [calRow, locRow] }),
    group({
      head: 'Privacy',
      rows: [
        row({ ic: 'mic', label: 'Listening stays on NOCTIS', desc: 'Voice is processed on the device. Conversations aren’t stored.', cls: 'static' }),
        row({ ic: 'wave', label: 'Room sensing', desc: 'Estimates sleep and snoring from sound.', control: senseSw }),
        row({ ic: 'mic', label: 'Save short snore clips', desc: 'Off unless you turn it on. Saved to this app only.', control: recSw }),
        row({ ic: 'dot3', label: 'Ask NOCTIS', desc: 'Hold the screen to ask a question.', control: voiceSw }),
        row({ ic: 'trash', label: 'Delete my sleep data', chevron: false, cls: 'danger-l', onClick: confirmDelete }),
      ],
    }),
    group({
      head: 'Updates',
      rows: [row({ ic: 'update', label: 'Automatic updates', desc: 'Overnight, never close to an alarm.', control: autoSw }), updRow],
    }),
    group({ head: 'NOCTIS', rows: [wifiRow, finishRow, row({ ic: 'info', label: 'About', onClick: openAboutSheet })] }),
    group({ rows: [row({ label: 'Unpair NOCTIS', chevron: false, cls: 'danger', onClick: confirmUnpair })] }),
    el('<p class="disclaimer">NOCTIS is not a medical device and doesn’t diagnose or treat any sleep condition.</p>'),
  );

  function confirmDelete() {
    actionSheet({
      title: 'Delete your sleep data?',
      message: 'Every night estimate and any saved clips are removed from NOCTIS and this phone. This can’t be undone.',
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
    P.setTitle(st.device.name);
    const status = hero.querySelector('.nx-status');
    status.classList.toggle('off', !ds.connected);
    status.querySelector('span').textContent = ds.connected ? `Online${st.device.wifi ? ` · ${st.device.wifi}` : ''}${ds.firmware ? ` · NOCTIS OS ${ds.firmware}` : ''}` : 'Offline';
    brightVal.textContent = `${Math.round(st.display.brightness * 100)}%`;
    const acc = services.calendar.accounts();
    const names = services.calendar.providers().filter((p) => acc[p.id]).map((p) => p.name.split(' ')[0]);
    calRow.setValue(names.length ? names.join(', ') : 'None');
    locRow.setValue(st.location?.name || 'Not set');
    wifiRow.setValue(st.device.wifi || 'Not set');
    finishRow.setValue(FINISHES[st.device.finish]?.name || '');
    const v = updRow.querySelector('.rv');
    if (upd?.available) v.innerHTML = '<i class="dot"></i>Available';
    else v.textContent = ds.firmware ? `${ds.firmware}` : '';
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
  return {
    el: P.el,
    toTop: P.toTop,
    enter() {
      render();
      showMode(services.device.status().mode);
      stageInto(view, { mode: view.mode });
      checkUpdate();
      subs.push(
        store.on(['device', 'display', 'location', 'alarms', 'updates'], render),
        services.device.on('mode', (st) => { showMode(st.mode); render(); }),
        services.device.on('status', () => render()),
      );
      const onCal = () => render();
      addEventListener('offhours:briefing', onCal);
      subs.push(() => removeEventListener('offhours:briefing', onCal));
    },
    leave() {
      subs.splice(0).forEach((u) => u());
      stageOutOf(view);
    },
    destroy() { view.destroy(); },
  };
}
