// src/modules/TicketBowl/TicketBowlFiltersPanel.tsx
import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Search,
  X,
  Filter,
  CheckCircle,
  AlertCircle,
  Tag,
  Flame,
  FileQuestion,
  Info,
  Zap,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TicketBowlFilters, ForwardingHistoryVerification, QuickSearchProgress } from './types'

interface TicketBowlFiltersPanelProps {
  filters: TicketBowlFilters
  onFilterChange: (updates: Partial<TicketBowlFilters>) => void
  onResetFilters: () => void
  onToggleUnavailableHistory?: () => void
  availableTypes: Array<{ id: number; name: string }>
  availableStatuses?: string[]
  availableTestingStatuses?: string[]
  unavailableCount?: number
  // Quick Search props
  quickSearchMode?: boolean
  onToggleQuickSearchMode?: () => void
  onExecuteQuickSearch?: () => void
  quickSearchLoading?: boolean
  quickSearchProgress?: QuickSearchProgress | null
}

const QA_MISSED_OPTIONS = [
  { value: '', label: 'All QA Missed' },
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'N/A', label: 'N/A (Not Applicable)' },
  { value: 'Unknown', label: 'Unknown' },
]

const HISTORY_VERIF_OPTIONS: Array<{ value: ForwardingHistoryVerification | ''; label: string }> = [
  { value: '', label: 'All History Statuses' },
  { value: 'verified', label: 'Verified Handoffs Only' },
  { value: 'unavailable', label: 'Incomplete / Unavailable History' },
  { value: 'unverified', label: 'Unverified History' },
  { value: 'no_matching_event', label: 'No Qualifying Transition' },
]

