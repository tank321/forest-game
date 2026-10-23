import { CONFIG } from '../config';

/** Camera over a w×h tile world. (x, y) is the world point at the screen center; zoom is px/tile. */
export class Camera {
  x: number;
  y: number;
  zoom: number = CONFIG.camera.startZoom;
  vw = 1; // viewport size, CSS px
  vh = 1;

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

  panBy(dxPx: number, dyPx: number): void {
    this.x -= dxPx / this.zoom;
    this.y -= dyPx / this.zoom;
    this.clamp();
  }

  /** Zoom by `factor`, keeping the world point under (sx, sy) fixed. */
  zoomAt(sx: number, sy: number, factor: number): void {
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
