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

export const sfx = {
  /** Tick del timer: sottile a tempo pieno, urgente negli ultimi 10s */
  tick(secondsLeft: number): void {
    if (secondsLeft <= 10) {
      // ultimi 10s: click secco + tono acuto crescente
      click(0.10);
      tone(880 + (10 - secondsLeft) * 40, 0.05, 'square', 0.08);
    } else {
      // tick sottile
      click(0.045);
    }
  },
  draw(): void {
    click(0.12);
    tone(760, 0.06, 'sine', 0.12);
  },
  discard(): void {
    click(0.16);
    tone(380, 0.08, 'sine', 0.1, 0.01);
  },
  meld(): void {
    tone(523, 0.10, 'sine', 0.20);       // C5
    tone(659, 0.12, 'sine', 0.18, 0.07); // E5
    tone(784, 0.18, 'sine', 0.22, 0.13); // G5
  },
  yourTurn(): void {
    tone(440, 0.14, 'sine', 0.18);
    tone(554, 0.20, 'sine', 0.22, 0.13);
    if ('vibrate' in navigator) navigator.vibrate([80, 30, 80]);
  },
  oppAction(): void {
    tone(320, 0.06, 'triangle', 0.09);
  },
  deal(): void {
    for (let i = 0; i < 6; i++) {
      click(0.06, i * 0.07);
      tone(560 + i * 40, 0.05, 'sine', 0.08, i * 0.07);
    }
  },
  guestJoined(): void {
    tone(523, 0.10, 'sine', 0.18);
    tone(659, 0.14, 'sine', 0.20, 0.10);
    tone(784, 0.20, 'sine', 0.24, 0.20);
  },
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'sine', 0.26, i * 0.11));
  },
  lose(): void {
    [440, 392, 349, 294].forEach((f, i) => tone(f, 0.28, 'sine', 0.18, i * 0.13));
  },
};