export function TicketBowlFiltersPanel({
  filters,
  onFilterChange,
  onResetFilters,
  onToggleUnavailableHistory,
  availableTypes,
  availableStatuses,
  availableTestingStatuses,
  unavailableCount = 0,
  quickSearchMode = false,
  onToggleQuickSearchMode,
  onExecuteQuickSearch,
  quickSearchLoading = false,
  quickSearchProgress,
}: TicketBowlFiltersPanelProps) {
  // Local search state for responsive typing
  const [localSearch, setLocalSearch] = useState(filters.search || '')

  useEffect(() => {
    setLocalSearch(filters.search || '')
  }, [filters.search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilterChange({ search: localSearch.trim() || null })
  }

  const isDateFiltered = Boolean(filters.forwardedFrom || filters.forwardedTo)

  const hasActiveFilters = Boolean(
    filters.forwardedFrom ||
    filters.forwardedTo ||
    filters.typeName ||
    filters.statusName ||
    filters.priorityName ||
    filters.testingStatus ||
    filters.isQAMissed ||
    filters.historyVerificationStatus ||
    filters.authorName ||
    filters.assigneeName ||
    filters.search
  )

  return (
    <div className="rounded-xl border border-border/70 bg-surface/70 p-4 space-y-3.5 shadow-xs">
      {/* ── Primary Filter: Forwarded to Testing Team Date Range ── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-lg border ${quickSearchMode ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-accent/5 border-accent/20'}`}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${quickSearchMode ? 'text-emerald-500' : 'text-accent'}`} />
          <span className="text-xs font-semibold text-text-primary">
            Forwarded to Testing Date Range:
          </span>
          {quickSearchMode ? (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium">
              Quick Search Mode
            </span>
          ) : (
            <span className="text-[11px] text-text-muted hidden sm:inline">
              (Matches tickets with verified handoffs on these dates)
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted">From:</span>
            <input
              type="date"
              value={filters.forwardedFrom || ''}
              onChange={e => onFilterChange({ forwardedFrom: e.target.value || null })}
              className="px-2.5 py-1 rounded-md border border-border/80 bg-surface text-text-primary text-xs focus:ring-1 focus:ring-accent"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-text-muted">To:</span>
            <input
              type="date"
              value={filters.forwardedTo || ''}
              onChange={e => onFilterChange({ forwardedTo: e.target.value || null })}
              className="px-2.5 py-1 rounded-md border border-border/80 bg-surface text-text-primary text-xs focus:ring-1 focus:ring-accent"
            />
          </div>

          {isDateFiltered && (
            <button
              type="button"
              onClick={() => onFilterChange({ forwardedFrom: null, forwardedTo: null })}
              className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface"
              title="Clear date filter"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Quick Search Toggle & Execute */}
          {onToggleQuickSearchMode && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/50">
              <Button
                variant={quickSearchMode ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleQuickSearchMode}
                className={`h-7 text-xs gap-1 ${quickSearchMode ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
              >
                <Zap className="w-3 h-3" />
                <span>{quickSearchMode ? 'Exit Quick Search' : 'Quick Search'}</span>
              </Button>

              {quickSearchMode && onExecuteQuickSearch && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onExecuteQuickSearch}
                  disabled={!isDateFiltered || quickSearchLoading}
                  className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {quickSearchLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3 h-3" />
                      <span>Fetch Now</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Search Progress */}
      {quickSearchMode && quickSearchProgress && quickSearchLoading && (
        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-emerald-700 dark:text-emerald-300 font-medium">
              {quickSearchProgress.message}
            </span>
            {quickSearchProgress.foundCount !== undefined && (
              <span className="text-emerald-600 dark:text-emerald-400">
                {quickSearchProgress.foundCount} found
              </span>
            )}
          </div>
          {quickSearchProgress.total > 0 && (
            <div className="w-full h-1.5 bg-emerald-200 dark:bg-emerald-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(quickSearchProgress.current / quickSearchProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Quick Search Mode Info */}
      {quickSearchMode && !quickSearchLoading && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300">
          <Zap className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Quick Search Mode Active</p>
            <p className="text-emerald-600 dark:text-emerald-400 mt-0.5">
              Select a date range and click "Fetch Now" to search OpenProject directly for tickets forwarded in that period.
              This is faster than full sync but only shows results for the selected dates.
            </p>
          </div>
        </div>
      )}

      {/* ── Notice when Date Filter is Active and there are unavailable history tickets ── */}
      {isDateFiltered && unavailableCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-blue-500" />
            <span>
              {unavailableCount} ticket(s) have incomplete OpenProject history. Only verified forwarding events are included in this date-filtered result.
            </span>
          </div>
          {onToggleUnavailableHistory && (
            <button
              type="button"
              onClick={onToggleUnavailableHistory}
              className="text-[11px] font-semibold underline hover:text-blue-900 dark:hover:text-blue-100 shrink-0 text-left"
            >
              Inspect Tickets with Unavailable History
            </button>
          )}
        </div>
      )}

      {/* ── Secondary Filters Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative sm:col-span-2">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search ticket ID or subject..."
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            onBlur={() => onFilterChange({ search: localSearch.trim() || null })}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-text-muted/60"
          />
        </form>

        {/* Dynamic Work Package Type Filter */}
        <div>
          <select
            value={filters.typeName || ''}
            onChange={e => onFilterChange({ typeName: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="">All Types</option>
            {availableTypes.map(t => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter (Work Package Status) */}
        <div>
          <select
            value={filters.statusName || ''}
            onChange={e => onFilterChange({ statusName: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="">All Statuses</option>
            {availableStatuses?.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Current Testing Status */}
        <div>
          <select
            value={filters.testingStatus || ''}
            onChange={e => onFilterChange({ testingStatus: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value="">All Testing Statuses</option>
            {availableTestingStatuses?.map(status => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Is QA Missed */}
        <div>
          <select
            value={filters.isQAMissed || ''}
            onChange={e => onFilterChange({ isQAMissed: e.target.value || null })}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            {QA_MISSED_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* History Verification Status Filter */}
        <div>
          <select
            value={filters.historyVerificationStatus || ''}
            onChange={e =>
              onFilterChange({
                historyVerificationStatus: (e.target.value as ForwardingHistoryVerification) || null,
              })
            }
            className="w-full px-2.5 py-1.5 rounded-lg border border-border/70 bg-surface text-text-primary text-xs focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
          >
            {HISTORY_VERIF_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters Button Row */}
      {hasActiveFilters && (
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLocalSearch('')
              onResetFilters()
            }}
            className="h-7 text-xs text-text-muted hover:text-text-primary gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </Button>
        </div>
      )}
    </div>
  )
}
