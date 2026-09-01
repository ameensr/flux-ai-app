// Apple-style motion primitives (WWDC Designing Fluid Interfaces).
// Springs use bounce + duration (≈ damping ratio + response), not mass/stiffness.

export const springSettle = { type: 'spring' as const, bounce: 0, duration: 0.35 }
export const springDrawer = { type: 'spring' as const, bounce: 0, duration: 0.3 }
export const springMove = { type: 'spring' as const, bounce: 0, duration: 0.4 }
export const springFlick = { type: 'spring' as const, bounce: 0.2, duration: 0.35 }
export const fadeQuick = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }

/** Press feedback: highlight on pointer-down, ~0.97 scale. */
export const pressTap = { scale: 0.97 }
export const pressHover = { scale: 1.015 }

/** Symmetric overlay enter/exit — same path in both directions. */
export const modalCard = {
  initial: { opacity: 0, scale: 0.96, y: 16 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 16 },
}

export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const FLICK_VELOCITY = 320

/**
 * Apple's exponential-decay projection (not v²/2a).
 * decelerationRate ≈ 0.998 for scroll feel; 0.99 for snappier sheets.
 */
export function project(initialVelocity: number, decelerationRate = 0.998): number {
  return (initialVelocity / 1000) * decelerationRate / (1 - decelerationRate)
}

/** Progressive resistance past a bound. Hard stops read as frozen. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Right sheet: x=0 open, x=width closed.
 * Velocity sign decides flick commit; otherwise snap to the target nearest
 * the projected rest point.
 */
export function sheetReleaseTarget(
  current: number,
  velocity: number,
  width: number,
): { target: number; flicked: boolean } {
  const flicked = Math.abs(velocity) >= FLICK_VELOCITY
  if (flicked) {
    return { target: velocity > 0 ? width : 0, flicked: true }
  }
  const projected = current + project(velocity)
  const target = projected > width * 0.5 ? width : 0
  return { target, flicked: false }
}

export function sheetReleaseTargetLeft(
  current: number,
  velocity: number,
  width: number,
): { target: number; flicked: boolean } {
  // Left sheet: x=0 open, x=-width closed. Negative velocity dismisses.
  const flicked = Math.abs(velocity) >= FLICK_VELOCITY
  if (flicked) {
    return { target: velocity < 0 ? -width : 0, flicked: true }
  }
  const projected = current + project(velocity)
  const target = projected < -width * 0.5 ? -width : 0
  return { target, flicked: false }
}
