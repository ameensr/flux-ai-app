// src/modules/ReleaseTaskTracker/components/ReleaseManagerDashboard.tsx
// Manager Live Dashboard: Enterprise Release Task Overview & Analytics.
// Permission-controlled: Rendered only when user has 'can_view_dashboard' permission.

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import {
  LayoutDashboard, Clock, AlertTriangle, CheckCircle2,
  Hourglass, PlayCircle, Ban, XCircle, ChevronDown,
  Activity, ArrowRight, UserCheck, Flame, Rocket, Layers,
  Calendar, CheckSquare, Sparkles, Filter, RefreshCw
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { useReleaseTrackerStore } from '../store'
import type { ProductReleaseSummary } from '../types'

export function ReleaseManagerDashboard() {
  const {
    products,
    employees,
    filters,
    setFilters,
    resetFilters,
    setSelectedProduct,
    setSelectedRelease,
    getKPICounters,
    getReleaseProgress,
    getProductReleaseSummaries,
    getAvailableReleases,
    dropdownConfigs,
    setDrillDownRelease
  } = useReleaseTrackerStore()

  const kpis = getKPICounters()
  const releaseProgress = getReleaseProgress()
  const summaries = getProductReleaseSummaries()
  const availableReleases = getAvailableReleases()

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.selectedProductId !== 'all') count++
    if (filters.selectedRelease !== 'all') count++
    if (filters.taskStatus.length > 0) count++
    if (filters.assignedTo.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.dateRangeStart || filters.dateRangeEnd) count++
    return count
  }, [filters])

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

  // Chart data for status distribution
  const statusChartData = useMemo(() => {
    return [
      { name: 'Not Started', count: kpis.notStarted, color: '#94a3b8' },
      { name: 'Assigned', count: kpis.assigned, color: '#3b82f6' },
      { name: 'In Progress', count: kpis.inProgress, color: '#8b5cf6' },
      { name: 'Blocked', count: kpis.blocked, color: '#ef4444' },
      { name: 'In Review', count: kpis.inReview, color: '#f59e0b' },
      { name: 'Completed', count: kpis.completed, color: '#10b981' }
    ].filter(item => item.count > 0)
  }, [kpis])

  // Chart data for hours comparison
  const hoursChartData = useMemo(() => {
    return [
      { name: 'Estimated Hrs', hours: kpis.totalEstimatedHours, fill: '#3b82f6' },
      { name: 'Actual Hrs', hours: kpis.totalActualHours, fill: '#8b5cf6' },
      { name: 'Remaining Hrs', hours: kpis.remainingHours, fill: '#10b981' },
      { name: 'Overrun Hrs', hours: kpis.overrunHours, fill: '#ef4444' }
    ]
  }, [kpis])

  return (
    <div className="space-y-6">
      {/* ── Top Header & Global Filter Controls ─────────────────────────────── */}
      <GlassCard className="p-5 md:p-6 border border-white/10 dark:border-white/5 bg-gradient-to-br from-surface to-surface-secondary shadow-xl rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-text-primary">
                  Manager Release Dashboard
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent border-accent/20">
                  Live Analytics
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Real-time release task velocity, progress indicators, and cumulative work hours
              </p>
            </div>
          </div>

          {/* ── Product & Release Primary Dropdowns ───────────────────────────── */}
          <div className="flex flex-wrap items-center gap-3">
            {/* 1. Product Filter (from /project-hub) */}
            <div className="relative min-w-[200px]">
              <label htmlFor="filter-product-select" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Product
              </label>
              <div className="relative">
                <select
                  id="filter-product-select"
                  aria-label="Filter by Product"
                  value={filters.selectedProductId}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full h-10 appearance-none bg-surface-elevated/90 hover:bg-surface-elevated border border-white/15 dark:border-white/10 rounded-xl px-3.5 pr-9 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer transition-all shadow-sm"
                >
                  <option value="all">Product: All Products ▼</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.project_code ? `(${p.project_code})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Release Filter (dynamically filtered by product) */}
            <div className="relative min-w-[180px]">
              <label htmlFor="filter-release-select" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Release
              </label>
              <div className="relative">
                <select
                  id="filter-release-select"
                  aria-label="Filter by Release"
                  value={filters.selectedRelease}
                  onChange={(e) => setSelectedRelease(e.target.value)}
                  className="w-full h-10 appearance-none bg-surface-elevated/90 hover:bg-surface-elevated border border-white/15 dark:border-white/10 rounded-xl px-3.5 pr-9 text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer transition-all shadow-sm"
                >
                  <option value="all">Release: All Releases ▼</option>
                  {availableReleases.map((rel) => (
                    <option key={rel} value={rel}>
                      {rel}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Quick Reset Filter Button */}
            {activeFiltersCount > 0 && (
              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-10 px-3 flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reset ({activeFiltersCount})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Multi-Dimensional Secondary Filters ───────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="filter-status" className="text-[11px] font-semibold text-text-muted block mb-1">
              Task Status
            </label>
            <select
              id="filter-status"
              aria-label="Filter by Task Status"
              value={filters.taskStatus[0] || ''}
              onChange={(e) =>
                setFilters({ taskStatus: e.target.value ? [e.target.value] : [] })
              }
              className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Statuses</option>
              {dropdownConfigs.task_status.filter(s => s.is_active).map((s) => (
                <option key={s.id} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To Filter */}
          <div>
            <label htmlFor="filter-assigned" className="text-[11px] font-semibold text-text-muted block mb-1">
              Assigned To
            </label>
            <select
              id="filter-assigned"
              aria-label="Filter by Assigned Employee"
              value={filters.assignedTo[0] || ''}
              onChange={(e) =>
                setFilters({ assignedTo: e.target.value ? [e.target.value] : [] })
              }
              className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Employees</option>
              {dropdownConfigs.assigned_to.map((emp) => (
                <option key={emp.id} value={emp.label}>
                  {emp.label} {!emp.is_active ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="filter-priority" className="text-[11px] font-semibold text-text-muted block mb-1">
              Priority
            </label>
            <select
              id="filter-priority"
              aria-label="Filter by Priority"
              value={filters.priority[0] || ''}
              onChange={(e) =>
                setFilters({ priority: e.target.value ? [e.target.value] : [] })
              }
              className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
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
            <label htmlFor="filter-date-start" className="text-[11px] font-semibold text-text-muted block mb-1">
              Start Date (From - To)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                id="filter-date-start"
                type="date"
                aria-label="Date Range Start"
                value={filters.dateRangeStart || ''}
                onChange={(e) => setFilters({ dateRangeStart: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                id="filter-date-end"
                type="date"
                aria-label="Date Range End"
                value={filters.dateRangeEnd || ''}
                onChange={(e) => setFilters({ dateRangeEnd: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── Section 5: RELEASE PROGRESS INDICATOR (Requirement 5) ──────────── */}
      <GlassCard className="p-5 border border-white/10 bg-gradient-to-r from-surface-elevated to-surface shadow-md rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-text-primary">
                  {releaseProgress.release}
                </span>
                <Badge
                  variant="outline"
                  className={
                    releaseProgress.percentage === 100
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]'
                      : 'bg-accent/20 text-accent border-accent/30 text-[10px]'
                  }
                >
                  {releaseProgress.percentage}% Completed
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Release progress calculated across unique task completion states
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Total Tasks:</span>
              <span className="font-bold text-text-primary">{releaseProgress.totalTasks}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Completed:</span>
              <span className="font-bold text-emerald-400">{releaseProgress.completedTasks}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Remaining:</span>
              <span className="font-bold text-blue-400">{releaseProgress.remainingTasks}</span>
            </div>
            {releaseProgress.blockedTasks > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-text-muted">Blocked:</span>
                <span className="font-bold text-rose-400">{releaseProgress.blockedTasks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden p-0.5 border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${releaseProgress.percentage}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              releaseProgress.percentage === 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-accent to-purple-500'
            }`}
          />
        </div>
      </GlassCard>

      {/* ── 11 KPI Cards (Requirement 3: KPI Cards) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {/* 1. Total Release Tasks */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-accent/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tasks</span>
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-text-primary">{kpis.totalTasks}</div>
            <div className="text-[10px] text-text-muted mt-1">Across filtered scope</div>
          </GlassCard>
        </motion.div>

        {/* 2. Not Started */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-slate-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Not Started</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-300">{kpis.notStarted}</div>
            <div className="text-[10px] text-text-muted mt-1">Backlog queue</div>
          </GlassCard>
        </motion.div>

        {/* 3. Assigned */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-blue-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Assigned</span>
              <UserCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-blue-400">{kpis.assigned}</div>
            <div className="text-[10px] text-text-muted mt-1">Allocated to testers</div>
          </GlassCard>
        </motion.div>

        {/* 4. In Progress */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-purple-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">In Progress</span>
              <PlayCircle className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-400">{kpis.inProgress}</div>
            <div className="text-[10px] text-text-muted mt-1">Active QA execution</div>
          </GlassCard>
        </motion.div>

        {/* 5. Blocked */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-rose-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Blocked</span>
              <Ban className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400">{kpis.blocked}</div>
            <div className="text-[10px] text-rose-400/80 mt-1">Requires unblocking</div>
          </GlassCard>
        </motion.div>

        {/* 6. In Review */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-amber-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">In Review</span>
              <RefreshCw className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{kpis.inReview}</div>
            <div className="text-[10px] text-text-muted mt-1">Pending verification</div>
          </GlassCard>
        </motion.div>

        {/* 7. Completed */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-emerald-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400">{kpis.completed}</div>
            <div className="text-[10px] text-text-muted mt-1">Closed & verified</div>
          </GlassCard>
        </motion.div>

        {/* 8. Total Estimated Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-accent/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Estimated Hrs</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-text-primary">
              {kpis.totalEstimatedHours} <span className="text-xs font-normal text-text-muted">hrs</span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">Planned baseline</div>
          </GlassCard>
        </motion.div>

        {/* 9. Total Actual Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-indigo-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Actual Hrs</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-300">
              {kpis.totalActualHours} <span className="text-xs font-normal text-text-muted">hrs</span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">Logged effort</div>
          </GlassCard>
        </motion.div>

        {/* 10. Remaining Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-amber-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Remaining Hrs</span>
              <Hourglass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">
              {kpis.remainingHours} <span className="text-xs font-normal text-text-muted">hrs</span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">Effort balance</div>
          </GlassCard>
        </motion.div>

        {/* 11. Overrun Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-rose-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Overrun Hrs</span>
              <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            <div className={`text-2xl font-extrabold ${kpis.overrunHours > 0 ? 'text-rose-400' : 'text-text-muted'}`}>
              {kpis.overrunHours} <span className="text-xs font-normal text-text-muted">hrs</span>
            </div>
            <div className="text-[10px] text-text-muted mt-1">
              {kpis.overrunHours > 0 ? 'Exceeded estimate' : 'Within budget'}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* ── Section 6: PRODUCT / RELEASE SUMMARY TABLE (Requirement 6) ──────── */}
      <GlassCard className="p-5 border border-white/10 bg-surface/90 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-text-primary">
              Release-Wise Execution Summary
            </h3>
          </div>
          <span className="text-[11px] text-text-muted">
            Click any row to filter tracker to that Product / Release
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-elevated/80 text-[11px] font-semibold text-text-muted uppercase tracking-wider border-b border-white/10">
              <tr>
                <th className="py-2.5 px-3">Product</th>
                <th className="py-2.5 px-3">Release</th>
                <th className="py-2.5 px-2.5 text-center">Total Tasks</th>
                <th className="py-2.5 px-2.5 text-center">In Progress</th>
                <th className="py-2.5 px-2.5 text-center">Blocked</th>
                <th className="py-2.5 px-2.5 text-center">Completed</th>
                <th className="py-2.5 px-2.5 text-right">Estimated</th>
                <th className="py-2.5 px-2.5 text-right">Actual</th>
                <th className="py-2.5 px-2.5 text-right">Remaining</th>
                <th className="py-2.5 px-2.5 text-right">Overrun</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {summaries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-text-muted text-xs">
                    No release summary data available yet.
                  </td>
                </tr>
              ) : (
                summaries.map((s, idx) => (
                  <tr
                    key={`${s.projectId}_${s.release}_${idx}`}
                    onClick={() => handleSummaryRowClick(s)}
                    className="hover:bg-accent/10 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-text-primary">
                      {s.productName}
                      {s.productCode && (
                        <span className="ml-1.5 text-[10px] text-text-muted font-mono">
                          ({s.productCode})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-[11px] text-text-secondary">
                        {s.release}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-center font-bold text-text-primary">{s.totalTasks}</td>
                    <td className="py-2.5 px-2.5 text-center text-purple-400">{s.inProgress}</td>
                    <td className="py-2.5 px-2.5 text-center text-rose-400">{s.blocked}</td>
                    <td className="py-2.5 px-2.5 text-center text-emerald-400">{s.completed}</td>
                    <td className="py-2.5 px-2.5 text-right text-text-muted">{s.estimatedHrs}h</td>
                    <td className="py-2.5 px-2.5 text-right font-semibold text-purple-300">{s.actualHrs}h</td>
                    <td className="py-2.5 px-2.5 text-right text-emerald-400">{s.remainingHrs}h</td>
                    <td className="py-2.5 px-2.5 text-right text-rose-400 font-semibold">
                      {s.overrunHrs > 0 ? `+${s.overrunHrs}h` : '0h'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── Charts: Task Distribution & Hours Comparison ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status Distribution */}
        <GlassCard className="p-4 border border-white/10 bg-surface/90 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-primary">Task Status Distribution</span>
            <span className="text-[11px] text-text-muted">Current Filter Scope</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Hours Breakdown */}
        <GlassCard className="p-4 border border-white/10 bg-surface/90 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-text-primary">Cumulative Hours Breakdown</span>
            <span className="text-[11px] text-text-muted">Estimated vs Actual</span>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  formatter={(val: any) => [`${val} Hrs`, 'Hours']}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                  {hoursChartData.map((entry, index) => (
                    <Cell key={`cell-hrs-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
