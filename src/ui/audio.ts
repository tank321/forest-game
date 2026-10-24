/**
 * The one AudioContext shared by the chimes and the music. Browsers only allow audio after the player
 * interacts, so it is created on the first tap or key press; later presses resume it if the browser suspended it.
 */
let ctx: AudioContext | null = null;
const waiting: ((ctx: AudioContext) => void)[] = [];

function wake(): void {
  if (!ctx) {
    ctx = new AudioContext();
    for (const ready of waiting.splice(0)) ready(ctx);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}
addEventListener('pointerdown', wake);
addEventListener('keydown', wake);

/** Calls `ready` with the shared context once audio is allowed (at once if it already is). */
export function whenAudio(ready: (ctx: AudioContext) => void): void {
  if (ctx) ready(ctx);
  else waiting.push(ready);
}

/** Frequency of a MIDI note. */
export const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Stereo noise, flat (`shape` 0) or dying away (`shape` > 0, a reverb impulse). UI-only randomness. */
export function noise(ctx: AudioContext, seconds: number, shape: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const b = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (shape ? (1 - i / len) ** shape : 1);
  }
  return b;
}

// On/off settings are per-browser preferences, not part of the save. Storage can be blocked, so both sides tolerate failure.
export function readPref(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function writePref(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // not remembered; the toggle still works for this session
  }
}

/** Shows an on/off audio button's state: pressed while on, dimmed while off. */
export function showToggle(btn: HTMLButtonElement, on: boolean, name: string): void {
  btn.setAttribute('aria-pressed', String(on));
  btn.classList.toggle('muted', !on);
  btn.title = `${name} ${on ? 'on' : 'off'}`;
}
