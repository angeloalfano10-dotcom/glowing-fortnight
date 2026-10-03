// Settings sheets: location, calendars, Wi-Fi, finish, name, about.

import { el, esc } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';
import { island } from '../ui/island.js';
import { makeSwitch } from '../ui/controls.js';
import { haptic } from '../lib/haptics.js';
import { ctx } from '../ctx.js';
import { group, row, finishPicker, wifiRows, askWifi, connectCalendar } from './common.js';

/** A sheet whose header has a title and a Done button. */
function doneSheet(title, opts) {
  let sheet = null;
  const d = textButton('Done', { strong: true, onClick: () => sheet?.close() });
  sheet = openSheet({ ...opts, head: sheetHead({ title, right: d }), label: title });
  return sheet;
}

/* ---------- Location ---------- */
export function openLocationSheet() {
  const { store, services } = ctx;
  const body = el(`<div class="sheet-pad">
      <div class="search-wrap">${iconStr('search')}<input class="field search" type="search" placeholder="Search for a city" aria-label="Search for a city" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="search"></div>
      <div data-here></div>
      <div data-results></div>
      <div class="caption" style="margin-top:16px">Used for the weather only. Open-Meteo receives coordinates, nothing else.</div>
    </div>`);
  const cancel = textButton('Cancel');
  const sheet = openSheet({ content: body, head: sheetHead({ title: 'Location', left: cancel }), size: 'large', label: 'Location' });
  cancel.addEventListener('click', () => sheet.close());
  const choose = (place) => {
    store.set('location', { ...place, auto: false });
    haptic();
    island(`Weather for ${place.name}`, 'pin');
    sheet.close();
  };
  const here = row({
    ic: 'locate',
    label: 'Use current location',
    chevron: false,
    onClick: async () => {
      here.setValue('Locating');
      try { choose(await services.weather.locate()); } catch { here.setValue('Not available'); }
    },
  });
  body.querySelector('[data-here]').append(group({ rows: [here] }));
  const results = body.querySelector('[data-results]');
  const input = body.querySelector('input');
  let t = 0;
  let q = 0;
  input.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(async () => {
      const mine = ++q;
      const found = await services.weather.search(input.value);
      if (mine !== q) return;
      results.innerHTML = '';
      if (found.length) results.append(group({ rows: found.map((p) => row({ label: p.name, value: p.region || '', chevron: false, onClick: () => choose(p) })) }));
      else if (input.value.trim()) results.append(el('<div class="caption" style="padding:16px 4px">No places found.</div>'));
    }, 250);
  });
  setTimeout(() => input.focus(), 450);
}

/* ---------- Calendars ---------- */
export function openCalendarsSheet() {
  const { services } = ctx;
  const body = el('<div class="sheet-pad"></div>');
  let sheet = null;
  const render = () => {
    body.innerHTML = '';
    const acc = services.calendar.accounts();
    services.calendar.providers().forEach((p) => {
      const a = acc[p.id];
      if (!a) {
        body.append(group({
          head: p.name,
          rows: [row({ ic: 'calendar', label: 'Connect', chevron: false, onClick: async () => { if (await connectCalendar(p.id)) render(); } })],
        }));
        return;
      }
      const rows = a.calendars.map((c) => row({
        label: c.name,
        control: makeSwitch({ checked: c.on, label: c.name, onChange: (v) => { services.calendar.setCalendar(p.id, c.id, v); ctx.rebuildBriefing(); } }),
      }));
      const dis = row({ label: `Disconnect ${p.name}`, chevron: false, cls: 'danger', onClick: async () => { await services.calendar.disconnect(p.id); island(`${p.name} disconnected`, 'calendar'); render(); ctx.rebuildBriefing(); } });
      body.append(group({ head: `${p.name} · ${a.account}`, rows: [...rows, dis] }));
    });
    body.append(el('<div class="caption" style="margin:18px 4px 0">NOCTIS uses only the first event of each morning. Titles and times go from this phone to NOCTIS and nowhere else.</div>'));
  };
  render();
  sheet = doneSheet('Calendars', { content: body, size: 'large', onClose: () => ctx.rebuildBriefing() });
  return sheet;
}

