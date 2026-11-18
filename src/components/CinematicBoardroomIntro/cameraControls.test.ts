import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { createIntroCameraPath, hallTourPose, INTRO_DURATION_MS, seatFovAfterWheel, seatLookAfterDrag, seatTourLook, smoothCameraStep } from './cameraControls';

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
    const anchor = { azimuth: 0, elevation: .72, radius: 10 };
    expect(hallTourPose(0, anchor)).toEqual(anchor);
    const poses = Array.from({ length: 180 }, (_, i) => hallTourPose(i, anchor));
    expect(Math.min(...poses.map(pose => pose.azimuth))).toBeGreaterThanOrEqual(-.52);
    expect(Math.max(...poses.map(pose => pose.azimuth))).toBeLessThanOrEqual(.52);
    expect(hallTourPose(1, anchor).azimuth).toBeGreaterThan(0);
    expect(hallTourPose(1, anchor).azimuth).toBeLessThan(.1);
  });

  it('resumes the Hall tour from the user position without a camera jump', () => {
    const userPosition = { azimuth: 1.2, elevation: 1.05, radius: 6.5 };
    expect(hallTourPose(0, userPosition, -1)).toEqual(userPosition);
    expect(hallTourPose(1, userPosition, -1).azimuth).toBeLessThan(userPosition.azimuth);
  });

  it('gently moves the Seat gaze and resumes from the dragged view', () => {
    const eye = new Vector3(0, 1.22, 4);
    const draggedView = new Vector3(1.5, 1.8, -3);
    expect(seatTourLook(eye, draggedView, 0).distanceTo(draggedView)).toBeLessThan(1e-10);
    const afterOneSecond = seatTourLook(eye, draggedView, 1);
    expect(afterOneSecond.distanceTo(draggedView)).toBeGreaterThan(.01);
    expect(afterOneSecond.distanceTo(draggedView)).toBeLessThan(.2);
    expect(seatTourLook(eye, draggedView, 1, -1).x).toBeLessThan(draggedView.x);
  });

  it('opens with angled views and settles at the meeting seat without a camera jump', () => {
    const seat = new Vector3(0, 1.22, 2.6);
    const screen = new Vector3(0, 1.65, -4);
    const hall = new Vector3(0, 6.6, 7.5);
    const pose = createIntroCameraPath(hall, seat, screen, 9);
    expect(pose(0).position.distanceTo(hall)).toBeLessThan(1e-10);
    expect(pose(0).position.y).toBeGreaterThan(seat.y);
    expect(pose(.7).position.x).toBeGreaterThan(0);
    expect(pose(1).position.distanceTo(seat)).toBeLessThan(1e-10);
    expect(pose(1).look.distanceTo(screen)).toBeLessThan(1e-10);
    expect(smoothCameraStep(0)).toBe(0);
    expect(smoothCameraStep(1)).toBe(1);
    const frameCount = Math.round(INTRO_DURATION_MS / 1000 * 60);
    const frames = Array.from({ length: frameCount + 1 }, (_, i) => pose(i / frameCount).position);
    expect(Math.max(...frames.slice(1).map((point, i) => point.distanceTo(frames[i])))).toBeLessThan(.1);
  });

  it('uses the same smooth approach from a manually positioned Hall camera', () => {
    const hall = new Vector3(2, 5, 6);
    const hallLook = new Vector3(.5, 1, 0);
    const seat = new Vector3(0, 1.22, 2.6);
    const screen = new Vector3(0, 1.65, -4);
    const pose = createIntroCameraPath(hall, seat, screen, 9, hallLook);
    expect(pose(0).position.distanceTo(hall)).toBeLessThan(1e-10);
    expect(pose(0).look.distanceTo(hallLook)).toBeLessThan(1e-10);
    expect(pose(1).position.distanceTo(seat)).toBeLessThan(1e-10);
    expect(pose(1).look.distanceTo(screen)).toBeLessThan(1e-10);
  });
});
