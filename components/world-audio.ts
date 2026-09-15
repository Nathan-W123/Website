/**
 * Procedural sound for Nathan's World: a looping chiptune track and a handful of effects, all
 * synthesised with Web Audio so nothing has to be downloaded. Browsers only allow audio after a
 * user gesture, so `start()` must be called from a pointer or key handler.
 */

export type SoundEffect = 'step' | 'open' | 'close' | 'discover' | 'map' | 'area';

export type WorldAudio = {
  start(): void;
  setMuted(muted: boolean): void;
  play(effect: SoundEffect): void;
  dispose(): void;
};

type AudioContextCtor = typeof AudioContext;

const MASTER_GAIN = .16;
const BPM = 96;
const STEP = 60 / BPM / 4; // sixteenth note, seconds
const LOOKAHEAD = .12; // seconds of audio to schedule ahead
const TICK = 30; // ms between scheduler runs

// Note helpers (MIDI number -> Hz).
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const A3 = 57, C4 = 60, D4 = 62, E4 = 64, G4 = 67, A4 = 69, C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81;

// Two eight-bar phrases in A minor pentatonic; `null` is a rest. 16 steps per bar.
const LEAD_A: (number | null)[] = [
  A4, null, C5, null, D5, null, E5, null, D5, null, C5, null, A4, null, null, null,
  G4, null, A4, null, C5, null, null, null, A4, null, G4, null, E4, null, null, null,
  A4, null, C5, null, E5, null, G5, null, E5, null, D5, null, C5, null, null, null,
  D5, null, C5, null, A4, null, null, null, G4, null, A4, null, null, null, null, null,
];
const LEAD_B: (number | null)[] = [
  E5, null, D5, null, C5, null, D5, null, E5, null, null, null, G5, null, E5, null,
  D5, null, C5, null, A4, null, null, null, C5, null, D5, null, C5, null, null, null,
  A4, null, C5, null, D5, null, E5, null, G5, null, A5, null, G5, null, E5, null,
  D5, null, null, null, C5, null, A4, null, null, null, null, null, null, null, null, null,
];
const BASS: number[] = [A3, A3, C4, C4, D4, D4, E4, E4]; // one note per half bar over 4 bars
const PAD_CHORDS: number[][] = [[A3, C4, E4], [A3, C4, E4], [C4, E4, G4], [D4, G4, A4]];

function makeNoiseBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * .3, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createWorldAudio(): WorldAudio {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let music: GainNode | null = null;
  let effects: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let timer = 0;
  let nextStepTime = 0;
  let step = 0;
  let muted = false;
  let started = false;

  const ensureContext = () => {
    if (context) return context;
    const Ctor: AudioContextCtor | undefined = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_GAIN;
    const warmth = context.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 3200;
    master.connect(warmth).connect(context.destination);
    music = context.createGain();
    music.gain.value = 1;
    music.connect(master);
    effects = context.createGain();
    effects.gain.value = 1;
    effects.connect(master);
    noise = makeNoiseBuffer(context);
    return context;
  };

  const voice = (
    destination: AudioNode,
    type: OscillatorType,
    frequency: number,
    start: number,
    duration: number,
    peak: number,
    attack = .01,
    release = .08,
  ) => {
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.setValueAtTime(peak, Math.max(start + attack, start + duration - release));
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  };

  const scheduleStep = (index: number, time: number) => {
    if (!context || !music) return;
    const bar = Math.floor(index / 16) % 8;
    const phrase = bar < 4 ? LEAD_A : LEAD_B;
    const lead = phrase[index % 64];
    if (lead !== null) voice(music, 'square', hz(lead), time, STEP * 1.8, .22, .005, .06);
    if (index % 8 === 0) {
      const bass = BASS[Math.floor(index / 8) % BASS.length];
      voice(music, 'triangle', hz(bass - 12), time, STEP * 7, .5, .01, .1);
    }
    if (index % 16 === 0) {
      const chord = PAD_CHORDS[Math.floor(index / 16) % PAD_CHORDS.length];
      for (const note of chord) voice(music, 'triangle', hz(note), time, STEP * 15.5, .11, .3, .6);
    }
    // Soft hi-hat on the off-beats.
    if (index % 4 === 2 && noise) {
      const source = context.createBufferSource();
      source.buffer = noise;
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6000;
      const gain = context.createGain();
      gain.gain.setValueAtTime(.05, time);
      gain.gain.exponentialRampToValueAtTime(.001, time + .05);
      source.connect(filter).connect(gain).connect(music);
      source.start(time);
      source.stop(time + .06);
    }
  };

  const scheduler = () => {
    if (!context) return;
    while (nextStepTime < context.currentTime + LOOKAHEAD) {
      scheduleStep(step, nextStepTime);
      step += 1;
      nextStepTime += STEP;
    }
  };

  const start = () => {
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    if (started) return;
    started = true;
    step = 0;
    nextStepTime = ctx.currentTime + .05;
    timer = window.setInterval(scheduler, TICK);
  };

  const setMuted = (value: boolean) => {
    muted = value;
    if (!context || !master) return;
    master.gain.setTargetAtTime(value ? 0 : MASTER_GAIN, context.currentTime, .05);
    if (!value && context.state === 'suspended') void context.resume();
  };

  const play = (effect: SoundEffect) => {
    if (!context || !effects || muted || context.state !== 'running') return;
    const out: AudioNode = effects;
    const now = context.currentTime;
    switch (effect) {
      case 'step': {
        if (!noise) return;
        const source = context.createBufferSource();
        source.buffer = noise;
        const filter = context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 500 + Math.random() * 300;
        filter.Q.value = 1.2;
        const gain = context.createGain();
        gain.gain.setValueAtTime(.35, now);
        gain.gain.exponentialRampToValueAtTime(.001, now + .07);
        source.connect(filter).connect(gain).connect(out);
        source.start(now);
        source.stop(now + .08);
        break;
      }
      case 'open':
        voice(out, 'square', hz(E5), now, .09, .3, .005, .03);
        voice(out, 'square', hz(A5), now + .09, .16, .3, .005, .08);
        break;
      case 'close':
        voice(out, 'square', hz(A5), now, .08, .25, .005, .03);
        voice(out, 'square', hz(E5), now + .08, .14, .25, .005, .08);
        break;
      case 'discover':
        [C5, E5, G5, C5 + 12].forEach((note, i) => voice(out, 'square', hz(note), now + i * .09, .22, .3, .005, .12));
        voice(out, 'triangle', hz(C5 + 12), now + .36, .5, .25, .01, .35);
        break;
      case 'map':
        voice(out, 'square', 1200, now, .05, .2, .002, .03);
        break;
      case 'area':
        voice(out, 'sine', hz(E5), now, .4, .22, .01, .3);
        voice(out, 'sine', hz(A5), now + .12, .6, .18, .01, .45);
        break;
    }
  };

  const dispose = () => {
    window.clearInterval(timer);
    if (context) void context.close();
    context = null;
    started = false;
  };

  return { start, setMuted, play, dispose };
}
