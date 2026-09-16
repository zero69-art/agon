import type { MusicMood } from './types';

interface MoodSpec {
  bpm: number;
  chords: number[][]; // midi notes
  barsPerChord: number;
  padWave: OscillatorType;
  padGain: number;
  padDetune: number;
  arp: 'none' | 'eighths' | 'sixteenths' | 'sparse';
  arpWave: OscillatorType;
  arpGain: number;
  arpOctave: number;
  bass: 'none' | 'roots' | 'walking' | 'pulse';
  drums: 'none' | 'soft' | 'full' | 'epic';
  vinyl: boolean;
  filterHz: number;
  melody: boolean;
}

const MOODS: Record<Exclude<MusicMood, 'none'>, MoodSpec> = {
  dreamy: {
    bpm: 70,
    chords: [
      [60, 64, 67, 71],
      [57, 60, 64, 67],
      [53, 57, 60, 64],
      [55, 59, 62, 65],
    ],
    barsPerChord: 2,
    padWave: 'triangle',
    padGain: 0.16,
    padDetune: 7,
    arp: 'eighths',
    arpWave: 'sine',
    arpGain: 0.14,
    arpOctave: 12,
    bass: 'roots',
    drums: 'none',
    vinyl: false,
    filterHz: 1800,
    melody: false,
  },
  upbeat: {
    bpm: 122,
    chords: [
      [60, 64, 67],
      [55, 59, 62],
      [57, 60, 64],
      [53, 57, 60],
    ],
    barsPerChord: 1,
    padWave: 'sawtooth',
    padGain: 0.05,
    padDetune: 9,
    arp: 'sixteenths',
    arpWave: 'square',
    arpGain: 0.06,
    arpOctave: 12,
    bass: 'walking',
    drums: 'full',
    vinyl: false,
    filterHz: 2600,
    melody: true,
  },
  epic: {
    bpm: 92,
    chords: [
      [57, 60, 64],
      [53, 57, 60],
      [60, 64, 67],
      [55, 59, 62],
    ],
    barsPerChord: 1,
    padWave: 'sawtooth',
    padGain: 0.075,
    padDetune: 12,
    arp: 'eighths',
    arpWave: 'triangle',
    arpGain: 0.09,
    arpOctave: 12,
    bass: 'pulse',
    drums: 'epic',
    vinyl: false,
    filterHz: 1400,
    melody: true,
  },
  mystery: {
    bpm: 78,
    chords: [
      [62, 65, 69],
      [58, 62, 65],
      [55, 58, 62],
      [57, 61, 64],
    ],
    barsPerChord: 2,
    padWave: 'sine',
    padGain: 0.14,
    padDetune: 15,
    arp: 'sparse',
    arpWave: 'sine',
    arpGain: 0.16,
    arpOctave: 24,
    bass: 'roots',
    drums: 'none',
    vinyl: false,
    filterHz: 1200,
    melody: false,
  },
  lofi: {
    bpm: 84,
    chords: [
      [53, 57, 60, 64],
      [52, 55, 59, 62],
      [50, 53, 57, 60],
      [48, 52, 55, 59],
    ],
    barsPerChord: 1,
    padWave: 'triangle',
    padGain: 0.13,
    padDetune: 5,
    arp: 'eighths',
    arpWave: 'triangle',
    arpGain: 0.08,
    arpOctave: 12,
    bass: 'roots',
    drums: 'soft',
    vinyl: true,
    filterHz: 1500,
    melody: true,
  },
  ambient: {
    bpm: 60,
    chords: [
      [48, 55, 60, 64],
      [50, 57, 62, 65],
      [45, 52, 57, 60],
      [47, 54, 59, 62],
    ],
    barsPerChord: 3,
    padWave: 'sine',
    padGain: 0.18,
    padDetune: 18,
    arp: 'sparse',
    arpWave: 'triangle',
    arpGain: 0.09,
    arpOctave: 12,
    bass: 'roots',
    drums: 'none',
    vinyl: false,
    filterHz: 980,
    melody: false,
  },
  cinematic: {
    bpm: 86,
    chords: [
      [57, 60, 64, 69],
      [52, 55, 59, 64],
      [55, 59, 62, 67],
      [50, 53, 57, 62],
    ],
    barsPerChord: 2,
    padWave: 'sawtooth',
    padGain: 0.1,
    padDetune: 11,
    arp: 'eighths',
    arpWave: 'triangle',
    arpGain: 0.11,
    arpOctave: 12,
    bass: 'pulse',
    drums: 'epic',
    vinyl: false,
    filterHz: 1600,
    melody: true,
  },
  retro: {
    bpm: 110,
    chords: [
      [64, 67, 71],
      [60, 64, 67],
      [57, 60, 64],
      [62, 65, 69],
    ],
    barsPerChord: 1,
    padWave: 'square',
    padGain: 0.08,
    padDetune: 8,
    arp: 'sixteenths',
    arpWave: 'square',
    arpGain: 0.1,
    arpOctave: 12,
    bass: 'walking',
    drums: 'full',
    vinyl: false,
    filterHz: 2600,
    melody: true,
  },
};

