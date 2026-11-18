import { MathUtils, Vector3 } from 'three';

export function seatLookAfterDrag(eye: Vector3, currentTarget: Vector3, dx: number, dy: number): Vector3 {
  const direction = currentTarget.clone().sub(eye).normalize();
  const yaw = Math.atan2(direction.x, -direction.z) - dx * .006;
  const pitch = MathUtils.clamp(Math.asin(MathUtils.clamp(direction.y, -1, 1)) - dy * .006, -1.12, 1.12);
  return eye.clone().add(new Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ).multiplyScalar(5));
}

export function seatFovAfterWheel(currentFov: number, deltaY: number): number {
  return MathUtils.clamp(currentFov + Math.sign(deltaY) * 3.5, 34, 80);
}

export function hallTourPose(elapsedSeconds: number, baseRadius: number) {
  return {
    azimuth: 1.05 * Math.sin(elapsedSeconds * .35),
    elevation: .72 + .065 * Math.sin(elapsedSeconds * .24),
    radius: baseRadius * (1 + .035 * Math.sin(elapsedSeconds * .2)),
  };
}
