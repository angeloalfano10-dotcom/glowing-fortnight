// Light haptic tick. Android: Vibration API. iPhone (Safari 18+): toggling a hidden
// <input switch> plays the system haptic. Elsewhere it does nothing.

let label = null;

export function haptic() {
  try {
    if (typeof navigator.vibrate === 'function') { navigator.vibrate(8); return; }
    if (!label) {
      label = document.createElement('label');
      label.setAttribute('aria-hidden', 'true');
      label.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.setAttribute('switch', '');
      input.tabIndex = -1;
      label.append(input);
      document.body.append(label);
    }
    label.click();
  } catch { /* no haptics */ }
}
