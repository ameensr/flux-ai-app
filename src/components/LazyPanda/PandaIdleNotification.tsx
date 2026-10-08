// src/components/LazyPanda/PandaIdleNotification.tsx
// Small friendly notification/chat bubble displaying sleeping Panda in the bottom-right corner.
// Subtle, premium black-and-white tint with gentle light blur on the background backdrop.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Moon, Sparkles } from 'lucide-react'
import { PandaSVG } from './PandaSVG'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIdleDetection } from '@/hooks/useIdleDetection'
import { useAppStore } from '@/store/useAppStore'
import { formatPandaIdleMessage, getPandaIdleConfig } from '@/lib/pandaIdleConfig'
import { usePandaConfigStore } from './pandaConfig'
import { usePandaEnabled } from './useLazyPanda'

export interface PandaIdleNotificationProps {
  className?: string
}

export const PandaIdleNotification: React.FC<PandaIdleNotificationProps> = () => {
  const envConfig = getPandaIdleConfig()
  const prefersReducedMotion = usePrefersReducedMotion()
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const [userEnabled] = usePandaEnabled()
  const globalConfig = usePandaConfigStore(s => s.config)
  const profile = useAppStore(s => s.profile)
  const user = useAppStore(s => s.user)

  // Only track idle state when .env enables it, user is logged in, and toggles are on
  const isDetectionActive =
    envConfig.enabled &&
    isAuthenticated &&
    globalConfig.enabled &&
    globalConfig.features?.idleSleep !== false &&
    userEnabled

  const { isIdle, message, enabled, resetIdle } = useIdleDetection({
    enabled: isDetectionActive,
  })

  // Resolve user display name (full_name -> metadata name -> email handle)
  const resolvedName =
    profile?.full_name?.trim() ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString().trim() ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.name?.toString().trim() ||
    user?.email?.split('@')[0]?.trim() ||
    null

  const displayMessage = React.useMemo(() => {
    return formatPandaIdleMessage(message, resolvedName)
  }, [message, resolvedName])

  // Panda idle notification is strictly for logged-in users and when enabled via env & settings
  if (
    !envConfig.enabled ||
    !isAuthenticated ||
    !enabled ||
    !globalConfig.enabled ||
    globalConfig.features?.idleSleep === false ||
    !userEnabled
  ) {
    return null
  }

  // Float above the AICopilot floating action button when on dashboard
  const positionClass = 'bottom-24 right-6 sm:right-8'

  return (
    <AnimatePresence>
      {isIdle && (
        <React.Fragment key="panda-idle-container">
          {/* ── 1. Subtle, Low-Blur Black & White Ambient Backdrop ────────── */}
          <motion.div
            key="panda-idle-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
            }
            className="fixed inset-0 z-[70] cursor-pointer select-none"
            style={{
              backdropFilter: 'grayscale(55%) blur(2.5px) brightness(0.93)',
              WebkitBackdropFilter: 'grayscale(55%) blur(2.5px) brightness(0.93)',
              background:
                'radial-gradient(ellipse at center, rgba(11, 16, 32, 0.15) 0%, rgba(5, 8, 20, 0.42) 100%)',
            }}
            onClick={resetIdle}
            title="Click anywhere to wake up"
            aria-hidden="true"
          />

          {/* ── 2. Previous Bottom-Right Corner Card with Creative Elements ─ */}
          <motion.div
            key="panda-idle-card"
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.92 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.94 }
            }
            transition={
              prefersReducedMotion
                ? { duration: 0.2 }
                : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
            }
            className={`fixed ${positionClass} z-[75] flex flex-col items-center select-none pointer-events-auto filter drop-shadow-2xl`}
            role="status"
            aria-live="polite"
          >
            {/* Creative Accent: Floating Mini Crescent Moon */}
            <motion.div
              className="absolute -top-3 -right-1 z-20 flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)',
              }}
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      y: [-1, 2, -1],
                    }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
            >
              <Moon className="w-3 h-3 text-amber-300 fill-amber-300/40" />
              <span className="text-[9px] font-semibold text-amber-200/90 tracking-wide uppercase">
                Zzz
              </span>
            </motion.div>

            {/* Creative Accent: Subtle Floating Sparkle */}
            <motion.div
              className="absolute top-1 left-2 z-20 pointer-events-none"
              animate={
                prefersReducedMotion
                  ? undefined
                  : {
                      scale: [0.85, 1.15, 0.85],
                      opacity: [0.4, 0.9, 0.4],
                    }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 2.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }
              }
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 drop-shadow-[0_0_6px_rgba(165,180,252,0.8)]" />
            </motion.div>

            {/* Panda mascot sitting on top */}
            <div
              className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center -mb-2.5 z-10 filter drop-shadow-md cursor-pointer"
              onClick={resetIdle}
              title="Click Panda to wake up"
            >
              {/* Soft dream cloud under Panda's paws */}
              <div
                className="absolute bottom-1 w-20 h-4 rounded-full blur-sm opacity-40 dark:opacity-60 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse, rgba(165, 180, 252, 0.6) 0%, rgba(99, 102, 241, 0.3) 60%, transparent 100%)',
                }}
              />

              <PandaSVG
                state="SLEEPING"
                eyeOffset={{ x: 0, y: 0 }}
                headRotation={-5}
                isBlinking={false}
                size={74}
                reducedMotion={prefersReducedMotion}
              />
            </div>

            {/* Speech bubble */}
            <div
              className="rounded-2xl px-5 py-3.5 relative max-w-[280px] sm:max-w-[310px] text-center backdrop-blur-2xl transition-all"
              style={{
                background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
                border: '1px solid var(--border)',
                boxShadow:
                  '0 16px 40px -8px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08), 0 0 24px rgba(99, 102, 241, 0.1)',
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={resetIdle}
                className="absolute top-2 right-2 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--hover)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                aria-label="Dismiss idle notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Bubble tail pointing up toward Panda */}
              <div
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45"
                style={{
                  background: 'var(--surface)',
                  borderLeft: '1px solid var(--border)',
                  borderTop: '1px solid var(--border)',
                }}
              />

              {/* Message content */}
              <div className="relative z-10 pt-0.5">
                <p
                  className="text-sm font-semibold tracking-tight text-balance leading-snug"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {displayMessage}
                </p>

                <p
                  className="text-[11px] font-medium mt-1 opacity-70"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Move mouse or press any key to wake up
                </p>

                {/* Quick interactive wake button */}
                <div className="mt-2.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={resetIdle}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--accent-fg)',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.92'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <span>I'm awake! 👋</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}
