import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { Camera } from '../src/render/camera';

describe('camera glide', () => {
  it('eases to the target and stops when the player pans', () => {
    const cam = new Camera(100, 100);
    cam.resize(400, 400);
    cam.glideTo(20, 70);
    cam.step(CONFIG.camera.glideMs / 2);
    expect(cam.x).toBeCloseTo(35);
    expect(cam.y).toBeCloseTo(60);
    cam.step(CONFIG.camera.glideMs);
    expect([cam.x, cam.y]).toEqual([20, 70]);

    cam.glideTo(80, 80);
    cam.panBy(0, 0);
    cam.step(CONFIG.camera.glideMs);
    expect([cam.x, cam.y]).toEqual([20, 70]);
  });
});
