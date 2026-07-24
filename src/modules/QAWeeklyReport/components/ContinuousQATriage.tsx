import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContinuousQATriageProps {
  position?: 'top' | 'bottom'
  className?: string
  opacity?: string
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
  'Compiling component metrics...'
]

const LineItem = ({ data }: { data: LineData }) => {
  const words = data.text.split(' ')
  
  if (data.type === 'process') {
    return (
      <div className="flex items-center text-text-secondary/70">
        <div className="flex gap-1 flex-wrap">
          {words.map((w, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
            >
              {w}
            </motion.span>
          ))}
        </div>
      </div>
    )
  }

  const colorClass = data.type === 'pass' 
    ? 'text-green-600/70 dark:text-green-400/70' 
    : 'text-red-600/70 dark:text-red-400/70'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`font-medium ${colorClass} mt-1`}
    >
      {data.text}
    </motion.div>
  )
}

export const ContinuousQATriage: React.FC<ContinuousQATriageProps> = ({ 
  position = 'bottom', 
  className = '',
  opacity = 'opacity-[0.4]' 
}) => {
  const [lines, setLines] = useState<LineData[]>([])
  
  useEffect(() => {
    let idCounter = 0
    let timerId: ReturnType<typeof setTimeout>

    const tick = () => {
      // 80% chance of a process line, 20% chance of a pass/fail line
      const isProcess = Math.random() > 0.3
      let newLine: LineData

      if (isProcess) {
        const phrase = PHRASES[Math.floor(Math.random() * PHRASES.length)]
        newLine = { id: idCounter++, type: 'process', text: `> ${phrase}` }
      } else {
        const isPass = Math.random() > 0.2
        if (isPass) {
          newLine = { id: idCounter++, type: 'pass', text: '[PASS] Check passed' }
        } else {
          newLine = { id: idCounter++, type: 'fail', text: '[FAIL] Attention required' }
        }
      }

      setLines(prev => {
        const newLines = [...prev, newLine]
        // Keep max 12 lines to allow it to fill more of the background
        if (newLines.length > 12) return newLines.slice(newLines.length - 12)
        return newLines
      })

      // Random delay for next line
      const nextDelay = isProcess ? 2000 + Math.random() * 1500 : 1000 + Math.random() * 1000
      timerId = setTimeout(tick, nextDelay)
    }

    timerId = setTimeout(tick, 200)

    return () => clearTimeout(timerId)
  }, [])

  const alignmentClass = position === 'top' ? 'justify-start' : 'justify-end'
  const maskStyle = position === 'top' 
    ? 'linear-gradient(to bottom, black 30%, transparent 100%)'
    : 'linear-gradient(to top, black 70%, transparent 100%)'

  return (
    <div 
      className={`absolute inset-0 z-[0] overflow-hidden pointer-events-none select-none font-mono text-[10px] p-6 flex flex-col gap-2 tracking-wide ${alignmentClass} ${opacity} ${className}`}
      style={{ WebkitMaskImage: maskStyle, maskImage: maskStyle }}
    >
      <AnimatePresence mode="popLayout">
        {lines.map(line => (
          <motion.div
            key={line.id}
            layout
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <LineItem data={line} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
