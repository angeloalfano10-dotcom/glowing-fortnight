// Text to speech for the briefing preview, with the same voice choice as the
// device prototype. On NOCTIS itself the audio would come from cloud TTS.

let voice = null;

function pickVoice() {
  try {
    const vs = speechSynthesis.getVoices();
    for (const p of ['Samantha', 'Serena', 'Karen', 'Moira', 'Google UK English Female', 'Microsoft Sonia', 'Microsoft Libby', 'Daniel']) {
      const v = vs.find((x) => x.name.includes(p));
      if (v) return v;
    }
    return vs.find((v) => /^en[-_]GB/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null;
  } catch { return null; }
}

export const canSpeak = () => 'speechSynthesis' in window;

/** Speak text; always calls onend (with a timed fallback if the engine stays silent). */
export function speak(text, { onend, volume = 1 } = {}) {
  let done = false;
  let fb = 0;
  const finish = () => { if (done) return; done = true; clearTimeout(fb); onend?.(); };
  const est = text.split(/\s+/).length * 330 + 600;
  if (!canSpeak()) { fb = setTimeout(finish, est); return finish; }
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    voice = voice || pickVoice();
    if (voice) u.voice = voice;
    u.rate = 0.97;
    u.volume = volume;
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
    fb = setTimeout(finish, est * 2.2 + 2500);
  } catch {
    fb = setTimeout(finish, est);
  }
  return finish;
}

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}
