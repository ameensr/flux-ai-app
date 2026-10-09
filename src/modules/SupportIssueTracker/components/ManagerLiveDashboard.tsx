// src/modules/SupportIssueTracker/components/ManagerLiveDashboard.tsx
// Manager Live Dashboard: Enterprise QA & Support Overview
// Permission-controlled: Rendered only when user has 'can_view_dashboard' permission.

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  LayoutDashboard, Clock, CheckCircle2,
  Hourglass, PlayCircle, Ban, RefreshCw, XCircle, ChevronDown,
  Activity, ArrowRight, UserCheck, Flame, Filter
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useSupportTrackerStore } from '../store'

export function ManagerLiveDashboard() {
  const {
    products,
    filters,
    setFilters,
    resetFilters,
    setSelectedProduct,
    getKPICounters,
    getProductSummaries,
    getTesterWorkloads,
    getStatusDistribution,
    dropdownConfigs,
    setDrillDownTarget
  } = useSupportTrackerStore()

  // Collapsible sections state
  const [isDashboardOpen, setIsDashboardOpen] = useState(true)
  const [isProductSummaryExpanded, setIsProductSummaryExpanded] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const kpis = getKPICounters()
  const productSummaries = getProductSummaries()
  const testerWorkloads = getTesterWorkloads()
  const statusDistribution = getStatusDistribution()

  // Active filters count (excluding default 'all' product)
  const secondaryFiltersCount = useMemo(() => {
    let count = 0
    if (filters.testingStatus.length > 0) count++
    if (filters.tester.length > 0) count++
    if (filters.receivedDateStart || filters.receivedDateEnd) count++
    if (filters.startDateStart || filters.startDateEnd) count++
    if (filters.finishDateStart || filters.finishDateEnd) count++
    return count
  }, [filters])

  const totalActiveFiltersCount = useMemo(() => {
    return (filters.selectedProductId !== 'all' ? 1 : 0) + secondaryFiltersCount
  }, [filters.selectedProductId, secondaryFiltersCount])

  // Handle drill down click on a product row
  const handleProductDrillDown = (productId: string, productName: string) => {
    setSelectedProduct(productId)
    setDrillDownTarget(productName)
    const tableEl = document.getElementById('support-issue-table-section')
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
              <LayoutDashboard className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold tracking-tight text-text-primary whitespace-nowrap">
                Manager Live Dashboard
              </h2>
              <Badge variant="outline" className="text-[9px] uppercase font-semibold tracking-wider px-1.5 py-0 bg-accent/10 text-accent border-accent/25">
                Live
              </Badge>
              {/* Collapsed summary quick preview */}
              {!isDashboardOpen && (
                <div className="hidden md:flex items-center gap-2 text-xs text-text-muted font-mono ml-2 pl-2 border-l border-border/40 truncate">
                  <span>{kpis.totalIssues} Issues</span>
                  <span className="text-blue-400">· {kpis.openIssues} Open</span>
                  <span className="text-purple-400">· {kpis.inTesting} Testing</span>
                  <span className="text-emerald-400">· {kpis.completed} Closed</span>
                  <span className="text-indigo-400">· {kpis.totalActualHours}h Logged</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Controls & Dashboard Toggle */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Product Selector */}
            <div className="relative">
              <select
                id="product-filter-select"
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
          <div className="pt-2.5 border-t border-border/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* 1. Testing Status */}
            <div>
              <label htmlFor="filter-status-select" className="text-[10px] font-semibold text-text-muted block mb-1">
                Testing Status
              </label>
              <select
                id="filter-status-select"
                aria-label="Filter by Testing Status"
                value={filters.testingStatus[0] || ''}
                onChange={(e) =>
                  setFilters({ testingStatus: e.target.value ? [e.target.value] : [] })
                }
                className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">All Statuses</option>
                {dropdownConfigs.testing_status.filter(ts => ts.is_active).map((ts) => (
                  <option key={ts.id} value={ts.value}>
                    {ts.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Tester */}
            <div>
              <label htmlFor="filter-tester-select" className="text-[10px] font-semibold text-text-muted block mb-1">
                Who's Testing
              </label>
              <select
                id="filter-tester-select"
                aria-label="Filter by Tester"
                value={filters.tester[0] || ''}
                onChange={(e) =>
                  setFilters({ tester: e.target.value ? [e.target.value] : [] })
                }
                className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
              >
                <option value="">All Testers</option>
                {dropdownConfigs.testers.filter(t => t.is_active).map((t) => (
                  <option key={t.id} value={t.value}>
                    {t.label.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Received Date */}
            <div>
              <label htmlFor="filter-received-start" className="text-[10px] font-semibold text-text-muted block mb-1">
                Received (From - To)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  id="filter-received-start"
                  type="date"
                  aria-label="Received Date From"
                  value={filters.receivedDateStart || ''}
                  onChange={(e) => setFilters({ receivedDateStart: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <input
                  id="filter-received-end"
                  type="date"
                  aria-label="Received Date To"
                  value={filters.receivedDateEnd || ''}
                  onChange={(e) => setFilters({ receivedDateEnd: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>

            {/* 4. Start Date */}
            <div>
              <label htmlFor="filter-start-start" className="text-[10px] font-semibold text-text-muted block mb-1">
                Start Date (From - To)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  id="filter-start-start"
                  type="date"
                  aria-label="Start Date From"
                  value={filters.startDateStart || ''}
                  onChange={(e) => setFilters({ startDateStart: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <input
                  id="filter-start-end"
                  type="date"
                  aria-label="Start Date To"
                  value={filters.startDateEnd || ''}
                  onChange={(e) => setFilters({ startDateEnd: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>

            {/* 5. Finish Date */}
            <div>
              <label htmlFor="filter-finish-start" className="text-[10px] font-semibold text-text-muted block mb-1">
                Finish Date (From - To)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  id="filter-finish-start"
                  type="date"
                  aria-label="Finish Date From"
                  value={filters.finishDateStart || ''}
                  onChange={(e) => setFilters({ finishDateStart: e.target.value })}
                  className="w-full h-8 bg-surface-secondary/70 border border-border/50 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
                <input
                  id="filter-finish-end"
                  type="date"
                  aria-label="Finish Date To"
                  value={filters.finishDateEnd || ''}
                  onChange={(e) => setFilters({ finishDateEnd: e.target.value })}
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
          {/* ── 10 KPI Cards (Minimal Look) ──────────────────────────────── */}
          <div className="space-y-2.5">
            {/* Tier 1: Issue Lifecycle (6 cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
              {/* 1. Total Issues */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-border transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Total Issues</span>
                  <div className="w-6 h-6 rounded-md bg-accent/10 text-accent flex items-center justify-center">
                    <Activity className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-text-primary">
                  {kpis.totalIssues}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Filtered scope</div>
              </div>

              {/* 2. Open Issues */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-blue-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Open</span>
                  <div className="w-6 h-6 rounded-md bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <PlayCircle className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-blue-400">
                  {kpis.openIssues}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Pending QA</div>
              </div>

              {/* 3. In Testing */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-purple-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">In Testing</span>
                  <div className="w-6 h-6 rounded-md bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <Hourglass className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-purple-400">
                  {kpis.inTesting}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Active runs</div>
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

              {/* 5. Retesting */}
              <div className="p-3 rounded-xl border border-border/50 bg-surface/70 hover:border-cyan-500/40 transition-all shadow-xs">
                <div className="flex items-center justify-between text-text-muted mb-1.5">
                  <span className="text-[11px] font-medium text-text-muted">Retesting</span>
                  <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <RefreshCw className="w-3 h-3" />
                  </div>
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-cyan-400">
                  {kpis.retesting}
                </div>
                <div className="text-[10px] text-text-muted mt-0.5 truncate">Fix verify</div>
              </div>

              {/* 6. Completed */}
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
              {/* 7. Estimated Hours */}
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

              {/* 8. Actual Logged Hours */}
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

              {/* 9. Remaining Hours */}
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

              {/* 10. Overrun Hours */}
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

          {/* ── Product Summary Overview (Expand / Collapse Section) ──────── */}
          <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md shadow-xs overflow-hidden">
            {/* Header: Clickable Expand / Collapse bar */}
            <div
              onClick={() => setIsProductSummaryExpanded(!isProductSummaryExpanded)}
              className="px-4 py-3 bg-surface/90 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 cursor-pointer select-none hover:bg-surface-elevated/40 transition-colors"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsProductSummaryExpanded(!isProductSummaryExpanded) } }}
              aria-expanded={isProductSummaryExpanded}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-text-primary flex items-center gap-2 whitespace-nowrap">
                  <span>Product Summary Overview</span>
                  <span className="text-[11px] font-normal text-text-muted hidden md:inline">
                    (Click row to filter issues below)
                  </span>
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-secondary/70 text-text-muted border border-border/40 whitespace-nowrap">
                  {productSummaries.length} {productSummaries.length === 1 ? 'product' : 'products'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {filters.selectedProductId !== 'all' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedProduct('all')
                    }}
                    className="text-xs font-medium text-accent hover:underline flex items-center gap-1 cursor-pointer mr-1"
                  >
                    Clear filter
                  </button>
                )}
                <span className="text-[11px] text-text-muted hidden sm:inline">
                  {isProductSummaryExpanded ? 'Collapse' : 'Expand'}
                </span>
                <div className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-colors">
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isProductSummaryExpanded ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </div>

            {/* Collapsible Table Content */}
            {isProductSummaryExpanded && (
              <div className="border-t border-border/40 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-secondary/80 border-b border-border/40 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                      <th className="py-2.5 px-3.5">Product</th>
                      <th className="py-2.5 px-2.5 text-center">Total Issues</th>
                      <th className="py-2.5 px-2.5 text-center">Open</th>
                      <th className="py-2.5 px-2.5 text-center">In Testing</th>
                      <th className="py-2.5 px-2.5 text-center">Blocked</th>
                      <th className="py-2.5 px-2.5 text-center">Retesting</th>
                      <th className="py-2.5 px-2.5 text-center">Completed</th>
                      <th className="py-2.5 px-2.5 text-right">Est. Hrs</th>
                      <th className="py-2.5 px-2.5 text-right">Act. Hrs</th>
                      <th className="py-2.5 px-2.5 text-right">Rem. Hrs</th>
                      <th className="py-2.5 px-3.5 text-right">Overrun</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {productSummaries.map((summary) => {
                      const isSelected = filters.selectedProductId === summary.projectId
                      return (
                        <tr
                          key={summary.projectId}
                          onClick={() => handleProductDrillDown(summary.projectId, summary.productName)}
                          className={`cursor-pointer transition-colors hover:bg-accent/[0.04] ${
                            isSelected ? 'bg-accent/10 border-l-[3px] border-l-accent' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3.5 font-medium text-text-primary">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-text-primary hover:text-accent transition-colors">
                                {summary.productName}
                              </span>
                              {summary.productCode && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 text-text-muted font-mono">
                                  {summary.productCode}
                                </Badge>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center font-bold text-text-primary tabular-nums">
                            {summary.totalIssues}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-blue-400 font-semibold tabular-nums">
                            {summary.open}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-purple-400 font-semibold tabular-nums">
                            {summary.inTesting}
                          </td>
                          <td className="py-2.5 px-2.5 text-center">
                            {summary.blocked > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-semibold text-[11px]">
                                {summary.blocked}
                              </span>
                            ) : (
                              <span className="text-text-muted/60">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-cyan-400 font-semibold tabular-nums">
                            {summary.retesting}
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-emerald-400 font-semibold tabular-nums">
                            {summary.completed}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-text-secondary tabular-nums font-mono">
                            {summary.estimatedHrs}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-indigo-400 tabular-nums font-mono">
                            {summary.actualHrs}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-medium text-amber-400 tabular-nums font-mono">
                            {summary.remainingHrs}
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-semibold">
                            {summary.overrunHrs > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[11px] font-mono">
                                +{summary.overrunHrs}h
                              </span>
                            ) : (
                              <span className="text-text-muted/60 text-[11px] font-mono">0</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {productSummaries.length === 0 && (
                      <tr>
                        <td colSpan={11} className="py-6 text-center text-xs text-text-muted">
                          No products found matching active filters.
                        </td>
                      </tr>
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
                        formatter={(value: any) => [`${value} Issues`, 'Count']}
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
                    const hasHighWorkload = tester.remainingHrs > 16 || tester.activeIssues > 3
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
                              {tester.activeIssues} active
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
