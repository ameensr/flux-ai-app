// src/components/LazyPanda/LazyPanda.tsx
// Main wrapper component that orchestrates the Lazy Panda mascot.
// Provides the send() dispatcher to the parent (AuthPage) via a callback ref.

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PandaSVG } from './PandaSVG'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useLazyPanda, usePandaEnabled } from './useLazyPanda'
import { usePandaConfigStore } from './pandaConfig'
import type { PandaEvent } from './types'

export interface LazyPandaProps {
  /** Whether this is the sign-up page (slightly different idle behavior) */
  isSignUp?: boolean
  /** Callback to expose the send() function to the parent */
  onReady?: (send: (event: PandaEvent) => void) => void
}

/**
 * LazyPanda — the interactive authentication mascot.
 * Place beside the auth card. Pass events from form interactions via onReady → send().
 *
 * Respects prefers-reduced-motion, user's Settings toggle, AND admin global config.
 */
export const LazyPanda: React.FC<LazyPandaProps> = ({ isSignUp = false, onReady }) => {
  const [userEnabled] = usePandaEnabled()
  const globalConfig = usePandaConfigStore(s => s.config)
  const { ctx, send, eyeOffset, headRotation, isBlinking } = useLazyPanda(isSignUp)
  const [clickCount, setClickCount] = React.useState(0)
  const clickTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Expose send to parent
  useEffect(() => {
    onReady?.(send)
  }, [onReady, send])

  const prefersReducedMotion = usePrefersReducedMotion()

  // Easter egg: click panda multiple times for fun reaction
  const handleClick = () => {
    if (!globalConfig.features.easterEggs) return

    setClickCount(prev => prev + 1)

    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
    clickTimeoutRef.current = setTimeout(() => setClickCount(0), 2000)

    // Easter egg triggers
    if (clickCount === 2) {
      // Third click - wave/success animation
      send({ type: 'LOGIN_SUCCESS' })
      setTimeout(() => send({ type: 'RESET' }), 1500)
    } else if (clickCount === 5) {
      // Sixth click - sleepy
      send({ type: 'IDLE_TIMEOUT' })
      setTimeout(() => send({ type: 'WAKE_UP' }), 2000)
    }
  }

  // Don't render if disabled by admin OR by user preference
  if (!globalConfig.enabled || !userEnabled) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.9 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -30, scale: 0.9 }}
        transition={prefersReducedMotion ? { duration: 0.2 } : { type: 'spring', bounce: 0, duration: 0.4 }}
        className="flex items-center justify-center select-none relative"
        aria-hidden="true"
        style={{
          willChange: 'transform, opacity',
          cursor: globalConfig.features.easterEggs ? 'pointer' : 'default',
          pointerEvents: globalConfig.features.easterEggs ? 'auto' : 'none',
        }}
        onClick={handleClick}
      >
        {/* Dark mode visibility enhancement: subtle glow backdrop */}
        <motion.div
          className="absolute inset-0 rounded-full blur-3xl opacity-0 dark:opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 70%)',
            zIndex: -1,
          }}
          animate={prefersReducedMotion ? undefined : {
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={prefersReducedMotion ? undefined : {
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Scales with the left half; FitToBox on the panel shrinks further if needed */}
        <div
          className="relative flex items-end justify-center"
          style={{
            width: 'clamp(8rem, 18vmin, 15rem)',
            height: 'clamp(8rem, 18vmin, 15rem)',
            maxWidth: '100%',
            maxHeight: 'min(15rem, 36vh)',
            filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1)) drop-shadow(0 0 20px rgba(139, 92, 246, 0.1))',
          }}
        >
          <PandaSVG
            state={prefersReducedMotion ? 'IDLE' : ctx.state}
            eyeOffset={prefersReducedMotion ? { x: 0, y: 0 } : eyeOffset}
            headRotation={prefersReducedMotion ? 0 : headRotation}
            isBlinking={isBlinking}
            reducedMotion={prefersReducedMotion}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Re-export hook for settings page
export { usePandaEnabled } from './useLazyPanda'
export type { PandaEvent } from './types'
