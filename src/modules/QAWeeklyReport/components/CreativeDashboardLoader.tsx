import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'

// 5x8 dot matrix font
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

const ARROW_GRID = [
  [0, 0, 1, 0, 0],
  [0, 0, 0, 1, 0],
  [1, 1, 1, 0, 1],
  [0, 0, 0, 1, 0],
  [0, 0, 1, 0, 0],
]

interface CreativeDashboardLoaderProps {
  onComplete?: () => void
  title?: string
  subtitle?: string
  dense?: boolean
  isCompact?: boolean
  durationMs?: number
}

/**
 * Creative Dot-Matrix Loading Animation:
 * Built based on the uploaded studio visual reference, matched to the UI color theme.
 * Counts 0% -> 100%, supports dark and light modes.
 */
export const CreativeDashboardLoader: React.FC<CreativeDashboardLoaderProps> = ({
  onComplete,
  title = 'LOADING...',
  subtitle = 'SP • DEV',
  dense = false,
  isCompact = false,
  durationMs = 1100,
}) => {
  const { isDark } = useTheme()
  const [percent, setPercent] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const ratio = Math.min(elapsed / durationMs, 1)
      const current = Math.min(
        Math.round((1 - Math.pow(1 - ratio, 2.5)) * 100),
        100
      )
      setPercent(current)

      if (ratio >= 1) {
        clearInterval(timer)
        setTimeout(() => {
          onCompleteRef.current?.()
        }, 140)
      }
    }, 20)

    return () => clearInterval(timer)
  }, [durationMs])

  const textToRender = `${percent}%`

  // Matched to application UI color theme
  const activeDotColor = isDark ? '#6366F1' : '#4F46E5'
  const unlitDotColor = isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.07)'
  const accentTextColor = isDark ? '#818CF8' : '#4F46E5'
  const subtextColor = isDark ? '#A4B3CD' : '#64748B'

  return (
    <div
      className={`relative flex flex-col justify-between w-full select-none ${
        isCompact ? 'py-4' : dense ? 'py-6 px-4' : 'py-10 px-6 sm:px-10'
      }`}
    >
      {/* Top row: Status label in UI color */}
      <div className="flex items-center gap-2 mb-6">
        <span
          className="font-mono text-xs font-bold tracking-[0.2em] uppercase"
          style={{ color: accentTextColor }}
        >
          {title}
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
      </div>

      {/* Center: Dot Matrix percentage counter */}
      <div className="flex flex-col items-end my-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {textToRender.split('').map((char, charIdx) => {
            const grid = DOT_FONT[char] || DOT_FONT['0']
            return (
              <div
                key={`matrix-char-${charIdx}-${char}`}
                className="grid grid-cols-5 gap-1 sm:gap-1.5"
              >
                {grid.flatMap((row, rIdx) =>
                  row.map((cell, cIdx) => (
                    <div
                      key={`matrix-dot-${rIdx}-${cIdx}`}
                      className="w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-colors"
                      style={{
                        backgroundColor: cell === 1 ? activeDotColor : unlitDotColor,
                        boxShadow:
                          cell === 1
                            ? isDark
                              ? '0 0 8px rgba(99,102,241,0.7)'
                              : '0 2px 6px rgba(79,70,229,0.3)'
                            : undefined,
                      }}
                    />
                  ))
                )}
              </div>
            )
          })}
        </div>

        {subtitle && (
          <div
            className="mt-3 font-mono text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: subtextColor }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {/* Bottom: Animated Dot-Matrix arrow */}
      <div className="mt-6 flex items-center justify-start">
        <motion.div
          animate={{ x: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="grid grid-cols-5 gap-1"
        >
          {ARROW_GRID.flatMap((row, rIdx) =>
            row.map((cell, cIdx) => (
              <div
                key={`arr-dot-${rIdx}-${cIdx}`}
                className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
                style={{
                  backgroundColor: cell === 1 ? activeDotColor : unlitDotColor,
                  boxShadow:
                    cell === 1
                      ? isDark
                        ? '0 0 6px rgba(99,102,241,0.6)'
                        : '0 2px 4px rgba(79,70,229,0.25)'
                      : undefined,
                }}
              />
            ))
          )}
        </motion.div>
      </div>
    </div>
  )
}