/** Tempo per mood, exposed so visuals (renderer) can pulse in time with the beat. */
export const MOOD_BPM: Record<MusicMood, number> = {
  none: 0,
  dreamy: MOODS.dreamy.bpm,
  upbeat: MOODS.upbeat.bpm,
  epic: MOODS.epic.bpm,
  mystery: MOODS.mystery.bpm,
  lofi: MOODS.lofi.bpm,
  ambient: MOODS.ambient.bpm,
  cinematic: MOODS.cinematic.bpm,
  retro: MOODS.retro.bpm,
};

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bus!: GainNode;
  private drums!: GainNode;
  private reverb!: ConvolverNode;
  private reverbGain!: GainNode;
  private filter!: BiquadFilterNode;
  private dest: MediaStreamAudioDestinationNode | null = null;
  private noiseBuf!: AudioBuffer;
  private vinylSrc: AudioBufferSourceNode | null = null;
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private mood: Exclude<MusicMood, 'none'> = 'dreamy';
  private volume = 0.55;
  private seedState = 12345;
  playing = false;

  private rnd(): number {
    this.seedState = (this.seedState * 1664525 + 1013904223) >>> 0;
    return this.seedState / 4294967296;
  }

  ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 20;
    comp.ratio.value = 4;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.bus = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 1800;
    this.filter.Q.value = 0.4;

    // reverb impulse
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.35;

    this.bus.connect(this.filter);
    this.drums = ctx.createGain();
    this.drums.connect(this.master);
    this.filter.connect(this.master);
    this.filter.connect(this.reverb);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.dest = ctx.createMediaStreamDestination();
    comp.connect(this.dest);

    const nlen = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;
    return ctx;
  }

  get audioStream(): MediaStream | null {
    this.ensure();
    return this.dest?.stream ?? null;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  start(mood: MusicMood): void {
    if (mood === 'none') {
      this.stop();
      return;
    }
    const ctx = this.ensure();
    if (ctx.state === 'suspended') void ctx.resume();
    if (this.playing && this.mood === mood) return;
    this.stopScheduler();
    this.mood = mood;
    const spec = MOODS[mood];
    this.filter.frequency.setTargetAtTime(spec.filterHz, ctx.currentTime, 0.1);
    // fresh buses fade in; anything still ringing on the old ones was orphaned by stop()
    this.bus.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.bus.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.8);
    this.drums.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.drums.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.4);
    this.step = 0;
    this.seedState = 12345;
    this.nextTime = ctx.currentTime + 0.06;
    this.playing = true;
    if (spec.vinyl) this.startVinyl();
    this.timer = window.setInterval(() => this.schedule(), 30);
  }

  stop(): void {
    if (!this.ctx) return;
    if (this.playing) {
      const ctx = this.ctx;
      const oldBus = this.bus;
      const oldDrums = this.drums;
      for (const g of [oldBus, oldDrums]) {
        g.gain.cancelScheduledValues(ctx.currentTime);
        g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      }
      window.setTimeout(() => {
        oldBus.disconnect();
        oldDrums.disconnect();
      }, 500);
      this.bus = ctx.createGain();
      this.bus.connect(this.filter);
      this.drums = ctx.createGain();
      this.drums.connect(this.master);
    }
    this.stopScheduler();
  }

  private stopScheduler(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    if (this.vinylSrc) {
      try {
        this.vinylSrc.stop();
      } catch {
        /* already stopped */
      }
      this.vinylSrc = null;
    }
  }

  private startVinyl(): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.value = 0.012;
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start();
    this.vinylSrc = src;
  }

  private schedule(): void {
    const ctx = this.ctx!;
    const spec = MOODS[this.mood];
    const stepDur = 60 / spec.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextTime, spec, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  private tone(freq: number, time: number, dur: number, wave: OscillatorType, gain: number, attack = 0.01, detune = 0, release = 0.1): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + attack);
    g.gain.setValueAtTime(gain, time + Math.max(attack, dur - release));
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur + 0.02);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  private pluck(freq: number, time: number, wave: OscillatorType, gain: number, decay: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    osc.connect(g);
    g.connect(this.bus);
    osc.start(time);
    osc.stop(time + decay + 0.02);
  }

  private kick(time: number, gain: number, long = false): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(long ? 120 : 160, time);
    osc.frequency.exponentialRampToValueAtTime(long ? 32 : 45, time + (long ? 0.35 : 0.14));
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + (long ? 0.7 : 0.3));
    osc.connect(g);
    g.connect(this.drums);
    osc.start(time);
    osc.stop(time + 0.8);
  }

  private noiseHit(time: number, gain: number, type: BiquadFilterType, freq: number, decay: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay);
    src.connect(f);
    f.connect(g);
    g.connect(this.drums);
    src.start(time);
    src.stop(time + decay + 0.02);
  }

  private playStep(step: number, time: number, spec: MoodSpec, stepDur: number): void {
    const bar = Math.floor(step / 16);
    const s16 = step % 16;
    const chordIdx = Math.floor(bar / spec.barsPerChord) % spec.chords.length;
    const chord = spec.chords[chordIdx];
    const barDur = stepDur * 16;

    // pad
    if (s16 === 0 && bar % spec.barsPerChord === 0) {
      const dur = barDur * spec.barsPerChord;
      chord.forEach((n) => {
        this.tone(midiToHz(n), time, dur, spec.padWave, spec.padGain, 0.4, -spec.padDetune, 0.6);
        this.tone(midiToHz(n), time, dur, spec.padWave, spec.padGain, 0.5, spec.padDetune, 0.6);
      });
    }

    // bass
    const root = chord[0] - 24;
    if (spec.bass === 'roots' && (s16 === 0 || s16 === 8)) {
      this.tone(midiToHz(root), time, stepDur * 7, 'sine', 0.22, 0.02, 0, 0.2);
    } else if (spec.bass === 'walking' && s16 % 4 === 0) {
      const seq = [root, root, root + 7, root + 12];
      const note = seq[(s16 / 4) % 4];
      this.pluck(midiToHz(s16 === 12 ? note - 12 : note), time, 'triangle', 0.28, stepDur * 3.2);
    } else if (spec.bass === 'pulse' && s16 % 2 === 0) {
      this.pluck(midiToHz(root), time, 'sawtooth', 0.09, stepDur * 1.6);
      if (s16 === 0) this.tone(midiToHz(root - 12), time, barDur, 'sine', 0.2, 0.05, 0, 0.4);
    }

    // arp
    if (spec.arp === 'eighths' && s16 % 2 === 0) {
      const idx = (s16 / 2) % chord.length;
      const pattern = [0, 1, 2, 3, 2, 1, 0, 1];
      const note = chord[pattern[(s16 / 2) % 8] % chord.length] + spec.arpOctave;
      void idx;
      this.pluck(midiToHz(note), time, spec.arpWave, spec.arpGain, stepDur * 3);
    } else if (spec.arp === 'sixteenths') {
      const pattern = [0, 2, 1, 2, 0, 2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 2];
      const note = chord[pattern[s16] % chord.length] + spec.arpOctave;
      if (s16 % 2 === 0 || this.rnd() < 0.6) this.pluck(midiToHz(note), time, spec.arpWave, spec.arpGain, stepDur * 1.6);
    } else if (spec.arp === 'sparse' && s16 % 2 === 0) {
      if (this.rnd() < 0.18) {
        const note = chord[Math.floor(this.rnd() * chord.length)] + spec.arpOctave;
        this.tone(midiToHz(note), time, stepDur * 6, spec.arpWave, spec.arpGain, 0.02, 0, 1.2);
      }
    }

    // melody line (pentatonic wander)
    if (spec.melody && s16 % 4 === 2 && this.rnd() < 0.55) {
      const scale = [0, 2, 4, 7, 9];
      const base = chord[0] + 12;
      const note = base + scale[Math.floor(this.rnd() * scale.length)] + (this.rnd() < 0.3 ? 12 : 0);
      this.pluck(midiToHz(note), time, spec.arpWave === 'square' ? 'triangle' : 'sine', spec.arpGain * 1.2, stepDur * 5);
    }

    // drums
    if (spec.drums === 'full') {
      if (s16 % 4 === 0) this.kick(time, 0.9);
      if (s16 === 4 || s16 === 12) this.noiseHit(time, 0.35, 'bandpass', 1800, 0.16);
      if (s16 % 2 === 1) this.noiseHit(time, s16 % 4 === 1 ? 0.12 : 0.07, 'highpass', 7000, 0.05);
    } else if (spec.drums === 'soft') {
      if (s16 === 0 || s16 === 10) this.kick(time, 0.6);
      if (s16 === 4 || s16 === 12) this.noiseHit(time, 0.16, 'bandpass', 1400, 0.14);
      if (s16 % 2 === 0) this.noiseHit(time, 0.05, 'highpass', 8000, 0.04);
    } else if (spec.drums === 'epic') {
      if (s16 === 0 || s16 === 8) this.kick(time, 1.0, true);
      if (s16 === 6 || s16 === 14) this.kick(time + stepDur * 0.5, 0.5, true);
      if (bar % 2 === 1 && (s16 === 14 || s16 === 15)) this.noiseHit(time, 0.2, 'lowpass', 900, 0.12);
      if (s16 === 4 || s16 === 12) this.noiseHit(time, 0.12, 'bandpass', 3000, 0.25);
    }
  }
}

export const music = new MusicEngine();
