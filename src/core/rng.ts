/** mulberry32. State lives on the owning object so it serializes with the game. */
export function rand(o: { rng: number }): number {
  let t = (o.rng = (o.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
