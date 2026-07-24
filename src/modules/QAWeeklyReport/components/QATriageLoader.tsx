import React, { useState, useEffect } from 'react'
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

const LineItem = ({ data, onFinish, isActive, isCompact }: { data: LineData, onFinish: () => void, isActive: boolean, isCompact?: boolean }) => {
  const words = data.text.split(' ')
  
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    
    // Timing calculations
    if (data.type === 'process') {
      timeout = setTimeout(() => onFinish(), words.length * 150 + 800)
    } else if (data.type === 'complete') {
      timeout = setTimeout(() => onFinish(), 1800)
    } else {
      timeout = setTimeout(() => onFinish(), 700)
    }
    
    return () => clearTimeout(timeout)
  }, [data, onFinish, words.length])

  if (data.type === 'process') {
    return (
      <div className="flex items-center text-text-secondary">
        <div className="flex gap-1.5 flex-wrap">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, filter: 'blur(2px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              {w}
            </motion.span>
          ))}
        </div>
        {isActive && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            className={`bg-text-secondary/70 ml-2 mb-0.5 inline-block ${isCompact ? 'w-1 h-2.5' : 'w-1.5 h-3.5'}`}
          />
        )}
      </div>
    )
  }

  const colorClass = data.type === 'pass' || data.type === 'complete' 
    ? 'text-green-600/90 dark:text-green-400/80' 
    : 'text-red-600/90 dark:text-red-400/80'

  const spacingClass = data.type === 'complete' ? (isCompact ? 'mt-2 pt-2 border-t border-border/30' : 'mt-4 pt-4 border-t border-border/30') : 'mt-1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.4 }}
      className={`font-medium ${colorClass} ${spacingClass}`}
    >
      {data.text}
    </motion.div>
  )
}

export const QATriageLoader: React.FC<QATriageLoaderProps> = ({ onComplete, isCompact = false, sequence = DEFAULT_SEQUENCE, brandLabel = 'QA TRIAGE' }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0)

  const handleLineFinish = () => {
    if (currentLineIndex < sequence.length - 1) {
      setCurrentLineIndex(prev => prev + 1)
    } else {
      onComplete()
    }
  }

  const containerHeight = isCompact ? 'h-full flex-1' : 'min-h-[450px]'
  const cardStyle = isCompact 
    ? 'w-full h-full font-mono text-[10px] flex flex-col justify-center'
    : 'w-full max-w-sm mx-auto font-mono text-xs md:text-sm px-6 py-12 rounded-2xl bg-surface-elevated/30 border border-border/20 shadow-inner backdrop-blur-sm'

  return (
    <div className={`flex flex-col items-center justify-center w-full bg-transparent ${containerHeight}`}>
      <div className={cardStyle}>
        
        {/* Branding */}
        <div className={`w-full border-b border-border/40 pb-3 ${isCompact ? 'mb-3' : 'mb-6 pb-4'}`}>
          <span className="font-bold tracking-[0.1em] text-text-muted">
            qaly.ai <span className="mx-1 text-border">/</span> {brandLabel}
          </span>
        </div>
        
        {/* Sequence Content */}
        <div className={`flex flex-col gap-1.5 w-full ${isCompact ? '' : 'min-h-[220px] gap-2'}`}>
          {sequence.slice(0, currentLineIndex + 1).map((line, idx) => (
            <LineItem 
              key={line.id} 
              data={line} 
              isActive={idx === currentLineIndex}
              isCompact={isCompact}
              onFinish={idx === currentLineIndex ? handleLineFinish : () => {}} 
            />
          ))}
        </div>
        
      </div>
    </div>
  )
}
