// src/modules/QAWeeklyReport/components/ReleaseBugStatus/index.tsx
// Release Bug Status — premium drag-drop Excel upload + auto-analytics display.
// Single upload with view type selection (Release Bug Status OR Task-Wise Status).

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, X, CheckCircle, AlertTriangle,
  Bug, BarChart3, Shield, Sparkles, TrendingUp,
  Trash2, RefreshCw, ListTree,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { parseReleaseBugFile } from './parser'
import { parseTaskWiseFile } from './taskWiseParser'
import type { ReleaseBugAnalytics } from './types'
import type { TaskWiseAnalytics } from './taskWiseTypes'

// Re-export types for external use
export type { ReleaseBugAnalytics } from './types'
export type { TaskWiseAnalytics } from './taskWiseTypes'

type ViewMode = 'release-bug' | 'task-wise'

interface ReleaseBugStatusProps {
  analytics: ReleaseBugAnalytics | null
  onChange: (analytics: ReleaseBugAnalytics | null) => void
  taskWiseAnalytics?: TaskWiseAnalytics | null
  onTaskWiseChange?: (analytics: TaskWiseAnalytics | null) => void
  sectionVisibility?: Record<string, boolean>
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KPICard({ label, value, suffix, icon: Icon, color }: {
  label: string; value: number | string; suffix?: string; icon: React.ElementType; color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 rounded-2xl border flex flex-col gap-2"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <Icon className={cn('w-4 h-4', color)} />
        <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <span className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
        {value}{suffix}
      </span>
    </motion.div>
  )
}

// ── Status Table ──────────────────────────────────────────────────────────────

function StatusTable({ data }: { data: { status: string; count: number }[] }) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: 'var(--hover)' }}>
            <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>Status</th>
            <th className="text-right py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.status} style={{ borderTop: '1px solid var(--divider)' }}>
              <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.status}</td>
              <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--text-secondary)' }}>{row.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ReleaseBugStatus({ analytics, onChange, taskWiseAnalytics, onTaskWiseChange, sectionVisibility }: ReleaseBugStatusProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Default to whichever has data, or release-bug
    if (taskWiseAnalytics && !analytics) return 'task-wise'
    return 'release-bug'
  })
  
  // Track uploaded file for re-parsing when view mode changes
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  
  // Alert popup states
  const [showTaskWiseAlert, setShowTaskWiseAlert] = useState(false)
  const [showReleaseBugAlert, setShowReleaseBugAlert] = useState(false)
  
  // Check toggle states
  const isReleaseBugToggleOn = sectionVisibility?.show_releaseBugStatus !== false
  const isTaskWiseToggleOn = sectionVisibility?.show_taskWiseStatus === true

  const ACCEPTED_EXT = ['.xlsx', '.xls', '.csv']

  const processFile = useCallback(async (file: File, mode: ViewMode) => {
    // Validate
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXT.includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx, .xls, or .csv')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB.')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      // Parse file for BOTH formats so both toggles work independently
      const [releaseBugResult, taskWiseResult] = await Promise.all([
        parseReleaseBugFile(file).catch(() => null),
        parseTaskWiseFile(file).catch(() => null)
      ])
      
      // Set both data types
      if (releaseBugResult) {
        onChange(releaseBugResult)
      }
      if (taskWiseResult) {
        onTaskWiseChange?.(taskWiseResult)
      }
      
      // Show toast based on selected view mode
      if (mode === 'release-bug' && releaseBugResult) {
        toast({ title: 'Bug Report Analyzed', description: `${releaseBugResult.rawRowCount} defects processed from ${file.name}` })
      } else if (mode === 'task-wise' && taskWiseResult) {
        toast({ title: 'Task Status Analyzed', description: `${taskWiseResult.rawRowCount} records processed from ${file.name}` })
      } else {
        toast({ title: 'File Analyzed', description: `Data processed from ${file.name}` })
      }
      
      setUploadedFile(file)
    } catch (err: any) {
      setError(err.message)
      toast({ variant: 'destructive', title: 'Parse Failed', description: err.message })
    } finally {
      setIsProcessing(false)
    }
  }, [onChange, onTaskWiseChange, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file, viewMode)
  }, [processFile, viewMode])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file, viewMode)
    e.target.value = '' // reset so same file can be re-uploaded
  }, [processFile, viewMode])

  const handleRemove = () => {
    onChange(null)
    onTaskWiseChange?.(null)
    setUploadedFile(null)
    setError(null)
  }

  const handleViewModeChange = async (newMode: ViewMode) => {
    setViewMode(newMode)
    // Show alert if the corresponding toggle is OFF
    if (newMode === 'task-wise' && !isTaskWiseToggleOn) {
      setShowTaskWiseAlert(true)
    } else if (newMode === 'release-bug' && !isReleaseBugToggleOn) {
      setShowReleaseBugAlert(true)
    }
    // No need to re-parse - both data types are already available
  }

  const hasData = analytics || taskWiseAnalytics
  const currentFileName = analytics?.uploadedFileName || taskWiseAnalytics?.uploadedFileName
  const currentRowCount = analytics?.rawRowCount || taskWiseAnalytics?.rawRowCount
  const currentUploadedAt = analytics?.uploadedAt || taskWiseAnalytics?.uploadedAt

  return (
    <GlassCard hoverEffect={false}>
      {/* Task-Wise Status Alert Popup */}
      <AnimatePresence>
        {showTaskWiseAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowTaskWiseAlert(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="mx-4 max-w-md p-6 rounded-2xl shadow-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Important Notice</h3>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                Toggle ON "<span className="font-bold" style={{ color: 'var(--accent)' }}>Task-Wise Status Breakdown</span>" in Dashboard Display Sections to see the data Task Wise in the Website.
              </p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                Toggle OFF the "<span className="font-bold" style={{ color: 'var(--accent)' }}>Release Bug Status</span>" to avoid Duplication once Toggle ON "<span className="font-bold" style={{ color: 'var(--accent)' }}>Task-Wise Status Breakdown</span>".
              </p>
              <button
                onClick={() => setShowTaskWiseAlert(false)}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Release Bug Status Alert Popup */}
      <AnimatePresence>
        {showReleaseBugAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowReleaseBugAlert(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="mx-4 max-w-md p-6 rounded-2xl shadow-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                  <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Important Notice</h3>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                Toggle ON "<span className="font-bold" style={{ color: 'var(--accent)' }}>Release Bug Status</span>" in Dashboard Display Sections to see the Bug Status in the Website.
              </p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
                Toggle OFF the "<span className="font-bold" style={{ color: 'var(--accent)' }}>Task-Wise Status Breakdown</span>" to avoid Duplication once Toggle ON "<span className="font-bold" style={{ color: 'var(--accent)' }}>Release Bug Status</span>".
              </p>
              <button
                onClick={() => setShowReleaseBugAlert(false)}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            {viewMode === 'release-bug' ? (
              <Bug className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            ) : (
              <ListTree className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            )}
            {viewMode === 'release-bug' ? 'Release Bug Status' : 'Task-Wise Status'}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Upload defect/task tracker and select view type to generate analytics.
          </p>
        </div>
        {hasData && (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 mb-5 p-1 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => handleViewModeChange('release-bug')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
            viewMode === 'release-bug'
              ? 'bg-accent text-white shadow-lg'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <Bug className="w-3.5 h-3.5" />
          Release Bug Status
        </button>
        <button
          onClick={() => handleViewModeChange('task-wise')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all',
            viewMode === 'task-wise'
              ? 'bg-accent text-white shadow-lg'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          <ListTree className="w-3.5 h-3.5" />
          Task-Wise Status
        </button>
      </div>

      {/* Upload Area (shown when no data) */}
      {!hasData && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300',
            isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/40 hover:bg-hover',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileSelect}
          />

          {isProcessing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Analyzing spreadsheet...</span>
            </motion.div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Drag & Drop Excel File
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  or click to <span style={{ color: 'var(--accent)' }}>Browse</span>
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {ACCEPTED_EXT.map(ext => (
                  <span key={ext} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {ext}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400"><X className="w-3 h-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Info (shown when data exists) */}
      {hasData && (
        <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
          <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{currentFileName}</span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {currentRowCount} {viewMode === 'release-bug' ? 'defects' : 'records'} · Uploaded {currentUploadedAt ? new Date(currentUploadedAt).toLocaleString() : ''}
            </span>
          </div>
          <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
        </div>
      )}

      {/* Release Bug Status Analytics Display */}
      {viewMode === 'release-bug' && analytics && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Release Health */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border" style={{ background: analytics.releaseHealth.status === 'ready' ? 'rgba(34,197,94,0.05)' : analytics.releaseHealth.status === 'needs_review' ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)', borderColor: analytics.releaseHealth.status === 'ready' ? 'rgba(34,197,94,0.2)' : analytics.releaseHealth.status === 'needs_review' ? 'rgba(245,158,11,0.2)' : 'rgba(239,68,68,0.2)' }}>
              <span className="text-2xl">{analytics.releaseHealth.emoji}</span>
              <div>
                <span className={cn('text-sm font-bold', analytics.releaseHealth.color)}>{analytics.releaseHealth.label}</span>
                <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Release Health Score: {analytics.releaseHealth.score}%</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard label="Total Bugs" value={analytics.metrics.totalBugs} icon={Bug} color="text-blue-400" />
              <KPICard label="Closed" value={analytics.metrics.completedBugs} icon={CheckCircle} color="text-green-400" />
              <KPICard label="Open" value={analytics.metrics.openBugs} icon={AlertTriangle} color="text-red-400" />
              <KPICard label="Closure %" value={analytics.metrics.closurePercentage.toFixed(1)} suffix="%" icon={TrendingUp} color="text-accent-gold" />
              <KPICard label="Deferred" value={analytics.metrics.deferredBugs} icon={Shield} color="text-amber-400" />
            </div>

            {/* Status Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <BarChart3 className="w-3.5 h-3.5" /> Status Distribution
              </h4>
              <StatusTable data={analytics.statusDistribution} />
            </div>

            {/* Severity + Priority side by side */}
            {(analytics.severityDistribution.length > 0 || analytics.priorityDistribution.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {analytics.severityDistribution.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Severity</h4>
                    <StatusTable data={analytics.severityDistribution.map(s => ({ status: s.severity, count: s.count }))} />
                  </div>
                )}
                {analytics.priorityDistribution.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Priority</h4>
                    <StatusTable data={analytics.priorityDistribution.map(p => ({ status: p.priority, count: p.count }))} />
                  </div>
                )}
              </div>
            )}

            {/* AI Summary */}
            <div className="p-4 rounded-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>AI Executive Summary</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {analytics.aiSummary}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Task-Wise Status Analytics Display */}
      {viewMode === 'task-wise' && taskWiseAnalytics && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Total Records" value={taskWiseAnalytics.rawRowCount} icon={BarChart3} color="text-blue-400" />
              <KPICard label="Unique Parents" value={taskWiseAnalytics.uniqueParents} icon={ListTree} color="text-purple-400" />
              <KPICard label="Unique Statuses" value={taskWiseAnalytics.uniqueStatuses?.length || 0} icon={CheckCircle} color="text-emerald-400" />
              <KPICard label="Blank Parents" value={taskWiseAnalytics.validation?.blankParentCount || 0} icon={AlertTriangle} color="text-amber-400" />
            </div>

            {/* Overall Status Summary */}
            {taskWiseAnalytics.overallStatus?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <BarChart3 className="w-3.5 h-3.5" /> Overall Status Summary
                </h4>
                <StatusTable data={taskWiseAnalytics.overallStatus.map(s => ({ status: s.status, count: s.count }))} />
              </div>
            )}

            {/* Parent-Wise Status (collapsed preview) */}
            {taskWiseAnalytics.parentWiseStatus?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <ListTree className="w-3.5 h-3.5" /> Parent-Wise Status ({taskWiseAnalytics.parentWiseStatus.length} parents)
                </h4>
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'var(--hover)' }}>
                        <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>Parent</th>
                        <th className="text-right py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taskWiseAnalytics.parentWiseStatus.slice(0, 5).map((row) => (
                        <tr key={row.parent} style={{ borderTop: '1px solid var(--divider)' }}>
                          <td className="py-2 px-3 font-medium truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }} title={row.parent}>{row.parent}</td>
                          <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--accent)' }}>{row.total}</td>
                        </tr>
                      ))}
                      {taskWiseAnalytics.parentWiseStatus.length > 5 && (
                        <tr style={{ borderTop: '1px solid var(--divider)' }}>
                          <td colSpan={2} className="py-2 px-3 text-center" style={{ color: 'var(--text-muted)' }}>
                            + {taskWiseAnalytics.parentWiseStatus.length - 5} more parents
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Validation Summary */}
            {taskWiseAnalytics.validation && (
              <div className="p-3 rounded-xl" style={{ 
                background: taskWiseAnalytics.validation.totalRecordsMatch ? 'rgba(34,197,94,0.05)' : 'rgba(245,158,11,0.05)',
                border: `1px solid ${taskWiseAnalytics.validation.totalRecordsMatch ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`
              }}>
                <div className="flex items-center gap-2">
                  {taskWiseAnalytics.validation.totalRecordsMatch ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-bold" style={{ color: taskWiseAnalytics.validation.totalRecordsMatch ? 'rgb(74,222,128)' : 'rgb(251,191,36)' }}>
                    Data Validation: {taskWiseAnalytics.validation.totalRecordsMatch ? 'Passed' : 'Check Required'}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </GlassCard>
  )
}
