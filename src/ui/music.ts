import { CONFIG } from '../config';
import type { Season } from '../core/seasons';
import { hz, noise, showToggle, whenAudio } from './audio';
import { readPref, writePref } from './prefs';

/** A chord: its name, bass note and pad notes (MIDI), held for two bars. */
type Chord = [name: string, bass: number, pad: number[]];
interface Score {
  bpm: number;
  lead: 'kalimba' | 'celesta';
  range: [number, number]; // melody notes, MIDI
  density: number; // how busy the melody is
  rest: number; // chance a phrase rests
  cutoff: number; // pad brightness, Hz
  birds: number; // chance of birdsong per bar
  wind: number; // wind level (0 = none)
  chords: Chord[];
}

/** Each season's music. All in C major, so the achievement chimes always fit on top. */
const SCORES: Record<Season, Score> = {
  spring: {
    bpm: 72, lead: 'kalimba', range: [72, 86], density: 0.45, rest: 0.25, cutoff: 1400, birds: 0.35, wind: 0,
    chords: [['C', 48, [55, 60, 64]], ['G', 43, [55, 59, 62]], ['Am', 45, [57, 60, 64]], ['F', 41, [57, 60, 65]]],
  },
  summer: {
    bpm: 84, lead: 'kalimba', range: [76, 91], density: 0.6, rest: 0.15, cutoff: 2200, birds: 0.6, wind: 0,
    chords: [['Fmaj7', 41, [57, 60, 64]], ['C', 48, [55, 60, 64]], ['G', 43, [55, 59, 62]], ['Am', 45, [57, 60, 64]]],
  },
  autumn: {
    bpm: 64, lead: 'kalimba', range: [67, 81], density: 0.35, rest: 0.3, cutoff: 900, birds: 0.1, wind: 0.012,
    chords: [['Am', 45, [57, 60, 64]], ['F', 41, [57, 60, 65]], ['C', 48, [55, 60, 64]], ['G', 43, [55, 59, 62]]],
  },
  winter: {
    bpm: 54, lead: 'celesta', range: [79, 93], density: 0.3, rest: 0.45, cutoff: 650, birds: 0, wind: 0.03,
    chords: [['Am', 45, [57, 60, 64]], ['Em', 40, [55, 59, 64]], ['F', 41, [57, 60, 65]], ['C', 48, [55, 60, 64]]],
  },
};
const PENTA = [0, 2, 4, 7, 9]; // C D E G A: every melody note sits in C major pentatonic
const STEPS = [-2, -1, -1, 0, 1, 1, 2]; // the melody mostly moves by small steps
/** Eighth-note rhythms for one bar; a phrase alternates two of them. */
const RHYTHMS = [
  [1, 0, 1, 0, 1, 0, 0, 0], [1, 0, 0, 1, 0, 0, 1, 0], [1, 0, 0, 0, 1, 0, 1, 1],
  [0, 0, 1, 0, 1, 0, 1, 0], [1, 1, 0, 0, 1, 0, 0, 0], [1, 0, 0, 0, 0, 0, 1, 0],
];
const FADE_S = 3; // crossfade between seasons
const LOOKAHEAD_S = 0.5;
const TICK_MS = 100;
const REVERB_S = 3;

/** What a season's layer plays into: the music bus and the reverb send, plus the noise the wind loops. */
interface Mix {
  bus: GainNode;
  verb: GainNode;
  noise: AudioBuffer;
}

/**
 * Background music: a generative score that follows the season on the map, synthesized with Web Audio
 * (no sound files). It crossfades when the season turns, pauses while the tab is hidden, and its
 * on/off setting is remembered per browser.
 */
export class Music {
  private ctx: AudioContext | null = null;
  private mix!: Mix;
  private layer: Layer | null = null;
  private timer = 0;
  private season: Season = 'spring';
  private on: boolean;

  constructor(private btn: HTMLButtonElement) {
    this.on = readPref(CONFIG.music.key) !== 'off';
    btn.onclick = () => this.toggle();
    showToggle(btn, this.on, 'Music');
    whenAudio((ctx) => {
      const bus = ctx.createGain();
      bus.gain.value = CONFIG.music.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      bus.connect(comp).connect(ctx.destination);
      const conv = ctx.createConvolver();
      conv.buffer = noise(ctx, REVERB_S, 2.5);
      const verb = ctx.createGain();
      verb.gain.value = 0.45;
      verb.connect(conv).connect(bus);
      this.mix = { bus, verb, noise: noise(ctx, 2, 0) };
      this.ctx = ctx;
      this.sync();
    });
    // Background tabs slow timers to a crawl, which would stutter the music, so it pauses while hidden.
    document.addEventListener('visibilitychange', () => this.sync());
  }

