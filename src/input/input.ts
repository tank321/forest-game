import { CONFIG } from '../config';
import type { Camera } from '../render/camera';

export interface InputHandlers {
  tap(wx: number, wy: number, alt: boolean): void; // alt = right click
  hover(wx: number, wy: number): void;
  leave(): void; // the mouse left the map
}

/** Pointer input: drag to pan, wheel/pinch to zoom, short press = tap (world coords). */
export function attachInput(el: HTMLElement, cam: Camera, h: InputHandlers): void {
  const pts = new Map<number, { x: number; y: number }>();
  let downAt: { x: number; y: number } | null = null; // null once the gesture became a drag/pinch
  let pinchDist = 0;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const spread = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const p = local(e);
    pts.set(e.pointerId, p);
    if (pts.size === 1) downAt = p;
    else {
      downAt = null;
      pinchDist = spread().d;
    }
  });

  el.addEventListener('pointermove', (e) => {
    const p = local(e);
    const prev = pts.get(e.pointerId);
    if (!prev) return h.hover(...cam.toWorld(p.x, p.y));
    pts.set(e.pointerId, p);
    if (pts.size === 2) {
      const { d, mx, my } = spread();
      cam.zoomAt(mx, my, d / pinchDist);
      pinchDist = d;
      return;
    }
    if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < CONFIG.camera.tapSlop) return;
    if (downAt) cam.panBy(p.x - downAt.x, p.y - downAt.y); // first move past the slop
    else cam.panBy(p.x - prev.x, p.y - prev.y);
    downAt = null;
    if (e.pointerType === 'mouse') h.hover(...cam.toWorld(p.x, p.y)); // the map moved under the cursor
  });

  const end = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    if (downAt && e.type === 'pointerup') h.tap(...cam.toWorld(downAt.x, downAt.y), e.button === 2);
    downAt = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && h.leave());
  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const p = local(e);
      cam.zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
      h.hover(...cam.toWorld(p.x, p.y));
    },
    { passive: false },
  );
}
