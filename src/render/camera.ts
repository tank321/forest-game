import { CONFIG } from '../config';

/** Camera over a w×h tile world. (x, y) is the world point at the screen center; zoom is px/tile. */
export class Camera {
  x: number;
  y: number;
  zoom: number = CONFIG.camera.startZoom;
  vw = 1; // viewport size, CSS px
  vh = 1;
  private glide: { fx: number; fy: number; tx: number; ty: number; t: number } | null = null; // t runs 0 → 1

  constructor(
    private worldW: number,
    private worldH: number,
  ) {
    this.x = worldW / 2;
    this.y = worldH / 2;
  }

  resize(vw: number, vh: number): void {
    this.vw = vw;
    this.vh = vh;
    this.clamp();
  }

  toScreen(wx: number, wy: number): [number, number] {
    return [(wx - this.x) * this.zoom + this.vw / 2, (wy - this.y) * this.zoom + this.vh / 2];
  }

  toWorld(sx: number, sy: number): [number, number] {
    return [(sx - this.vw / 2) / this.zoom + this.x, (sy - this.vh / 2) / this.zoom + this.y];
  }

  /** Smoothly center on (wx, wy) over `CONFIG.camera.glideMs`. Any pan or zoom by the player stops it. */
  glideTo(wx: number, wy: number): void {
    this.glide = { fx: this.x, fy: this.y, tx: wx, ty: wy, t: 0 };
  }

  /** Advance a glide by `ms` of wall-clock time, easing in and out. */
  step(ms: number): void {
    const g = this.glide;
    if (!g) return;
    g.t = Math.min(1, g.t + ms / CONFIG.camera.glideMs);
    const e = g.t < 0.5 ? 4 * g.t ** 3 : 1 - (2 - 2 * g.t) ** 3 / 2;
    this.x = g.fx + (g.tx - g.fx) * e;
    this.y = g.fy + (g.ty - g.fy) * e;
    this.clamp();
    if (g.t === 1) this.glide = null;
  }

  panBy(dxPx: number, dyPx: number): void {
    this.glide = null;
    this.x -= dxPx / this.zoom;
    this.y -= dyPx / this.zoom;
    this.clamp();
  }

  /** Zoom by `factor`, keeping the world point under (sx, sy) fixed. */
  zoomAt(sx: number, sy: number, factor: number): void {
    this.glide = null;
    const [wx, wy] = this.toWorld(sx, sy);
    this.zoom = Math.min(CONFIG.camera.maxZoom, Math.max(this.minZoom(), this.zoom * factor));
    const [nx, ny] = this.toWorld(sx, sy);
    this.x += wx - nx;
    this.y += wy - ny;
    this.clamp();
  }

  /** Fully zoomed out shows the whole map. */
  private minZoom(): number {
    return Math.min(this.vw / this.worldW, this.vh / this.worldH);
  }

  private clamp(): void {
    this.zoom = Math.max(this.zoom, this.minZoom());
    this.x = Math.min(this.worldW, Math.max(0, this.x));
    this.y = Math.min(this.worldH, Math.max(0, this.y));
  }
}
