// Profile: you, not the device. Your name for the greeting, what NOCTIS is
// connected to, how the app looks, and your privacy and data.
// There is no account: everything stays on this phone and your NOCTIS.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { makeSwitch, makeSegmented } from '../ui/controls.js';
import { actionSheet } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { setNumeric } from '../ui/motion.js';
import { panel, group, row } from './common.js';
import { openLocationSheet, openCalendarsSheet, openNameSheet, openAboutSheet } from './sheets.js';
import { stageAway } from './stagehelp.js';

export function createProfile() {
  const { store, services } = ctx;
  const s = store.state;
  const P = panel({ cls: 'profile', label: 'No account needed', title: 'Profile' });

  /* ---- you ---- */
  const me = el(`<button class="card me" type="button" aria-label="Your name">
      <span class="avatar" aria-hidden="true"></span>
      <span class="me-t"><span class="me-name"></span><span class="me-sub">Everything stays on this phone and your NOCTIS.</span></span>
      ${iconStr('chev')}
    </button>`);
  me.addEventListener('click', () => openNameSheet('profile'));
  const stats = el(`<div class="card pstats">
      <div><b data-s="nights">–</b><span>Nights</span></div>
      <div><b data-s="alarms">–</b><span>Alarms on</span></div>
      <div><b data-s="cals">–</b><span>Calendars</span></div>
    </div>`);

  /* ---- connections ---- */
  const calRow = row({ ic: 'calendar', label: 'Calendars', onClick: () => openCalendarsSheet() });
  const locRow = row({ ic: 'cloud', label: 'Weather', desc: 'Used only for the forecast', onClick: openLocationSheet });

  /* ---- appearance ---- */
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

  /* ---- privacy ---- */
  const senseSw = makeSwitch({ label: 'Room sensing', checked: s.privacy.roomSensing, onChange: (v) => store.patch('privacy', { roomSensing: v }) });
  const recSw = makeSwitch({ label: 'Save short snore clips', checked: s.privacy.recordings, onChange: (v) => store.patch('privacy', { recordings: v }) });
  const voiceSw = makeSwitch({ label: 'Ask NOCTIS', checked: s.privacy.voice, onChange: (v) => store.patch('privacy', { voice: v }) });

  P.body.append(
    me,
    stats,
    group({ head: 'Connections', rows: [calRow, locRow], foot: 'NOCTIS reads your first event and the forecast over Wi-Fi to build its morning briefing.' }),
    group({
      head: 'Appearance',
      rows: [
        row({ ic: 'theme', label: 'Theme', desc: 'The app and NOCTIS share it', control: themeSeg }),
        row({ ic: 'sun', label: 'Light or dark', control: appearSeg }),
      ],
    }),
    group({
      head: 'Privacy',
      rows: [
        row({ ic: 'lockon', label: 'Listening stays on NOCTIS', desc: 'Voice is processed on the device. Conversations aren’t stored.', cls: 'static' }),
        row({ ic: 'wave', label: 'Room sensing', desc: 'Estimates sleep and snoring from sound.', control: senseSw }),
        row({ ic: 'mic', label: 'Save short snore clips', desc: 'Off unless you turn it on. Saved to this app only.', control: recSw }),
        row({ ic: 'dot3', label: 'Ask NOCTIS', desc: 'Hold the screen to ask a question.', control: voiceSw }),
        row({ ic: 'trash', label: 'Delete my sleep data', chevron: false, cls: 'danger-l', onClick: confirmDelete }),
      ],
    }),
    group({
      head: 'offhours',
      rows: [
        row({ ic: 'info', label: 'About and privacy', onClick: openAboutSheet }),
        row({ ic: 'device', label: 'Replay the intro', chevron: false, onClick: () => ctx.go.splash() }),
      ],
    }),
    el('<p class="disclaimer">No analytics, no tracking. NOCTIS is not a medical device.</p>'),
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

  function render() {
    const st = store.state;
    const name = st.profile.name.trim();
    me.querySelector('.avatar').innerHTML = name ? esc(name[0].toUpperCase()) : iconStr('person');
    me.querySelector('.me-name').textContent = name || 'Add your name';
    me.classList.toggle('noname', !name);
    const acc = services.calendar.accounts();
    const names = services.calendar.providers().filter((p) => acc[p.id]).map((p) => p.name.split(' ')[0]);
    calRow.setValue(names.length ? names.join(', ') : 'None');
    locRow.setValue(st.location?.name || 'Not set');
    setNumeric(stats.querySelector('[data-s="nights"]'), String(ctx.nights?.length ?? 0));
    setNumeric(stats.querySelector('[data-s="alarms"]'), String(st.alarms.filter((a) => a.on).length));
    setNumeric(stats.querySelector('[data-s="cals"]'), String(names.length));
    themeSeg.set(st.display.theme);
    appearSeg.set(st.display.appearance);
    senseSw.set(st.privacy.roomSensing);
    recSw.set(st.privacy.recordings);
    voiceSw.set(st.privacy.voice);
  }
  render();

  const subs = [];
  return {
    el: P.el,
    toTop: P.toTop,
    enter() {
      stageAway();
      render();
      subs.push(store.on(['profile', 'display', 'privacy', 'location', 'alarms'], render));
      const on = () => render();
      ['offhours:nights', 'offhours:briefing'].forEach((t) => { addEventListener(t, on); subs.push(() => removeEventListener(t, on)); });
    },
    leave() { subs.splice(0).forEach((u) => u()); },
  };
}
