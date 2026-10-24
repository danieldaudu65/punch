/**
 * Game sounds, synthesised with the Web Audio API.
 * No audio files: each sound is a few short tones, so nothing extra is
 * downloaded and every sound can be tuned in code.
 *
 * Background music is a looping chiptune made the same way (see the
 * "Background music" section below). The mute button controls both.
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

// ---------------------------------------------------------------------------
// Background music
// Slow and dark: A minor at 70 BPM over an eight-bar loop (Am, Am, F, E, Am,
// Dm, F, E). A low sub bass, a dim saw pad, a sparse plucked motif through an
// echo, and a heartbeat kick. Notes are scheduled a little ahead of the audio
// clock, so the timing stays steady even when the page is busy.
// ---------------------------------------------------------------------------

const MUSIC_VOLUME = 0.32;
const BPM = 70;
const BEAT = 60 / BPM;
const STEP_SECONDS = BEAT / 2; // one eighth note
const STEPS_PER_BAR = 8;
const LOOKAHEAD_SECONDS = 0.4;
const SCHEDULER_INTERVAL_MS = 90;

const NOTE_OFFSETS: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

/** "A4" -> 440 Hz, "G#3" works too. */
function note(name: string): number {
  const sharp = name[1] === '#';
  const octave = Number(name.slice(sharp ? 2 : 1));
  const semitones = NOTE_OFFSETS[name[0]] + (sharp ? 1 : 0) + (octave - 4) * 12;
  return 440 * 2 ** (semitones / 12);
}

interface Bar {
  bass: string;
  pad: string[];
  /** One entry per eighth note. null is a rest. */
  motif: (string | null)[];
}

const AM: Bar = { bass: 'A2', pad: ['A3', 'C4', 'E4'], motif: ['A3', null, null, 'C4', null, 'E4', null, null] };
const AM2: Bar = { bass: 'A2', pad: ['A3', 'C4', 'E4'], motif: ['A3', null, 'E4', null, null, 'C4', null, 'B3'] };
const F: Bar = { bass: 'F2', pad: ['F3', 'A3', 'C4'], motif: ['F3', null, null, 'A3', null, 'C4', null, null] };
const E7: Bar = { bass: 'E2', pad: ['E3', 'G#3', 'B3'], motif: ['E3', null, 'G#3', null, 'B3', null, 'D4', null] };
const DM: Bar = { bass: 'D2', pad: ['D3', 'F3', 'A3'], motif: ['D3', null, null, 'F3', null, 'A3', null, 'E3'] };

const LOOP: Bar[] = [AM, AM2, F, E7, AM, DM, F, E7];
const TOTAL_STEPS = LOOP.length * STEPS_PER_BAR;

let musicGain: GainNode | null = null;
let echoIn: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let nextStepTime = 0;
let stepIndex = 0;

interface VoiceOptions {
  freq: number;
  at: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack?: number;
  /** Low-pass cutoff in Hz; lower is darker. */
  cutoff?: number;
  detune?: number;
  slideTo?: number;
  /** Also send to the echo. */
  echo?: boolean;
}

function musicVoice(ctx: AudioContext, o: VoiceOptions) {
  if (!musicGain) return;
  const { freq, at, duration, type, volume, attack = 0.01, cutoff, detune = 0, slideTo, echo = false } = o;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  osc.detune.value = detune;
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, at + duration);

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(volume, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  let out: AudioNode = osc;
  if (cutoff) {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    osc.connect(filter);
    out = filter;
  }
  out.connect(gain);
  gain.connect(musicGain);
  if (echo && echoIn) gain.connect(echoIn);

  osc.start(at);
  osc.stop(at + duration + 0.05);
}

