// src/modules/SupportIssueTracker/components/ManagerLiveDashboard.tsx
// Manager Live Dashboard: Enterprise QA & Support Overview
// Permission-controlled: Rendered only when user has 'can_view_dashboard' permission.

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import {
  LayoutDashboard, Filter, Clock, AlertTriangle, CheckCircle2,
  Hourglass, PlayCircle, Ban, RefreshCw, XCircle, ChevronDown,
  User, Calendar, Activity, ArrowRight, UserCheck, Flame, Info
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { useSupportTrackerStore } from '../store'
import type { ProductSummary, TesterWorkload } from '../types'

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

  const kpis = getKPICounters()
  const productSummaries = getProductSummaries()
  const testerWorkloads = getTesterWorkloads()
  const statusDistribution = getStatusDistribution()

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.selectedProductId !== 'all') count++
    if (filters.testingStatus.length > 0) count++
    if (filters.tester.length > 0) count++
    if (filters.receivedDateStart || filters.receivedDateEnd) count++
    if (filters.startDateStart || filters.startDateEnd) count++
    if (filters.finishDateStart || filters.finishDateEnd) count++
    return count
  }, [filters])

  // Handle drill down click on a product row
  const handleProductDrillDown = (productId: string, productName: string) => {
    setSelectedProduct(productId)
    setDrillDownTarget(productName)
    // Smooth scroll down to the support issue table
    const tableEl = document.getElementById('support-issue-table-section')
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header & Global Filter Controls ─────────────────────────────── */}
      <GlassCard className="p-5 md:p-6 border border-white/10 dark:border-white/5 bg-gradient-to-br from-surface to-surface-secondary shadow-xl rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-text-primary">
                  Manager Live Dashboard
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent border-accent/20">
                  Live View
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Real-time product-wise overview of support & QA testing execution
              </p>
            </div>
          </div>

          {/* ── Product Filter Dropdown (Requirement 3: Product: All Products ▼) ── */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <label htmlFor="product-filter-select" className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1">
                Product Filter
              </label>
              <div className="relative">
                <select
                  id="product-filter-select"
                  aria-label="Filter by Product"
                  value={filters.selectedProductId}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="w-full h-10 appearance-none bg-surface-elevated/90 hover:bg-surface-elevated border border-white/15 dark:border-white/10 rounded-xl px-3.5 pr-9 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer transition-all shadow-sm"
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

            {/* Quick Reset Button if filters active */}
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

        {/* ── Secondary Multi-Dimensional Filter Bar ─────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-4">
          {/* 1. Testing Status Filter */}
          <div>
            <label htmlFor="filter-status-select" className="text-[11px] font-semibold text-text-muted block mb-1">
              Testing Status
            </label>
            <select
              id="filter-status-select"
              aria-label="Filter by Testing Status"
              value={filters.testingStatus[0] || ''}
              onChange={(e) =>
                setFilters({ testingStatus: e.target.value ? [e.target.value] : [] })
              }
              className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Statuses</option>
              {dropdownConfigs.testing_status.filter(ts => ts.is_active).map((ts) => (
                <option key={ts.id} value={ts.value}>
                  {ts.label}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Who's Testing Filter */}
          <div>
            <label htmlFor="filter-tester-select" className="text-[11px] font-semibold text-text-muted block mb-1">
              Who's Testing
            </label>
            <select
              id="filter-tester-select"
              aria-label="Filter by Tester"
              value={filters.tester[0] || ''}
              onChange={(e) =>
                setFilters({ tester: e.target.value ? [e.target.value] : [] })
              }
              className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">All Testers</option>
              {dropdownConfigs.testers.filter(t => t.is_active).map((t) => (
                <option key={t.id} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Received Date Range */}
          <div>
            <label htmlFor="filter-received-start" className="text-[11px] font-semibold text-text-muted block mb-1">
              Received Date (From - To)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                id="filter-received-start"
                type="date"
                aria-label="Received Date From"
                value={filters.receivedDateStart || ''}
                onChange={(e) => setFilters({ receivedDateStart: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                id="filter-received-end"
                type="date"
                aria-label="Received Date To"
                value={filters.receivedDateEnd || ''}
                onChange={(e) => setFilters({ receivedDateEnd: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* 4. Start Date Range */}
          <div>
            <label htmlFor="filter-start-start" className="text-[11px] font-semibold text-text-muted block mb-1">
              Start Date (From - To)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                id="filter-start-start"
                type="date"
                aria-label="Start Date From"
                value={filters.startDateStart || ''}
                onChange={(e) => setFilters({ startDateStart: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                id="filter-start-end"
                type="date"
                aria-label="Start Date To"
                value={filters.startDateEnd || ''}
                onChange={(e) => setFilters({ startDateEnd: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* 5. Finish Date Range */}
          <div>
            <label htmlFor="filter-finish-start" className="text-[11px] font-semibold text-text-muted block mb-1">
              Finish Date (From - To)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                id="filter-finish-start"
                type="date"
                aria-label="Finish Date From"
                value={filters.finishDateStart || ''}
                onChange={(e) => setFilters({ finishDateStart: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                id="filter-finish-end"
                type="date"
                aria-label="Finish Date To"
                value={filters.finishDateEnd || ''}
                onChange={(e) => setFilters({ finishDateEnd: e.target.value })}
                className="w-full h-9 bg-surface-elevated/70 border border-white/10 rounded-lg px-1.5 text-[11px] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ── 10 KPI Cards (Requirement 2: KPI Cards) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {/* 1. Total Support Issues */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-accent/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Issues</span>
              <Activity className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-text-primary">{kpis.totalIssues}</div>
            <div className="text-[10px] text-text-muted mt-1">Across filtered scope</div>
          </GlassCard>
        </motion.div>

        {/* 2. Open Issues */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-blue-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Open Issues</span>
              <PlayCircle className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-extrabold text-blue-400">{kpis.openIssues}</div>
            <div className="text-[10px] text-text-muted mt-1">Pending completion</div>
          </GlassCard>
        </motion.div>

        {/* 3. In Testing */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-purple-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">In Testing</span>
              <Hourglass className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-400">{kpis.inTesting}</div>
            <div className="text-[10px] text-text-muted mt-1">Active QA execution</div>
          </GlassCard>
        </motion.div>

        {/* 4. Blocked */}
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

        {/* 5. Retesting */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-cyan-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Retesting</span>
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-400">{kpis.retesting}</div>
            <div className="text-[10px] text-text-muted mt-1">Verifying fixes</div>
          </GlassCard>
        </motion.div>

        {/* 6. Completed */}
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

        {/* 7. Total Estimated Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-accent/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Estimated Hrs</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-extrabold text-text-primary">{kpis.totalEstimatedHours} <span className="text-xs font-normal text-text-muted">hrs</span></div>
            <div className="text-[10px] text-text-muted mt-1">Planned baseline</div>
          </GlassCard>
        </motion.div>

        {/* 8. Total Actual Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-accent/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Actual Hrs</span>
              <Clock className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-300">{kpis.totalActualHours} <span className="text-xs font-normal text-text-muted">hrs</span></div>
            <div className="text-[10px] text-text-muted mt-1">Logged effort</div>
          </GlassCard>
        </motion.div>

        {/* 9. Remaining Hours */}
        <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
          <GlassCard className="p-4 rounded-xl border border-white/10 dark:border-white/5 bg-surface/90 hover:border-amber-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between text-text-muted mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Remaining Hrs</span>
              <Hourglass className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400">{kpis.remainingHours} <span className="text-xs font-normal text-text-muted">hrs</span></div>
            <div className="text-[10px] text-text-muted mt-1">Effort balance</div>
          </GlassCard>
        </motion.div>

        {/* 10. Overrun Hours */}
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

      {/* ── Product-Wise Summary Table (Requirement 4) ────────────────────── */}
      <GlassCard className="p-5 border border-white/10 dark:border-white/5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>Product Summary Overview</span>
              <span className="text-xs font-normal text-text-muted">
                (Click any product row to drill down)
              </span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Live status breakdown and effort tracking per Product Hub record
            </p>
          </div>
          {filters.selectedProductId !== 'all' && (
            <button
              type="button"
              onClick={() => setSelectedProduct('all')}
              className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
            >
              Clear drill-down filter
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10 dark:border-white/5">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-elevated/80 border-b border-white/10 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                <th className="py-3 px-3.5">Product</th>
                <th className="py-3 px-3 text-center">Total Issues</th>
                <th className="py-3 px-3 text-center">Open</th>
                <th className="py-3 px-3 text-center">In Testing</th>
                <th className="py-3 px-3 text-center">Blocked</th>
                <th className="py-3 px-3 text-center">Retesting</th>
                <th className="py-3 px-3 text-center">Completed</th>
                <th className="py-3 px-3 text-right">Est. Hrs</th>
                <th className="py-3 px-3 text-right">Act. Hrs</th>
                <th className="py-3 px-3 text-right">Rem. Hrs</th>
                <th className="py-3 px-3.5 text-right">Overrun Hrs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {productSummaries.map((summary) => {
                const isSelected = filters.selectedProductId === summary.projectId
                return (
                  <tr
                    key={summary.projectId}
                    onClick={() => handleProductDrillDown(summary.projectId, summary.productName)}
                    className={`cursor-pointer transition-colors hover:bg-white/[0.04] ${
                      isSelected ? 'bg-accent/10 border-l-2 border-l-accent' : ''
                    }`}
                  >
                    <td className="py-3 px-3.5 font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary hover:text-accent transition-colors">
                          {summary.productName}
                        </span>
                        {summary.productCode && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-white/15 text-text-muted">
                            {summary.productCode}
                          </Badge>
                        )}
                        <ArrowRight className="w-3.5 h-3.5 text-accent opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-text-primary">
                      {summary.totalIssues}
                    </td>
                    <td className="py-3 px-3 text-center text-blue-400 font-semibold">
                      {summary.open}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-400 font-semibold">
                      {summary.inTesting}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {summary.blocked > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-semibold">
                          {summary.blocked}
                        </span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-cyan-400 font-semibold">
                      {summary.retesting}
                    </td>
                    <td className="py-3 px-3 text-center text-emerald-400 font-semibold">
                      {summary.completed}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-text-secondary">
                      {summary.estimatedHrs}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-indigo-300">
                      {summary.actualHrs}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-amber-400">
                      {summary.remainingHrs}
                    </td>
                    <td className="py-3 px-3.5 text-right font-semibold">
                      {summary.overrunHrs > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                          +{summary.overrunHrs} hrs
                        </span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── Charts & Tester Workload Section (Requirements 5 & 6) ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Testing Status Visualization (Requirement 5) */}
        <GlassCard className="lg:col-span-7 p-5 border border-white/10 dark:border-white/5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Testing Status Visualization
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Distribution of support issues across configurable statuses
                </p>
              </div>
            </div>

            <div className="h-[250px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={statusDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
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
                      backgroundColor: 'var(--modal-bg)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value} Issues`, 'Count']}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick status count pills */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/5">
            {statusDistribution.map((item) => (
              <div
                key={item.status}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-surface-elevated/70 border border-white/5"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-text-muted">{item.status}:</span>
                <span className="font-bold text-text-primary">{item.count}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Tester Workload (Requirement 6) */}
        <GlassCard className="lg:col-span-5 p-5 border border-white/10 dark:border-white/5 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-accent" />
                  <span>Tester Workload</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Effort allocation, remaining queue & overruns per tester
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {testerWorkloads.map((tester) => {
                const hasHighWorkload = tester.remainingHrs > 16 || tester.activeIssues > 3
                const hasOverrun = tester.overrunHrs > 0

                return (
                  <div
                    key={tester.testerName}
                    className={`p-3 rounded-xl border transition-all ${
                      hasOverrun
                        ? 'bg-rose-500/5 border-rose-500/20'
                        : hasHighWorkload
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-surface-elevated/60 border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/20 border border-accent/30 text-accent flex items-center justify-center text-[10px] font-bold">
                          {tester.testerName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-xs text-text-primary">
                          {tester.testerName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasOverrun && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            +{tester.overrunHrs}h Overrun
                          </Badge>
                        )}
                        {hasHighWorkload && !hasOverrun && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/10">
                            Heavy Queue
                          </Badge>
                        )}
                        <span className="text-xs text-text-muted">
                          {tester.activeIssues} active
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-[11px] pt-1 border-t border-white/5">
                      <div>
                        <span className="text-text-muted block text-[10px]">Est.</span>
                        <span className="font-medium text-text-primary">{tester.estimatedHrs}h</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Act.</span>
                        <span className="font-medium text-indigo-300">{tester.actualHrs}h</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Rem.</span>
                        <span className={`font-semibold ${tester.remainingHrs > 12 ? 'text-amber-400' : 'text-text-primary'}`}>
                          {tester.remainingHrs}h
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Overrun</span>
                        <span className={`font-semibold ${tester.overrunHrs > 0 ? 'text-rose-400' : 'text-text-muted'}`}>
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
        </GlassCard>
      </div>
    </div>
  )
}
