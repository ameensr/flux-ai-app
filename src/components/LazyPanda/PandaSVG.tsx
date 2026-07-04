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
}) => {
  const isHandsUp = state === 'PASSWORD_HIDE'
  const isOneEyeOpen = state === 'PASSWORD_SHOW'
  const isSleeping = state === 'SLEEPING'
  const isSuccess = state === 'SUCCESS'
  const isError = state === 'ERROR'
  const isLoading = state === 'LOGIN_LOADING'

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
        fill="rgba(0,0,0,0.15)"
        animate={{ rx: isSleeping ? 22 : 18, opacity: isSleeping ? 0.1 : 0.15 }}
        transition={{ duration: 0.4 }}
      />

      {/* ── Body ── */}
      <motion.g
        animate={{
          y: isSuccess ? -8 : isSleeping ? 5 : 0,
          rotate: isSleeping ? -5 : 0,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ originX: '80px', originY: '140px' }}
      >
        {/* Body (round) */}
        <ellipse cx="80" cy="115" rx="30" ry="32" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1" />

        {/* Belly patch */}
        <ellipse cx="80" cy="120" rx="18" ry="20" fill="#F5F5F5" />

        {/* ── Tail ── */}
        <motion.circle
          cx="50"
          cy="130"
          r="6"
          fill="#2D2D2D"
          variants={tailVariant}
          animate="animate"
          style={{ originX: '56px', originY: '130px' }}
        />

        {/* ── Legs ── */}
        <ellipse cx="68" cy="142" rx="9" ry="6" fill="#2D2D2D" />
        <ellipse cx="92" cy="142" rx="9" ry="6" fill="#2D2D2D" />

        {/* ── Arms / Paws ── */}
        <motion.g
          animate={{
            y: isHandsUp || isOneEyeOpen ? -30 : 0,
            rotate: isHandsUp || isOneEyeOpen ? -10 : 0,
          }}
          transition={{ duration: DURATIONS.handRaise, ease: EASING.smooth }}
          style={{ originX: '60px', originY: '110px' }}
        >
          {/* Left arm */}
          <ellipse cx="55" cy="110" rx="8" ry="12" fill="#2D2D2D" />
          <ellipse cx="55" cy="104" rx="6" ry="5" fill="#4A4A4A" />
        </motion.g>

        <motion.g
          animate={{
            y: isHandsUp ? -30 : isOneEyeOpen ? 0 : 0,
            rotate: isHandsUp ? 10 : 0,
          }}
          transition={{ duration: DURATIONS.handRaise, ease: EASING.smooth }}
          style={{ originX: '100px', originY: '110px' }}
        >
          {/* Right arm */}
          <ellipse cx="105" cy="110" rx="8" ry="12" fill="#2D2D2D" />
          <ellipse cx="105" cy="104" rx="6" ry="5" fill="#4A4A4A" />
        </motion.g>

        {/* ── Head ── */}
        <motion.g
          animate={{ rotate: headRotation * 0.3 }}
          transition={{ duration: DURATIONS.headRotate, ease: EASING.smooth }}
          style={{ originX: '80px', originY: '80px' }}
        >
          {/* Head shape */}
          <circle cx="80" cy="72" r="32" fill="#FAFAFA" stroke="#E0E0E0" strokeWidth="1" />

          {/* Ears */}
          <circle cx="56" cy="50" r="12" fill="#2D2D2D" />
          <circle cx="56" cy="50" r="7" fill="#4A4A4A" />
          <circle cx="104" cy="50" r="12" fill="#2D2D2D" />
          <circle cx="104" cy="50" r="7" fill="#4A4A4A" />

          {/* Eye patches (dark circles around eyes) */}
          <ellipse cx="68" cy="72" rx="12" ry="11" fill="#2D2D2D" />
          <ellipse cx="92" cy="72" rx="12" ry="11" fill="#2D2D2D" />

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
                fill="#1A1A1A"
                animate={{ opacity: leftEyeOpen }}
              />
            )}
            {/* Eye shine */}
            {leftEyeOpen > 0 && !isBlinking && (
              <circle cx="67" cy="70" r="1.2" fill="white" opacity="0.8" />
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
                fill="#1A1A1A"
                animate={{ opacity: rightEyeOpen }}
              />
            )}
            {rightEyeOpen > 0 && !isBlinking && (
              <circle cx="91" cy="70" r="1.2" fill="white" opacity="0.8" />
            )}
          </motion.g>

          {/* Nose */}
          <ellipse cx="80" cy="82" rx="4" ry="3" fill="#2D2D2D" />

          {/* Mouth */}
          <motion.path
            d={getMouthPath()}
            stroke="#2D2D2D"
            strokeWidth="1.5"
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

          {/* One eyebrow raised (password show) */}
          {isOneEyeOpen && (
            <motion.line
              x1="87"
              y1="62"
              x2="97"
              y2="60"
              stroke="#2D2D2D"
              strokeWidth="2"
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
