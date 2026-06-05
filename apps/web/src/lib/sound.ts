/* ============================================================
   BURRACO — Suoni sintetizzati con WebAudio (nessun file).
   Rispetta soundEnabled e mute di background.
   ============================================================ */

let _ctx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  return _ctx;
}

let _enabled = localStorage.getItem('burraco_sound') !== 'off';
export const soundEnabled = (): boolean => _enabled;
export const setSoundEnabled = (v: boolean): void => {
  _enabled = v;
  localStorage.setItem('burraco_sound', v ? 'on' : 'off');
};

let _vibration = localStorage.getItem('burraco_vibration') !== 'off';
export const vibrationEnabled = (): boolean => _vibration;
export const setVibrationEnabled = (v: boolean): void => {
  _vibration = v;
  localStorage.setItem('burraco_vibration', v ? 'on' : 'off');
};
/** Vibra solo se la vibrazione è attiva e supportata. */
export function vibrate(pattern: number | number[]): void {
  if (_vibration && 'vibrate' in navigator) navigator.vibrate(pattern);
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'sine',
  vol = 0.22,
  delay = 0,
): void {
  if (!_enabled) return;
  const ac = ctx();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + delay);
  gain.gain.setValueAtTime(0, ac.currentTime + delay);
  gain.gain.linearRampToValueAtTime(vol, ac.currentTime + delay + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + dur);
  osc.start(ac.currentTime + delay);
  osc.stop(ac.currentTime + delay + dur + 0.05);
}

function click(vol = 0.08, delay = 0): void {
  if (!_enabled) return;
  const ac = ctx();
  const len = Math.floor(ac.sampleRate * 0.04);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, ac.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + 0.04);
  src.connect(gain);
  gain.connect(ac.destination);
  src.start(ac.currentTime + delay);
}

/** Rumore bianco breve = fruscio di carta (dal vecchio sfxCard). */
function shuffleNoise(vol = 0.18, dur = 0.06, delay = 0): void {
  if (!_enabled) return;
  const ac = ctx();
  const t = ac.currentTime + delay;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + dur);
}

export const sfx = {
  /** Tick del timer (dal vecchio progetto): sine 660Hz, 900Hz quando urgente (≤10s). */
  tick(urgent: boolean): void {
    tone(urgent ? 900 : 660, 0.09, 'sine', 0.13);
  },
  /** Singola carta distribuita: fruscio di volo + click morbido all'atterraggio. */
  dealCard(pitch = 1): void {
    if (!_enabled) return;
    const ac = ctx(), t = ac.currentTime;
    // fruscio di volo (rumore bianco bandpass) — dal vecchio sfxDeal
    const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.18), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.8);
    const src = ac.createBufferSource(); src.buffer = buf;
    const filt = ac.createBiquadFilter(); filt.type = 'bandpass';
    filt.frequency.setValueAtTime(1200 * pitch, t);
    filt.frequency.linearRampToValueAtTime(400 * pitch, t + 0.22);
    filt.Q.value = 0.5;
    const g = ac.createGain(); g.gain.setValueAtTime(0.10, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start(t); src.stop(t + 0.22);
    // click morbido d'atterraggio
    const o = ac.createOscillator(), og = ac.createGain();
    o.type = 'triangle'; o.frequency.value = 140 * pitch;
    og.gain.setValueAtTime(0.045, t + 0.19); og.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    o.connect(og); og.connect(ac.destination); o.start(t + 0.19); o.stop(t + 0.30);
  },
  draw(): void {
    // click acuto 900→300 + fruscio carta (dal vecchio sfxDraw)
    tone(900, 0.09, 'triangle', 0.22);
    tone(300, 0.001, 'triangle', 0.001, 0.08);
    shuffleNoise(0.18, 0.06);
  },
  discard(): void {
    // "plop" basso 220→80 (dal vecchio sfxDiscard)
    const ac = ctx(), t = ac.currentTime;
    if (!_enabled) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(80, t + 0.12);
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 0.13);
  },
  meld(): void {
    // accordo ascendente 4 note (dal vecchio sfxMeld)
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'sine', 0.18, i * 0.07));
  },
  yourTurn(): void {
    // "ding-dong" gentile 440→660 + aptico
    tone(440, 0.22, 'sine', 0.18);
    tone(660, 0.22, 'sine', 0.18, 0.12);
    vibrate([80, 40, 80]);
  },
  oppAction(): void {
    // "tick" morbido (dal vecchio sfxOppAction)
    tone(660, 0.1, 'sine', 0.12);
  },
  guestJoined(): void {
    [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'sine', 0.18, i * 0.10));
  },
  win(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.30, 'triangle', 0.20, i * 0.12));
  },
  lose(): void {
    [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.15, i * 0.18));
  },
};
