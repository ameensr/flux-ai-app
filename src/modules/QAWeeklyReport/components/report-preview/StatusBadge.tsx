import React from 'react'

type ThemeId = 'light' | 'dark'

type Tone = { dark: string; light: string }

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

const TONES = {
  /** Complete / Completed / Done — strong green */
  complete: {
    dark: 'bg-green-500/15 text-green-400 border border-green-500/30',
    light: 'bg-green-100 text-green-700 border border-green-200',
  },
  /** Pass / Passed — light green (distinct from Complete) */
  pass: {
    dark: 'bg-lime-500/15 text-lime-300 border border-lime-500/30',
    light: 'bg-lime-50 text-lime-700 border border-lime-200',
  },
  /** Resolved / Closed / Fixed / Success */
  success: {
    dark: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    light: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  /** Fail / Failed / Hold */
  danger: {
    dark: 'bg-red-500/15 text-red-400 border border-red-500/30',
    light: 'bg-red-50 text-red-700 border border-red-200',
  },
  /** Blocked */
  blocked: {
    dark: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    light: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  /** In Progress */
  progress: {
    dark: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    light: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  /** Pending / Waiting / Retesting */
  pending: {
    dark: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
    light: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  /** Open / Active */
  open: {
    dark: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30',
    light: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  },
  /** Not Started / Not Executed / Deferred */
  muted: {
    dark: 'bg-white/10 text-white/50 border border-white/10',
    light: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
  /** Critical priority */
  critical: {
    dark: 'bg-red-500/15 text-red-400 border border-red-500/30',
    light: 'bg-red-50 text-red-700 border border-red-200',
  },
  high: {
    dark: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    light: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  medium: {
    dark: 'bg-amber-500/15 text-accent-gold border border-amber-500/30',
    light: 'bg-amber-50 text-amber-600 border border-amber-200',
  },
  low: {
    dark: 'bg-white/10 text-white/50 border border-white/10',
    light: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
  draft: {
    dark: 'bg-white/10 text-white/60 border border-white/10',
    light: 'bg-slate-100 text-slate-500 border border-slate-200',
  },
  final: {
    dark: 'bg-accent-gold/10 text-accent-gold border border-accent-gold/30',
    light: 'bg-amber-50 text-[#b5942b] border border-amber-200',
  },
} as const satisfies Record<string, Tone>

const FALLBACK: Tone = TONES.muted

/** Order matters — more specific phrases first. */
function resolveTone(status: string): Tone {
  const s = (status || '').trim().toLowerCase()
  if (!s) return FALLBACK

  // Exact priority / report-status keys
  if (s === 'critical') return TONES.critical
  if (s === 'high') return TONES.high
  if (s === 'medium') return TONES.medium
  if (s === 'low') return TONES.low
  if (s === 'draft') return TONES.draft
  if (s === 'final') return TONES.final

  // Negative / stop states
  if (s.includes('hold') || s.includes('on hold')) return TONES.danger
  if (s.includes('fail') || s.includes('failure')) return TONES.danger
  if (s.includes('blocked') || s.includes('blocker')) return TONES.blocked

  // Completion vs pass (Complete = green, Pass = light green)
  if (
    s.includes('complete') ||
    s === 'done' ||
    s.includes('closed') ||
    s.includes('fixed')
  ) {
    return TONES.complete
  }
  if (s.includes('pass') || s.includes('success')) return TONES.pass
  if (s.includes('resolved') || s.includes('verified')) return TONES.success

  // In-flight
  if (s.includes('progress') || s.includes('ongoing') || s.includes('running')) {
    return TONES.progress
  }
  if (
    s.includes('pending') ||
    s.includes('waiting') ||
    s.includes('retest') ||
    s.includes('re-test')
  ) {
    return TONES.pending
  }
  if (s.includes('open') || s.includes('active') || s.includes('new')) return TONES.open

  // Idle / not run
  if (
    s.includes('not started') ||
    s.includes('not executed') ||
    s.includes('not run') ||
    s.includes('deferred') ||
    s.includes('n/a') ||
    s === 'na'
  ) {
    return TONES.muted
  }

  return FALLBACK
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, theme, size = 'xs', className = '' }) => {
  const colors = resolveTone(status)
  const colorClass = theme === 'dark' ? colors.dark : colors.light
  const sizeClass = size === 'sm' ? 'px-3 py-1 text-[10px]' : 'px-2.5 py-1 text-[9px]'

  return (
    <span
      className={`inline-block rounded-full font-black uppercase tracking-widest whitespace-nowrap ${sizeClass} ${colorClass} ${className}`}
      title={status}
    >
      {status || '—'}
    </span>
  )
}
