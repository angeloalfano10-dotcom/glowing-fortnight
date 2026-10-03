// Tomorrow's briefing, previewed on a NOCTIS screen: the cards play the way the
// device will show them. Play speaks it, Send puts it on NOCTIS now.

import { el } from '../lib/dom.js';
import { iconStr } from '../ui/icons.js';
import { ctx } from '../ctx.js';
import { clock, planFor, relativeDay } from '../lib/time.js';
import { DeviceView } from '../ui/device-view.js';
import { openSheet, sheetHead, textButton } from '../ui/sheet.js';

export function openBriefingSheet() {
  const { store, services } = ctx;
  const body = el(`<div class="sheet-pad brief-sheet">
      <div class="preview"></div>
      <div class="t2 bstatus" data-b="status"></div>
      <div class="caption bnote" data-b="note"></div>
      <div class="pills">
        <button class="pill ghost" type="button" data-play>${iconStr('play')}<span>Play</span></button>
        <button class="pill solid" type="button" data-send><span>Send now</span></button>
      </div>
      <p class="caption bexplain">Your phone builds the briefing each evening from the forecast and your calendar. NOCTIS shows and speaks it after the alarm, and adds its own sleep estimate.</p>
    </div>`);
  const B = (k) => body.querySelector(`[data-b="${k}"]`);
  const preview = new DeviceView({ body: false, theme: store.state.display.theme, tappable: true, source: ctx.deviceSource });
  body.querySelector('.preview').append(preview.el);
  const playBtn = body.querySelector('[data-play]');
  const sendBtn = body.querySelector('[data-send]');
  let playing = false;

  const loop = () => {
    if (ctx.briefing) preview.playBriefing(ctx.briefing, { loop: true });
    else preview.setMode('idle');
  };
  const setPlay = () => { playBtn.innerHTML = playing ? `${iconStr('stop')}<span>Stop</span>` : `${iconStr('play')}<span>Play</span>`; };
  playBtn.addEventListener('click', () => {
    if (!ctx.briefing) return;
    if (playing) { playing = false; setPlay(); loop(); return; }
    playing = true;
    setPlay();
    const s = store.state;
    preview.playBriefing(ctx.briefing, {
      speak: true,
      volume: s.sound.volume,
      onEnd: () => { playing = false; setPlay(); loop(); },
    });
  });
  sendBtn.addEventListener('click', () => ctx.sendBriefing({ manual: true }));

  function render() {
    const b = ctx.briefing;
    const st = services.device.status();
    B('status').textContent = ctx.briefingStatus();
    const notes = [];
    if (b?.event?.beforeAlarm) notes.push(`${b.event.title} starts before your alarm.`);
    if (b?.weather.source === 'sample') notes.push('Sample weather. Live weather loads with a connection.');
    B('note').textContent = notes.join(' ');
    const sent = ctx.briefingSent();
    sendBtn.disabled = !st.connected || !b;
    sendBtn.innerHTML = sent ? `${iconStr('check')}<span>Sent</span>` : '<span>Send now</span>';
    sendBtn.classList.toggle('ghost', !!sent);
    sendBtn.classList.toggle('solid', !sent);
    playBtn.disabled = !b;
  }

  const now = clock.now();
  const day = relativeDay(planFor(store.state.alarms, now).morning, now);
  const title = day === 'Tomorrow' ? 'Tomorrow’s briefing' : day === 'Today' ? 'This morning’s briefing' : `${day}’s briefing`;
  const subs = [];
  let sheet = null;
  const done = textButton('Done', { strong: true, onClick: () => sheet?.close() });
  sheet = openSheet({
    content: body,
    head: sheetHead({ title, right: done }),
    size: 'large',
    label: title,
    onClose: () => { subs.forEach((u) => u()); setTimeout(() => preview.destroy(), 600); },
  });
  const onBrief = () => { render(); if (!playing) loop(); };
  addEventListener('offhours:briefing', onBrief);
  subs.push(() => removeEventListener('offhours:briefing', onBrief));
  subs.push(store.on('briefing', render), services.device.on('status', render));
  render();
  requestAnimationFrame(loop);
  return sheet;
}

