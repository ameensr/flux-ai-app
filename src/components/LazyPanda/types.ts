// src/components/LazyPanda/types.ts
// Lazy Panda state machine types and configuration.

export type PandaState =
  | 'IDLE'
  | 'WALKING'
  | 'LOOKING_AT_EMAIL'
  | 'THINKING'
  | 'PASSWORD_HIDE'
  | 'PASSWORD_SHOW'
  | 'LOGIN_LOADING'
  | 'SUCCESS'
  | 'ERROR'
  | 'SLEEPING'

export type PandaEvent =
  | { type: 'EMAIL_FOCUS' }
  | { type: 'EMAIL_BLUR' }
  | { type: 'EMAIL_TYPING' }
  | { type: 'PASSWORD_FOCUS' }
  | { type: 'PASSWORD_BLUR' }
  | { type: 'PASSWORD_SHOW_TOGGLE'; visible: boolean }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'LOGIN_ERROR' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'WAKE_UP' }
  | { type: 'RESET' }

export interface PandaContext {
  state: PandaState
  prevState: PandaState
  eyeTarget: { x: number; y: number }
  isPasswordVisible: boolean
  idleSeconds: number
  blinkTimer: number
  isSignUp: boolean
}

export interface PandaConfig {
  /** Time (ms) before panda starts sleeping */
  sleepTimeout: number
  /** Blink interval range (ms) */
  blinkMin: number
  blinkMax: number
  /** Max head rotation in degrees */
  maxHeadRotation: number
  /** Max eye rotation in degrees */
  maxEyeRotation: number
}

export const DEFAULT_CONFIG: PandaConfig = {
  sleepTimeout: 15_000,
  blinkMin: 3000,
  blinkMax: 8000,
  maxHeadRotation: 20,
  maxEyeRotation: 10,
}

// ── Animation durations ───────────────────────────────────────────────────────

export const DURATIONS = {
  blink: 0.15,
  eyeMove: 0.15,
  headRotate: 0.3,
  walk: 0.8,
  jump: 0.4,
  success: 0.8,
  sleep: 1.2,
  handRaise: 0.4,
  handLower: 0.3,
  stateTransition: 0.35,
} as const

// ── Easing curves ─────────────────────────────────────────────────────────────

export const EASING = {
  smooth: [0.4, 0, 0.2, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
  easeOut: [0.22, 1, 0.36, 1] as [number, number, number, number],
  spring: { type: 'spring' as const, stiffness: 200, damping: 15 },
}
