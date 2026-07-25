import React from 'react'
import { motion } from 'framer-motion'

type ThemeId = 'light' | 'dark'

export interface RankedProgressItem {
  label: string
  count: number
  percent: number
  /** Full Tailwind background class, e.g. "bg-green-400" — used for both the dot and the bar fill. */
  colorClass: string
}

interface RankedProgressListProps {
  theme: ThemeId
  items: RankedProgressItem[]
  hasPlayed?: boolean
  /** Tighter row spacing — used in the hero Bug Status rail to leave room for triage animation */
  compact?: boolean
}

/**
 * Ranked/percentage list pattern: colored dot + label, a thin fully-rounded progress bar,
 * and the resolved count/percentage at the row's end. Presentation-only — callers pass in
 * already-computed counts/percentages from real report data.
 */
export const RankedProgressList: React.FC<RankedProgressListProps> = ({
  theme,
  items,
  hasPlayed = true,
  compact = false,
}) => {
  return (
    <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-4'}`}>
      {items.map((item, idx) => (
        <div key={item.label} className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${item.colorClass}`} />
              <span className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{item.label}</span>
            </div>
            <span className="text-xs font-black shrink-0 tabular-nums">
              {item.count} <span className="text-text-muted font-semibold">· {item.percent.toFixed(1)}%</span>
            </span>
          </div>
          <div className={`${compact ? 'h-1.5' : 'h-2'} rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
            <motion.div
              initial={{ width: hasPlayed ? `${item.percent}%` : 0 }}
              animate={{ width: `${item.percent}%` }}
              transition={{ duration: hasPlayed ? 0 : 0.8, delay: hasPlayed ? 0 : idx * 0.08, ease: 'easeOut' }}
              className={`h-full rounded-full ${item.colorClass}`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
