// src/components/LazyPanda/SmartSyncReminder.tsx
// Smart Sync Reminder — Premium glassmorphic popup reminding users to sync OpenProject data

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useAppStore } from '@/store/useAppStore'
import { useTheme } from '@/context/ThemeContext'
import { useSyncReminderConfigStore, getLastSyncTimestamp, setLastSyncTimestamp } from '@/lib/syncReminderConfig'
import { onSyncEvent } from '@/lib/syncReminderEvents'

// Simple time ago formatter
function getTimeAgo(timestamp: string): string {
  try {
    const now = Date.now()
    const then = new Date(timestamp).getTime()
    const diffMs = now - then
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay > 0) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
    if (diffHour > 0) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`
    if (diffMin > 0) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`
    return 'just now'
  } catch {
    return 'a while ago'
  }
}

// Creative reminder messages with personalization
const REMINDER_MESSAGES = [
  "Hey, {name}! 👋 It's been a while since your last sync. Your dashboard deserves some fresh data. Let's get everything up to date!",
  "🐼 Hey, {name}! Your OpenProject data is getting a little sleepy! Let's wake things up with a fresh sync.",
  "✨ Time for a quick refresh! Your last synchronization was {timeAgo}. Sync now to ensure you're working with the latest information.",
  "🤖 Quick check-in, {name}! Fresh data means better insights and more accurate reports. Ready to catch up?",
  "📊 {name}, your data might be out of sync. Keep your Ticket Bowl updated with the latest changes from OpenProject!",
  "💡 Fresh sync = fresh insights! {name}, let's make sure you have the most current OpenProject data.",
]

interface SmartSyncReminderProps {
  onSyncNow?: () => void
  className?: string
}

