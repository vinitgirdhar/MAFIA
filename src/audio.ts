// Atmosphere: synthesized sound effects (no audio files to download), optional spoken narration, haptics.
// Everything here is optional and fire-and-forget. Narration only ever receives fixed phrases —
// never a player's name, a night selection or an investigation result.

export type Sfx =
  | 'tap'
  | 'night'
  | 'dawn'
  | 'suspense'
  | 'reveal'
  | 'vote'
  | 'tick'
  | 'bell'
  | 'win'
  | 'lose'
  | 'select'
  | 'confirm'
  | 'error'
  | 'whoosh'
  | 'pop'
  | 'drop'
  | 'sparkle'
  | 'tock'
  | 'rise';

let ctx: AudioContext | null = null;
export const audio = { sfx: true, voice: false };

function ac(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Browsers only allow audio after a gesture: call from the first tap. */
export const unlockAudio = () => void ac();

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  to?: number;
  attack?: number;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, o: ToneOpts = {}) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const peak = o.gain ?? 0.08;
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, at);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (o.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function noise(c: AudioContext, at: number, dur: number, gain: number, freq: number) {
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buf;
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(at);
}

/** `p` is a pitch multiplier, used by sounds that climb (hold progress, ruler steps). */
const SOUNDS: Record<Sfx, (c: AudioContext, t: number, p: number) => void> = {
  tap: (c, t) => tone(c, 560, t, 0.06, { gain: 0.04 }),
  vote: (c, t) => {
    tone(c, 330, t, 0.09, { gain: 0.06, type: 'triangle' });
    tone(c, 495, t + 0.07, 0.14, { gain: 0.05, type: 'triangle' });
  },
  tick: (c, t) => tone(c, 880, t, 0.07, { gain: 0.05, type: 'square' }),
  bell: (c, t) => [0, 0.28, 0.56].forEach((d) => tone(c, 988, t + d, 0.5, { gain: 0.06 })),
  night: (c, t) => {
    tone(c, 196, t, 2.6, { gain: 0.07, attack: 0.9, type: 'triangle' });
    tone(c, 294, t + 0.2, 2.4, { gain: 0.04, attack: 0.9 });
    tone(c, 330, t, 2.4, { gain: 0.03, to: 165, attack: 0.5 });
  },
  dawn: (c, t) => [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.16, 1.1, { gain: 0.055 })),
  suspense: (c, t) => {
    for (let i = 0; i < 5; i++) {
      const at = t + i * 0.72;
      tone(c, 62 + i * 3, at, 0.22, { gain: 0.2, to: 38 });
      tone(c, 58 + i * 3, at + 0.17, 0.2, { gain: 0.14, to: 36 });
    }
    tone(c, 110, t, 3.4, { gain: 0.03, to: 440, type: 'sawtooth', attack: 3 });
  },
  reveal: (c, t) => {
    tone(c, 90, t, 1.1, { gain: 0.28, to: 32 });
    noise(c, t, 0.5, 0.12, 900);
    tone(c, 466, t + 0.05, 1.4, { gain: 0.04 });
    tone(c, 494, t + 0.05, 1.4, { gain: 0.035 });
  },
  win: (c, t) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(c, f, t + i * 0.18, 1.8, { gain: 0.06, type: 'triangle' }));
    [262, 392].forEach((f) => tone(c, f, t + 0.6, 2.2, { gain: 0.05, attack: 0.3 }));
  },
  lose: (c, t) => {
    [110, 131, 156].forEach((f) => tone(c, f, t, 3, { gain: 0.07, to: f * 0.8, attack: 0.4, type: 'sawtooth' }));
    noise(c, t, 1.4, 0.05, 400);
  },
  // a soft pluck when a card is picked
  select: (c, t, p) => {
    tone(c, 620 * p, t, 0.09, { gain: 0.05, type: 'triangle' });
    tone(c, 930 * p, t + 0.04, 0.12, { gain: 0.03, type: 'sine' });
  },
  // two rising notes: "locked in"
  confirm: (c, t) => {
    tone(c, 523, t, 0.12, { gain: 0.055, type: 'triangle' });
    tone(c, 784, t + 0.09, 0.22, { gain: 0.06, type: 'triangle' });
  },
  error: (c, t) => {
    tone(c, 150, t, 0.16, { gain: 0.07, to: 95, type: 'sawtooth' });
    tone(c, 150, t + 0.18, 0.16, { gain: 0.07, to: 95, type: 'sawtooth' });
  },
  // a short air sweep for panels sliding in
  whoosh: (c, t) => {
    const len = Math.floor(c.sampleRate * 0.4);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    filter.type = 'bandpass';
    filter.Q.value = 0.9;
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.exponentialRampToValueAtTime(2600, t + 0.32);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    src.connect(filter).connect(g).connect(c.destination);
    src.start(t);
  },
  pop: (c, t) => tone(c, 420, t, 0.12, { gain: 0.06, to: 760, type: 'sine' }),
  drop: (c, t) => tone(c, 520, t, 0.14, { gain: 0.05, to: 240, type: 'triangle' }),
  sparkle: (c, t) => [1319, 1568, 1976, 2349].forEach((f, i) => tone(c, f, t + i * 0.06, 0.4, { gain: 0.03 })),
  tock: (c, t, p) => tone(c, 300 * p, t, 0.05, { gain: 0.07, type: 'square' }),
  rise: (c, t, p) => tone(c, 330 * p, t, 0.09, { gain: 0.045, type: 'triangle' }),
};

const lastPlayed: Partial<Record<Sfx, number>> = {};

export function play(name: Sfx, pitch = 1) {
  if (!audio.sfx) return;
  const now = performance.now();
  if (now - (lastPlayed[name] ?? 0) < 35) return; // never stack the same sound within a frame or two
  lastPlayed[name] = now;
  const c = ac();
  if (c) SOUNDS[name](c, c.currentTime + 0.02, pitch);
}

export function say(text: string) {
  if (!audio.voice || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.88;
  u.pitch = 0.8;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const buzz = (ms: number | number[] = 12) => audio.sfx && navigator.vibrate?.(ms);
