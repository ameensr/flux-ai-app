// src/hooks/useIdleTimeout.ts
// Global idle-session timeout hook with cross-tab sync and active-operation locking.

import { useEffect, useRef, useCallback, useState } from 'react'
import {
  SESSION_IDLE_TIMEOUT_MS,
  WARNING_COUNTDOWN_SECONDS,
  IDLE_CHANNEL_NAME,
  IDLE_STORAGE_KEY,
  LOGOUT_SIGNAL_KEY,
} from '@/lib/idleConfig'
import { bindIdleOperationRegistrar } from '@/lib/idleOperations'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

// ── Types ─────────────────────────────────────────────────────────────────────

export type IdlePhase = 'active' | 'warning' | 'logging-out'

interface IdleMessage {
  type: 'activity' | 'logout' | 'stay'
}

interface UseIdleTimeoutReturn {
  /** Current phase of the idle session */
  phase: IdlePhase
  /** Seconds remaining in the warning countdown (only meaningful when phase === 'warning') */
  secondsLeft: number
  /** Call to dismiss warning and reset idle timer */
  stayLoggedIn: () => void
  /** Call to immediately log out */
  logoutNow: () => void
  /** Register an active operation (returns unregister function) */
  registerOperation: (key: string) => () => void
}

// ── Activity events to monitor ────────────────────────────────────────────────

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
  'wheel',
]

