// Moving the app's one pair of eyes between places, including into and out of a
// device screen (where the device's own eyes take over once they land).

import { ctx } from '../ctx.js';
import { deviceEye } from '../ui/device-view.js';

/** Send the stage eyes to an anchor, starting from wherever they were handed off. */
export function stageTo(anchor, opts = {}) {
  const from = ctx.stageFrom;
  ctx.stageFrom = null;
  if (from) ctx.stageFromHide?.();
  ctx.stageFromHide = null;
  ctx.stage.attach(anchor, { ...opts, from });
}

/** Fly the stage eyes into a DeviceView's screen and hand over to its eyes. */
export function stageInto(view, { mode = 'idle' } = {}) {
  const stage = ctx.stage;
  const theme = view.theme;
  const [eye, glow] = deviceEye(theme, mode === 'sleep' ? 'night' : 'day');
  const same = mode === 'idle' || mode === 'sleep';
  view.eyes.alpha.snap(same ? 0 : 1);
  stageTo(view.scr, { eye, glow });
  stage.endBeh();
  if (mode === 'sleep') stage.sleep(); else if (same) stage.rest('day');
  const token = (ctx._intoToken = (ctx._intoToken || 0) + 1);
  if (!same) { stage.detach(); return; }
  view.eyes.endBeh();
  stage.landed().then(() => {
    if (token !== ctx._intoToken || stage.anchor !== view.scr) return;
    view.eyes.alpha.snap(1);
    stage.detach({ now: true });
  });
}

/** Mark a DeviceView as the starting point for the next stageTo(). */
export function stageOutOf(view) {
  ctx._intoToken = (ctx._intoToken || 0) + 1;
  if (view.eyes.alpha.v > 0.5 && (view.mode === 'idle' || view.mode === 'sleep')) {
    ctx.stageFrom = view.scr;
    ctx.stageFromHide = () => view.eyes.alpha.snap(0);
    if (view.mode === 'sleep') ctx.stage.sleep(); else ctx.stage.rest('day');
  }
}
