// src/lib/idleConfig.ts
// Idle session timeout configuration — single source of truth.

/**
 * How long (ms) before the user is considered idle.
 * Default: 15 minutes. Override via VITE_SESSION_IDLE_TIMEOUT_MS env var.
 */
export const SESSION_IDLE_TIMEOUT_MS: number =
  Number(import.meta.env.VITE_SESSION_IDLE_TIMEOUT_MS) || 15 * 60 * 1000

/**
 * How many seconds the warning countdown lasts before auto-logout.
 * Default: 60 seconds.
 */
export const WARNING_COUNTDOWN_SECONDS: number =
  Number(import.meta.env.VITE_SESSION_WARNING_SECONDS) || 60

/**
 * Maximum absolute session lifetime in milliseconds.
 * User will be logged out after this time regardless of activity.
 * Default: 24 hours. Override via VITE_MAX_SESSION_AGE_MS env var.
 */
export const MAX_SESSION_AGE_MS: number =
  Number(import.meta.env.VITE_MAX_SESSION_AGE_MS) || 24 * 60 * 60 * 1000

/**
 * BroadcastChannel name for cross-tab idle sync.
 */
export const IDLE_CHANNEL_NAME = 'qaly-idle-session'

/**
 * localStorage key used to broadcast last-activity timestamp (fallback for older browsers).
 */
export const IDLE_STORAGE_KEY = 'qaly-last-activity'

/**
 * localStorage key used to signal forced logout across tabs.
 */
export const LOGOUT_SIGNAL_KEY = 'qaly-logout-signal'

/**
 * localStorage key to track when the session started (for absolute timeout).
 */
export const SESSION_START_KEY = 'qaly-session-start'
