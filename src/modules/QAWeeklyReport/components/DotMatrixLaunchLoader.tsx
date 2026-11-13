import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

// 5 columns x 8 rows dot-matrix font map
const DOT_FONT: Record<string, number[][]> = {
  '0': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '1': [
    [0, 0, 1, 1, 0],
    [1, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
  ],
  '2': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1],
  ],
  '3': [
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  '4': [
    [0, 0, 0, 1, 0],
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  '5': [
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
  ],
  '6': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '7': [
    [1, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
  ],
  '8': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '9': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
  '%': [
    [1, 1, 0, 1, 1],
    [1, 1, 0, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 1, 1],
    [1, 0, 0, 1, 1],
  ],
}

// Dot matrix arrow (matching the bottom-left arrow in uploaded image)
const ARROW_GRID = [
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [1, 1, 1, 0, 1],
  [0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0],
]

interface DotMatrixLoaderProps {
  open: boolean
  onComplete: () => void
  durationMs?: number
  label?: string
  sublabel?: string
}

/**
 * DotMatrixLaunchLoader:
 * Displays the Swiss dot-matrix loading counter in the application's UI color theme.
 * Counts smoothly from 0% to 100%, supports Dark & Light themes, and loads the page.
 */
export const DotMatrixLaunchLoader: React.FC<DotMatrixLoaderProps> = ({
  open,
  onComplete,
  durationMs = 1100,
  label = 'LOADING...',
  sublabel = 'SP • DEV',
}) => {
  useBodyScrollLock(open)
  const { isDark } = useTheme()
  const [percent, setPercent] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    if (!open) return

    setPercent(0)
    setIsDone(false)
    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progressRatio = Math.min(elapsed / durationMs, 1)

      // Fast, snappy decelerating cubic curve so count is dynamic and responsive
      const easedPercent = Math.min(
        Math.round((1 - Math.pow(1 - progressRatio, 2.5)) * 100),
        100
      )
      setPercent(easedPercent)

      if (progressRatio >= 1) {
        clearInterval(interval)
        setIsDone(true)
        // Snappy pause at 100% so user sees completion before fast reveal
        setTimeout(() => {
          onCompleteRef.current?.()
        }, 140)
      }
    }, 20)

    return () => clearInterval(interval)
  }, [open, durationMs])

  if (!open) return null

  const textToRender = `${percent}%`

  // Application UI colors:
  // Dark Theme: Background #090D1A, Active Dots #6366F1 / #818CF8, Glow 0 0 16px rgba(99,102,241,0.7)
  // Light Theme: Background #F4F6FB, Active Dots #4F46E5 / #6366F1, Shadow 0 2px 8px rgba(79,70,229,0.3)
  const activeDotColor = isDark ? '#6366F1' : '#4F46E5'
  const unlitDotColor = isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.07)'
  const accentTextColor = isDark ? '#818CF8' : '#4F46E5'
  const subtextColor = isDark ? '#A4B3CD' : '#64748B'

  return (
    <AnimatePresence>
      <motion.div
        key="dot-matrix-loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[9999] flex flex-col justify-between p-6 sm:p-12 lg:p-20 select-none overflow-hidden transition-colors duration-500"
        style={{
          backgroundColor: isDark ? '#090D1A' : '#F4F6FB',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Loading report"
      >
        {/* Subtle Ambient Radial UI Glow in Dark Mode */}
        {isDark && (
          <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-25 bg-indigo-500" />
        )}

        {/* ── Top Row: Status Label ── */}
        <div className="w-full flex items-start justify-between relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex items-center gap-2"
          >
            <span
              className="font-mono text-xs sm:text-[13px] font-bold tracking-[0.22em] uppercase"
              style={{ color: accentTextColor }}
            >
              {label}
            </span>
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: accentTextColor,
                boxShadow: isDark ? '0 0 8px rgba(99,102,241,0.8)' : undefined,
              }}
            />
          </motion.div>
        </div>

        {/* ── Center / Right Composition: Huge Dot Matrix Number Counter ── */}
        <div className="w-full flex items-center justify-end my-auto py-8 relative z-10">
          <div className="flex flex-col items-start">
            {/* The Numbers (0% -> 100%) */}
            <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
              {textToRender.split('').map((char, charIdx) => {
                const grid = DOT_FONT[char] || DOT_FONT['0']
                return (
                  <motion.div
                    key={`char-${charIdx}-${char}`}
                    initial={{ opacity: 0.85, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.08 }}
                    className="grid grid-cols-5 gap-1.5 sm:gap-2 md:gap-3"
                  >
                    {grid.flatMap((row, rIdx) =>
                      row.map((cell, cIdx) => (
                        <div
                          key={`dot-${rIdx}-${cIdx}`}
                          className="w-2.5 h-2.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 rounded-full transition-all duration-100"
                          style={{
                            backgroundColor: cell === 1 ? activeDotColor : unlitDotColor,
                            boxShadow:
                              cell === 1
                                ? isDark
                                  ? isDone
                                    ? '0 0 20px rgba(99,102,241,0.9), 0 0 40px rgba(99,102,241,0.5)'
                                    : '0 0 10px rgba(99,102,241,0.6)'
                                  : isDone
                                    ? '0 4px 14px rgba(79,70,229,0.45)'
                                    : '0 2px 6px rgba(79,70,229,0.25)'
                                : undefined,
                            transform: cell === 1 ? 'scale(1)' : 'scale(0.8)',
                          }}
                        />
                      ))
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Sublabel directly underneath leftmost digit (matches "SP • DEV" in image) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-3 sm:mt-5 ml-1 font-mono text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase"
              style={{ color: subtextColor }}
            >
              {sublabel}
            </motion.div>
          </div>
        </div>

        {/* ── Bottom Row: Animated Dot-Matrix Arrow ── */}
        <div className="w-full flex items-end justify-between relative z-10">
          <motion.div
            animate={{ x: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="grid grid-cols-5 gap-1.5 sm:gap-2 w-fit"
          >
            {ARROW_GRID.flatMap((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`arrow-${rIdx}-${cIdx}`}
                  className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full transition-colors"
                  style={{
                    backgroundColor: cell === 1 ? activeDotColor : unlitDotColor,
                    boxShadow:
                      cell === 1
                        ? isDark
                          ? '0 0 8px rgba(99,102,241,0.6)'
                          : '0 2px 6px rgba(79,70,229,0.25)'
                        : undefined,
                  }}
                />
              ))
            )}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
