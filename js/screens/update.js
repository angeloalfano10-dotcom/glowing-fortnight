// Software update for NOCTIS. The eyes look around while checking, look up while
// installing and hop when it is done.

import { el } from '../lib/dom.js';
import { ctx } from '../ctx.js';
import { island } from '../ui/island.js';
import { haptic } from '../lib/haptics.js';
import { navbar } from './common.js';
import { stageTo } from './stagehelp.js';

export function createUpdate() {
  const { services } = ctx;
  const root = el(`<section class="screen update">
      <div class="upd">
        <div class="ob-eyes"><span class="anchor" style="width:150px;height:90px"></span></div>
        <div class="upd-copy">
          <div class="numeral upd-num" data-n hidden></div>
          <h1 class="title" data-t>Checking for updates.</h1>
          <p class="t2" data-s></p>
        </div>
        <div class="upd-foot">
          <button class="pill solid block" type="button" data-go hidden>Update</button>
          <div class="caption" data-c></div>
        </div>
      </div>
    </section>`);
  root.prepend(navbar('Software update'));
  const $ = (k) => root.querySelector(`[data-${k}]`);
  const stage = ctx.stage;
  let alive = true;
  let info = null;

  function set(t, s = '', c = '') { $('t').textContent = t; $('s').textContent = s; $('c').textContent = c; }

  async function check() {
    set('Checking for updates.');
    stage.rest('day');
    stage.usePool('scan', [300, 900]);
    try { info = await services.device.checkUpdate(); } catch { info = null; }
    if (!alive) return;
    stage.usePool('calm', [2500, 6000]);
    if (!info) { set('NOCTIS is offline.', 'Updates need NOCTIS on Wi-Fi.'); return; }
    if (!info.available) {
      set('Up to date.', `NOCTIS OS ${info.version}`);
      return;
    }
    stage.run('notice');
    set(`NOCTIS OS ${info.version}`, info.notes.join(' '), 'Keep NOCTIS plugged in. It takes about a minute.');
    $('go').hidden = false;
  }

  $('go').addEventListener('click', async () => {
    haptic();
    $('go').hidden = true;
    set('Updating.', 'NOCTIS will restart.', 'Keep NOCTIS plugged in.');
    const n = $('n');
    n.hidden = false;
    stage.setMode('awake');
    stage.hold({ gy: -10, wide: 0.15 });
    const r = await services.device.installUpdate((p) => { n.textContent = `${p}%`; });
    if (!alive) return;
    n.hidden = true;
    stage.release();
    stage.setMode('idle');
    stage.run('hop');
    set('Up to date.', `NOCTIS OS ${r.version}`);
    island('NOCTIS is up to date', 'check');
  });

  return {
    el: root,
    enter() { stageTo($('t').closest('.upd').querySelector('.anchor')); if (!info) check(); },
    leave() { alive = false; stage.usePool(null); stage.release(); },
  };
}