/** A short burst of filtered noise: a quiet, dry snare-like tick. */
function noiseHit(ctx: AudioContext, at: number, volume: number) {
  if (!musicGain) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1800;
  filter.Q.value = 0.8;
  gain.gain.setValueAtTime(volume, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  source.connect(filter).connect(gain).connect(musicGain);
  source.start(at);
}

function scheduleStep(ctx: AudioContext, step: number, at: number) {
  const inBar = step % STEPS_PER_BAR;
  const bar = LOOP[Math.floor(step / STEPS_PER_BAR) % LOOP.length];
  const barSeconds = STEPS_PER_BAR * STEP_SECONDS;

  if (inBar === 0) {
    // Sub bass: a pure low tone plus a dark saw for grit, held for the whole bar.
    musicVoice(ctx, { freq: note(bar.bass), at, duration: barSeconds, type: 'sine', volume: 0.75, attack: 0.05 });
    musicVoice(ctx, { freq: note(bar.bass), at, duration: barSeconds, type: 'sawtooth', volume: 0.1, attack: 0.15, cutoff: 260 });

    // Pad: each chord note twice, slightly out of tune, fading in slowly.
    for (const name of bar.pad) {
      for (const detune of [-9, 9]) {
        musicVoice(ctx, {
          freq: note(name),
          at,
          duration: barSeconds + 0.6,
          type: 'sawtooth',
          volume: 0.028,
          attack: 1.2,
          cutoff: 650,
          detune,
        });
      }
    }

    // Heartbeat: a strong beat, then a softer one.
    musicVoice(ctx, { freq: 95, at, duration: 0.22, type: 'sine', volume: 0.9, slideTo: 38 });
    musicVoice(ctx, { freq: 85, at: at + STEP_SECONDS * 1.5, duration: 0.2, type: 'sine', volume: 0.5, slideTo: 36 });
  }

  const motifNote = bar.motif[inBar];
  if (motifNote) {
    musicVoice(ctx, {
      freq: note(motifNote),
      at,
      duration: STEP_SECONDS * 3,
      type: 'square',
      volume: 0.09,
      cutoff: 1300,
      echo: true,
    });
  }

  // A dry tick on beat three, every other bar.
  if (inBar === 4 && Math.floor(step / STEPS_PER_BAR) % 2 === 1) noiseHit(ctx, at, 0.07);
}

function runScheduler() {
  const ctx = context;
  if (!ctx || ctx.state !== 'running') return;
  try {
    // If the page was paused for a while, restart from now instead of catching up.
    if (nextStepTime < ctx.currentTime) nextStepTime = ctx.currentTime + 0.05;
    while (nextStepTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
      scheduleStep(ctx, stepIndex, nextStepTime);
      stepIndex = (stepIndex + 1) % TOTAL_STEPS;
      nextStepTime += STEP_SECONDS;
    }
  } catch {
    // Music is a bonus; never let it break the app.
  }
}

function startMusic() {
  if (!enabled || schedulerTimer) return;
  const ctx = getContext();
  if (!ctx) return;

  if (!musicGain) {
    musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);

    // A dark echo (a dotted eighth apart) that makes the motif feel far away.
    echoIn = ctx.createGain();
    const delay = ctx.createDelay(2);
    delay.delayTime.value = BEAT * 0.75;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.42;
    const darken = ctx.createBiquadFilter();
    darken.type = 'lowpass';
    darken.frequency.value = 1500;
    const wet = ctx.createGain();
    wet.gain.value = 0.6;
    echoIn.connect(delay);
    delay.connect(darken);
    darken.connect(feedback);
    feedback.connect(delay);
    darken.connect(wet);
    wet.connect(musicGain);
  }
  musicGain.gain.cancelScheduledValues(ctx.currentTime);
  musicGain.gain.setTargetAtTime(MUSIC_VOLUME, ctx.currentTime, 1.2); // gentle fade-in

  nextStepTime = ctx.currentTime + 0.1;
  schedulerTimer = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
  runScheduler();
}

function stopMusic() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  if (context && musicGain) {
    musicGain.gain.cancelScheduledValues(context.currentTime);
    musicGain.gain.setTargetAtTime(0, context.currentTime, 0.15);
  }
}

// Save battery and keep the clock honest: pause everything while the tab is hidden.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!context) return;
    if (document.hidden) {
      void context.suspend();
    } else if (enabled) {
      void context.resume();
    }
  });
}

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
  if (!enabled) return;
  getContext();
  startMusic();
}

export function isSoundOn() {
  return enabled;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  if (on) startMusic();
  else stopMusic();
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
