import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/config';
import { BUILDINGS } from '../src/core/buildings';
import { attachInput, type InputHandlers } from '../src/input/input';
import { Camera } from '../src/render/camera';
import { aiming, onFootprint } from '../src/ui/placement';
import { createUiState } from '../src/ui/state';

class FakeCanvas extends EventTarget {
  setPointerCapture(): void {}
  getBoundingClientRect() {
    return { left: 0, top: 0 };
  }
}

/** A 100×100 world in a 400×400 view at the start zoom: screen (200, 200) is world (50, 50). */
function setup(over: Partial<InputHandlers> = {}) {
  const el = new FakeCanvas();
  const cam = new Camera(100, 100);
  cam.resize(400, 400);
  const calls: string[] = [];
  const h: InputHandlers = {
    tap: (x, y, _alt, touch) => calls.push(`tap ${x} ${y} ${touch ? 'touch' : 'mouse'}`),
    hover: () => {},
    leave: () => {},
    brush: () => false,
    stroke: () => {},
    grab: () => false,
    drag: (x, y, start) => calls.push(`drag ${x} ${y}${start ? ' start' : ''}`),
    hold: (x, y) => (calls.push(`hold ${x} ${y}`), true),
    ...over,
  };
  attachInput(el as unknown as HTMLElement, cam, h);
  const send = (type: string, id: number, x: number, y: number, pointerType = 'touch') =>
    el.dispatchEvent(Object.assign(new Event(type), { pointerId: id, clientX: x, clientY: y, pointerType, button: 0 }));
  return { cam, calls, send };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', globalThis);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('touch hold', () => {
  it('fires once a finger has been still for holdMs, and its release is no tap', () => {
    const { calls, send } = setup();
    send('pointerdown', 1, 200, 200);
    vi.advanceTimersByTime(CONFIG.camera.holdMs - 1);
    expect(calls).toEqual([]);
    send('pointermove', 1, 202, 201); // within the tap slop
    vi.advanceTimersByTime(1);
    send('pointerup', 1, 202, 201);
    expect(calls).toEqual(['hold 50 50']);
  });

  it('taps on release when the hold is not handled', () => {
    const { calls, send } = setup({ hold: () => false });
    send('pointerdown', 1, 200, 200);
    vi.advanceTimersByTime(CONFIG.camera.holdMs);
    send('pointerup', 1, 200, 200);
    expect(calls).toEqual(['tap 50 50 touch']);
  });

  it('does not fire for a mouse, a drag, a quick tap or a pinch', () => {
    const { calls, send } = setup();
    send('pointerdown', 1, 200, 200, 'mouse');
    vi.advanceTimersByTime(CONFIG.camera.holdMs);
    send('pointerup', 1, 200, 200, 'mouse');
    send('pointerdown', 2, 200, 200);
    send('pointermove', 2, 240, 200);
    vi.advanceTimersByTime(CONFIG.camera.holdMs);
    send('pointerup', 2, 240, 200);
    send('pointerdown', 3, 200, 200);
    send('pointerup', 3, 200, 200);
    vi.advanceTimersByTime(CONFIG.camera.holdMs);
    send('pointerdown', 4, 180, 200);
    send('pointerdown', 5, 220, 200);
    vi.advanceTimersByTime(CONFIG.camera.holdMs);
    expect(calls).toEqual(['tap 50 50 mouse', 'tap 49 50 touch']); // the drag panned a tile
  });
});

describe('touch aiming', () => {
  it('drags instead of panning, while a tap still taps', () => {
    const { cam, calls, send } = setup({ grab: () => true });
    send('pointerdown', 1, 200, 200);
    send('pointermove', 1, 240, 200);
    send('pointermove', 1, 280, 240);
    send('pointerup', 1, 280, 240);
    send('pointerdown', 2, 200, 200);
    send('pointerup', 2, 200, 200);
    expect(calls).toEqual(['drag 51 50 start', 'drag 52 51', 'tap 50 50 touch']);
    expect([cam.x, cam.y]).toEqual([50, 50]);
  });

  it('leaves a mouse drag panning', () => {
    const { cam, calls, send } = setup({ grab: () => true });
    send('pointerdown', 1, 200, 200, 'mouse');
    send('pointermove', 1, 240, 200, 'mouse');
    send('pointerup', 1, 240, 200, 'mouse');
    expect(calls).toEqual([]);
    expect(cam.x).toBe(49);
  });
});

describe('pinch', () => {
  it('zooms by the fingers spread and keeps the world point between them under their midpoint', () => {
    const { cam, send } = setup();
    send('pointerdown', 1, 180, 200);
    send('pointerdown', 2, 220, 200);
    send('pointermove', 1, 230, 240);
    send('pointermove', 2, 290, 240);
    expect(cam.zoom).toBeCloseTo(CONFIG.camera.startZoom * 1.5);
    const [wx, wy] = cam.toWorld(260, 240);
    expect(wx).toBeCloseTo(50);
    expect(wy).toBeCloseTo(50);
  });
});

describe('placement footprint', () => {
  it('names what is aimed and hit-tests its footprint with slack', () => {
    const ui = createUiState();
    expect(aiming(ui)).toBeNull();
    ui.placing = 'farm';
    ui.hover = { x: 10, y: 10 };
    expect(aiming(ui)).toBe('farm');
    const { w, h } = BUILDINGS.farm;
    const x = Math.floor(10 - w / 2 + 0.5);
    const y = Math.floor(10 - h / 2 + 0.5);
    expect(onFootprint(ui, x + 0.1, y + 0.1, 0)).toBe(true);
    expect(onFootprint(ui, x + w - 0.1, y + h - 0.1, 0)).toBe(true);
    expect(onFootprint(ui, x - 0.2, y, 0)).toBe(false);
    expect(onFootprint(ui, x - 0.2, y, 0.3)).toBe(true);
    expect(onFootprint(ui, x + w + 0.5, y, 0.3)).toBe(false);

    ui.placing = null;
    ui.movingRoad = true;
    ui.road = 0;
    ui.hover = { x: 4.5, y: 7.5 };
    expect(aiming(ui)).toBe('road');
    expect(onFootprint(ui, 4.9, 7.1, 0)).toBe(true);
    expect(onFootprint(ui, 5.1, 7.1, 0)).toBe(false);
  });
});
