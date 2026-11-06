// src/modules/TicketBowl/TicketBowlStatsDashboard.tsx
import React from 'react'
import {
  Layers,
  CheckCircle2,
  Flame,
  Activity,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  FileQuestion,
} from 'lucide-react'
import type { TicketBowlDashboardStats } from './types'

interface TicketBowlStatsDashboardProps {
  stats: TicketBowlDashboardStats
  loading: boolean
  onFilterUnavailableHistory?: () => void
  isFilteringUnavailableHistory?: boolean
}

// Consistent colors for testing statuses
const STATUS_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  'Forwarded to the Testing Team': {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    bar: 'bg-blue-500',
  },
  'Under Testing': {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    bar: 'bg-indigo-500',
  },
  'Testing In Progress': {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  'Retesting In Progress': {
    bg: 'bg-orange-500/10 dark:bg-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-orange-500',
  },
  'Testing Passed': {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  'Testing Failed': {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
  },
  'Testing Completed': {
    bg: 'bg-teal-500/10 dark:bg-teal-500/20',
    text: 'text-teal-600 dark:text-teal-400',
    bar: 'bg-teal-500',
  },
  'Not Started': {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    bar: 'bg-slate-400',
  },
}

const DEFAULT_STATUS_COLOR = {
  bg: 'bg-purple-500/10 dark:bg-purple-500/20',
  text: 'text-purple-600 dark:text-purple-400',
  bar: 'bg-purple-500',
}

export function TicketBowlStatsDashboard({
  stats,
  loading,
  onFilterUnavailableHistory,
  isFilteringUnavailableHistory = false,
}: TicketBowlStatsDashboardProps) {
  const {
    totalUniqueTickets = 0,
    totalForwardingEvents = 0,
    repeatForwardedTickets = 0,
    unavailableHistoryTickets = 0,
    currentTestingStatusCounts = {},
    qaMissedCounts = {},
  } = stats

  const statusEntries = Object.entries(currentTestingStatusCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-3">
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Card 1: Unique Forwarded Tickets */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Unique Tickets
            </p>
            {loading ? (
              <div className="h-6 w-16 bg-surface-elevated animate-pulse rounded mt-1" />
            ) : (
              <p className="text-xl font-bold text-text-primary mt-0.5">
                {totalUniqueTickets.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">In filtered dataset</p>
          </div>
          <div className="p-2.5 rounded-lg bg-accent/10 text-accent shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Total Forwarding Events */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Forwarding Events
            </p>
            {loading ? (
              <div className="h-6 w-16 bg-surface-elevated animate-pulse rounded mt-1" />
            ) : (
              <p className="text-xl font-bold text-text-primary mt-0.5">
                {totalForwardingEvents.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">Total transitions</p>
          </div>
          <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-500 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        {/* Card 3: Repeat-Forwarded Tickets */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              Repeat Forwarded
            </p>
            {loading ? (
              <div className="h-6 w-12 bg-surface-elevated animate-pulse rounded mt-1" />
            ) : (
              <p className="text-xl font-bold text-amber-500 mt-0.5">
                {repeatForwardedTickets.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">&gt; 1 transition count</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Incomplete / Unavailable History */}
        <div
          onClick={onFilterUnavailableHistory}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center justify-between ${
            isFilteringUnavailableHistory
              ? 'border-accent bg-accent/10 ring-1 ring-accent'
              : 'border-border/70 bg-surface/80 hover:bg-surface-elevated/80'
          }`}
          title="Click to toggle filter for tickets with unavailable history"
        >
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
              <span>Incomplete History</span>
              <HelpCircle className="w-3 h-3 text-text-muted" />
            </p>
            {loading ? (
              <div className="h-6 w-12 bg-surface-elevated animate-pulse rounded mt-1" />
            ) : (
              <p className="text-xl font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                {unavailableHistoryTickets.toLocaleString()}
              </p>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">
              {isFilteringUnavailableHistory ? 'Active filter (click to reset)' : 'Inspect separately'}
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-500/10 text-slate-500 shrink-0">
            <FileQuestion className="w-4 h-4" />
          </div>
        </div>

        {/* Card 5: QA Missed Tracking */}
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
              QA Missed
            </p>
            {loading ? (
              <div className="h-6 w-20 bg-surface-elevated animate-pulse rounded mt-1" />
            ) : (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xl font-bold text-rose-500">
                  {qaMissedCounts['Yes'] || 0}
                </span>
                <span className="text-xs text-text-muted">
                  / {qaMissedCounts['No'] || 0} No
                </span>
              </div>
            )}
            <p className="text-[10px] text-text-muted mt-0.5">
              {qaMissedCounts['N/A'] || 0} N/A • {qaMissedCounts['Unknown'] || 0} Unknown
            </p>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── Current Testing Status Distribution (Multi-Segment Proportional Bar) ── */}
      {loading ? (
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 space-y-2">
          <div className="h-4 w-48 bg-surface-elevated animate-pulse rounded" />
          <div className="h-2.5 w-full bg-surface-elevated animate-pulse rounded-full" />
        </div>
      ) : totalUniqueTickets > 0 && statusEntries.length > 0 ? (
        <div className="p-3.5 rounded-xl border border-border/70 bg-surface/80 space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-text-primary">
                Current Testing Status Distribution
              </span>
            </div>
            <span className="text-[11px] text-text-muted">
              {totalUniqueTickets.toLocaleString()} unique tickets
            </span>
          </div>

          {/* Proportional Status Bar */}
          <div className="h-2.5 w-full rounded-full bg-border/40 overflow-hidden flex">
            {statusEntries.map(([statusName, count]) => {
              const pct = (count / totalUniqueTickets) * 100
              const colorConfig = STATUS_COLORS[statusName] || DEFAULT_STATUS_COLOR
              return (
                <div
                  key={statusName}
                  style={{ width: `${pct}%` }}
                  className={`h-full ${colorConfig.bar} transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
                  title={`${statusName}: ${count} (${pct.toFixed(1)}%)`}
                />
              )
            })}
          </div>

          {/* Status Breakdown Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {statusEntries.map(([statusName, count]) => {
              const pct = ((count / totalUniqueTickets) * 100).toFixed(1)
              const colorConfig = STATUS_COLORS[statusName] || DEFAULT_STATUS_COLOR
              return (
                <div
                  key={statusName}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border border-border/50 ${colorConfig.bg} ${colorConfig.text}`}
                >
                  <span className="font-medium">{statusName}:</span>
                  <span className="font-bold">{count}</span>
                  <span className="text-[10px] opacity-75">({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
