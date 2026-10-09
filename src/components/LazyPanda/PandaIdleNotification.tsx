// src/components/LazyPanda/PandaIdleNotification.tsx
// Sleeping Panda idle notification — bottom-right corner card.
// Creative effects: sleep aura glow, floating dream stars, moon dust particles.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Moon } from 'lucide-react'
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

// Floating dream star positions (relative to the card)
const DREAM_STARS = [
  { x: -18, y: -10, size: 3.5, delay: 0,    dur: 2.8 },
  { x:  12, y: -22, size: 2.5, delay: 0.6,  dur: 3.2 },
  { x: -28, y:  14, size: 2,   delay: 1.1,  dur: 2.5 },
  { x:  26, y:   4, size: 3,   delay: 0.3,  dur: 3.6 },
  { x:   4, y: -30, size: 2,   delay: 1.7,  dur: 2.9 },
]

export const PandaIdleNotification: React.FC<PandaIdleNotificationProps> = () => {
  const envConfig = getPandaIdleConfig()
  const prefersReducedMotion = usePrefersReducedMotion()
  const isAuthenticated = useAppStore(s => s.isAuthenticated)
  const [userEnabled] = usePandaEnabled()
  const globalConfig = usePandaConfigStore(s => s.config)
  const profile = useAppStore(s => s.profile)
  const user = useAppStore(s => s.user)

  const isDetectionActive =
    envConfig.enabled &&
    isAuthenticated &&
    globalConfig.enabled &&
    globalConfig.features?.idleSleep !== false &&
    userEnabled

  const { isIdle, message, enabled, resetIdle } = useIdleDetection({
    enabled: isDetectionActive,
  })

  const resolvedName =
    profile?.full_name?.trim() ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.full_name?.toString().trim() ||
    (user?.user_metadata as Record<string, unknown> | undefined)?.name?.toString().trim() ||
    user?.email?.split('@')[0]?.trim() ||
    null

  const displayMessage = React.useMemo(
    () => formatPandaIdleMessage(message, resolvedName),
    [message, resolvedName]
  )

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

  const positionClass = 'bottom-24 right-6 sm:right-8'

  return (
    <AnimatePresence>
      {isIdle && (
        <React.Fragment key="panda-idle-container">
          {/* ── Subtle grayscale backdrop ── */}
          <motion.div
            key="panda-idle-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0.15 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-[70] cursor-pointer select-none"
            style={{
              backdropFilter: 'grayscale(55%) blur(2.5px) brightness(0.93)',
              WebkitBackdropFilter: 'grayscale(55%) blur(2.5px) brightness(0.93)',
              background: 'radial-gradient(ellipse at center, rgba(11,16,32,0.15) 0%, rgba(5,8,20,0.42) 100%)',
            }}
            onClick={resetIdle}
            aria-hidden="true"
          />

          {/* ── Main card ── */}
          <motion.div
            key="panda-idle-card"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.92 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.94 }}
            transition={prefersReducedMotion ? { duration: 0.2 } : { duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed ${positionClass} z-[75] flex flex-col items-center select-none pointer-events-auto`}
            role="status"
            aria-live="polite"
          >
            {/* ── Creative: floating dream stars around the panda ── */}
            {!prefersReducedMotion && DREAM_STARS.map((star, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none rounded-full"
                style={{
                  width: star.size,
                  height: star.size,
                  left: `calc(50% + ${star.x}px)`,
                  top: `calc(0px + ${star.y}px)`,
                  background: 'radial-gradient(circle, #e0e7ff 0%, #a5b4fc 60%, transparent 100%)',
                  boxShadow: `0 0 ${star.size * 2}px ${star.size}px rgba(165,180,252,0.6)`,
                }}
                animate={{
                  opacity: [0, 0.9, 0],
                  scale: [0.4, 1.2, 0.4],
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: star.dur,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: 'easeInOut',
                }}
              />
            ))}

            {/* ── Creative: crescent moon badge (top-right of panda) ── */}
            <motion.div
              className="absolute z-20 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{
                top: -4,
                right: -8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                boxShadow: '0 0 14px rgba(245,158,11,0.35)',
              }}
              animate={prefersReducedMotion ? undefined : { y: [-1, 2, -1] }}
              transition={prefersReducedMotion ? undefined : { duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Moon className="w-3 h-3 text-amber-300 fill-amber-300/40" />
            </motion.div>

            {/* ── Panda with sleep aura glow ── */}
            <div className="relative flex items-center justify-center -mb-2.5 z-10">
              {/* Creative: pulsing sleep aura */}
              {!prefersReducedMotion && (
                <motion.div
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 88,
                    height: 88,
                    background: 'radial-gradient(circle, rgba(165,180,252,0.18) 0%, rgba(99,102,241,0.08) 60%, transparent 100%)',
                  }}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Soft dream cloud under paws */}
              <div
                className="absolute bottom-1 w-20 h-4 rounded-full blur-sm opacity-40 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse, rgba(165,180,252,0.6) 0%, rgba(99,102,241,0.3) 60%, transparent 100%)',
                }}
              />

              <div
                className="w-16 h-16 sm:w-20 sm:h-20 cursor-pointer filter drop-shadow-md"
                onClick={resetIdle}
                title="Click Panda to wake up"
              >
                <PandaSVG
                  state="SLEEPING"
                  eyeOffset={{ x: 0, y: 0 }}
                  headRotation={-5}
                  isBlinking={false}
                  size={74}
                  reducedMotion={prefersReducedMotion}
                />
              </div>
            </div>

            {/* ── Speech bubble ── */}
            <div
              className="rounded-2xl px-5 py-3.5 relative max-w-[280px] sm:max-w-[310px] text-center backdrop-blur-2xl"
              style={{
                background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
                border: '1px solid var(--border)',
                boxShadow:
                  '0 16px 40px -8px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.08), 0 0 24px rgba(99,102,241,0.12)',
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={resetIdle}
                className="absolute top-2 right-2 p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
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

              {/* Message */}
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
              </div>
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}
