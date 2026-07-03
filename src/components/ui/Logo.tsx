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

// ─── The Qaly Icon ────────────────────────────────────────────────────────────
// Design language:
//   • A perfect circle — representing quality, completeness, continuous improvement
//   • A precision orbital arc sweeping 270° — representing AI intelligence, motion
//   • A confident diagonal tail — the Q signature, also a forward-pointing arrow
//   • Gradient stroke: indigo → blue (brand identity)
//   • Bolder stroke weights for high visibility at all sizes
// ─────────────────────────────────────────────────────────────────────────────

interface QIconProps {
  size: number
  mono?: boolean
  gradientId: string
  glowId: string
}

const QIcon: React.FC<QIconProps> = ({ size, mono, gradientId, glowId }) => {
  const cx = 14.5
  const cy = 14.5
  const r = 9
  const strokeW = 2.8

  // Orbital arc: 270° sweep from top clockwise to right
  const arcStartX = cx
  const arcStartY = cy - r
  const arcEndX = cx + r
  const arcEndY = cy

  // Tail: diagonal from arc end, pointing bottom-right
  const tailX1 = arcEndX
  const tailY1 = arcEndY
  const tailX2 = arcEndX + 5.5
  const tailY2 = arcEndY + 5.5

  const stroke = mono ? 'currentColor' : `url(#${gradientId})`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="50%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#2D8CFF" />
        </linearGradient>
        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Main circle — the Q body */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        stroke={stroke}
        strokeWidth={strokeW}
        fill="none"
        strokeLinecap="round"
        filter={mono ? undefined : `url(#${glowId})`}
      />

      {/* Orbital arc — intelligence layer, subtly lighter */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${r} ${r} 0 1 1 ${arcEndX} ${arcEndY}`}
        stroke={stroke}
        strokeWidth={strokeW * 0.6}
        fill="none"
        strokeLinecap="round"
        opacity={0.35}
      />

      {/* Precision tail — the Q signature */}
      <line
        x1={tailX1}
        y1={tailY1}
        x2={tailX2}
        y2={tailY2}
        stroke={stroke}
        strokeWidth={strokeW}
        strokeLinecap="round"
        filter={mono ? undefined : `url(#${glowId})`}
      />
    </svg>
  )
}

// ─── Size map ─────────────────────────────────────────────────────────────────
const SIZE_MAP = {
  sm: { icon: 24, qaly: 16, engine: 9, gap: 7, letterSpacing: '-0.02em', engineTracking: '0.12em' },
  md: { icon: 28, qaly: 19, engine: 10, gap: 8, letterSpacing: '-0.02em', engineTracking: '0.14em' },
  lg: { icon: 36, qaly: 26, engine: 13, gap: 10, letterSpacing: '-0.025em', engineTracking: '0.15em' },
  xl: { icon: 50, qaly: 36, engine: 16, gap: 13, letterSpacing: '-0.03em', engineTracking: '0.17em' },
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
  const uid = React.useId().replace(/:/g, '')
  const gradientId = `qg-${uid}`
  const glowId = `qgl-${uid}`

  // Wordmark color: always high-contrast solid color (no transparent gradient trick)
  const qalyColor = mono
    ? (dark ? '#111827' : '#ffffff')
    : 'var(--text-primary)'

  const engineColor = mono
    ? (dark ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.55)')
    : 'var(--text-muted)'

  return (
    <div
      className={cn('inline-flex items-center select-none', className)}
      style={{ gap: s.gap }}
      role="img"
      aria-label="Qaly AI Engine"
    >
      {/* Icon */}
      <motion.div
        className="shrink-0 flex items-center justify-center"
        initial={animate ? { opacity: 0, scale: 0.75 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <QIcon size={s.icon} mono={mono} gradientId={gradientId} glowId={glowId} />
      </motion.div>

      {/* Wordmark */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: animate ? 0.12 : 0 }}
            className="flex items-baseline"
            style={{ gap: size === 'sm' ? 3 : 4 }}
          >
            {/* "Qaly" — solid, bold, always visible */}
            <span
              className="font-clash"
              style={{
                fontSize: s.qaly,
                fontWeight: 700,
                letterSpacing: s.letterSpacing,
                lineHeight: 1,
                color: qalyColor,
              }}
            >
              Qaly
            </span>

            {/* "AI ENGINE" — refined secondary */}
            <span
              style={{
                fontSize: s.engine,
                fontWeight: 500,
                letterSpacing: s.engineTracking,
                lineHeight: 1,
                textTransform: 'uppercase',
                color: engineColor,
              }}
            >
              AI Engine
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Icon-only export (for FAB, avatar, favicon contexts) ─────────────────────
export const QalyIcon: React.FC<{
  size?: number
  mono?: boolean
  className?: string
  animate?: boolean
}> = ({ size = 32, mono = false, className, animate = false }) => {
  const uid = React.useId().replace(/:/g, '')
  return (
    <motion.div
      className={cn('inline-flex items-center justify-center shrink-0', className)}
      initial={animate ? { opacity: 0, scale: 0.8 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <QIcon size={size} mono={mono} gradientId={`qg-icon-${uid}`} glowId={`qgl-icon-${uid}`} />
    </motion.div>
  )
}
