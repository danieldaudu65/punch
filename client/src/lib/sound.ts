/**
 * Game sounds, synthesised with the Web Audio API.
 * No audio files: each sound is a few short tones, so nothing extra is
 * downloaded and every sound can be tuned in code.
 *
 * Browsers only allow audio after the user has interacted with the page,
 * so the AudioContext is created (or resumed) on the first pointer or key
 * press — see unlockAudio(), wired up in main.tsx.
 */

export type SoundName =
  | 'tap' // a light confirmation, e.g. Next
  | 'back' // the reverse of tap, e.g. Previous, log out
  | 'select' // picking an answer
  | 'submit' // sending answers
  | 'success' // logged in, practice round finished
  | 'coin' // XP landing
  | 'levelUp' // reaching a new level
  | 'badge' // a badge unlocking
  | 'tick' // the last seconds of the timer
  | 'timeUp' // the timer hitting zero
  | 'error'; // something failed

const STORAGE_KEY = 'pn-sound';
const MASTER_VOLUME = 0.22;

let context: AudioContext | null = null;
let master: GainNode | null = null;
let enabled = readPreference();
const listeners = new Set<() => void>();

function readPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!context) {
    context = new AudioContextClass();
    master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

interface ToneOptions {
  freq: number;
  start?: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  /** Glide to this frequency over the tone's duration. */
  slideTo?: number;
}

/** One note with a quick attack and a smooth fade, so nothing clicks. */
function tone(ctx: AudioContext, { freq, start = 0, duration = 0.12, type = 'sine', volume = 1, slideTo }: ToneOptions) {
  if (!master) return;
  const at = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + duration + 0.03);
}

// Notes in Hz, so the melodies read like music.
const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const B5 = 987.77;
const C6 = 1046.5;
const E6 = 1318.51;
const G6 = 1567.98;

const SOUNDS: Record<SoundName, (ctx: AudioContext) => void> = {
  tap: (ctx) => tone(ctx, { freq: 880, duration: 0.06, type: 'triangle', volume: 0.5 }),

  back: (ctx) => tone(ctx, { freq: 620, duration: 0.07, type: 'triangle', volume: 0.45, slideTo: 480 }),

  select: (ctx) => {
    tone(ctx, { freq: 740, duration: 0.07, type: 'triangle', volume: 0.55 });
    tone(ctx, { freq: 1110, start: 0.05, duration: 0.09, type: 'triangle', volume: 0.45 });
  },

  submit: (ctx) => tone(ctx, { freq: 300, duration: 0.32, type: 'sine', volume: 0.6, slideTo: 900 }),

  success: (ctx) => {
    tone(ctx, { freq: G5, duration: 0.12, type: 'triangle', volume: 0.55 });
    tone(ctx, { freq: C6, start: 0.09, duration: 0.2, type: 'triangle', volume: 0.55 });
  },

  // The classic two-note coin pickup.
  coin: (ctx) => {
    tone(ctx, { freq: B5, duration: 0.08, type: 'square', volume: 0.22 });
    tone(ctx, { freq: E6, start: 0.07, duration: 0.32, type: 'square', volume: 0.22 });
  },

  levelUp: (ctx) => {
    [C5, E5, G5, C6].forEach((freq, i) =>
      tone(ctx, { freq, start: i * 0.09, duration: 0.18, type: 'triangle', volume: 0.6 }),
    );
    tone(ctx, { freq: E6, start: 0.36, duration: 0.5, type: 'sine', volume: 0.35 });
  },

  // Bright bells, slightly offset, like a sparkle.
  badge: (ctx) => {
    tone(ctx, { freq: E6, duration: 0.25, type: 'sine', volume: 0.45 });
    tone(ctx, { freq: G6, start: 0.06, duration: 0.3, type: 'sine', volume: 0.35 });
    tone(ctx, { freq: C6 * 2, start: 0.12, duration: 0.4, type: 'sine', volume: 0.25 });
  },

  tick: (ctx) => tone(ctx, { freq: 1200, duration: 0.03, type: 'square', volume: 0.12 }),

  timeUp: (ctx) => {
    tone(ctx, { freq: 660, duration: 0.18, type: 'triangle', volume: 0.6 });
    tone(ctx, { freq: 440, start: 0.16, duration: 0.35, type: 'triangle', volume: 0.6 });
  },

  error: (ctx) => {
    tone(ctx, { freq: 200, duration: 0.09, type: 'sawtooth', volume: 0.25 });
    tone(ctx, { freq: 160, start: 0.1, duration: 0.14, type: 'sawtooth', volume: 0.25 });
  },
};

export function playSound(name: SoundName) {
  if (!enabled) return;
  const ctx = getContext();
  if (!ctx) return;
  try {
    SOUNDS[name](ctx);
  } catch {
    // Sound is a bonus; never let it break the app.
  }
}

/** Call on the first user interaction so later sounds are allowed to play. */
export function unlockAudio() {
  if (enabled) getContext();
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Not saved, but still applies for this visit.
  }
  listeners.forEach((listener) => listener());
}

export function subscribeToSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
