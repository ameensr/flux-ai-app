import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { hallTourPose, seatFovAfterWheel, seatLookAfterDrag } from './cameraControls';

describe('boardroom seat camera controls', () => {
  it('zooms in on upward scrolling and clamps the zoom range', () => {
    expect(seatFovAfterWheel(66, -120)).toBeLessThan(66);
    expect(seatFovAfterWheel(66, 120)).toBeGreaterThan(66);
    expect(seatFovAfterWheel(34, -120)).toBe(34);
    expect(seatFovAfterWheel(80, 120)).toBe(80);
  });

  it('looks upward and downward when the pointer is dragged vertically', () => {
    const eye = new Vector3(0, 1.22, 4);
    const screen = new Vector3(0, 1.65, -4);
    const up = seatLookAfterDrag(eye, screen, 0, -100);
    const down = seatLookAfterDrag(eye, screen, 0, 100);
    expect(up.y).toBeGreaterThan(screen.y);
    expect(down.y).toBeLessThan(eye.y);
  });

  it('keeps the Hall tour on the presentation side of the room', () => {
    const start = hallTourPose(0, 10);
    expect(start).toEqual({ azimuth: 0, elevation: .72, radius: 10 });
    expect(hallTourPose(1, 10).azimuth).toBeGreaterThan(.3);
    const poses = Array.from({ length: 180 }, (_, i) => hallTourPose(i, 10));
    expect(Math.min(...poses.map(pose => pose.azimuth))).toBeGreaterThanOrEqual(-1.05);
    expect(Math.max(...poses.map(pose => pose.azimuth))).toBeLessThanOrEqual(1.05);
    expect(Math.min(...poses.map(pose => pose.radius))).toBeGreaterThan(9.6);
  });
});
