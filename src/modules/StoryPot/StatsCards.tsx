// src/modules/StoryPot/StatsCards.tsx
import React from 'react'
import { BarChart3, ShieldAlert, ShieldCheck } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

interface StatsCardsProps {
  stats: {
    total: number
    withForwardingDate: number
    overdue: number
    unassigned: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    byPriority: Record<string, number>
    byTestingStatus: Record<string, number>
    qaMissedYes?: number
    qaMissedNo?: number
  } | undefined
  filteredByTestingStatus: Record<string, number>
  filteredCount: number
  activeFilterCount: number
  isDark: boolean
}

const STATUS_COLORS: Record<string, string> = {
  'Issues Reported': '#ef4444',
  'Forwarded to the Testing Team': '#3b82f6',
  'Testing in Progress': '#8b5cf6',
  'Testing Completed': '#22c55e',
  'Re-Testing': '#f97316',
  'On Hold': '#94a3b8',
}
const FALLBACK = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#84cc16', '#06b6d4']

function color(status: string, idx: number) {
  return STATUS_COLORS[status] ?? FALLBACK[idx % FALLBACK.length]
}

export function StatsCards({ stats, filteredByTestingStatus, filteredCount, activeFilterCount }: StatsCardsProps) {
  if (!stats) return null

  const displayTotal = activeFilterCount > 0 ? filteredCount : stats.total
  const barSource = activeFilterCount > 0 ? filteredByTestingStatus : stats.byTestingStatus
  const entries = Object.entries(barSource).sort((a, b) => b[1] - a[1])
  const barTotal = entries.reduce((s, [, c]) => s + c, 0) || 1
  const qaMissedYes = stats.qaMissedYes ?? 0
  const qaMissedNo = stats.qaMissedNo ?? 0
  const qaMissedTotal = qaMissedYes + qaMissedNo

  return (
    <div className="space-y-3">

      {/* ── Testing Status strip ───────────────────────────────────────────── */}
      {entries.length > 0 && (
        <div
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
        >
          {/* Label */}
          <span
            className="text-[10px] font-bold uppercase tracking-[0.13em] shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            Testing Status
          </span>

          {/* Thin bar */}
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden flex min-w-0"
            style={{ background: 'var(--hover)' }}
          >
            {entries.map(([status, count], idx) => (
              <div
                key={status}
                className="h-full transition-all duration-300"
                style={{ width: `${(count / barTotal) * 100}%`, backgroundColor: color(status, idx) }}
                title={`${status}: ${count}`}
              />
            ))}
          </div>

          {/* Chips */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {entries.map(([status, count], idx) => (
              <span
                key={status}
                className="inline-flex items-center gap-1 text-[10px] font-medium whitespace-nowrap"
                style={{ color: 'var(--text-secondary)' }}
                title={status}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: color(status, idx) }}
                />
                <span className="font-bold tabular-nums" style={{ color: color(status, idx) }}>{count}</span>
                <span className="hidden sm:inline truncate max-w-[90px]">{status}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total / Filtered */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#3b82f620', color: '#3b82f6' }}>
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{displayTotal.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
                {activeFilterCount > 0 ? 'Filtered' : 'Total'}
              </p>
            </div>
          </div>
        </GlassCard>

        {/* QA Missed */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#ef444420', color: '#ef4444' }}>
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{qaMissedYes.toLocaleString()}</p>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-muted)' }}>QA Missed</p>
              {qaMissedTotal > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#ef4444' }}>
                    <ShieldAlert className="w-2.5 h-2.5" /> {qaMissedYes}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>/</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#22c55e' }}>
                    <ShieldCheck className="w-2.5 h-2.5" /> {qaMissedNo}
                  </span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