// Throttle interval for activity detection (avoids excessive processing)
const ACTIVITY_THROTTLE_MS = 2000

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useIdleTimeout(): UseIdleTimeoutReturn {
  const { isAuthenticated, setUser, setProfile, setPermissionMap, setPermissionsLoaded } = useAppStore()

  const [phase, setPhase] = useState<IdlePhase>('active')
  const [secondsLeft, setSecondsLeft] = useState(WARNING_COUNTDOWN_SECONDS)

  // Refs for timers and state that shouldn't trigger re-renders
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const throttleRef = useRef<number>(0)
  const activeOpsRef = useRef<Set<string>>(new Set())
  const channelRef = useRef<BroadcastChannel | null>(null)
  const phaseRef = useRef<IdlePhase>('active')
  const isLoggingOutRef = useRef(false)

  // Keep phaseRef in sync
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Secure logout ─────────────────────────────────────────────────────────

  const performLogout = useCallback(async (showToast = true) => {
    if (isLoggingOutRef.current) return
    isLoggingOutRef.current = true

    setPhase('logging-out')

    // Signal other tabs
    try {
      channelRef.current?.postMessage({ type: 'logout' } satisfies IdleMessage)
    } catch { /* channel may be closed */ }

    // Broadcast via localStorage for older browser fallback
    try {
      localStorage.setItem(LOGOUT_SIGNAL_KEY, Date.now().toString())
    } catch { /* storage may be unavailable */ }

    // Clear sensitive state
    setUser(null)
    setProfile(null)
    setPermissionMap({})
    setPermissionsLoaded(false)

    // Sign out from Supabase (invalidates session server-side)
    try {
      await supabase.auth.signOut()
    } catch { /* best effort */ }

    // Clear all session/local storage data (except theme preference)
    try {
      const themeKey = 'qaly-theme'
      const themeValue = localStorage.getItem(themeKey)
      sessionStorage.clear()
      // Selective localStorage clear: remove session keys, keep theme
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key !== themeKey && key !== LOGOUT_SIGNAL_KEY) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k))
      if (themeValue) localStorage.setItem(themeKey, themeValue)
    } catch { /* best effort */ }

    // Flash message survives the hard redirect (storage was just cleared)
    if (showToast) {
      try {
        sessionStorage.setItem(
          'qaly-session-expired',
          JSON.stringify({
            title: 'Session expired',
            description: 'You have been logged out due to inactivity.',
          }),
        )
      } catch { /* non-critical */ }
    }

    // Hard navigate so React Router + auth guards land cleanly on login
    window.location.assign('/login')

    isLoggingOutRef.current = false
  }, [setUser, setProfile, setPermissionMap, setPermissionsLoaded])

  // ── Timer management ──────────────────────────────────────────────────────

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [])

  const startWarningCountdown = useCallback(() => {
    setPhase('warning')
    setSecondsLeft(WARNING_COUNTDOWN_SECONDS)

    let remaining = WARNING_COUNTDOWN_SECONDS
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearTimers()
        performLogout()
      }
    }, 1000)
  }, [clearTimers, performLogout])

  const resetIdleTimer = useCallback(() => {
    // Don't reset if active operations are in progress or already logging out
    if (activeOpsRef.current.size > 0) return
    if (isLoggingOutRef.current) return

    clearTimers()
    setPhase('active')
    setSecondsLeft(WARNING_COUNTDOWN_SECONDS)
    lastActivityRef.current = Date.now()

    // Persist last activity for cross-tab fallback
    try {
      localStorage.setItem(IDLE_STORAGE_KEY, Date.now().toString())
    } catch { /* non-critical */ }

    // Start idle timeout (fires warning when idle period reached)
    idleTimerRef.current = setTimeout(() => {
      // Double-check active operations before warning
      if (activeOpsRef.current.size > 0) {
        // Retry after a short delay
        resetIdleTimer()
        return
      }
      startWarningCountdown()
    }, SESSION_IDLE_TIMEOUT_MS - WARNING_COUNTDOWN_SECONDS * 1000)
  }, [clearTimers, startWarningCountdown])

  // ── Public actions ────────────────────────────────────────────────────────

  const stayLoggedIn = useCallback(() => {
    clearTimers()
    setPhase('active')
    setSecondsLeft(WARNING_COUNTDOWN_SECONDS)
    resetIdleTimer()
    // Notify other tabs
    try {
      channelRef.current?.postMessage({ type: 'stay' } satisfies IdleMessage)
    } catch { /* non-critical */ }
  }, [clearTimers, resetIdleTimer])

  const logoutNow = useCallback(() => {
    clearTimers()
    performLogout()
  }, [clearTimers, performLogout])

  const registerOperation = useCallback((key: string) => {
    activeOpsRef.current.add(key)
    // Pause idle countdown while a protected operation is running
    clearTimers()
    if (phaseRef.current === 'warning') {
      setPhase('active')
      setSecondsLeft(WARNING_COUNTDOWN_SECONDS)
    }
    return () => {
      activeOpsRef.current.delete(key)
      // Resume idle timer once all protected ops finish
      if (activeOpsRef.current.size === 0 && phaseRef.current === 'active' && !isLoggingOutRef.current) {
        resetIdleTimer()
      }
    }
  }, [clearTimers, resetIdleTimer])

  // ── Activity handler (throttled) ──────────────────────────────────────────
  // Warning phase is intentional: only Stay / Logout buttons dismiss it.
  // Stray mouse/keyboard must not auto-extend the session.

  const handleActivity = useCallback(() => {
    if (phaseRef.current !== 'active') return
    if (isLoggingOutRef.current) return

    const now = Date.now()
    if (now - throttleRef.current < ACTIVITY_THROTTLE_MS) return
    throttleRef.current = now
    lastActivityRef.current = now

    resetIdleTimer()
    try {
      channelRef.current?.postMessage({ type: 'activity' } satisfies IdleMessage)
      localStorage.setItem(IDLE_STORAGE_KEY, now.toString())
    } catch { /* non-critical */ }
  }, [resetIdleTimer])

  // Expose registerOperation to non-React services (AI gateway, etc.)
  useEffect(() => {
    bindIdleOperationRegistrar(registerOperation)
    return () => bindIdleOperationRegistrar(null)
  }, [registerOperation])

  // ── Cross-tab synchronization ─────────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) return

    // BroadcastChannel (modern browsers)
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(IDLE_CHANNEL_NAME)
      channelRef.current = channel

      channel.onmessage = (event: MessageEvent<IdleMessage>) => {
        const msg = event.data
        if (msg.type === 'activity' || msg.type === 'stay') {
          // Another tab had activity — reset our timer
          clearTimers()
          setPhase('active')
          setSecondsLeft(WARNING_COUNTDOWN_SECONDS)
          lastActivityRef.current = Date.now()
          // Re-arm the idle timer
          idleTimerRef.current = setTimeout(() => {
            if (activeOpsRef.current.size > 0) return
            startWarningCountdown()
          }, SESSION_IDLE_TIMEOUT_MS - WARNING_COUNTDOWN_SECONDS * 1000)
        } else if (msg.type === 'logout') {
          // Another tab triggered logout
          clearTimers()
          performLogout(false)
        }
      }
    } catch {
      // BroadcastChannel not supported — fall back to storage events
    }

    // Storage event fallback for cross-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOGOUT_SIGNAL_KEY && e.newValue) {
        clearTimers()
        performLogout(false)
      }
      if (e.key === IDLE_STORAGE_KEY && e.newValue) {
        const otherTabActivity = Number(e.newValue)
        if (otherTabActivity > lastActivityRef.current) {
          lastActivityRef.current = otherTabActivity
          if (phaseRef.current !== 'logging-out') {
            clearTimers()
            setPhase('active')
            setSecondsLeft(WARNING_COUNTDOWN_SECONDS)
            idleTimerRef.current = setTimeout(() => {
              if (activeOpsRef.current.size > 0) return
              startWarningCountdown()
            }, SESSION_IDLE_TIMEOUT_MS - WARNING_COUNTDOWN_SECONDS * 1000)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      channel?.close()
      channelRef.current = null
    }
  }, [isAuthenticated, clearTimers, performLogout, startWarningCountdown])

  // ── Visibility change (handle sleep/resume & hidden tabs) ─────────────────

  useEffect(() => {
    if (!isAuthenticated) return

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Check how long we were away
        const elapsed = Date.now() - lastActivityRef.current
        const totalTimeout = SESSION_IDLE_TIMEOUT_MS

        if (elapsed >= totalTimeout) {
          // We exceeded the full timeout while hidden — logout
          clearTimers()
          performLogout()
        } else if (elapsed >= totalTimeout - WARNING_COUNTDOWN_SECONDS * 1000) {
          // We're in warning territory
          const warningElapsed = elapsed - (totalTimeout - WARNING_COUNTDOWN_SECONDS * 1000)
          const remaining = WARNING_COUNTDOWN_SECONDS - Math.floor(warningElapsed / 1000)
          if (remaining <= 0) {
            clearTimers()
            performLogout()
          } else {
            clearTimers()
            setPhase('warning')
            setSecondsLeft(remaining)
            let left = remaining
            countdownRef.current = setInterval(() => {
              left -= 1
              setSecondsLeft(left)
              if (left <= 0) {
                clearTimers()
                performLogout()
              }
            }, 1000)
          }
        } else {
          // Still within safe window — just reset timer with remaining time
          clearTimers()
          setPhase('active')
          const remainingIdle = (totalTimeout - WARNING_COUNTDOWN_SECONDS * 1000) - elapsed
          idleTimerRef.current = setTimeout(() => {
            if (activeOpsRef.current.size > 0) {
              resetIdleTimer()
              return
            }
            startWarningCountdown()
          }, remainingIdle)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [isAuthenticated, clearTimers, performLogout, resetIdleTimer, startWarningCountdown])

  // ── Attach global activity listeners ──────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers()
      return
    }

    // Start the idle timer on mount
    resetIdleTimer()

    // Attach listeners
    const handler = () => handleActivity()
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handler, { passive: true })
    })

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handler)
      })
      clearTimers()
    }
  }, [isAuthenticated, handleActivity, resetIdleTimer, clearTimers])

  return { phase, secondsLeft, stayLoggedIn, logoutNow, registerOperation }
}
