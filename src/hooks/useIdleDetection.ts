// src/hooks/useIdleDetection.ts
// Reusable hook for detecting user idle state across interactions with throttling and clean lifecycle management.

import { useState, useEffect, useRef, useCallback } from 'react'
import { getPandaIdleConfig, type PandaIdleConfig } from '@/lib/pandaIdleConfig'

export interface UseIdleDetectionOptions extends Partial<PandaIdleConfig> {
  /** Optional callback fired when the user transitions into the idle state */
  onIdle?: () => void
  /** Optional callback fired when the user transitions out of the idle state back to active */
  onActive?: () => void
}

export interface UseIdleDetectionReturn {
  /** Whether the user is currently considered idle */
  isIdle: boolean
  /** Friendly idle message to display */
  message: string
  /** Configured threshold in seconds */
  thresholdSeconds: number
  /** Whether idle detection is enabled and active */
  enabled: boolean
  /** Imperative function to manually reset the idle state */
  resetIdle: () => void
}

/** Supported activity events to track */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'mouseup',
  'click',
  'keydown',
  'keyup',
  'input',
  'touchstart',
  'touchmove',
  'touchend',
  'scroll',
  'wheel',
  'pointermove',
  'pointerdown',
  'pointerup',
]

/** High-frequency events that should be throttled when already in active state */
const HIGH_FREQUENCY_EVENTS = new Set<string>([
  'mousemove',
  'touchmove',
  'scroll',
  'wheel',
  'pointermove',
])

/** Throttle duration (ms) for high-frequency events while user is already active */
const ACTIVITY_THROTTLE_MS = 250

export function useIdleDetection(options?: UseIdleDetectionOptions): UseIdleDetectionReturn {
  // Resolve configuration from env, allowing option overrides
  const envConfig = getPandaIdleConfig()
  const enabled = options?.enabled ?? envConfig.enabled
  const thresholdSeconds = options?.thresholdSeconds ?? envConfig.thresholdSeconds
  const message = options?.message ?? envConfig.message

  const [isIdle, setIsIdle] = useState(false)

  // Stable refs to prevent unnecessary re-attachments and race conditions
  const isIdleRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const lastThrottleRef = useRef<number>(0)
  const thresholdMs = thresholdSeconds * 1000

  // Callbacks refs
  const onIdleRef = useRef(options?.onIdle)
  onIdleRef.current = options?.onIdle
  const onActiveRef = useRef(options?.onActive)
  onActiveRef.current = options?.onActive

  // Clear any existing idle timer safely
  const clearCurrentTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Schedule the timer for the remaining idle duration
  const scheduleIdleTimer = useCallback((delayMs: number) => {
    clearCurrentTimer()
    if (!enabled || thresholdMs <= 0) return

    timerRef.current = setTimeout(() => {
      const now = Date.now()
      const elapsed = now - lastActivityRef.current

      if (elapsed >= thresholdMs) {
        // Trigger idle state only once per idle period
        if (!isIdleRef.current) {
          isIdleRef.current = true
          setIsIdle(true)
          onIdleRef.current?.()
        }
      } else {
        // Timer fired prematurely (e.g. system clock adjust or tab backgrounding);
        // reschedule for remaining time
        const remaining = Math.max(thresholdMs - elapsed, 100)
        scheduleIdleTimer(remaining)
      }
    }, delayMs)
  }, [clearCurrentTimer, enabled, thresholdMs])

  // Reset idle state immediately and restart timer
  const resetIdle = useCallback(() => {
    const wasIdle = isIdleRef.current
    lastActivityRef.current = Date.now()
    lastThrottleRef.current = Date.now()

    if (wasIdle) {
      isIdleRef.current = false
      setIsIdle(false)
      onActiveRef.current?.()
    }

    if (enabled && thresholdMs > 0) {
      scheduleIdleTimer(thresholdMs)
    }
  }, [enabled, scheduleIdleTimer, thresholdMs])

  useEffect(() => {
    // If feature is disabled or threshold is invalid, clear state and timers
    if (!enabled || thresholdSeconds < 1) {
      clearCurrentTimer()
      if (isIdleRef.current) {
        isIdleRef.current = false
        setIsIdle(false)
      }
      return
    }

    // Initialize timer
    lastActivityRef.current = Date.now()
    scheduleIdleTimer(thresholdMs)

    // Event handler for user activities
    const handleUserActivity = (event: Event) => {
      const now = Date.now()

      // If user is currently idle, wake them up immediately with zero throttling
      if (isIdleRef.current) {
        resetIdle()
        return
      }

      // If high-frequency event, throttle to save CPU cycles
      if (HIGH_FREQUENCY_EVENTS.has(event.type)) {
        if (now - lastThrottleRef.current < ACTIVITY_THROTTLE_MS) {
          return
        }
      }

      lastThrottleRef.current = now
      lastActivityRef.current = now

      // Restart the idle timer for the full duration
      scheduleIdleTimer(thresholdMs)
    }

    // Handle tab visibility and window focus changes
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now()
        const elapsed = now - lastActivityRef.current

        if (elapsed >= thresholdMs) {
          // Inactive while tab was in background
          if (!isIdleRef.current) {
            isIdleRef.current = true
            setIsIdle(true)
            onIdleRef.current?.()
          }
        } else if (!isIdleRef.current) {
          // Reschedule for remaining time
          const remaining = Math.max(thresholdMs - elapsed, 100)
          scheduleIdleTimer(remaining)
        }
      }
    }

    // Attach listeners with capture and passive options for maximum responsiveness and non-blocking scrolls
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { capture: true, passive: true })
    })

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)

    return () => {
      clearCurrentTimer()
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity, { capture: true } as any)
      })
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
    }
  }, [clearCurrentTimer, enabled, resetIdle, scheduleIdleTimer, thresholdMs, thresholdSeconds])

  return {
    isIdle,
    message,
    thresholdSeconds,
    enabled,
    resetIdle,
  }
}
