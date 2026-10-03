// Alarm tones, synthesised so they can be previewed without audio files.
// "Dawn" is the arpeggio from the NOCTIS OS prototype. On the device the same
// tone ramps up over about 25 s; here a preview plays for a few seconds.

export const TONES = [
  { id: 'dawn', name: 'Dawn' },
  { id: 'chime', name: 'Soft chime' },
  { id: 'birdsong', name: 'Birdsong' },
];
export const toneName = (id) => TONES.find((t) => t.id === id)?.name || 'Dawn';

let ac = null;
let bus = null;
let timer = 0;

function audio() {
  try {
    ac ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
  } catch { ac = null; }
  return ac;
}

function note(f, t, d, g, type = 'sine') {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = type;
  o.frequency.value = f;
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + 0.012);
  v.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(v).connect(bus);
  o.start(t);
  o.stop(t + d + 0.05);
}

function chirp(t, up = 1) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(2500 * up, t);
  o.frequency.exponentialRampToValueAtTime(4100 * up, t + 0.06);
  o.frequency.exponentialRampToValueAtTime(2900 * up, t + 0.13);
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
  v.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  o.connect(v).connect(bus);
  o.start(t);
  o.stop(t + 0.16);
}

/** Play a short preview of a tone. Must be called from a tap (browser audio rules). */
export function previewTone(id, volume = 0.6) {
  stopTone();
  if (!audio()) return;
  bus = ac.createGain();
  bus.gain.value = Math.max(0.05, volume);
  bus.connect(ac.destination);
  const t0 = ac.currentTime + 0.05;
  if (id === 'chime') {
    [[1046.5, 0], [1318.5, 0.55], [1568, 1.1]].forEach(([f, o]) => {
      note(f, t0 + o, 2.4, 0.09);
      note(f * 2.76, t0 + o, 0.8, 0.012);
    });
  } else if (id === 'birdsong') {
    [0, 0.18, 0.36, 0.95, 1.12, 1.9, 2.05, 2.2].forEach((o, i) => chirp(t0 + o, i % 3 === 2 ? 1.12 : 1));
  } else {
    [587.33, 739.99, 880, 1108.73].forEach((f, i) => {
      note(f, t0 + i * 0.22, 1.8, 0.11);
      note(f * 2, t0 + i * 0.22, 0.6, 0.018, 'triangle');
    });
  }
  timer = setTimeout(stopTone, 3200);
}

export function stopTone() {
  clearTimeout(timer);
  if (bus && ac) {
    const g = bus;
    try {
      g.gain.cancelScheduledValues(ac.currentTime);
      g.gain.setValueAtTime(g.gain.value, ac.currentTime);
      g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
    } catch { /* ignore */ }
    setTimeout(() => g.disconnect(), 400);
  }
  bus = null;
}
