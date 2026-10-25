import { CONFIG } from '../config';
import type { Camera } from '../render/camera';

export interface InputHandlers {
  tap(wx: number, wy: number, alt: boolean, touch: boolean): void; // alt = right click; touch = a finger or pen
  hover(wx: number, wy: number): void;
  leave(): void; // the mouse left the map
  brush(): boolean; // whether a one-finger drag paints (strokes) instead of panning
  stroke(wx: number, wy: number, start: boolean, alt: boolean): void; // a painted point; start = where the press began
  grab(): boolean; // whether a one-finger touch drag aims (drags) instead of panning; a touch tap still taps
  drag(wx: number, wy: number, start: boolean): void; // an aimed point; start = the first one past the tap slop
  hold(wx: number, wy: number): boolean; // a touch held still for `holdMs`; true = handled, so its release is no tap (and a drag aims, if `grab` now says so)
}

/**
 * Pointer input: drag to pan (or paint, see `brush`; or aim on touch, see `grab`), wheel/pinch to zoom, two fingers
 * also pan, short press = tap and a touch held still = hold (world coords).
 */
export function attachInput(el: HTMLElement, cam: Camera, h: InputHandlers): void {
  const pts = new Map<number, { x: number; y: number }>();
  let downAt: { x: number; y: number } | null = null; // null once the gesture became a drag/pinch
  let pinch = { d: 0, mx: 0, my: 0 };
  let painting: { x: number; y: number; alt: boolean } | null = null; // last painted world point
  let aiming = false; // this one-finger gesture drags (aims) instead of panning
  let dragged = false; // this gesture has aimed already (its first drag point is the start)
  let holdTimer = 0;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const spread = () => {
    const [a, b] = [...pts.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  };
  const cancelHold = () => {
    clearTimeout(holdTimer);
    holdTimer = 0;
  };

  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId);
    const p = local(e);
    pts.set(e.pointerId, p);
    cancelHold();
    const touch = e.pointerType !== 'mouse';
    if (pts.size === 1 && h.brush()) {
      const [x, y] = cam.toWorld(p.x, p.y);
      painting = { x, y, alt: e.button === 2 };
      h.stroke(x, y, true, painting.alt);
    } else if (pts.size === 1) {
      downAt = p;
      aiming = touch && h.grab();
      dragged = false;
      if (touch) {
        holdTimer = window.setTimeout(() => {
          holdTimer = 0;
          if (!downAt || !h.hold(...cam.toWorld(downAt.x, downAt.y))) return;
          downAt = null; // its release is no tap
          aiming = h.grab(); // a hold that picked something up drags it in the same gesture
        }, CONFIG.camera.holdMs);
      }
    } else {
      downAt = null;
      painting = null; // a second finger pinches instead
      aiming = false;
      pinch = spread();
    }
  });

  el.addEventListener('pointermove', (e) => {
    const p = local(e);
    const prev = pts.get(e.pointerId);
    if (!prev) return h.hover(...cam.toWorld(p.x, p.y));
    pts.set(e.pointerId, p);
    if (painting) {
      // Paint every point along the move in quarter-tile steps, so a fast drag leaves no gaps.
      const [x, y] = cam.toWorld(p.x, p.y);
      const n = Math.ceil(Math.hypot(x - painting.x, y - painting.y) * 4);
      for (let k = 1; k <= n; k++) h.stroke(painting.x + ((x - painting.x) * k) / n, painting.y + ((y - painting.y) * k) / n, false, painting.alt);
      painting.x = x;
      painting.y = y;
      return h.hover(x, y);
    }
    if (pts.size === 2) {
      // Zoom about the fingers' midpoint, and pan as the midpoint moves.
      const next = spread();
      cam.zoomAt(pinch.mx, pinch.my, next.d / pinch.d);
      cam.panBy(next.mx - pinch.mx, next.my - pinch.my);
      pinch = next;
      return;
    }
    if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) < CONFIG.camera.tapSlop) return;
    cancelHold();
    if (aiming) {
      h.drag(...cam.toWorld(p.x, p.y), !dragged);
      dragged = true;
      downAt = null;
      return;
    }
    if (downAt) cam.panBy(p.x - downAt.x, p.y - downAt.y); // first move past the slop
    else cam.panBy(p.x - prev.x, p.y - prev.y);
    downAt = null;
    if (e.pointerType === 'mouse') h.hover(...cam.toWorld(p.x, p.y)); // the map moved under the cursor
  });

  const end = (e: PointerEvent) => {
    if (!pts.delete(e.pointerId)) return;
    cancelHold();
    painting = null;
    aiming = false;
    if (downAt && e.type === 'pointerup') h.tap(...cam.toWorld(downAt.x, downAt.y), e.button === 2, e.pointerType !== 'mouse');
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
