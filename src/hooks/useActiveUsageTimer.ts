// src/hooks/useActiveUsageTimer.ts
// Reusable hook to track 60 seconds of verified active usage for authenticated users.
// Strictly pauses on background tabs, minimized windows, or user inactivity.
// Defers popup trigger if an active modal or critical workflow is open.

import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useAnnouncementStore } from '@/store/useAnnouncementStore'
import { ROUTES } from '@/lib/routes'

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'pointerdown',
  'wheel',
]

// User is considered inactive if no input received for 15 seconds
const INACTIVITY_THRESHOLD_MS = 15000

// Target active usage duration
const TARGET_ACTIVE_SECONDS = 60

/**
 * Check if another modal, drawer, or critical dialog is currently open in the DOM
 */
function isModalOrCriticalWorkflowOpen(): boolean {
  if (typeof document === 'undefined') return false

  // 1. Check body/html scroll lock (used by all standard modals in the app)
  if (document.documentElement.classList.contains('modal-scroll-locked')) {
    return true
  }

  // 2. Check for other open dialog elements (ignoring our own dialog)
  const openDialogs = document.querySelectorAll(
    '[role="dialog"]:not(#qub-rebranding-dialog), [role="alertdialog"], [data-radix-portal]'
  )
  if (openDialogs.length > 0) {
    return true
  }

  return false
}

export function useActiveUsageTimer() {
  const location = useLocation()
  const { isAuthenticated, user } = useAppStore()
  const {
    enabled,
    hasSeen,
    activeSeconds,
    isOpen,
    fetchConfig,
    initForUser,
    incrementActiveSeconds,
    openPopup,
  } = useAnnouncementStore()

  const lastActivityRef = useRef<number>(Date.now())
  const isWindowFocusedRef = useRef<boolean>(
    typeof document !== 'undefined' ? document.hasFocus() : true
  )

  // 1. Initialize user state when authenticated user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initForUser(user.id)
      fetchConfig()

      // Allow quick preview via URL query param: ?preview=rebranding or ?preview-rebranding=true
      if (
        location.search.includes('preview=rebranding') ||
        location.search.includes('preview-rebranding')
      ) {
        useAnnouncementStore.getState().previewPopup()
      }
    } else {
      initForUser(null)
    }
  }, [isAuthenticated, user?.id, initForUser, fetchConfig, location.search])

  // 2. Window focus & Tab visibility listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleFocus = () => {
      isWindowFocusedRef.current = true
      lastActivityRef.current = Date.now()
    }

    const handleBlur = () => {
      isWindowFocusedRef.current = false
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isWindowFocusedRef.current = false
      } else {
        isWindowFocusedRef.current = document.hasFocus()
        lastActivityRef.current = Date.now()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  // 3. User interaction listener to reset inactivity timer
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!isAuthenticated || hasSeen || !enabled) return

    let lastThrottle = 0
    const handleUserActivity = () => {
      const now = Date.now()
      // Throttle event updates to at most once per 200ms
      if (now - lastThrottle > 200) {
        lastThrottle = now
        lastActivityRef.current = now
        isWindowFocusedRef.current = true
      }
    }

    ACTIVITY_EVENTS.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true })
    })

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity)
      })
    }
  }, [isAuthenticated, hasSeen, enabled])

  // 4. One-second active countdown ticker
  useEffect(() => {
    // Only run ticker if authenticated, enabled, and user hasn't seen it
    if (!isAuthenticated || !enabled || hasSeen || isOpen) return

    // Do not run or count on login / signup / public landing routes
    const isPublicRoute =
      location.pathname === ROUTES.login ||
      location.pathname === ROUTES.signup ||
      location.pathname === ROUTES.landing

    if (isPublicRoute) return

    const interval = setInterval(() => {
      // Must be tab visible and window focused
      const isVisible =
        typeof document !== 'undefined' &&
        !document.hidden &&
        document.hasFocus() &&
        isWindowFocusedRef.current

      // Must have interacted recently within threshold
      const isRecentlyActive =
        Date.now() - lastActivityRef.current < INACTIVITY_THRESHOLD_MS

      if (isVisible && isRecentlyActive) {
        const currentSeconds = useAnnouncementStore.getState().activeSeconds
        if (currentSeconds + 1 >= TARGET_ACTIVE_SECONDS) {
          // Check if interrupted by another modal or critical workflow
          if (!isModalOrCriticalWorkflowOpen()) {
            incrementActiveSeconds()
            openPopup()
          }
          // If modal is open, wait until it closes on subsequent tick
        } else {
          incrementActiveSeconds()
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [
    isAuthenticated,
    enabled,
    hasSeen,
    isOpen,
    location.pathname,
    incrementActiveSeconds,
    openPopup,
  ])

  return {
    activeSeconds,
    targetSeconds: TARGET_ACTIVE_SECONDS,
    isOpen,
  }
}
