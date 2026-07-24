import React from 'react'

type ThemeId = 'light' | 'dark'

/**
 * Shared status / severity chip used across the report-preview hero and tables.
 * Purely presentational — never changes or interprets the underlying value beyond
 * picking a color, and always falls back gracefully for values it doesn't recognize
 * so no data is ever hidden.
 */
interface StatusBadgeProps {
  status: string
  theme: ThemeId
  size?: 'sm' | 'xs'
  className?: string
}

const STATUS_COLOR_MAP: Record<string, { dark: string; light: string }> = {
  // Release / QA test statuses
  pass: { dark: 'bg-green-500/10 text-green-400', light: 'bg-green-50 text-green-600' },
  fail: { dark: 'bg-red-500/10 text-red-400', light: 'bg-red-50 text-red-600' },
  blocked: { dark: 'bg-orange-500/10 text-orange-400', light: 'bg-orange-50 text-orange-600' },
  'in progress': { dark: 'bg-blue-500/10 text-blue-400', light: 'bg-blue-50 text-blue-600' },
  'not started': { dark: 'bg-white/10 text-white/50', light: 'bg-slate-100 text-slate-500' },

  // Support ticket statuses
  open: { dark: 'bg-amber-500/10 text-accent-gold', light: 'bg-amber-50 text-amber-600' },
  resolved: { dark: 'bg-emerald-500/10 text-emerald-400', light: 'bg-emerald-50 text-emerald-600' },
  closed: { dark: 'bg-green-500/10 text-green-400', light: 'bg-green-50 text-green-600' },

  // Report status
  draft: { dark: 'bg-white/10 text-white/60', light: 'bg-slate-100 text-slate-500' },
  final: { dark: 'bg-accent-gold/10 text-accent-gold', light: 'bg-amber-50 text-[#b5942b]' },

  // Priority / severity
  critical: { dark: 'bg-red-500/10 text-red-400', light: 'bg-red-50 text-red-600' },
  high: { dark: 'bg-orange-500/10 text-orange-400', light: 'bg-orange-50 text-orange-600' },
  medium: { dark: 'bg-amber-500/10 text-accent-gold', light: 'bg-amber-50 text-amber-600' },
  low: { dark: 'bg-white/10 text-white/50', light: 'bg-slate-100 text-slate-500' }
}

const FALLBACK_COLOR = { dark: 'bg-white/10 text-white/60', light: 'bg-slate-100 text-slate-500' }

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, theme, size = 'xs', className = '' }) => {
  const key = (status || '').trim().toLowerCase()
  const colors = STATUS_COLOR_MAP[key] || FALLBACK_COLOR
  const colorClass = theme === 'dark' ? colors.dark : colors.light
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-[10px]' : 'px-2.5 py-1 text-[9px]'

  return (
    <span className={`inline-block rounded-full font-black uppercase tracking-widest whitespace-nowrap ${sizeClass} ${colorClass} ${className}`}>
      {status}
    </span>
  )
}
