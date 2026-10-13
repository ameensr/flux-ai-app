// src/modules/DailyUpdateReport/components/ValidationTooltip.tsx
// Click-based validation issue indicator for table rows.
//
// Renders a small amber warning icon with a count badge inline (zero layout
// impact). On click, opens a compact popover listing all issues with field /
// value / reason / suggestion detail. Uses a portal so it always renders above
// sticky columns and overflow-x-auto containers regardless of scroll position.

import React, { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Info, X } from 'lucide-react'

export interface RowIssue {
  field: string
  value?: string
  reason: string
  suggestion?: string
}

interface ValidationTooltipProps {
  /** Legacy: plain string errors (shown as-is). */
  errors?: string[]
  /** Rich structured issues (preferred). */
  issues?: RowIssue[]
  /** Row number shown in the popover header (1-based). */
  rowNumber?: number
}

export const ValidationTooltip: React.FC<ValidationTooltipProps> = ({ errors = [], issues, rowNumber }) => {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const iconRef  = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Normalise: if rich issues provided use them, else convert plain errors
  const richIssues: RowIssue[] = issues && issues.length > 0
    ? issues
    : errors.map(e => ({ field: '', reason: e }))

  const hasIssues = richIssues.length > 0

  const updatePosition = () => {
    const rect = iconRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = 308
    const wouldOverflowRight = rect.left + panelWidth > window.innerWidth - 12
    setCoords({
      top: rect.bottom + 6,
      left: wouldOverflowRight ? Math.max(8, rect.right - panelWidth) : rect.left,
    })
  }

  useLayoutEffect(() => {
    if (!open || !hasIssues) return
    updatePosition()
    const handle = () => updatePosition()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [open, hasIssues])

  // Close on outside click — but NOT when clicking inside the panel itself
  useLayoutEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        iconRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!hasIssues) return null

  const count = richIssues.length

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setOpen(v => !v)
          }
          if (e.key === 'Escape') setOpen(false)
        }}
        className="relative shrink-0 leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 rounded"
        aria-label={`${count} validation issue${count === 1 ? '' : 's'} — click to view`}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Info className="w-3.5 h-3.5 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer" />
        <span className="absolute -top-1.5 -right-1.5 min-w-[13px] h-[13px] px-0.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center leading-none pointer-events-none">
          {count > 9 ? '9+' : count}
        </span>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && coords && (
            <motion.div
              ref={panelRef}
              role="dialog"
              aria-label={`Validation issues${rowNumber ? ` — Row ${rowNumber}` : ''}`}
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: 308,
                zIndex: 9999,
              }}
              className="bg-[#1c1a14] border border-amber-500/30 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/20 bg-amber-500/[0.06]">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-300">
                    Validation Issues{rowNumber ? ` — Row ${rowNumber}` : ''}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {count}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-0.5 rounded text-amber-500/60 hover:text-amber-300 transition-colors"
                  aria-label="Close validation issues"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Issue list */}
              <div className="p-2.5 space-y-2 max-h-64 overflow-y-auto">
                {richIssues.map((issue, i) => (
                  <div key={i} className="rounded-lg bg-amber-500/[0.05] border border-amber-500/15 p-2 space-y-0.5">
                    {issue.field && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] uppercase tracking-wider font-bold text-amber-500/70">Field</span>
                        <span className="text-[10px] font-semibold text-amber-200">{issue.field}</span>
                        {issue.value !== undefined && issue.value !== '' && (
                          <>
                            <span className="text-amber-500/40 text-[9px]">·</span>
                            <span
                              className="text-[9px] font-mono text-amber-400/80 bg-amber-500/10 px-1 rounded truncate max-w-[110px]"
                              title={issue.value}
                            >
                              "{issue.value}"
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-amber-200/90 leading-snug">⚠ {issue.reason}</p>
                    {issue.suggestion && (
                      <p className="text-[9px] text-amber-400/70 leading-snug italic">→ {issue.suggestion}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-3 py-1.5 border-t border-amber-500/15 bg-amber-500/[0.03]">
                <p className="text-[9px] text-amber-500/50 leading-snug">
                  Edit the row to resolve these issues. Other fields are unaffected.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
