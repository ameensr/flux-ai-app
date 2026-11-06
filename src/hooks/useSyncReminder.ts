// src/hooks/useSyncReminder.ts
// Manages Smart Sync Reminder timer lifecycle.
// - Starts initial countdown on mount (after login).
// - Resets on sync:success.
// - Pauses (no new timer) during sync:start.
// - Preserves schedule on sync:fail.
// - Clears all timers on unmount / logout.

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSyncReminderConfigStore, getLastSyncTimestamp, setLastSyncTimestamp } from '@/lib/syncReminderConfig'
import { onSyncEvent } from '@/lib/syncReminderEvents'
import { useAppStore } from '@/store/useAppStore'

export function useSyncReminder() {
  const config = useSyncReminderConfigStore(s => s.config)
  const user = useAppStore(s => s.user)
  const isAuthenticated = useAppStore(s => s.isAuthenticated)

  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSyncingRef = useRef(false)

  const userId = user?.id ?? null

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleNext = useCallback((delaySeconds: number) => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      if (!isSyncingRef.current) {
        setVisible(true)
      }
    }, delaySeconds * 1000)
  }, [clearTimer])

  // Start the initial countdown when authenticated and config is enabled
  useEffect(() => {
    if (!isAuthenticated || !config.enabled) {
      clearTimer()
      setVisible(false)
      return
    }
    scheduleNext(config.initialDelaySeconds)
    return clearTimer
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, config.enabled, config.initialDelaySeconds])

  // Subscribe to sync lifecycle events
  useEffect(() => {
    if (!isAuthenticated) return

    const unsubStart = onSyncEvent('sync:start', () => {
      isSyncingRef.current = true
      setVisible(false)
      clearTimer()
    })

    const unsubSuccess = onSyncEvent('sync:success', () => {
      isSyncingRef.current = false
      setVisible(false)
      clearTimer()
      if (userId) {
        setLastSyncTimestamp(userId, new Date().toISOString())
      }
      // Restart with full interval after a successful sync
      if (config.enabled) {
        scheduleNext(config.reminderIntervalSeconds)
      }
    })

    const unsubFail = onSyncEvent('sync:fail', () => {
      isSyncingRef.current = false
      // Preserve existing schedule — do nothing
    })

    return () => {
      unsubStart()
      unsubSuccess()
      unsubFail()
    }
  }, [isAuthenticated, userId, config.enabled, config.reminderIntervalSeconds, clearTimer, scheduleNext])

  // Dismiss popup and schedule next reminder
  const dismiss = useCallback(() => {
    setVisible(false)
    if (config.enabled) {
      scheduleNext(config.reminderIntervalSeconds)
    }
  }, [config.enabled, config.reminderIntervalSeconds, scheduleNext])

  const lastSyncAt = userId ? getLastSyncTimestamp(userId) : null

  return { visible, dismiss, lastSyncAt }
}
