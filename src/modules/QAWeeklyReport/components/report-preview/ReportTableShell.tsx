import React from 'react'
import { motion } from 'framer-motion'

type ThemeId = 'light' | 'dark'

/**
 * Consistent outer chrome (rounded border, background, horizontal scroll container,
 * subtle shadow) for large report tables. Does not own column definitions, row data,
 * or empty-state logic — those stay next to the data they render so behavior is
 * unchanged; this only standardizes the surrounding presentation.
 */
interface ReportTableShellProps {
  theme: ThemeId
  children: React.ReactNode
  className?: string
}

export const ReportTableShell: React.FC<ReportTableShellProps> = ({ theme, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-40px" }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className={`rounded-[32px] border overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#1a2133]/80 to-[#0b0f1a]/80 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-[0_4px_20px_rgba(15,23,42,0.03)]'} ${className}`}
  >
    <div className="overflow-x-auto">
      {children}
    </div>
  </motion.div>
)

/** Shared thead row styling so table headers stay visually consistent across the report. */
export const reportTableHeadClass = (theme: ThemeId) =>
  `border-b backdrop-blur-sm ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12]/95 text-white/55' : 'border-slate-200 bg-slate-50/95 text-slate-500'} text-[10px] font-black uppercase tracking-wider`

/** Shared tbody row styling (zebra + hover) for report tables. */
export const reportTableRowClass = (theme: ThemeId, idx: number) =>
  `border-b text-xs transition-colors duration-150 ${theme === 'dark' ? 'border-white/5 hover:bg-white/[0.045]' : 'border-slate-100 hover:bg-slate-50'} ${idx % 2 === 0 ? '' : theme === 'dark' ? 'bg-white/[0.015]' : 'bg-slate-50/50'}`
