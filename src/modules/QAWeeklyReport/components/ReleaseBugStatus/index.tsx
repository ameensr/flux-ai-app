// src/modules/QAWeeklyReport/components/ReleaseBugStatus/index.tsx
// Release Bug Status — premium drag-drop Excel upload + auto-analytics display.

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, X, CheckCircle, AlertTriangle,
  Bug, BarChart3, PieChart, Shield, Sparkles, TrendingUp,
  Trash2, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { parseReleaseBugFile } from './parser'
import type { ReleaseBugAnalytics } from './types'

// Re-export types for external use
export type { ReleaseBugAnalytics } from './types'

interface ReleaseBugStatusProps {
  analytics: ReleaseBugAnalytics | null
  onChange: (analytics: ReleaseBugAnalytics | null) => void
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

export function ReleaseBugStatus({ analytics, onChange }: ReleaseBugStatusProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ]
  const ACCEPTED_EXT = ['.xlsx', '.xls', '.csv']

  const processFile = useCallback(async (file: File) => {
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
      const result = await parseReleaseBugFile(file)
      onChange(result)
      toast({ title: 'Bug Report Analyzed', description: `${result.rawRowCount} defects processed from ${file.name}` })
    } catch (err: any) {
      setError(err.message)
      toast({ variant: 'destructive', title: 'Parse Failed', description: err.message })
    } finally {
      setIsProcessing(false)
    }
  }, [onChange, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = '' // reset so same file can be re-uploaded
  }, [processFile])

  const handleRemove = () => {
    onChange(null)
    setError(null)
  }

  return (
    <GlassCard hoverEffect={false}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Bug className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Release Bug Status
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Upload the latest defect tracker to automatically generate release defect analytics.
          </p>
        </div>
        {analytics && (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {/* Upload Area (shown when no analytics) */}
      {!analytics && (
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
                  Drag & Drop Release Bug File
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  or click to <span style={{ color: 'var(--accent)' }}>Browse Excel File</span>
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

      {/* Analytics Display */}
      <AnimatePresence>
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-5"
          >
            {/* File info */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{analytics.uploadedFileName}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{analytics.rawRowCount} defects · Uploaded {new Date(analytics.uploadedAt).toLocaleString()}</span>
              </div>
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            </div>

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
              <KPICard label="Completed" value={analytics.metrics.completedBugs} icon={CheckCircle} color="text-green-400" />
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
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