export const SmartSyncReminder: React.FC<SmartSyncReminderProps> = ({ onSyncNow, className }) => {
  const { isDark } = useTheme()
  const prefersReducedMotion = usePrefersReducedMotion()
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const profile = useAppStore(s => s.profile)
  const user = useAppStore(s => s.user)

  const config = useSyncReminderConfigStore(s => s.config)

  const [isVisible, setIsVisible] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const [lastDismissTime, setLastDismissTime] = useState<number | null>(null)

  const userId = user?.id || 'anonymous'
  const lastSyncTs = getLastSyncTimestamp(userId)

  // Resolve user name
  const userName = useMemo(() => {
    return (
      profile?.full_name?.trim() ||
      (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString().trim() ||
      (user?.user_metadata as Record<string, unknown> | undefined)?.name?.toString().trim() ||
      user?.email?.split('@')[0]?.trim() ||
      'there'
    )
  }, [profile, user])

  // Calculate time ago
  const timeAgo = useMemo(() => {
    if (!lastSyncTs) return 'a while'
    return getTimeAgo(lastSyncTs)
  }, [lastSyncTs])

  // Format reminder message
  const displayMessage = useMemo(() => {
    if (!config.rotateMessages) {
      // Use first message when rotation disabled
      return REMINDER_MESSAGES[0]
        .replace(/{name}/g, userName)
        .replace(/{timeAgo}/g, timeAgo)
    }

    return REMINDER_MESSAGES[messageIndex]
      .replace(/{name}/g, userName)
      .replace(/{timeAgo}/g, timeAgo)
  }, [messageIndex, userName, timeAgo, config.rotateMessages])

  // Handle dismissal
  const handleDismiss = useCallback(() => {
    setIsVisible(false)
    setLastDismissTime(Date.now())

    // Rotate to next message if enabled
    if (config.rotateMessages) {
      setMessageIndex((prev) => (prev + 1) % REMINDER_MESSAGES.length)
    }
  }, [config.rotateMessages])

  // Handle sync now
  const handleSyncNow = useCallback(() => {
    setIsVisible(false)
    if (onSyncNow) {
      onSyncNow()
    }
  }, [onSyncNow])

  // Check if reminder should be shown
  const shouldShowReminder = useCallback(() => {
    if (!config.enabled || !isAuthenticated) return false

    const now = Date.now()

    // Check if initial delay has passed since login
    // For simplicity, we check if enough time has passed since last dismiss or since app load
    if (lastDismissTime) {
      const timeSinceLastDismiss = now - lastDismissTime
      const intervalMs = config.reminderIntervalSeconds * 1000
      return timeSinceLastDismiss >= intervalMs
    }

    // Initial reminder check
    return true
  }, [config.enabled, config.reminderIntervalSeconds, isAuthenticated, lastDismissTime])

  // Set up reminder timer
  useEffect(() => {
    if (!config.enabled || !isAuthenticated) return

    // Initial delay timer
    const initialTimer = setTimeout(() => {
      if (shouldShowReminder()) {
        setIsVisible(true)
      }
    }, config.initialDelaySeconds * 1000)

    return () => clearTimeout(initialTimer)
  }, [config.enabled, config.initialDelaySeconds, isAuthenticated, shouldShowReminder])

  // Set up interval timer after dismissal
  useEffect(() => {
    if (!config.enabled || !isAuthenticated || !lastDismissTime) return

    const intervalMs = config.reminderIntervalSeconds * 1000

    const intervalTimer = setTimeout(() => {
      if (shouldShowReminder()) {
        setIsVisible(true)
      }
    }, intervalMs)

    return () => clearTimeout(intervalTimer)
  }, [config.enabled, config.reminderIntervalSeconds, isAuthenticated, lastDismissTime, shouldShowReminder])

  // Listen for successful sync to reset reminder
  useEffect(() => {
    const unsubscribe = onSyncEvent('sync:success', () => {
      setIsVisible(false)
      setLastDismissTime(null) // Reset timer
      setLastSyncTimestamp(userId, new Date().toISOString())
    })

    return unsubscribe
  }, [userId])

  // Listen for sync failure
  useEffect(() => {
    const unsubscribe = onSyncEvent('sync:fail', () => {
      setIsVisible(false)
      // Don't reset last dismiss time - keep reminder schedule active
    })

    return unsubscribe
  }, [])

  if (!config.enabled || !isAuthenticated) {
    return null
  }

  const positionClass = 'bottom-24 right-6 sm:right-8'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={`fixed ${positionClass} z-[100000] ${className || ''}`}
          role="alert"
          aria-live="polite"
        >
          {/* Main Card */}
          <div
            className="rounded-2xl px-6 py-5 max-w-[380px] sm:max-w-[420px] backdrop-blur-2xl shadow-2xl"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%), rgba(30, 41, 59, 0.95)'
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(16, 185, 129, 0.03) 100%), rgba(255, 255, 255, 0.98)',
              border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)'}`,
              boxShadow: isDark
                ? '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.1), 0 0 30px rgba(34, 197, 94, 0.08)'
                : '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.12), 0 0 25px rgba(34, 197, 94, 0.06)',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:scale-110"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                color: 'var(--text-muted)',
              }}
              aria-label="Dismiss reminder"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header with Panda Icon */}
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)',
                  border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.2)'}`,
                }}
              >
                <span className="text-2xl">🐼</span>
              </div>
              <div className="flex-1 pr-6">
                <h3
                  className="text-base font-bold mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Time for a Sync!
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-primary)', opacity: 0.9 }}
                >
                  {displayMessage}
                </p>
              </div>
            </div>

            {/* Last Sync Info */}
            {lastSyncTs && (
              <div
                className="text-xs mb-4 py-2 px-3 rounded-lg"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: 'var(--text-muted)',
                }}
              >
                Last synced: <strong>{timeAgo}</strong>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleSyncNow}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg"
                style={{
                  boxShadow: '0 4px 14px rgba(34, 197, 94, 0.3)',
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="outline"
                className="px-4"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              >
                <Check className="w-4 h-4 mr-1.5" />
                OK, Got it
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

