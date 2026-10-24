import { CONFIG } from '../config';
import { hz, noise, showToggle, whenAudio } from './audio';
import { readPref, writePref } from './prefs';

/** Each toast rank's chime: [start s, MIDI note, length s, level]; sparkles are short quiet bells, [start s, MIDI note]. */
const SCORES: Record<1 | 2 | 3, { notes: [number, number, number, number][]; sparkle: [number, number][] }> = {
  1: { notes: [[0, 79, 0.9, 1], [0.09, 84, 1.2, 1]], sparkle: [] },
  2: { notes: [[0, 76, 0.8, 0.8], [0.08, 79, 0.8, 0.8], [0.16, 84, 0.9, 0.9], [0.24, 88, 1.6, 1]], sparkle: [[0.4, 96], [0.5, 100]] },
  3: {
    notes: [
      [0, 72, 0.7, 0.7], [0.07, 76, 0.7, 0.7], [0.14, 79, 0.7, 0.7], [0.21, 84, 0.8, 0.8], [0.28, 88, 0.8, 0.8], [0.35, 91, 0.9, 0.85],
      [0.5, 48, 2.2, 0.9], [0.5, 84, 2.2, 0.75], [0.5, 88, 2.2, 0.75], [0.5, 91, 2.2, 0.75], [0.5, 96, 2.4, 0.9],
    ],
    sparkle: [[0.62, 100], [0.7, 103], [0.8, 108], [0.92, 103], [1.05, 105], [1.2, 108]],
  },
};
/** A bell's partials: frequency ratio, level, and share of the note's length before it dies away. The top one is slightly off, as in a real bell. */
const PARTIALS = [[1, 1, 1], [2, 0.4, 0.6], [3, 0.18, 0.4], [4.16, 0.1, 0.25]];
const REVERB_S = 1.6;
const WET = 0.35;

/** Achievement chimes and the Lucky Chest's sounds, synthesized with Web Audio (no sound files) through a small reverb. The on/off setting is remembered per browser. */
export class Sound {
  private ctx: AudioContext | null = null;
  private out!: GainNode;
  private verb!: ConvolverNode;
  private on: boolean;
  private clack: AudioBuffer | null = null; // the Lucky Chest rattle's one clack, made on first use

  constructor(private btn: HTMLButtonElement) {
    this.on = readPref(CONFIG.sound.key) !== 'off';
    btn.onclick = () => this.toggle();
    showToggle(btn, this.on, 'Sound');
    whenAudio((ctx) => {
      this.out = ctx.createGain();
      this.out.gain.value = CONFIG.sound.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.out.connect(comp).connect(ctx.destination);
      this.verb = ctx.createConvolver();
      this.verb.buffer = noise(ctx, REVERB_S, 3);
      this.verb.connect(this.out);
      this.ctx = ctx;
    });
  }

  /** Plays a toast rank's chime, unless sound is off or the browser hasn't allowed audio yet. */
  chime(rank: 1 | 2 | 3): void {
    const ctx = this.ctx;
    if (!ctx || !this.on || ctx.state !== 'running') return;
    const bus = ctx.createGain();
    const send = ctx.createGain();
    send.gain.value = WET;
    bus.connect(this.out);
    bus.connect(send).connect(this.verb);
    const t0 = ctx.currentTime + 0.03;
    for (const [at, n, len, level] of SCORES[rank].notes) this.bell(bus, t0 + at, n, len, level);
    for (const [at, n] of SCORES[rank].sparkle) this.bell(bus, t0 + at, n, 0.5, 0.25);
  }

  /** Lucky Chest: wooden clacks over `seconds`, quickening and rising as the chest shakes harder. */
  rattle(seconds: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.on || ctx.state !== 'running') return;
    this.clack ??= noise(ctx, 0.06, 3);
    const t0 = ctx.currentTime + 0.02;
    for (let at = 0, gap = 0.16; at < seconds; at += gap, gap = Math.max(0.045, gap * 0.86)) {
      const src = ctx.createBufferSource();
      src.buffer = this.clack;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.frequency.value = 700 + 1400 * (at / seconds);
      band.Q.value = 6;
      const v = ctx.createGain();
      v.gain.value = 0.5 + 0.5 * (at / seconds);
      src.connect(band).connect(v).connect(this.out);
      src.start(t0 + at);
    }
  }

  /** Lucky Chest bursting open: a whoosh, a fanfare as big as the reward's tier (1–4), and coins clinking. */
  chest(tier: 1 | 2 | 3 | 4): void {
    const ctx = this.ctx;
    if (!ctx || !this.on || ctx.state !== 'running') return;
    const bus = ctx.createGain();
    const send = ctx.createGain();
    send.gain.value = WET;
    bus.connect(this.out);
    bus.connect(send).connect(this.verb);
    const t0 = ctx.currentTime + 0.03;
    // Whoosh: noise through a low-pass sweeping up.
    const air = ctx.createBufferSource();
    air.buffer = noise(ctx, 0.5, 1.5);
    const sweep = ctx.createBiquadFilter();
    sweep.type = 'lowpass';
    sweep.frequency.setValueAtTime(300, t0);
    sweep.frequency.exponentialRampToValueAtTime(9000, t0 + 0.35);
    const v = ctx.createGain();
    v.gain.value = 0.8;
    air.connect(sweep).connect(v).connect(bus);
    air.start(t0);
    const { notes, sparkle } = SCORES[tier >= 2 ? 3 : 2];
    for (const [at, n, len, level] of notes) this.bell(bus, t0 + 0.08 + at, n, len, level);
    for (const [at, n] of sparkle) this.bell(bus, t0 + 0.08 + at, n, 0.5, 0.25);
    // Legendary: the run climbs another octave over the held chord.
    if (tier === 4) [96, 100, 103, 108].forEach((n, k) => this.bell(bus, t0 + 0.7 + k * 0.08, n, 1.2, 0.6));
    // Coins: short high bells scattered after the burst. UI-only randomness.
    for (let k = 0; k < 6 + 4 * tier; k++) this.bell(bus, t0 + 0.1 + Math.random() * (0.6 + 0.2 * tier), 98 + Math.floor(Math.random() * 12), 0.18, 0.2);
  }

  private toggle(): void {
    this.on = !this.on;
    writePref(CONFIG.sound.key, this.on ? 'on' : 'off');
    showToggle(this.btn, this.on, 'Sound');
    if (this.on) this.chime(1); // a taste of what is back on
  }

  /** A sine with overtones, each dying away faster than the last. */
  private bell(out: AudioNode, t: number, n: number, len: number, level: number): void {
    const ctx = this.ctx!;
    for (const [ratio, gain, decay] of PARTIALS) {
      const o = ctx.createOscillator();
      o.frequency.value = hz(n) * ratio;
      const v = ctx.createGain();
      const end = t + len * decay;
      v.gain.setValueAtTime(0, t);
      v.gain.linearRampToValueAtTime(level * gain * 0.3, t + 0.005);
      v.gain.exponentialRampToValueAtTime(0.0001, end);
      o.connect(v).connect(out);
      o.start(t);
      o.stop(end + 0.05);
    }
  }
}
