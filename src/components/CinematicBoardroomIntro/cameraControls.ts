import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';

export const INTRO_DURATION_MS = 4600;

export function smoothCameraStep(progress: number): number {
  const t = MathUtils.clamp(progress, 0, 1);
  return t * t * (3 - 2 * t);
}

/** Move toward a changing target without resetting the camera's velocity each frame. */
export function smoothDampVector3(current: Vector3, target: Vector3, velocity: Vector3, deltaSeconds: number, smoothTime = .16): void {
  const omega = 2 / Math.max(.001, smoothTime);
  const x = omega * Math.max(0, deltaSeconds);
  const decay = 1 / (1 + x + .48 * x * x + .235 * x * x * x);
  for (const axis of ['x', 'y', 'z'] as const) {
    const change = current[axis] - target[axis];
    const step = (velocity[axis] + omega * change) * deltaSeconds;
    velocity[axis] = (velocity[axis] - omega * step) * decay;
    current[axis] = target[axis] + (change + step) * decay;
  }
}

export function createIntroCameraPath(hallPosition: Vector3, seatPosition: Vector3, focal: Vector3, roomWidth: number, hallLook = new Vector3(0, .7, 0)) {
  const reach = Math.min(2.3, roomWidth * .26);
  const entrySide = seatPosition.x < -1 ? -1 : seatPosition.x > 1 ? 1 : -1;
  const middleSide = seatPosition.x < -1 ? -1 : 1;
  const curve = new CatmullRomCurve3([
    hallPosition.clone(),
    new Vector3(entrySide * reach, 3.04, seatPosition.z + .55),
    new Vector3(middleSide * reach * .72, 2.04, seatPosition.z - .78),
    seatPosition.clone(),
  ], false, 'centripetal');
  return (progress: number) => {
    const t = smoothCameraStep(progress);
    const look = hallLook.clone().lerp(focal, smoothCameraStep(t * 1.75));
    return { position: curve.getPoint(t), look };
  };
}

export function seatLookAfterDrag(eye: Vector3, currentTarget: Vector3, dx: number, dy: number): Vector3 {
  const direction = currentTarget.clone().sub(eye).normalize();
  const yaw = Math.atan2(direction.x, -direction.z) - dx * .0025;
  const pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(direction.y, -1, 1)) + dy * .0025, -1.12, 1.12);
  return eye.clone().add(new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).multiplyScalar(5));
}

export function seatFovAfterWheel(currentFov: number, deltaY: number): number {
  return MathUtils.clamp(currentFov + Math.sign(deltaY) * 3.5, 34, 80);
}

export interface HallTourAnchor { azimuth: number; elevation: number; radius: number }

export function hallTourPose(elapsedSeconds: number, anchor: HallTourAnchor, direction = 1) {
  return {
    azimuth: anchor.azimuth + direction * .52 * Math.sin(elapsedSeconds * .16),
    elevation: MathUtils.clamp(anchor.elevation + .018 * Math.sin(elapsedSeconds * .11), .18, 1.45),
    radius: anchor.radius * (1 + .012 * Math.sin(elapsedSeconds * .13)),
  };
}

export function seatTourLook(eye: Vector3, anchorTarget: Vector3, elapsedSeconds: number, direction = 1): Vector3 {
  const offset = anchorTarget.clone().sub(eye);
  const distance = offset.length();
  if (distance < .001) return anchorTarget.clone();
  const yaw = Math.atan2(offset.x, -offset.z) + direction * .11 * Math.sin(elapsedSeconds * .16);
  const pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(offset.y / distance, -1, 1)) + .022 * Math.sin(elapsedSeconds * .12), -1.12, 1.12);
  return eye.clone().add(new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).multiplyScalar(distance));
}
