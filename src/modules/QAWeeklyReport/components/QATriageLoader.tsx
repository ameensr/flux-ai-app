import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'

export type LineType = 'process' | 'pass' | 'fail' | 'complete'
export interface LineData {
  id: number
  type: LineType
  text: string
}

interface QATriageLoaderProps {
  onComplete: () => void
  isCompact?: boolean
  /** Smaller vertical footprint for overlay / card embeds (keeps readable type). */
  dense?: boolean
  /** Overrides the default defect-triage script — lets other "qaly.ai / X TRIAGE" screens reuse this exact loader with their own phrasing. */
  sequence?: LineData[]
  /** Text shown after "qaly.ai /" in the branding row. Defaults to "QA TRIAGE". */
  brandLabel?: string
}

const DEFAULT_SEQUENCE: LineData[] = [
  { id: 1, type: 'process', text: '> Reading defect details...' },
  { id: 2, type: 'process', text: '> Checking reproduction status...' },
  { id: 3, type: 'process', text: '> Evaluating severity...' },
  { id: 4, type: 'process', text: '> Reviewing testing status...' },
  { id: 5, type: 'process', text: '> Comparing release impact...' },
  { id: 6, type: 'pass', text: '[PASS] Reproduction data checked' },
  { id: 7, type: 'fail', text: '[FAIL] Active defect identified' },
  { id: 8, type: 'complete', text: '[PASS] Analysis complete' },
]

const LineItem = ({
  data,
  onFinish,
  isActive,
  isCompact,
}: {
  data: LineData
  onFinish: () => void
  isActive: boolean
  isCompact?: boolean
}) => {
  const words = data.text.split(' ')
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish

  useEffect(() => {
    if (!isActive) return
    let timeout: ReturnType<typeof setTimeout>

    // Snappier cadence — same sequence, less wait between lines
    if (data.type === 'process') {
      timeout = setTimeout(() => onFinishRef.current(), Math.min(words.length * 70 + 320, 900))
    } else if (data.type === 'complete') {
      timeout = setTimeout(() => onFinishRef.current(), 700)
    } else {
      timeout = setTimeout(() => onFinishRef.current(), 380)
    }

    return () => clearTimeout(timeout)
  }, [data, isActive, words.length])

  if (data.type === 'process') {
    return (
      <div className="flex items-center text-text-secondary">
        <div className="flex gap-1.5 flex-wrap">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: Math.min(i * 0.06, 0.35), duration: 0.18 }}
            >
              {w}
            </motion.span>
          ))}
        </div>
        {isActive && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
            className={`bg-text-secondary/70 ml-2 mb-0.5 inline-block ${isCompact ? 'w-1 h-2.5' : 'w-1.5 h-3.5'}`}
          />
        )}
      </div>
    )
  }

  const colorClass =
    data.type === 'pass' || data.type === 'complete'
      ? 'text-green-600/90 dark:text-green-400/80'
      : 'text-red-600/90 dark:text-red-400/80'

  const spacingClass =
    data.type === 'complete'
      ? isCompact
        ? 'mt-2 pt-2 border-t border-border/30'
        : 'mt-4 pt-4 border-t border-border/30'
      : 'mt-1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`font-medium ${colorClass} ${spacingClass}`}
    >
      {data.text}
    </motion.div>
  )
}

export const QATriageLoader: React.FC<QATriageLoaderProps> = ({
  onComplete,
  isCompact = false,
  dense = false,
  sequence = DEFAULT_SEQUENCE,
  brandLabel = 'QA TRIAGE',
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const handleLineFinish = useCallback(() => {
    setCurrentLineIndex(prev => {
      if (prev < sequence.length - 1) return prev + 1
      // Defer so we don't call setState during another setState
      queueMicrotask(() => onCompleteRef.current())
      return prev
    })
  }, [sequence.length])

  const containerHeight = isCompact ? 'h-full flex-1' : dense ? 'min-h-0' : 'min-h-[320px]'
  const cardStyle = isCompact
    ? 'w-full h-full font-mono text-[10px] flex flex-col justify-center'
    : dense
      ? 'w-full font-mono text-xs md:text-[13px] px-1 py-3'
      : 'w-full max-w-sm mx-auto font-mono text-xs md:text-sm px-6 py-10 rounded-2xl bg-surface-elevated/30 border border-border/20 shadow-inner'

  return (
    <div className={`flex flex-col items-center justify-center w-full bg-transparent ${containerHeight}`}>
      <div className={cardStyle}>
        <div className={`w-full border-b border-border/40 pb-3 ${isCompact || dense ? 'mb-3' : 'mb-5 pb-4'}`}>
          <span className="font-bold tracking-[0.12em]">
            <span className="text-accent-gold">qaly.ai</span>
            <span className="mx-1.5 text-border">/</span>
            <span className="text-text-muted">{brandLabel}</span>
          </span>
        </div>

        <div className={`flex flex-col gap-1.5 w-full ${isCompact ? '' : dense ? 'min-h-[180px] gap-2' : 'min-h-[180px] gap-2'}`}>
          {sequence.slice(0, currentLineIndex + 1).map((line, idx) => (
            <LineItem
              key={line.id}
              data={line}
              isActive={idx === currentLineIndex}
              isCompact={isCompact}
              onFinish={handleLineFinish}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