  /** Follows the season on the map; a change crossfades to the new season's music. */
  setSeason(season: Season): void {
    if (season === this.season) return;
    this.season = season;
    this.sync();
  }

  private toggle(): void {
    this.on = !this.on;
    writePref(CONFIG.music.key, this.on ? 'on' : 'off');
    showToggle(this.btn, this.on, 'Music');
    this.sync();
  }

  /** Starts, stops or swaps the playing layer to match the setting, the tab and the season. */
  private sync(): void {
    const ctx = this.ctx;
    if (!ctx || !this.on || document.hidden) {
      this.layer?.fadeOut();
      this.layer = null;
      window.clearInterval(this.timer);
      this.timer = 0;
      return;
    }
    if (this.layer?.season === this.season) return;
    this.layer?.fadeOut();
    this.layer = new Layer(ctx, this.mix, this.season);
    if (!this.timer) this.timer = window.setInterval(() => this.layer?.schedule(ctx.currentTime + LOOKAHEAD_S), TICK_MS);
  }
}

/** One season's music: its own gain (for crossfades), lead echo and melody walk, scheduled an eighth note at a time. */
class Layer {
  private s: Score;
  private dt: number; // seconds per eighth note
  private step = 0;
  private next: number;
  private out: GainNode;
  private lead: GainNode;
  private scale: number[] = [];
  private walk: number;
  private rhythmA = RHYTHMS[0];
  private rhythmB = RHYTHMS[0];
  private resting = false;
  private wind: AudioScheduledSourceNode[] = [];

