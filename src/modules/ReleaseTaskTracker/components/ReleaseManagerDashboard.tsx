// src/modules/ReleaseTaskTracker/components/ReleaseManagerDashboard.tsx
// Manager Live Dashboard: Enterprise Release Task Overview & Analytics.
// Permission-controlled: Rendered only when user has 'can_view_dashboard' permission.

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  Clock, CheckCircle2,
  Hourglass, PlayCircle, Ban, XCircle, ChevronDown,
  Activity, ArrowRight, UserCheck, Flame, Rocket, Layers,
  Filter, RefreshCw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useReleaseTrackerStore } from '../store'
import type { ProductReleaseSummary } from '../types'

export function ReleaseManagerDashboard() {
  const {
    products,
    filters,
    setFilters,
    resetFilters,
    setSelectedProduct,
    setSelectedRelease,
    getKPICounters,
    getReleaseProgress,
    getProductReleaseSummaries,
    getAvailableReleases,
    getTesterWorkloads,
    getStatusDistribution,
    dropdownConfigs,
    setDrillDownRelease
  } = useReleaseTrackerStore()

  // Collapsible sections state
  const [isDashboardOpen, setIsDashboardOpen] = useState(true)
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const kpis = getKPICounters()
  const releaseProgress = getReleaseProgress()
  const summaries = getProductReleaseSummaries()
  const availableReleases = getAvailableReleases()
  const testerWorkloads = getTesterWorkloads()
  const statusDistribution = getStatusDistribution()

  // Active secondary filters count
  const secondaryFiltersCount = useMemo(() => {
    let count = 0
    if (filters.taskStatus.length > 0) count++
    if (filters.assignedTo.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.dateRangeStart || filters.dateRangeEnd) count++
    return count
  }, [filters])

  const totalActiveFiltersCount = useMemo(() => {
    let count = secondaryFiltersCount
    if (filters.selectedProductId !== 'all') count++
    if (filters.selectedRelease !== 'all') count++
    return count
  }, [filters.selectedProductId, filters.selectedRelease, secondaryFiltersCount])

  // Drill down by clicking product/release summary row
  const handleSummaryRowClick = (item: ProductReleaseSummary) => {
    setSelectedProduct(item.projectId)
    setSelectedRelease(item.release)
    setDrillDownRelease(item.release)
    const tableEl = document.getElementById('release-task-table-section')
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Top Header & Global Filter Controls (Minimal & Compact) ──────── */}
      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-3.5 sm:p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
          {/* Left: Minimal Icon, Title & Live Indicator */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
              <Rocket className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-text-primary whitespace-nowrap">
                Manager Release Dashboard
              </h2>
              <Badge variant="outline" className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0 bg-accent/10 text-accent border-accent/25">
                Live Analytics
              </Badge>
              {/* Collapsed summary quick preview */}
              {!isDashboardOpen && (
                <div className="hidden md:flex items-center gap-2 text-xs text-text-muted font-mono ml-2 pl-2 border-l border-border/40 truncate">
                  <span>{kpis.totalTasks} Tasks</span>
                  <span className="text-purple-400">· {kpis.inProgress} In Progress</span>
                  <span className="text-emerald-400">· {kpis.completed} Completed</span>
                  <span className="text-accent">· {releaseProgress.percentage}% Done</span>
                  <span className="text-indigo-400">· {kpis.totalActualHours}h Logged</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & Dashboard Toggle */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Product Filter */}
            <div className="relative">
              <select
                id="filter-product-select"
                aria-label="Filter by Product"
                value={filters.selectedProductId}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="h-8 appearance-none bg-surface-secondary/80 hover:bg-surface-secondary border border-border/50 rounded-lg pl-2.5 pr-7 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer transition-all shadow-xs"
              >
                <option value="all">All Products ({products.length})</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.project_code ? `(${p.project_code})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Release Filter */}
            <div className="relative">
              <select
                id="filter-release-select"
                aria-label="Filter by Release"
                value={filters.selectedRelease}
                onChange={(e) => setSelectedRelease(e.target.value)}
                className="h-8 appearance-none bg-surface-secondary/80 hover:bg-surface-secondary border border-border/50 rounded-lg pl-2.5 pr-7 text-xs font-medium text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer transition-all shadow-xs"
              >
                <option value="all">All Releases ({availableReleases.length})</option>
                {availableReleases.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Toggle Detailed Filters Button */}
            {isDashboardOpen && (
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                  showFilters || secondaryFiltersCount > 0
                    ? 'bg-accent/10 border-accent/30 text-accent'
                    : 'border-border/50 text-text-muted hover:text-text-primary hover:bg-surface-elevated/80'
                }`}
                title="Toggle Advanced Filters"
              >
                <Filter className="w-3 h-3" />
                <span className="hidden sm:inline">Filters</span>
                {secondaryFiltersCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {secondaryFiltersCount}
                  </span>
                )}
              </button>
            )}

            {/* Reset Filters Button */}
            {totalActiveFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="h-8 px-2 sm:px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
                title="Reset All Filters"
              >
                <XCircle className="w-3 h-3" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Master Dashboard Expand / Collapse Button */}
            <button
              type="button"
              onClick={() => setIsDashboardOpen(!isDashboardOpen)}
              className="h-8 w-8 rounded-lg border border-border/50 text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all flex items-center justify-center cursor-pointer"
              title={isDashboardOpen ? 'Collapse Manager Dashboard' : 'Expand Manager Dashboard'}
              aria-label={isDashboardOpen ? 'Collapse Manager Dashboard' : 'Expand Manager Dashboard'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isDashboardOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Collapsible Secondary Filter Bar */}
        {isDashboardOpen && (showFilters || secondaryFiltersCount > 0) && (
          <div className="pt-2.5 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Status Filter */}
            <div>
              <label htmlFor="filter-status" className="text-[10px] font-semibold text-text-muted block mb-1">
                Task Status
              </label>
              <select
                id="filter-status"
                aria-label="Filter by Task Status"
                value={filters.taskStatus[0] || ''}
                onChange={(e) =>
                  setFilters({ taskStatus: e.target.value ? [e.target.value] : [] })
                }
                className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">All Statuses</option>
                {dropdownConfigs.task_status.filter(s => s.is_active).map((s) => (
                  <option key={s.id} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Who's Testing Filter */}
            <div>
              <label htmlFor="filter-assigned" className="text-[10px] font-semibold text-text-muted block mb-1">
                Who's Testing
              </label>
              <select
                id="filter-assigned"
                aria-label="Filter by Tester"
                value={filters.assignedTo[0] || ''}
                onChange={(e) =>
                  setFilters({ assignedTo: e.target.value ? [e.target.value] : [] })
                }
                className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">All Testers</option>
                {dropdownConfigs.assigned_to.map((emp) => (
                  <option key={emp.id} value={emp.label}>
                    {emp.label} {!emp.is_active ? '(Inactive)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label htmlFor="filter-priority" className="text-[10px] font-semibold text-text-muted block mb-1">
                Priority
              </label>
              <select
                id="filter-priority"
                aria-label="Filter by Priority"
                value={filters.priority[0] || ''}
                onChange={(e) =>
                  setFilters({ priority: e.target.value ? [e.target.value] : [] })
                }
                className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">All Priorities</option>
                {dropdownConfigs.priority.filter(p => p.is_active).map((p) => (
                  <option key={p.id} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label htmlFor="filter-date-start" className="text-[10px] font-semibold text-text-muted block mb-1">
                Start Date (From - To)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  id="filter-date-start"
                  type="date"
                  aria-label="Date Range Start"
                  value={filters.dateRangeStart || ''}
                  onChange={(e) => setFilters({ dateRangeStart: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <input
                  id="filter-date-end"
                  type="date"
                  aria-label="Date Range End"
                  value={filters.dateRangeEnd || ''}
                  onChange={(e) => setFilters({ dateRangeEnd: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Dashboard Body (Collapsible via isDashboardOpen) ────────── */}
      {isDashboardOpen && (
        <div className="space-y-4">
          {/* ── Release Progress Indicator (Compact Ribbon) ──────────────── */}
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-3 sm:p-3.5 shadow-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">
                    {releaseProgress.release}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      releaseProgress.percentage === 100
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-semibold'
                        : 'bg-accent/15 text-accent border-accent/25 text-[10px] font-semibold'
                    }
                  >
                    {releaseProgress.percentage}% Completed
                  </Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-secondary/60 border border-border/40">
                  <span className="text-text-muted">Total:</span>
                  <span className="font-bold text-text-primary">{releaseProgress.totalTasks}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <span>Done:</span>
                  <span className="font-bold">{releaseProgress.completedTasks}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <span>Remaining:</span>
                  <span className="font-bold">{releaseProgress.remainingTasks}</span>
                </div>
                {releaseProgress.blockedTasks > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <span>Blocked:</span>
                    <span className="font-bold">{releaseProgress.blockedTasks}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-surface-secondary overflow-hidden border border-border/40">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${releaseProgress.percentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  releaseProgress.percentage === 100
                    ? 'bg-emerald-500'
                    : 'bg-accent'
                }`}
              />
            </div>
          </div>

          {/* ── 11 KPI Cards (Minimal Look) ──────────────────────────────── */}
          <div className="space-y-2.5">
            {/* Tier 1: Task Lifecycle & Status (7 cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
              {/* 1. Total Release Tasks */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-border transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Total Tasks</span>
                  <div className="w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center">
                    <Activity className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpis.totalTasks}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Filtered scope</div>
              </div>

              {/* 2. Not Started */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-slate-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Not Started</span>
                  <div className="w-6 h-6 rounded-md bg-slate-500/10 text-slate-400 flex items-center justify-center">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-400">
                  {kpis.notStarted}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Pending kickoff</div>
              </div>

              {/* 3. In Progress */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-purple-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">In Progress</span>
                  <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <PlayCircle className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-purple-400">
                  {kpis.inProgress}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Active work</div>
              </div>

              {/* 4. Blocked */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-rose-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Blocked</span>
                  <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Ban className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-rose-400">
                  {kpis.blocked}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Needs unblock</div>
              </div>

              {/* 5. Assigned */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-cyan-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Assigned</span>
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Hourglass className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-cyan-400">
                  {kpis.assigned}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Assigned queue</div>
              </div>

              {/* 6. In Review */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-amber-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">In Review</span>
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-400">
                  {kpis.inReview}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Verification</div>
              </div>

              {/* 7. Completed */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-emerald-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Completed</span>
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-emerald-400">
                  {kpis.completed}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Closed & verified</div>
              </div>
            </div>

            {/* Tier 2: Hours & Effort (4 cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
              {/* 8. Estimated Hours */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-border transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Estimated Hours</span>
                  <div className="w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpis.totalEstimatedHours} <span className="text-xs font-normal text-text-muted">hrs</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Planned baseline</div>
              </div>

              {/* 9. Actual Logged Hours */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-indigo-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Actual Logged</span>
                  <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Clock className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-indigo-400">
                  {kpis.totalActualHours} <span className="text-xs font-normal text-text-muted">hrs</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Via time logs</div>
              </div>

              {/* 10. Remaining Hours */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-amber-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Remaining</span>
                  <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <Hourglass className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-amber-400">
                  {kpis.remainingHours} <span className="text-xs font-normal text-text-muted">hrs</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">Balance to plan</div>
              </div>

              {/* 11. Overrun Hours */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-rose-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Overrun</span>
                  <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-400 flex items-center justify-center">
                    <Flame className={`w-3 h-3 ${kpis.overrunHours > 0 ? 'text-rose-500' : 'text-text-muted'}`} />
                  </div>
                </div>
                <div className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${kpis.overrunHours > 0 ? 'text-rose-400' : 'text-text-primary'}`}>
                  {kpis.overrunHours} <span className="text-xs font-normal text-text-muted">hrs</span>
                </div>
                <div className="text-[10px] text-text-muted mt-0.5">
                  {kpis.overrunHours > 0 ? 'Exceeded budget' : 'Within budget'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Release-Wise Execution Summary (Expand / Collapse Section) ── */}
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md shadow-xs overflow-hidden">
            {/* Header: Clickable Expand / Collapse bar */}
            <div
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="px-4 py-3 bg-surface/90 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-surface-elevated/40 transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsSummaryExpanded(!isSummaryExpanded) } }}
              aria-expanded={isSummaryExpanded}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center text-accent">
                  <Layers className="w-3 h-3" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2 whitespace-nowrap">
                  <span>Release-Wise Execution Summary</span>
                  <span className="text-[11px] font-normal text-text-muted hidden md:inline">
                    (Click row to filter tracker to Product/Release)
                  </span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-secondary/70 text-text-muted border border-border/40 whitespace-nowrap">
                  {summaries.length} {summaries.length === 1 ? 'scope' : 'scopes'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {(filters.selectedProductId !== 'all' || filters.selectedRelease !== 'all') && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedProduct('all')
                      setSelectedRelease('all')
                    }}
                    className="text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer mr-1"
                  >
                    Clear filter
                  </button>
                )}
                <span className="text-[11px] text-text-muted hidden sm:inline">
                  {isSummaryExpanded ? 'Collapse' : 'Expand'}
                </span>
                <div className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSummaryExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Collapsible Table Content */}
            {isSummaryExpanded && (
              <div className="border-t border-border/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-secondary/80 border-b border-border/40 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                      <th className="py-2.5 px-3.5">Product</th>
                      <th className="py-2.5 px-3">Release</th>
                      <th className="py-2.5 px-2.5 text-center">Total Tasks</th>
                      <th className="py-2.5 px-2.5 text-center">In Progress</th>
                      <th className="py-2.5 px-2.5 text-center">Blocked</th>
                      <th className="py-2.5 px-2.5 text-center">Completed</th>
                      <th className="py-2.5 px-2.5 text-right">Est. Hrs</th>
                      <th className="py-2.5 px-2.5 text-right">Act. Hrs</th>
                      <th className="py-2.5 px-2.5 text-right">Rem. Hrs</th>
                      <th className="py-2.5 px-3.5 text-right">Overrun</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {summaries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-6 text-center text-xs text-text-muted">
                          No release summary data available yet.
                        </td>
                      </tr>
                    ) : (
                      summaries.map((s, idx) => (
                        <tr
                          key={`${s.projectId}_${s.release}_${idx}`}
                          onClick={() => handleSummaryRowClick(s)}
                          className="hover:bg-accent/[0.04] cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3.5 font-medium text-text-primary">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary hover:text-accent transition-colors">
                                {s.productName}
                              </span>
                              {s.productCode && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 text-text-muted font-mono">
                                  {s.productCode}
                                </Badge>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-surface-secondary border border-border/60 font-mono text-xs text-text-secondary">
                              {s.release}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-bold text-text-primary tabular-nums">
                            {s.totalTasks}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-purple-400 font-semibold tabular-nums">
                            {s.inProgress}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            {s.blocked > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-semibold text-[11px]">
                                {s.blocked}
                              </span>
                            ) : (
                              <span className="text-text-muted/60">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-emerald-400 font-semibold tabular-nums">
                            {s.completed}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-text-secondary tabular-nums font-mono">
                            {s.estimatedHrs}h
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-indigo-400 tabular-nums font-mono">
                            {s.actualHrs}h
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-amber-400 tabular-nums font-mono">
                            {s.remainingHrs}h
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-semibold">
                            {s.overrunHrs > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[11px] font-mono">
                                +{s.overrunHrs}h
                              </span>
                            ) : (
                              <span className="text-text-muted/60 text-[11px] font-mono">0h</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Charts & Tester Workload Section (Minimal & Clean) ────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Testing Status Visualization */}
            <div className="lg:col-span-7 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary">
                    Testing Status Visualization
                  </h3>
                  <span className="text-[10px] text-text-muted">Distribution by status</span>
                </div>

                <div className="h-[210px] w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusDistribution}
                      margin={{ top: 8, right: 8, left: -22, bottom: 22 }}
                    >
                      <XAxis
                        dataKey="status"
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--modal-bg, #141c2b)',
                          borderColor: 'var(--border, rgba(148, 163, 184, 0.2))',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '11px'
                        }}
                        formatter={(value: any) => [`${value} Tasks`, 'Count']}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-border/40">
                {statusDistribution.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] bg-surface-secondary/70 border border-border/40"
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-text-muted">{item.status}:</span>
                    <span className="font-bold text-text-primary font-mono">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tester Workload */}
            <div className="lg:col-span-5 rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-accent" />
                    <span>Tester Workload</span>
                  </h3>
                  <span className="text-[10px] text-text-muted">Active queue & hours</span>
                </div>

                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {testerWorkloads.map((tester) => {
                    const hasHighWorkload = tester.remainingHrs > 16 || tester.activeTasks > 3
                    const hasOverrun = tester.overrunHrs > 0

                    return (
                      <div
                        key={tester.testerName}
                        className={`p-2.5 rounded-lg border transition-all ${
                          hasOverrun
                            ? 'bg-rose-500/5 border-rose-500/25'
                            : hasHighWorkload
                            ? 'bg-amber-500/5 border-amber-500/25'
                            : 'bg-surface-secondary/60 border-border/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/25 text-accent flex items-center justify-center text-[9px] font-bold">
                              {tester.testerName.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="font-semibold text-xs text-text-primary">
                              {tester.testerName.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {hasOverrun && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 font-medium">
                                +{tester.overrunHrs}h Overrun
                              </Badge>
                            )}
                            {hasHighWorkload && !hasOverrun && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10 font-medium">
                                Heavy Queue
                              </Badge>
                            )}
                            <span className="text-[10px] text-text-muted font-mono">
                              {tester.activeTasks} active
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-[10px] pt-1 border-t border-border/30">
                          <div>
                            <span className="text-text-muted block text-[9px]">Est</span>
                            <span className="font-medium text-text-primary font-mono">{tester.estimatedHrs}h</span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[9px]">Act</span>
                            <span className="font-medium text-indigo-400 font-mono">{tester.actualHrs}h</span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[9px]">Rem</span>
                            <span className={`font-semibold font-mono ${tester.remainingHrs > 12 ? 'text-amber-400' : 'text-text-primary'}`}>
                              {tester.remainingHrs}h
                            </span>
                          </div>
                          <div>
                            <span className="text-text-muted block text-[9px]">Overrun</span>
                            <span className={`font-semibold font-mono ${tester.overrunHrs > 0 ? 'text-rose-400' : 'text-text-muted'}`}>
                              {tester.overrunHrs}h
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {testerWorkloads.length === 0 && (
                    <div className="text-center py-6 text-xs text-text-muted">
                      No active testers found in current filtered scope.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
