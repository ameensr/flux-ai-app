// src/components/ui/SessionTimeoutWarning.tsx
// Premium warning modal with animated countdown ring, frosted glass, and accessibility.

import React, { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, LogOut, ShieldAlert } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { WARNING_COUNTDOWN_SECONDS } from '@/lib/idleConfig'

interface SessionTimeoutWarningProps {
  visible: boolean
  secondsLeft: number
  onStay: () => void
  onLogout: () => void
}

// ── Countdown Ring SVG ────────────────────────────────────────────────────────

function CountdownRing({ secondsLeft }: { secondsLeft: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = secondsLeft / WARNING_COUNTDOWN_SECONDS
  const strokeDashoffset = circumference * (1 - progress)

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      {/* Background ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="6"
          opacity={0.3}
        />
        {/* Animated progress ring */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#countdown-gradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
        <defs>
          <linearGradient id="countdown-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center countdown number */}
      <motion.div
        key={secondsLeft}
        initial={{ scale: 1.3, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative flex flex-col items-center"
      >
        <span className="text-3xl font-clash font-bold text-text-primary tabular-nums">
          {secondsLeft}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-0.5">
          seconds
        </span>
      </motion.div>

      {/* Pulse ring effect */}
      {secondsLeft <= 10 && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-red-500/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function SessionTimeoutWarning({ visible, secondsLeft, onStay, onLogout }: SessionTimeoutWarningProps) {
  useBodyScrollLock(visible)
  const stayButtonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Trap focus within the modal when visible
  useEffect(() => {
    if (!visible) return
    // Focus the "Stay Logged In" button when modal opens
    const timer = setTimeout(() => stayButtonRef.current?.focus(), 100)
    return () => clearTimeout(timer)
  }, [visible])

  // Keyboard handler: Escape to stay, Tab trapping
  useEffect(() => {
    if (!visible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onStay()
        return
      }

      // Tab trapping within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [visible, onStay])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="session-timeout-title"
          aria-describedby="session-timeout-desc"
        >
          {/* Backdrop — light blur + black & white wash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: 'rgba(8, 10, 14, 0.45)',
              backdropFilter: 'blur(4px) grayscale(1) saturate(0)',
              WebkitBackdropFilter: 'blur(4px) grayscale(1) saturate(0)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          {/* Modal card */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-surface/80 backdrop-blur-xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]"
          >
            {/* Top accent gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-purple-500 to-red-500" />

            <div className="px-8 pt-10 pb-8 flex flex-col items-center text-center">
              {/* Icon */}
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-6 w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center"
              >
                <ShieldAlert className="w-6 h-6 text-accent" />
              </motion.div>

              {/* Title */}
              <h2
                id="session-timeout-title"
                className="text-xl font-clash font-bold text-text-primary mb-2"
              >
                Session Expiring
              </h2>

              {/* Description */}
              <p
                id="session-timeout-desc"
                className="text-sm text-text-secondary font-montreal leading-relaxed mb-8"
              >
                You've been inactive for a while. For your security, you'll be logged out
                when the timer hits zero. Click <span className="font-semibold text-text-primary">Stay Logged In</span> to continue.
              </p>

              {/* Countdown Ring */}
              <div className="mb-8">
                <CountdownRing secondsLeft={secondsLeft} />
              </div>

              {/* Buttons */}
              <div className="w-full space-y-3">
                <motion.button
                  ref={stayButtonRef}
                  onClick={onStay}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl bg-accent text-accent-fg font-bold text-sm uppercase tracking-wider hover:opacity-90 transition-opacity focus:outline-none focus:ring-4 focus:ring-accent/30"
                >
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4" />
                    Stay Logged In
                  </span>
                </motion.button>

                <motion.button
                  onClick={onLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-2xl bg-white/5 border border-border text-text-secondary font-bold text-sm uppercase tracking-wider hover:text-text-primary hover:border-red-500/30 hover:bg-red-500/5 transition-all focus:outline-none focus:ring-4 focus:ring-red-500/20"
                >
                  <span className="flex items-center justify-center gap-2">
                    <LogOut className="w-4 h-4" />
                    Logout Now
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
