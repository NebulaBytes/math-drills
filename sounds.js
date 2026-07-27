let ctx = null;
let muted = false;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

function tone(freq, start, duration, type = 'sine', gain = 0.15) {
  if (muted) return;
  const c = getCtx();
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  amp.gain.value = gain;
  osc.connect(amp).connect(c.destination);
  osc.start(c.currentTime + start);
  amp.gain.setValueAtTime(gain, c.currentTime + start + duration * 0.6);
  amp.gain.linearRampToValueAtTime(0, c.currentTime + start + duration);
  osc.stop(c.currentTime + start + duration);
}

export function playDing() {
  tone(880, 0, 0.12, 'sine');
  tone(1320, 0.08, 0.15, 'sine');
}

export function playBuzz() {
  tone(160, 0, 0.22, 'sawtooth', 0.12);
}

export function playCelebration() {
  [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.18, 'triangle'));
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}
