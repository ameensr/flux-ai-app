// src/modules/StoryPot/CachedFilters.tsx
import React from 'react'
import { Search, Filter, X, ChevronDown, ChevronUp, History } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { StoryPotFiltersState } from '@/hooks/useStoryPotCache'

interface FilterSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  isDark: boolean
  placeholder?: string
}

function FilterSelect({ label, value, onChange, options, isDark, placeholder = 'All' }: FilterSelectProps) {
  return (
    <div>
      <label
        className="block text-xs font-bold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border text-sm"
        style={{
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          color: 'var(--text-primary)',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  )
}

interface CachedFiltersProps {
  filters: StoryPotFiltersState
  setFilters: (f: Partial<StoryPotFiltersState>) => void
  resetFilters: () => void
  filterOptions: {
    types: string[]
    statuses: string[]
    priorities: string[]
    releases: string[]
    testingStatuses: string[]
    authors: string[]
    assignees: string[]
  } | undefined
  activeFilterCount: number
  isBugType: boolean
  isDark: boolean
  showFilters: boolean
  setShowFilters: (v: boolean) => void
}

export function CachedFilters({
  filters,
  setFilters,
  resetFilters,
  filterOptions,
  activeFilterCount,
  isBugType,
  isDark,
  showFilters,
  setShowFilters,
}: CachedFiltersProps) {
  const opts = filterOptions || {
    types: [],
    statuses: [],
    priorities: [],
    releases: [],
    testingStatuses: [],
    authors: [],
    assignees: [],
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: 'var(--text-muted)' }}
        />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search by ID or subject..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border text-sm"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" onClick={resetFilters} className="gap-2 text-red-500">
            <X className="w-4 h-4" /> Clear
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            {/* Row 1: Type, Status, Priority, Release (Bug only) */}
            <div className={`grid gap-3 ${isBugType ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
              <FilterSelect
                label="Type"
                value={filters.type}
                onChange={(v) => setFilters({ type: v, releaseTag: '' })}
                options={opts.types}
                isDark={isDark}
              />
              <FilterSelect
                label="Status"
                value={filters.status}
                onChange={(v) => setFilters({ status: v })}
                options={opts.statuses}
                isDark={isDark}
              />
              <FilterSelect
                label="Priority"
                value={filters.priority}
                onChange={(v) => setFilters({ priority: v })}
                options={opts.priorities}
                isDark={isDark}
              />
              {isBugType && (
                <FilterSelect
                  label="Release"
                  value={filters.releaseTag}
                  onChange={(v) => setFilters({ releaseTag: v })}
                  options={opts.releases}
                  isDark={isDark}
                />
              )}
            </div>

            {/* Row 2: Author, Assignee, Testing Status, QA Missed */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <FilterSelect
                label="Author"
                value={filters.author}
                onChange={(v) => setFilters({ author: v })}
                options={opts.authors}
                isDark={isDark}
              />
              <FilterSelect
                label="Assignee"
                value={filters.assignee}
                onChange={(v) => setFilters({ assignee: v })}
                options={opts.assignees}
                isDark={isDark}
              />
              <FilterSelect
                label="Testing Status"
                value={filters.testingStatus}
                onChange={(v) => setFilters({ testingStatus: v })}
                options={opts.testingStatuses}
                isDark={isDark}
              />
              <FilterSelect
                label="QA Missed"
                value={filters.isQAMissed}
                onChange={(v) => setFilters({ isQAMissed: v })}
                options={['Yes', 'No', 'N/A']}
                isDark={isDark}
              />
            </div>

            {/* Row 3: Date Status Changed to "Forwarded to the Testing Team" */}
            <div
              className="p-4 rounded-xl border"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.04)',
                borderColor: 'rgba(59, 130, 246, 0.3)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4" style={{ color: '#3b82f6' }} />
                <span className="text-sm font-bold" style={{ color: '#3b82f6' }}>
                  Date Status Changed to &quot;Forwarded to the Testing Team&quot;
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    From
                  </label>
                  <input
                    type="date"
                    value={filters.forwardedFrom}
                    onChange={(e) => setFilters({ forwardedFrom: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border text-sm"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    To
                  </label>
                  <input
                    type="date"
                    value={filters.forwardedTo}
                    onChange={(e) => setFilters({ forwardedTo: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border text-sm"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                Filters by the verified date when the ticket&apos;s Testing Status was changed to &quot;Forwarded to the Testing Team&quot; in the activity journal. Tickets without a verified transition date are excluded from date-range results.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
