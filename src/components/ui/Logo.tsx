import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animate?: boolean
  collapsed?: boolean
  /** Force monochrome white — for use on solid colored backgrounds */
  mono?: boolean
  /** Force dark wordmark — for light backgrounds */
  dark?: boolean
}

// ─── The Qaly Wordmark ────────────────────────────────────────────────────────
// Single source of truth for app branding — this is the exact design used on
// the Authentication page: a gradient "Q" + "aly" wordmark with a small
// gradient sparkle accent, plus a muted "AI ENGINE" subtext.
//   • font-inter font-extrabold, tight tracking
//   • gradient text (.text-gradient-q, driven by --q-gradient in index.css)
//   • sparkle dot (.logo-sparkle) with a soft glow
// Reused everywhere via this one component so every surface (sidebar, header,
// footer, landing page, report headers, etc.) stays perfectly in sync.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Size map — font sizes (px) tuned to match the Auth page at `lg` ─────────
const SIZE_MAP = {
  sm: { qaly: 16, engine: 8, gap: 6, sparkle: 4 },
  md: { qaly: 20, engine: 9, gap: 7, sparkle: 5 },
  lg: { qaly: 30, engine: 12, gap: 8, sparkle: 6 },
  xl: { qaly: 38, engine: 14, gap: 10, sparkle: 7 },
}

// ─── Logo ─────────────────────────────────────────────────────────────────────
export const Logo: React.FC<LogoProps> = ({
  className,
  size = 'md',
  animate = true,
  collapsed = false,
  mono = false,
  dark = false,
}) => {
  const s = SIZE_MAP[size]

  // Wordmark color: always high-contrast solid color (no transparent gradient trick)
  const qalyColor = mono
    ? (dark ? '#111827' : '#ffffff')
    : 'var(--text-primary)'

  const engineColor = mono
    ? (dark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.55)')
    : 'var(--text-muted)'

  return (
    <div
      className={cn('inline-flex items-baseline select-none', className)}
      style={{ gap: s.gap }}
      role="img"
      aria-label="Qaly AI Engine"
    >
      {/* "Qaly" wordmark — gradient Q + sparkle, always visible */}
      <motion.div
        className="font-inter font-extrabold tracking-tighter inline-flex items-center shrink-0"
        style={{ fontSize: s.qaly, lineHeight: 1, color: qalyColor }}
        initial={animate ? { opacity: 0, scale: 0.85 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className={mono ? undefined : 'text-gradient-q'}>Q</span>
        {!collapsed && (
          <>
            aly
            <span className="logo-sparkle" style={{ width: s.sparkle, height: s.sparkle }} />
          </>
        )}
      </motion.div>

      {/* "AI ENGINE" — refined secondary, hidden when collapsed */}
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: animate ? 0.12 : 0 }}
            className="font-inter font-medium uppercase whitespace-nowrap"
            style={{ fontSize: s.engine, letterSpacing: '0.14em', lineHeight: 1, color: engineColor }}
          >
            AI Engine
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Icon-only export (for FAB, avatar, favicon contexts) ─────────────────────
// Renders just the gradient "Q" glyph — the same character used in the full
// wordmark above — for spaces too tight for the full logo.
export const QalyIcon: React.FC<{
  size?: number
  mono?: boolean
  dark?: boolean
  className?: string
  animate?: boolean
}> = ({ size = 32, mono = false, dark = false, className, animate = false }) => {
  const color = mono ? (dark ? '#111827' : '#ffffff') : undefined

  return (
    <motion.span
      className={cn(
        'inline-flex items-center justify-center shrink-0 font-inter font-extrabold select-none',
        !mono && 'text-gradient-q',
        className,
      )}
      style={{ fontSize: size, lineHeight: 1, color }}
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      role="img"
      aria-label="Qaly AI Engine"
    >
      Q
    </motion.span>
  )
}
