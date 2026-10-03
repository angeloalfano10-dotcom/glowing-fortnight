// Moving the app's one pair of eyes between places, including into and out of a
// device screen (where the device's own eyes take over once they land).

import { ctx } from '../ctx.js';
import { deviceEye } from '../ui/device-view.js';
import { prefersReducedMotion } from '../lib/spring.js';

const take = () => {
  const from = ctx.stageFrom;
  const hide = ctx.stageFromHide;
  ctx.stageFrom = null;
  ctx.stageFromHide = null;
  return { from, hide };
};

/** Send the stage eyes to an anchor, starting from wherever they were handed off. */
export function stageTo(anchor, opts = {}) {
  const { from, hide } = take();
  if (from) hide?.();
  ctx.stage.attach(anchor, { ...opts, from });
}

/** Forget any pending hand-off and put the stage eyes away (screens without eyes). */
export function stageAway() {
  take();
  ctx._intoToken = (ctx._intoToken || 0) + 1;
  ctx.stage.detach({ now: true });
}

/**
 * Fly the stage eyes into a DeviceView's screen and hand over to its own eyes.
 * mode: what the device shows (idle and sleep hand over; anything else just fades).
 */
export function stageInto(view, { mode = 'idle' } = {}) {
  const stage = ctx.stage;
  const { from, hide } = take();
  const token = (ctx._intoToken = (ctx._intoToken || 0) + 1);
  const same = mode === 'idle' || mode === 'sleep';
  const inFlight = from || stage.alpha.v > 0.05;
  // Only fly to a device that is on screen (not one scrolled below the fold).
  const target = stage.frameOf(view.scr);
  const onScreen = !!target && target.cy > 0 && target.cy < ctx.root.offsetHeight;
  if (!inFlight || !same || !onScreen || prefersReducedMotion()) {
    // Nothing to fly: the device simply shows its own eyes.
    if (from) hide?.();
    view.eyes.alpha.snap(1);
    stage.detach({ now: !inFlight });
    return;
  }
  const [eye, glow] = deviceEye(view.theme, mode === 'sleep' ? 'night' : 'day');
  view.eyes.alpha.snap(0);
  if (from) hide?.();
  stage.attach(view.scr, { eye, glow, from });
  stage.endBeh();
  if (mode === 'sleep') stage.sleep(); else stage.rest('day');
  view.eyes.endBeh();
  stage.landed().then(() => {
    if (token !== ctx._intoToken || stage.anchor !== view.scr) return;
    view.eyes.alpha.snap(1);
    stage.detach({ now: true });
  });
}

/** Leave a DeviceView: its eyes become the starting point for the next stageTo / stageInto. */
export function stageOutOf(view) {
  ctx._intoToken = (ctx._intoToken || 0) + 1;
  const visible = view.eyes.alpha.v > 0.5 && (view.mode === 'idle' || view.mode === 'sleep');
  const frame = visible ? ctx.stage.frameOf(view.scr) : null;
  if (!frame || frame.cy < 0 || frame.cy > ctx.root.offsetHeight) { ctx.stageFrom = null; ctx.stageFromHide = null; return; }
  ctx.stageFrom = frame;
  ctx.stageFromHide = () => view.eyes.alpha.snap(0);
  if (view.mode === 'sleep') ctx.stage.sleep(); else ctx.stage.rest('day');
}
