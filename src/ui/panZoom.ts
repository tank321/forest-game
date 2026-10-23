import { CONFIG } from '../config';
import { Camera } from '../render/camera';

const MAX_ZOOM = 2;
/** Below this, fitting the whole layer makes it too small to read, so `home` zooms to `HOME_ZOOM` instead. */
const MIN_READABLE = 0.6;
const HOME_ZOOM = 0.85;

/**
 * A fixed-size layer inside a clipped viewport: drag or swipe to pan, wheel or pinch to zoom, +/- keys and
 * the corner buttons too. A drag never ends in a click, so dragging from a button doesn't press it.
 */
export class PanZoom {
  readonly viewport = document.createElement('div');
  readonly layer = document.createElement('div');
  private cam: Camera;
  private pointers = new Map<number, { x: number; y: number }>();
  private travel = 0;
  /** True while a drag or pinch is moving the view. */
  dragging = false;
  private justDragged = false;
  /** Called after every pan, zoom or resize, e.g. to keep a popup beside its target. */
  onMove = () => {};

  constructor(
    private w: number,
    private h: number,
    label: string,
  ) {
    this.cam = new Camera(w, h, MAX_ZOOM);
    this.cam.zoom = 1;
    this.viewport.className = 'pan-zoom';
    this.viewport.tabIndex = -1;
    this.viewport.setAttribute('aria-label', `${label}. Drag to pan, scroll or pinch to zoom.`);
    this.layer.className = 'pan-zoom-layer';
    this.layer.style.width = `${w}px`;
    this.layer.style.height = `${h}px`;
    const tools = document.createElement('div');
    tools.className = 'pan-zoom-tools';
    const tool = (text: string, title: string, run: () => void) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.onclick = run;
      return b;
    };
    tools.append(tool('+', 'Zoom in', () => this.zoomBy(1.25)), tool('−', 'Zoom out', () => this.zoomBy(0.8)), tool('⤢', 'Show everything', () => this.fit()));
    this.viewport.append(this.layer, tools);

    const v = this.viewport;
    v.addEventListener('pointerdown', (e) => {
      if ((e.pointerType === 'mouse' && e.button !== 0) || (e.target as HTMLElement).closest('.pan-zoom-tools')) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 1) this.travel = 0;
    });
    v.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const [a, b] = [...this.pointers.values()];
      const before = b && { mid: mid(a, b), dist: dist(a, b) };
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      this.travel += Math.hypot(dx, dy);
      if (!this.dragging && (b || this.travel > CONFIG.camera.tapSlop)) {
        this.dragging = true;
        for (const id of this.pointers.keys()) v.setPointerCapture(id);
        v.classList.add('is-panning');
      }
      if (!this.dragging) return;
      if (before) {
        const m = mid(a, b);
        const r = v.getBoundingClientRect();
        this.cam.panBy(m.x - before.mid.x, m.y - before.mid.y);
        this.cam.zoomAt(m.x - r.left, m.y - r.top, dist(a, b) / Math.max(1, before.dist));
      } else {
        this.cam.panBy(dx, dy);
      }
      this.apply();
    });
    const release = (e: PointerEvent) => {
      if (!this.pointers.delete(e.pointerId) || this.pointers.size || !this.dragging) return;
      this.dragging = false;
      this.justDragged = true;
      v.classList.remove('is-panning');
      window.setTimeout(() => { this.justDragged = false; });
    };
    v.addEventListener('pointerup', release);
    v.addEventListener('pointercancel', release);
    v.addEventListener('click', (e) => {
      if (!this.justDragged) return;
      e.stopPropagation();
      e.preventDefault();
    }, true);
    v.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = v.getBoundingClientRect();
      this.cam.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015)));
      this.apply();
    }, { passive: false });
    v.addEventListener('keydown', (e) => {
      const factor = e.key === '+' || e.key === '=' ? 1.25 : e.key === '-' ? 0.8 : 0;
      if (!factor) return;
      e.preventDefault();
      this.zoomBy(factor);
    });
    // Keyboard focus can land on a part of the layer that is off screen.
    v.addEventListener('focusin', (e) => this.reveal(e.target as HTMLElement));
    new ResizeObserver(() => this.measure()).observe(v);
  }

  /** Shows the whole layer when it is readable that small, otherwise (x, y) at a readable zoom. */
  home(x = this.w / 2, y = this.h / 2): void {
    this.measure();
    if (this.cam.minZoom() >= MIN_READABLE) return this.fit();
    this.cam.zoom = HOME_ZOOM;
    this.centerOn(x, y);
  }

  fit(): void {
    this.cam.zoom = this.cam.minZoom();
    this.centerOn(this.w / 2, this.h / 2);
  }

  /** Centers an element of the layer if any part of it is outside the viewport. */
  reveal(el: HTMLElement): void {
    if (el === this.viewport || el.closest('.pan-zoom-tools')) return;
    const v = this.viewport.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.left >= v.left && r.right <= v.right && r.top >= v.top && r.bottom <= v.bottom) return;
    this.cam.panBy(v.left + v.width / 2 - (r.left + r.width / 2), v.top + v.height / 2 - (r.top + r.height / 2));
    this.apply();
  }

  private zoomBy(factor: number): void {
    this.cam.zoomAt(this.cam.vw / 2, this.cam.vh / 2, factor);
    this.apply();
  }

  private centerOn(x: number, y: number): void {
    this.cam.x = x;
    this.cam.y = y;
    this.cam.panBy(0, 0); // clamps
    this.apply();
  }

  /** Reads the viewport size. It is 0 while the dialog is closed, so keep the last one then. */
  private measure(): void {
    const { clientWidth: vw, clientHeight: vh } = this.viewport;
    if (!vw || !vh) return;
    this.cam.resize(vw, vh);
    this.apply();
  }

  private apply(): void {
    const { x, y, zoom, vw, vh } = this.cam;
    this.layer.style.transform = `translate(${vw / 2 - x * zoom}px, ${vh / 2 - y * zoom}px) scale(${zoom})`;
    this.onMove();
  }
}

const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
