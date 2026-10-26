// src/components/announcements/QubRebrandingAnnouncement.tsx
// Standalone, minimal & elegant Qub.ai rebranding announcement popup.
// Features precision isometric "Qub" emblem, technical engineering crosshairs,
// and identity evolution transition pill.
// Fully accessible, theme-aware, focus-trapped, and non-configurable.

import React, { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { useAnnouncementStore } from '@/store/useAnnouncementStore'
import { useActiveUsageTimer } from '@/hooks/useActiveUsageTimer'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ROUTES } from '@/lib/routes'

export const QubRebrandingAnnouncement: React.FC = () => {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { isOpen, dismissPopup } = useAnnouncementStore()

  // 60-second active usage tracker
  useActiveUsageTimer()

  // Lock background scroll while modal is active
  useBodyScrollLock(isOpen)

  // Focus management
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const primaryButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement | null
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus?.()
      previousFocusRef.current = null
    }
  }, [isOpen])

  // Handle Escape key and Tab focus trap
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        dismissPopup()
        return
      }

      if (e.key === 'Tab') {
        const dialog = dialogRef.current
        if (!dialog) return

        const focusableElements = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    },
    [dismissPopup]
  )

  // Primary action: navigate to Dashboard
  const handleExplore = useCallback(() => {
    dismissPopup()
    navigate(ROUTES.dashboard)
  }, [dismissPopup, navigate])

  // Theme-tailored glassmorphic design tokens:
  // Dark:  Glass Surface rgba(16,20,38,0.72), Text #F8F9FF, Secondary #A8B0C5, Violet #7165F5, Blue #4F9DFF
  // Light: Glass Surface rgba(255,255,255,0.78), Text #171827, Secondary #697084, Violet #6255E8, Blue #2878F0
  const tokens = isDark
    ? {
        glassBg: 'rgba(16, 20, 38, 0.72)',
        textPrimary: '#F8F9FF',
        textSecondary: '#A8B0C5',
        violet: '#7165F5',
        blue: '#4F9DFF',
        glassBorder: 'rgba(255, 255, 255, 0.16)',
        // Soft colored overlay: gentle, colorful blur without desaturating or blacking out the background
        overlay: 'rgba(10, 14, 28, 0.38)',
        hairline: 'rgba(255, 255, 255, 0.1)',
        subtleGlass: 'rgba(255, 255, 255, 0.05)',
        subtleBorder: 'rgba(255, 255, 255, 0.12)',
        cardShadow:
          'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), inset 0 -1px 1px 0 rgba(0, 0, 0, 0.2), 0 24px 60px -12px rgba(0, 0, 0, 0.5), 0 0 32px -4px rgba(113, 101, 245, 0.22)',
        crosshair: 'rgba(113, 101, 245, 0.4)',
      }
    : {
        glassBg: 'rgba(255, 255, 255, 0.78)',
        textPrimary: '#171827',
        textSecondary: '#697084',
        violet: '#6255E8',
        blue: '#2878F0',
        glassBorder: 'rgba(255, 255, 255, 0.7)',
        // Soft colorful overlay for light mode
        overlay: 'rgba(240, 244, 252, 0.45)',
        hairline: 'rgba(15, 23, 42, 0.06)',
        subtleGlass: 'rgba(255, 255, 255, 0.6)',
        subtleBorder: 'rgba(255, 255, 255, 0.7)',
        cardShadow:
          'inset 0 1px 1px 0 rgba(255, 255, 255, 0.95), 0 20px 50px -10px rgba(15, 23, 42, 0.12), 0 0 24px -4px rgba(98, 85, 232, 0.15)',
        crosshair: 'rgba(98, 85, 232, 0.35)',
      }

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ backgroundColor: tokens.overlay }}
          onKeyDown={handleKeyDown}
          role="presentation"
        >
          {/* Gentle, Colorful Background Blur — "little bit blur", NO grayscale / b&w */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 backdrop-blur-[6px] pointer-events-none"
          />

          {/* Centered Glassmorphic Modal Dialog */}
          <motion.div
            ref={dialogRef}
            id="qub-rebranding-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qub-announcement-headline"
            aria-describedby="qub-announcement-desc"
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[440px] rounded-3xl overflow-hidden p-8 sm:p-10 z-10 backdrop-blur-2xl transition-colors"
            style={{
              backgroundColor: tokens.glassBg,
              border: `1px solid ${tokens.glassBorder}`,
              boxShadow: tokens.cardShadow,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Specular Top Hairline Reflection */}
            <div
              className="absolute top-0 left-0 right-0 h-[1.5px] pointer-events-none"
              style={{
                background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 30%, ${tokens.violet} 50%, ${tokens.blue} 70%, transparent 100%)`,
                opacity: isDark ? 0.75 : 0.6,
              }}
              aria-hidden="true"
            />

            {/* Delicate Ambient Halo Behind Emblem */}
            <div
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none blur-3xl"
              style={{
                background: `radial-gradient(circle, ${tokens.violet}30 0%, ${tokens.blue}15 45%, transparent 70%)`,
              }}
              aria-hidden="true"
            />

            {/* Creative Minimal Corner Crosshairs (+) */}
            <span
              className="absolute top-3 left-3 text-[10px] font-mono select-none pointer-events-none transition-colors"
              style={{ color: tokens.crosshair }}
              aria-hidden="true"
            >
              +
            </span>
            <span
              className="absolute top-3 right-3 text-[10px] font-mono select-none pointer-events-none transition-colors"
              style={{ color: tokens.crosshair }}
              aria-hidden="true"
            >
              +
            </span>
            <span
              className="absolute bottom-3 left-3 text-[10px] font-mono select-none pointer-events-none transition-colors"
              style={{ color: tokens.crosshair }}
              aria-hidden="true"
            >
              +
            </span>
            <span
              className="absolute bottom-3 right-3 text-[10px] font-mono select-none pointer-events-none transition-colors"
              style={{ color: tokens.crosshair }}
              aria-hidden="true"
            >
              +
            </span>

            {/* Minimal Frosted Glass Close Button */}
            <button
              type="button"
              onClick={dismissPopup}
              aria-label="Close rebranding announcement"
              className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer backdrop-blur-md focus-visible:outline-none"
              style={{
                color: tokens.textSecondary,
                backgroundColor: tokens.subtleGlass,
                border: `1px solid ${tokens.subtleBorder}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = tokens.textPrimary
                e.currentTarget.style.backgroundColor = isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(255,255,255,0.9)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = tokens.textSecondary
                e.currentTarget.style.backgroundColor = tokens.subtleGlass
              }}
            >
              <X className="w-4 h-4 stroke-[1.5]" aria-hidden="true" />
            </button>

            {/* Content Body */}
            <div className="relative flex flex-col items-center text-center">
              {/* Creative Minimal Element: Isometric "Qub" (Cube + Q) Emblem */}
              <div className="relative mb-5 flex items-center justify-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center relative transition-transform backdrop-blur-md"
                  style={{
                    backgroundColor: tokens.subtleGlass,
                    border: `1px solid ${tokens.subtleBorder}`,
                    boxShadow: isDark
                      ? 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 8px 24px -4px rgba(0,0,0,0.3)'
                      : 'inset 0 1px 1px rgba(255, 255, 255, 0.85), 0 4px 16px -2px rgba(98,85,232,0.1)',
                  }}
                >
                  <svg
                    width="44"
                    height="44"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="qubTop"
                        x1="16"
                        y1="10"
                        x2="48"
                        y2="28"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={tokens.violet} />
                        <stop offset="100%" stopColor={tokens.blue} />
                      </linearGradient>
                      <linearGradient
                        id="qubRight"
                        x1="32"
                        y1="19"
                        x2="52"
                        y2="46"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={tokens.blue} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={tokens.violet} stopOpacity="0.3" />
                      </linearGradient>
                      <linearGradient
                        id="qubLeft"
                        x1="16"
                        y1="19"
                        x2="32"
                        y2="46"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={tokens.violet} stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#252F5A" stopOpacity="0.25" />
                      </linearGradient>
                      <linearGradient
                        id="qubTail"
                        x1="38"
                        y1="34"
                        x2="52"
                        y2="48"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop offset="0%" stopColor={tokens.blue} />
                        <stop offset="100%" stopColor={tokens.violet} />
                      </linearGradient>
                    </defs>

                    {/* Faint dashed compass orbital ring */}
                    <circle
                      cx="32"
                      cy="28"
                      r="25"
                      stroke="url(#qubTop)"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                      opacity="0.28"
                    />

                    {/* Isometric Cube Faces (Qub) */}
                    <polygon
                      points="32,10 48,19 32,28 16,19"
                      fill="url(#qubTop)"
                    />
                    <polygon
                      points="16,19 32,28 32,46 16,37"
                      fill="url(#qubLeft)"
                    />
                    <polygon
                      points="32,28 48,19 48,37 32,46"
                      fill="url(#qubRight)"
                    />

                    {/* Q dynamic stem extending from bottom-right vertex */}
                    <path
                      d="M40 33 L51 46"
                      stroke="url(#qubTail)"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                    />
                    <circle cx="51" cy="46" r="1.75" fill={tokens.blue} />
                  </svg>
                </div>
              </div>

              {/* Creative Minimal Element: Identity Evolution Pill */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-3 transition-colors select-none backdrop-blur-md"
                style={{
                  backgroundColor: tokens.subtleGlass,
                  borderColor: tokens.subtleBorder,
                }}
              >
                <span
                  className="text-[10px] font-mono tracking-wider line-through transition-opacity"
                  style={{ color: tokens.textSecondary, opacity: 0.5 }}
                >
                  QALY
                </span>
                <span
                  className="text-[9px] font-bold"
                  style={{ color: tokens.violet }}
                  aria-hidden="true"
                >
                  →
                </span>
                <span
                  className="text-[10px] font-mono font-bold tracking-wider"
                  style={{ color: tokens.textPrimary }}
                >
                  QUB.AI
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full ml-0.5 animate-pulse"
                  style={{ backgroundColor: tokens.blue }}
                  aria-hidden="true"
                />
              </div>

              {/* Eyebrow Label */}
              <span
                className="text-[9px] font-bold uppercase tracking-[0.28em] mb-2"
                style={{ color: tokens.violet }}
              >
                A NEW CHAPTER
              </span>

              {/* Brand descriptor */}
              <div className="flex items-center gap-1.5 mb-2.5">
                <span
                  className="text-xs font-semibold uppercase tracking-wider font-inter"
                  style={{ color: tokens.textSecondary }}
                >
                  Qub.ai Engine
                </span>
                <span
                  className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded backdrop-blur-sm"
                  style={{
                    color: tokens.blue,
                    border: `1px solid ${tokens.subtleBorder}`,
                    backgroundColor: tokens.subtleGlass,
                  }}
                >
                  AI ENGINE
                </span>
              </div>

              {/* Headline */}
              <h2
                id="qub-announcement-headline"
                className="text-2xl sm:text-[26px] font-black tracking-tight leading-[1.12] uppercase font-inter mb-3"
                style={{ color: tokens.textPrimary }}
              >
                INTELLIGENCE.
                <br />
                <span
                  style={{
                    background: `linear-gradient(135deg, ${tokens.violet} 0%, ${tokens.blue} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  ENGINEERED.
                </span>
              </h2>

              {/* Supporting Message */}
              <p
                id="qub-announcement-desc"
                className="text-xs sm:text-[13px] leading-relaxed max-w-[340px] mb-7 font-normal"
                style={{ color: tokens.textSecondary }}
              >
                A new identity. The same commitment to quality. Welcome to{' '}
                <strong style={{ color: tokens.textPrimary }}>Qub.ai</strong> —
                engineered for smarter quality assurance.
              </p>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2">
                {/* Primary Action Button */}
                <button
                  ref={primaryButtonRef}
                  type="button"
                  onClick={handleExplore}
                  className="w-full py-3 px-6 rounded-xl text-xs font-bold tracking-wider uppercase inline-flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-95 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    background: `linear-gradient(135deg, ${tokens.violet} 0%, ${tokens.blue} 100%)`,
                    color: '#FFFFFF',
                    boxShadow: isDark
                      ? '0 4px 20px -2px rgba(113, 101, 245, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.25)'
                      : '0 4px 16px -2px rgba(98, 85, 232, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <span>EXPLORE QUB.AI</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.25]" aria-hidden="true" />
                </button>

                {/* Secondary Dismissal Action */}
                <button
                  type="button"
                  onClick={dismissPopup}
                  className="w-full py-2 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none"
                  style={{ color: tokens.textSecondary }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = tokens.textPrimary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = tokens.textSecondary
                  }}
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
