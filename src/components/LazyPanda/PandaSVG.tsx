// src/components/LazyPanda/PandaSVG.tsx
// Premium SVG Panda with animated body parts.
// All animations driven by props — no internal state.

import React, { memo } from 'react'
import { motion } from 'framer-motion'
import type { PandaState } from './types'
import { DURATIONS, EASING } from './types'

interface PandaSVGProps {
  state: PandaState
  eyeOffset: { x: number; y: number }
  headRotation: number
  isBlinking: boolean
  size?: number
  /** Show a smartphone held in the panda's paws (e.g. 404 page) */
  holdingPhone?: boolean
}

// ── Breathing animation (continuous, subtle) ──────────────────────────────────
const breatheVariant = {
  animate: {
    scaleY: [1, 1.015, 1],
    scaleX: [1, 0.995, 1],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

// ── Tail wag ──────────────────────────────────────────────────────────────────
const tailVariant = {
  animate: {
    rotate: [-8, 8, -8],
    transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

export const PandaSVG: React.FC<PandaSVGProps> = memo(({
  state,
  eyeOffset,
  headRotation,
  isBlinking,
  size = 160,
  holdingPhone = false,
}) => {
  const isHandsUp = state === 'PASSWORD_HIDE'
  const isOneEyeOpen = state === 'PASSWORD_SHOW'
  const isSleeping = state === 'SLEEPING'
  const isSuccess = state === 'SUCCESS'
  const isError = state === 'ERROR'
  const isLoading = state === 'LOGIN_LOADING'
  const isWalking = state === 'WALKING'

  // Eye state
  const eyeScaleY = isBlinking || isSleeping ? 0.1 : 1
  const leftEyeOpen = isHandsUp ? 0 : isOneEyeOpen ? 0 : 1
  const rightEyeOpen = isHandsUp ? 0 : isOneEyeOpen ? 1 : 1

  // Mouth shape
  const getMouthPath = () => {
    if (isSuccess) return 'M 70,120 Q 80,130 90,120' // big smile
    if (isError) return 'M 72,122 Q 80,118 88,122' // slight frown
    if (isSleeping) return 'M 74,120 Q 80,122 86,120' // relaxed
    if (isOneEyeOpen) return 'M 72,119 Q 80,124 88,119' // guilty smile
    return 'M 74,118 Q 80,122 86,118' // gentle smile
  }

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      variants={breatheVariant}
      animate="animate"
      style={{ originX: '50%', originY: '100%' }}
    >
      {/* ── Shadow ── */}
      <motion.ellipse
        cx="80"
        cy="150"
        rx={isSuccess ? 22 : 18}
        ry="4"
        fill="rgba(0,0,0,0.2)"
        animate={{ rx: isSleeping ? 22 : 18, opacity: isSleeping ? 0.15 : 0.2 }}
        transition={{ duration: 0.4 }}
      />

      {/* ── Body ── */}
      <motion.g
        animate={{
          y: isSuccess ? -8 : isSleeping ? 5 : 0,
          rotate: isSleeping ? -5 : 0,
          x: isWalking ? [0, 2, 0, -2, 0] : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 15,
          x: isWalking ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}
        }}
        style={{ originX: '80px', originY: '140px' }}
      >
        {/* Body (round) with enhanced visibility */}
        <ellipse cx="80" cy="115" rx="30" ry="32" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />

        {/* Belly patch */}
        <ellipse cx="80" cy="120" rx="18" ry="20" fill="#F9FAFB" />

        {/* ── Tail ── with better contrast */}
        <motion.circle
          cx="50"
          cy="130"
          r="6"
          fill="#1F2937"
          variants={tailVariant}
          animate="animate"
          style={{ originX: '56px', originY: '130px' }}
        />

        {/* ── Legs ── with better contrast */}
        <ellipse cx="68" cy="142" rx="9" ry="6" fill="#1F2937" />
        <ellipse cx="92" cy="142" rx="9" ry="6" fill="#1F2937" />

        {/* ── Arms / Paws ── with better contrast */}
        <motion.g
          animate={{
            y: holdingPhone ? 4 : isHandsUp || isOneEyeOpen ? -30 : 0,
            rotate: holdingPhone ? 18 : isHandsUp || isOneEyeOpen ? -10 : 0,
            x: holdingPhone ? 6 : 0,
          }}
          transition={{ duration: DURATIONS.handRaise, ease: EASING.smooth }}
          style={{ originX: '60px', originY: '110px' }}
        >
          {/* Left arm */}
          <ellipse cx="55" cy="110" rx="8" ry="12" fill="#1F2937" />
          <ellipse cx="55" cy="104" rx="6" ry="5" fill="#374151" />
        </motion.g>

        <motion.g
          animate={{
            y: holdingPhone ? 4 : isHandsUp ? -30 : 0,
            rotate: holdingPhone ? -18 : isHandsUp ? 10 : 0,
            x: holdingPhone ? -6 : 0,
          }}
          transition={{ duration: DURATIONS.handRaise, ease: EASING.smooth }}
          style={{ originX: '100px', originY: '110px' }}
        >
          {/* Right arm */}
          <ellipse cx="105" cy="110" rx="8" ry="12" fill="#1F2937" />
          <ellipse cx="105" cy="104" rx="6" ry="5" fill="#374151" />
        </motion.g>

        {/* ── Smartphone (held in paws) ── */}
        {holdingPhone && !isHandsUp && (
          <motion.g
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: isSuccess ? -6 : isSleeping ? 4 : 0,
              rotate: isSleeping ? -8 : [-3, 3, -3],
              scale: 1,
            }}
            transition={{
              opacity: { duration: 0.35 },
              rotate: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
              y: { type: 'spring', stiffness: 200, damping: 15 },
            }}
            style={{ originX: '80px', originY: '118px' }}
          >
            <rect
              x="71"
              y="102"
              width="18"
              height="30"
              rx="3.5"
              fill="#111827"
              stroke="#374151"
              strokeWidth="1"
            />
            <rect x="73" y="105" width="14" height="22" rx="1.5" fill="#1e1b4b" />
            <motion.rect
              x="73"
              y="105"
              width="14"
              height="22"
              rx="1.5"
              fill="#6366F1"
              animate={{ opacity: [0.25, 0.45, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <rect x="75" y="108" width="10" height="1.5" rx="0.5" fill="white" opacity="0.55" />
            <rect x="75" y="112" width="7" height="1.2" rx="0.5" fill="white" opacity="0.35" />
            <rect x="75" y="115.5" width="8" height="1.2" rx="0.5" fill="white" opacity="0.28" />
            <rect x="77.5" y="103.2" width="5" height="1.2" rx="0.6" fill="#0f172a" />
            <rect x="76.5" y="128.5" width="7" height="1.2" rx="0.6" fill="white" opacity="0.4" />
            <rect x="88.5" y="110" width="1" height="4" rx="0.4" fill="#4B5563" />
          </motion.g>
        )}

        {/* ── Head ── */}
        <motion.g
          animate={{ rotate: holdingPhone ? headRotation * 0.3 + 6 : headRotation * 0.3 }}
          transition={{ duration: DURATIONS.headRotate, ease: EASING.smooth }}
          style={{ originX: '80px', originY: '80px' }}
        >
          {/* Head shape with enhanced visibility */}
          <circle cx="80" cy="72" r="32" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="1.5" />

          {/* Ears with better contrast */}
          <circle cx="56" cy="50" r="12" fill="#1F2937" />
          <circle cx="56" cy="50" r="7" fill="#374151" />
          <circle cx="104" cy="50" r="12" fill="#1F2937" />
          <circle cx="104" cy="50" r="7" fill="#374151" />

          {/* Eye patches (dark circles around eyes) with enhanced contrast */}
          <ellipse cx="68" cy="72" rx="12" ry="11" fill="#1F2937" />
          <ellipse cx="92" cy="72" rx="12" ry="11" fill="#1F2937" />

          {/* ── Eyes ── */}
          <motion.g
            animate={{ x: eyeOffset.x, y: eyeOffset.y }}
            transition={{ duration: DURATIONS.eyeMove, ease: EASING.smooth }}
          >
            {/* Left eye */}
            <motion.ellipse
              cx="68"
              cy="72"
              rx="5"
              ry="5"
              fill="white"
              animate={{ scaleY: isBlinking ? 0.1 : leftEyeOpen ? 1 : 0 }}
              transition={{ duration: DURATIONS.blink }}
              style={{ originX: '68px', originY: '72px' }}
            />
            {leftEyeOpen > 0 && !isBlinking && (
              <motion.circle
                cx="69"
                cy="73"
                r="2.5"
                fill="#0F172A"
                animate={{ opacity: leftEyeOpen }}
              />
            )}
            {/* Eye shine - brighter for contrast */}
            {leftEyeOpen > 0 && !isBlinking && (
              <circle cx="67" cy="70" r="1.3" fill="white" opacity="0.95" />
            )}

            {/* Right eye */}
            <motion.ellipse
              cx="92"
              cy="72"
              rx="5"
              ry="5"
              fill="white"
              animate={{ scaleY: isBlinking ? 0.1 : rightEyeOpen ? 1 : 0 }}
              transition={{ duration: DURATIONS.blink }}
              style={{ originX: '92px', originY: '72px' }}
            />
            {rightEyeOpen > 0 && !isBlinking && (
              <motion.circle
                cx="93"
                cy="73"
                r="2.5"
                fill="#0F172A"
                animate={{ opacity: rightEyeOpen }}
              />
            )}
            {rightEyeOpen > 0 && !isBlinking && (
              <circle cx="91" cy="70" r="1.3" fill="white" opacity="0.95" />
            )}
          </motion.g>

          {/* Nose with better contrast */}
          <ellipse cx="80" cy="82" rx="4" ry="3" fill="#1F2937" />

          {/* Mouth with darker stroke */}
          <motion.path
            d={getMouthPath()}
            stroke="#1F2937"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            animate={{ d: getMouthPath() }}
            transition={{ duration: 0.3 }}
          />

          {/* Blush (subtle) */}
          <circle cx="60" cy="82" r="4" fill="#FFB6C1" opacity="0.25" />
          <circle cx="100" cy="82" r="4" fill="#FFB6C1" opacity="0.25" />

          {/* Sleeping Zzz */}
          {isSleeping && (
            <motion.g
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], y: [0, -15, -30] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
            >
              <text x="105" y="55" fontSize="10" fontWeight="bold" fill="var(--text-muted)" fontFamily="sans-serif">z</text>
              <text x="112" y="48" fontSize="8" fontWeight="bold" fill="var(--text-muted)" fontFamily="sans-serif">z</text>
              <text x="117" y="42" fontSize="6" fontWeight="bold" fill="var(--text-muted)" fontFamily="sans-serif">z</text>
            </motion.g>
          )}

          {/* One eyebrow raised (password show) with better visibility */}
          {isOneEyeOpen && (
            <motion.line
              x1="87"
              y1="62"
              x2="97"
              y2="60"
              stroke="#1F2937"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </motion.g>

        {/* ── Loading laptop ── */}
        {isLoading && (
          <motion.g
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Tiny laptop */}
            <rect x="65" cy="125" y="125" width="30" height="18" rx="2" fill="#333" stroke="#555" strokeWidth="0.5" />
            <rect x="67" y="127" width="26" height="12" rx="1" fill="#1a1a2e" />
            {/* Screen glow */}
            <motion.rect
              x="67"
              y="127"
              width="26"
              height="12"
              rx="1"
              fill="var(--accent)"
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            {/* Coffee cup */}
            <rect x="100" y="130" width="8" height="10" rx="2" fill="#8B4513" />
            <motion.path
              d="M 101,128 Q 104,124 107,128"
              stroke="#999"
              strokeWidth="0.8"
              fill="none"
              animate={{ opacity: [0.3, 0.7, 0.3], y: [0, -2, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.g>
        )}

        {/* ── Success sparkles ── */}
        {isSuccess && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {[
              { cx: 50, cy: 45, delay: 0 },
              { cx: 110, cy: 50, delay: 0.1 },
              { cx: 65, cy: 35, delay: 0.2 },
              { cx: 95, cy: 38, delay: 0.15 },
            ].map((s, i) => (
              <motion.circle
                key={i}
                cx={s.cx}
                cy={s.cy}
                r="2"
                fill="var(--accent)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
                transition={{ delay: s.delay, duration: 0.6, repeat: 2 }}
              />
            ))}
          </motion.g>
        )}

        {/* ── Error sweat drop ── */}
        {isError && (
          <motion.g
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.ellipse
              cx="108"
              cy="58"
              rx="3"
              ry="4"
              fill="#87CEEB"
              animate={{ y: [0, 3, 0], opacity: [0.8, 0.4, 0.8] }}
              transition={{ duration: 1.5, repeat: 2 }}
            />
          </motion.g>
        )}
      </motion.g>
    </motion.svg>
  )
})

PandaSVG.displayName = 'PandaSVG'
