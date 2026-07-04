// src/components/LazyPanda/LazyPanda.tsx
// Main wrapper component that orchestrates the Lazy Panda mascot.
// Provides the send() dispatcher to the parent (AuthPage) via a callback ref.

import React, { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PandaSVG } from './PandaSVG'
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

  // Expose send to parent
  useEffect(() => {
    onReady?.(send)
  }, [onReady, send])

  // Check prefers-reduced-motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Don't render if disabled by admin OR by user preference
  if (!globalConfig.enabled || !userEnabled) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -30, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 30, scale: 0.9 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end justify-center select-none pointer-events-none"
        aria-hidden="true"
        style={{ willChange: 'transform, opacity' }}
      >
        {/* Responsive sizing via CSS */}
        <div className="w-[110px] h-[110px] sm:w-[140px] sm:h-[140px] lg:w-[170px] lg:h-[170px] flex items-end justify-center">
          <PandaSVG
            state={prefersReducedMotion ? 'IDLE' : ctx.state}
            eyeOffset={prefersReducedMotion ? { x: 0, y: 0 } : eyeOffset}
            headRotation={prefersReducedMotion ? 0 : headRotation}
            isBlinking={isBlinking}
            size={170}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// Re-export hook for settings page
export { usePandaEnabled } from './useLazyPanda'
export type { PandaEvent } from './types'