  constructor(private ctx: AudioContext, private mix: Mix, readonly season: Season) {
    const s = (this.s = SCORES[season]);
    const now = ctx.currentTime;
    this.dt = 60 / s.bpm / 2;
    this.next = now + 0.1;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0, now);
    this.out.gain.linearRampToValueAtTime(1, now + FADE_S);
    this.out.connect(mix.bus);
    this.out.connect(mix.verb);
    // The lead goes through a dotted-eighth echo.
    this.lead = ctx.createGain();
    this.lead.connect(this.out);
    const echo = ctx.createDelay(2);
    echo.delayTime.value = this.dt * 3;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    this.lead.connect(echo);
    echo.connect(feedback).connect(echo);
    echo.connect(wet).connect(this.out);
    for (let n = s.range[0]; n <= s.range[1]; n++) if (PENTA.includes(n % 12)) this.scale.push(n);
    this.walk = this.scale.length >> 1;
    if (s.wind) this.startWind();
  }

  schedule(until: number): void {
    while (this.next < until) {
      this.play(this.step, this.next);
      this.next += this.dt;
      this.step++;
    }
  }

  fadeOut(): void {
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + FADE_S);
    for (const node of this.wind) node.stop(now + FADE_S + 0.1);
    window.setTimeout(() => this.out.disconnect(), (FADE_S + 4) * 1000);
  }

  private pick<T>(list: readonly T[]): T {
    return list[Math.floor(Math.random() * list.length)];
  }

  private play(step: number, t: number): void {
    const s = this.s;
    const [, bass, pad] = s.chords[Math.floor(step / 16) % s.chords.length];
    const beat = step % 8;
    // Every 8 bars a new phrase: two rhythms that alternate bar by bar, or a rest so the music can breathe.
    if (step % 64 === 0) {
      this.rhythmA = this.pick(RHYTHMS);
      this.rhythmB = this.pick(RHYTHMS);
      this.resting = step > 0 && Math.random() < s.rest;
    }
    if (step % 16 === 0) this.pad(t, pad, 16 * this.dt);
    if (beat === 0) this.bass(t, bass, 8 * this.dt);
    if (beat === 0 && Math.random() < s.birds) this.birds(t + Math.random() * 6 * this.dt);
    if (this.resting) return;
    const rhythm = Math.floor(step / 8) % 2 ? this.rhythmB : this.rhythmA;
    const play = rhythm[beat] ? Math.random() < Math.min(0.95, 0.5 + s.density) : Math.random() < s.density * 0.15;
    if (play) this.melody(t, beat === 0, pad);
  }

  /** A step of the melody's walk; on a downbeat it settles on the nearest chord tone. */
  private melody(t: number, strong: boolean, pad: number[]): void {
    const sc = this.scale;
    let i = Math.max(0, Math.min(sc.length - 1, this.walk + this.pick(STEPS)));
    if (strong) {
      const tones = pad.map((n) => n % 12);
      let best = i;
      let gap = Infinity;
      sc.forEach((n, j) => {
        if (tones.includes(n % 12) && Math.abs(j - i) < gap) [best, gap] = [j, Math.abs(j - i)];
      });
      i = best;
    }
    this.walk = i;
    const v = 0.7 + Math.random() * 0.3;
    // Kalimba: a sine and a quick, high overtone (a tine's click). Celesta: a soft glass bell.
    const partials = this.s.lead === 'celesta'
      ? [[1, 0.09, 1.8], [2, 0.0315, 0.9], [3, 0.0108, 0.54], [4.16, 0.0072, 0.36]]
      : [[1, 0.12, 1.4], [5.95, 0.05, 0.12]];
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 0.6;
    pan.connect(this.lead);
    for (const [ratio, level, decay] of partials) this.tone(pan, t, hz(sc[i]) * ratio, level * v, decay);
  }

  /** A sine that strikes and dies away. */
  private tone(out: AudioNode, t: number, freq: number, level: number, decay: number): void {
    const o = this.ctx.createOscillator();
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  /** Pad: each chord note as two detuned saws, spread left and right, through a slowly opening low-pass filter. */
  private pad(t: number, notes: number[], len: number): void {
    const ctx = this.ctx;
    const end = t + len;
    const cut = this.s.cutoff;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 0.4;
    f.frequency.setValueAtTime(cut * 0.6, t);
    f.frequency.linearRampToValueAtTime(cut, t + len * 0.5);
    f.frequency.linearRampToValueAtTime(cut * 0.7, end + 2.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 1.8);
    g.gain.setValueAtTime(1, end);
    g.gain.linearRampToValueAtTime(0, end + 2.5);
    f.connect(g).connect(this.out);
    for (const n of notes) {
      for (const cents of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = hz(n);
        o.detune.value = cents;
        const p = ctx.createStereoPanner();
        p.pan.value = cents < 0 ? -0.4 : 0.4;
        const v = ctx.createGain();
        v.gain.value = 0.018;
        o.connect(v).connect(p).connect(f);
        o.start(t);
        o.stop(end + 2.6);
      }
    }
  }

  /** Bass: a soft triangle, one long note per bar. */
  private bass(t: number, n: number, len: number): void {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz(n);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.08);
    g.gain.setTargetAtTime(0.06, t + 0.08, 0.5);
    g.gain.setValueAtTime(0.06, t + len - 0.05);
    g.gain.linearRampToValueAtTime(0, t + len + 0.6);
    o.connect(f).connect(g).connect(this.out);
    o.start(t);
    o.stop(t + len + 0.7);
  }

  /** Birdsong: two to four quick upward chirps from one spot in the stereo field. */
  private birds(t: number): void {
    const ctx = this.ctx;
    const count = 2 + Math.floor(Math.random() * 3);
    const base = 2400 + Math.random() * 1200;
    const pan = ctx.createStereoPanner();
    pan.pan.value = (Math.random() - 0.5) * 1.4;
    pan.connect(this.out);
    let at = t;
    for (let k = 0; k < count; k++) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(base, at);
      o.frequency.exponentialRampToValueAtTime(base * 1.5, at + 0.04);
      o.frequency.exponentialRampToValueAtTime(base * 1.1, at + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.012, at + 0.01);
      g.gain.linearRampToValueAtTime(0, at + 0.09);
      o.connect(g).connect(pan);
      o.start(at);
      o.stop(at + 0.1);
      at += 0.09 + Math.random() * 0.05;
    }
  }

  /** Wind: looping noise through a band-pass whose centre drifts slowly. */
  private startWind(): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.mix.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const depth = ctx.createGain();
    depth.gain.value = 250;
    lfo.connect(depth).connect(f.frequency);
    const g = ctx.createGain();
    g.gain.value = this.s.wind;
    src.connect(f).connect(g).connect(this.out);
    src.start();
    lfo.start();
    this.wind = [src, lfo];
  }
}