/* ---------- Wi-Fi ---------- */
export function openWifiSheet() {
  const { services, store } = ctx;
  const body = el(`<div class="sheet-pad">
      <div class="caption" style="margin:0 4px 12px">NOCTIS works on 2.4 GHz networks.</div>
      <div data-cur></div><div data-list><div class="caption ob-loading">Looking for networks</div></div>
    </div>`);
  doneSheet('Wi-Fi', { content: body, size: 'large' });
  const cur = body.querySelector('[data-cur]');
  const list = body.querySelector('[data-list]');
  const showCurrent = (txt) => {
    cur.innerHTML = '';
    const ssid = store.state.device.wifi;
    if (!ssid) return;
    cur.append(group({ rows: [row({ label: ssid, control: el(`<span class="rv">${esc(txt || '')}${txt ? '' : iconStr('check')}</span>`) })] }));
  };
  showCurrent();
  const join = async (ssid, password, net) => {
    showCurrent();
    cur.innerHTML = '';
    cur.append(group({ rows: [row({ label: ssid, value: 'Joining' })] }));
    try {
      await services.device.joinWifi(ssid, password);
      store.patch('device', { wifi: ssid });
      island(`Connected to ${ssid}`, 'wifi3');
      showCurrent();
    } catch (e) {
      showCurrent();
      const again = await askWifi(net, { error: e.code === 'wrong-password' ? 'Wrong password. Try again.' : 'That didn’t work. Try again.' });
      if (again) join(again.ssid, again.password, net);
    }
  };
  services.device.wifiNetworks().then((nets) => {
    list.innerHTML = '';
    const others = nets.filter((n) => n.ssid !== store.state.device.wifi);
    const g = wifiRows(others, async (n) => {
      if (n && !n.secure) { join(n.ssid, '', n); return; }
      const r = await askWifi(n);
      if (r) join(r.ssid, r.password, n);
    });
    g.prepend(el('<div class="group-head">Other networks</div>'));
    list.append(g);
  });
}

/* ---------- Finish ---------- */
export function openFinishSheet() {
  const { store } = ctx;
  const picker = finishPicker({
    value: store.state.device.finish,
    size: 240,
    onChange: (k) => store.patch('device', { finish: k }),
  });
  const body = el('<div class="sheet-pad finish-sheet"></div>');
  body.append(picker);
  body.append(el('<div class="caption" style="text-align:center;margin-top:18px">Finishes are design studies. The final range may change.</div>'));
  doneSheet('Finish', { content: body, size: 'auto', onClose: () => setTimeout(() => picker.destroy(), 600) });
}

/* ---------- Name ---------- */
export function openNameSheet() {
  const { store } = ctx;
  const body = el(`<form class="sheet-pad" autocomplete="off">
      <input class="field" name="n" maxlength="24" value="${esc(store.state.device.name)}" aria-label="Name" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="done">
    </form>`);
  const cancel = textButton('Cancel');
  const save = textButton('Save', { strong: true });
  const sheet = openSheet({ content: body, head: sheetHead({ title: 'Name', left: cancel, right: save }), size: 'auto', label: 'Name' });
  const commit = (e) => {
    e?.preventDefault();
    const v = body.n.value.trim();
    if (v) store.patch('device', { name: v });
    sheet.close();
  };
  cancel.addEventListener('click', () => sheet.close());
  save.addEventListener('click', commit);
  body.addEventListener('submit', commit);
  setTimeout(() => { body.n.focus(); body.n.select(); }, 450);
}

/* ---------- About ---------- */
export function openAboutSheet() {
  const st = ctx.services.device.status();
  const body = el(`<div class="sheet-pad about">
      <div class="about-head">
        <div class="wordmark">offhours</div>
        <div class="caption">App 0.1 · NOCTIS OS ${esc(st.firmware || '–')}</div>
      </div>
      ${group({
        head: 'Privacy',
        rows: [
          'Microphone audio is processed on NOCTIS itself. Conversations aren’t stored.',
          'Short recordings are saved to this app only when you turn that on.',
          'Sleep time and snoring are estimates from room sensing. Useful patterns, not measurements.',
          'NOCTIS doesn’t diagnose or treat any sleep condition.',
        ].map((t) => el(`<div class="row wrap"><span class="rl">${esc(t)}</span></div>`)),
      }).outerHTML}
      <div class="group-foot">No analytics, no tracking. The only request this app makes is for the weather, to Open-Meteo.</div>
      <div class="caption" style="text-align:center;margin-top:28px">NOCTIS is not a medical device.<br>© 2026 offhours</div>
    </div>`);
  doneSheet('About', { content: body, size: 'large' });
}
