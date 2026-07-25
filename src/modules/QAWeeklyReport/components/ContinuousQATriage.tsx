import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContinuousQATriageProps {
  position?: 'top' | 'bottom'
  className?: string
  opacity?: string
  /** Stop spawning lines (keeps current lines). Useful while modals scroll. */
  paused?: boolean
}

type LineType = 'process' | 'pass' | 'fail'
interface LineData {
  id: number
  type: LineType
  text: string
}

const PHRASES = [
  'Reading defect details...',
  'Checking reproduction status...',
  'Evaluating severity...',
  'Reviewing testing status...',
  'Comparing release impact...',
  'Validating regression flows...',
  'Analyzing API error rates...',
  'Compiling component metrics...',
]

const MAX_LINES = 5

const LineItem = ({ data }: { data: LineData }) => {
  if (data.type === 'process') {
    return <div className="text-text-secondary/70">{data.text}</div>
  }

  const colorClass =
    data.type === 'pass'
      ? 'text-green-600/70 dark:text-green-400/70'
      : 'text-red-600/70 dark:text-red-400/70'

  return <div className={`font-medium ${colorClass} mt-0.5`}>{data.text}</div>
}

/**
 * Ambient triage console. Anchored to a band (not the full card) with a soft mask
 * and per-line fade so text auto-dims as it approaches the real content above/below.
 */
export const ContinuousQATriage: React.FC<ContinuousQATriageProps> = ({
  position = 'bottom',
  className = '',
  opacity = 'opacity-[0.35]',
  paused = false,
}) => {
  const [lines, setLines] = useState<LineData[]>([])

  useEffect(() => {
    if (paused) return

    let idCounter = 0
    let timerId: ReturnType<typeof setTimeout>
    let cancelled = false

    const tick = () => {
      if (cancelled || (typeof document !== 'undefined' && document.hidden)) {
        timerId = setTimeout(tick, 1500)
        return
      }

      const isProcess = Math.random() > 0.3
      let newLine: LineData

      if (isProcess) {
        const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)]
        newLine = { id: idCounter++, type: 'process', text: `> ${phrase}` }
      } else {
        const isPass = Math.random() > 0.2
        newLine = isPass
          ? { id: idCounter++, type: 'pass', text: '[PASS] Check passed' }
          : { id: idCounter++, type: 'fail', text: '[FAIL] Attention required' }
      }

      setLines(prev => {
        const next = [...prev, newLine]
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
      })

      const nextDelay = isProcess ? 2800 + Math.random() * 1800 : 1600 + Math.random() * 1200
      timerId = setTimeout(tick, nextDelay)
    }

    timerId = setTimeout(tick, 400)
    return () => {
      cancelled = true
      clearTimeout(timerId)
    }
  }, [paused])

  const isBottom = position === 'bottom'
  // Band only — keeps typing out of the status list region
  const bandClass = isBottom
    ? 'bottom-0 left-0 right-0 h-[38%] min-h-[88px]'
    : 'top-0 left-0 right-0 h-[38%] min-h-[88px]'

  // Soft mask: fully visible at the outer edge, transparent toward content
  const maskStyle = isBottom
    ? 'linear-gradient(to top, black 0%, black 42%, transparent 92%)'
    : 'linear-gradient(to bottom, black 0%, black 42%, transparent 92%)'

  return (
    <div
      className={`absolute z-[0] overflow-hidden pointer-events-none select-none font-mono text-[10px] px-5 py-4 flex flex-col gap-1.5 tracking-wide ${
        isBottom ? 'justify-end' : 'justify-start'
      } ${opacity} ${bandClass} ${className}`}
      style={{ WebkitMaskImage: maskStyle, maskImage: maskStyle }}
      aria-hidden
    >
      <AnimatePresence initial={false}>
        {lines.map((line, index) => {
          // Lines nearer the content edge auto-fade; outer-edge lines stay readable as ambience
          const nearContentT =
            lines.length <= 1
              ? 0
              : isBottom
                ? 1 - index / (lines.length - 1) // top of stack → near content
                : index / (lines.length - 1)

          const proximityOpacity = 1 - nearContentT * 0.85

          return (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: isBottom ? 6 : -6 }}
              animate={{ opacity: proximityOpacity, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <LineItem data={line} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
