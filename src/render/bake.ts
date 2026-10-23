import type { Rgba } from './sprites';

/** Rasterizes a sprite grid at the given brightness. */
export function bake(grid: readonly string[], palette: Record<string, Rgba>, light: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = grid[0].length;
  c.height = grid.length;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const rgba = palette[row[x]];
      if (!rgba) continue; // '.' is transparent
      const p = (y * c.width + x) * 4;
      for (let j = 0; j < 3; j++) img.data[p + j] = rgba[j] * light;
      img.data[p + 3] = rgba[3];
    }
  });
  g.putImageData(img, 0, 0);
  return c;
}
