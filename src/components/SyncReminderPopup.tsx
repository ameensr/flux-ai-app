// src/components/SyncReminderPopup.tsx
// Smart Sync Reminder popup — bottom-right, premium glassmorphic design.
// Reuses VITE_PANDA_IDLE visual style. No background blur, no overlay.

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PandaSVG } from '@/components/LazyPanda/PandaSVG'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useSyncReminder } from '@/hooks/useSyncReminder'
import { useSyncReminderConfigStore } from '@/lib/syncReminderConfig'
import { useAppStore } from '@/store/useAppStore'

const MESSAGES = [
  "Your data might be out of sync! 🔄",
  "Time for a quick sync check! 📡",
  "Keep your data fresh — sync now! 🌿",
  "Don't miss any updates — sync! 🚀",
  "A sync a day keeps stale data away! 🐼",
  "Your OpenProject data is waiting! 📋",
]

let msgIndex = 0

function getNextMessage(rotate: boolean): string {
  if (!rotate) return MESSAGES[0]
  const msg = MESSAGES[msgIndex % MESSAGES.length]
  msgIndex++
  return msg
}

export function SyncReminderPopup() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { visible, dismiss, lastSyncAt } = useSyncReminder()
  const config = useSyncReminderConfigStore(s => s.config)
  const profile = useAppStore(s => s.profile)
  const user = useAppStore(s => s.user)

  const displayName =
    profile?.full_name?.trim() ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString().trim() ||
    user?.email?.split('@')[0]?.trim() ||
    'there'

  const message = useMemo(
    () => visible ? getNextMessage(config.rotateMessages) : '',
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visible]
  )

  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString([], {
        day: '2-digit', month: 'short',
        hour: '2-digit', minute: '2-digit',
      })
    : 'Never'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="sync-reminder-card"
          initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.93 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.95 }}
          transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 right-6 sm:right-8 z-[99998] flex flex-col items-center select-none pointer-events-auto"
          role="status"
          aria-live="polite"
        >
          {/* Panda — smaller */}
          <div className="relative flex items-center justify-center -mb-2 z-10">
            {!prefersReducedMotion && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 64, height: 64,
                  background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(99,102,241,0.06) 60%, transparent 100%)',
                }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.9, 0.4] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <div className="w-14 h-14 filter drop-shadow-md">
              <PandaSVG
                state="IDLE"
                eyeOffset={{ x: 0, y: 0 }}
                headRotation={0}
                isBlinking={false}
                size={56}
                reducedMotion={prefersReducedMotion}
              />
            </div>
          </div>

          {/* Speech bubble — compact */}
          <div
            className="rounded-xl px-4 py-3 relative max-w-[240px] text-center backdrop-blur-2xl"
            style={{
              background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
              border: '1px solid var(--border)',
              boxShadow:
                '0 12px 32px -6px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.07), 0 0 18px rgba(59,130,246,0.1)',
            }}
          >
            {/* Bubble tail */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
              style={{
                background: 'var(--surface)',
                borderLeft: '1px solid var(--border)',
                borderTop: '1px solid var(--border)',
              }}
            />

            <div className="relative z-10 pt-0.5 space-y-1.5">
              <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Hey {displayName}! 🐼
              </p>
              <p className="text-xs leading-snug" style={{ color: 'var(--text-primary)' }}>
                {message}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Last sync: {formattedLastSync}
              </p>
              <div className="pt-1">
                <button
                  onClick={dismiss}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all w-full"
                  style={{
                    background: 'var(--hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.8' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
