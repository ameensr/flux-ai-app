// src/modules/QAWeeklyReport/components/ReleaseBugStatus/TaskWiseStatus.tsx
// Task-Wise Status — displays parent-wise and overall status summaries

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, X, CheckCircle, AlertTriangle,
  ListTree, BarChart3, Table2, RefreshCw, Trash2, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { parseTaskWiseFile } from './taskWiseParser'
import type { TaskWiseAnalytics } from './taskWiseTypes'

export type { TaskWiseAnalytics } from './taskWiseTypes'

interface TaskWiseStatusProps {
  analytics: TaskWiseAnalytics | null
  onChange: (analytics: TaskWiseAnalytics | null) => void
}

// ── Overall Status Table ──────────────────────────────────────────────────────

function OverallStatusTable({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
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
          {data.map((row) => (
            <tr key={row.status} style={{ borderTop: '1px solid var(--divider)' }}>
              <td className="py-2 px-3 font-medium" style={{ color: 'var(--text-primary)' }}>{row.status}</td>
              <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--text-secondary)' }}>{row.count}</td>
            </tr>
          ))}
          <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--hover)' }}>
            <td className="py-2 px-3 font-bold" style={{ color: 'var(--text-primary)' }}>Total</td>
            <td className="py-2 px-3 text-right font-black" style={{ color: 'var(--accent)' }}>{total}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ── Parent-Wise Status Table ──────────────────────────────────────────────────

function ParentWiseTable({ data, statuses }: { 
  data: { parent: string; total: number; statusCounts: Record<string, number> }[]
  statuses: string[]
}) {
  const [expanded, setExpanded] = useState(true)
  
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 text-left"
        style={{ background: 'var(--hover)' }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Parent-Wise Status ({data.length} parents)
        </span>
        {expanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-x-auto"
          >
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr style={{ background: 'var(--hover)' }}>
                  <th className="text-left py-2 px-3 font-bold sticky left-0" style={{ color: 'var(--text-muted)', background: 'var(--hover)' }}>Parent</th>
                  <th className="text-right py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>Total</th>
                  {statuses.map(status => (
                    <th key={status} className="text-right py-2 px-3 font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {status}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.parent} style={{ borderTop: '1px solid var(--divider)' }}>
                    <td className="py-2 px-3 font-medium max-w-[200px] truncate sticky left-0" style={{ color: 'var(--text-primary)', background: 'var(--card-bg)' }} title={row.parent}>
                      {row.parent}
                    </td>
                    <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--accent)' }}>{row.total}</td>
                    {statuses.map(status => (
                      <td key={status} className="py-2 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>
                        {row.statusCounts[status] || 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── All Records Table ─────────────────────────────────────────────────────────

function AllRecordsTable({ records, columns }: { 
  records: Record<string, any>[]
  columns: string[]
}) {
  const [expanded, setExpanded] = useState(false)
  const displayRecords = expanded ? records : records.slice(0, 10)
  
  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between p-3" style={{ background: 'var(--hover)' }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          All Records ({records.length} total)
        </span>
        {records.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold px-2 py-1 rounded-lg"
            style={{ color: 'var(--accent)', background: 'rgba(99,102,241,0.1)' }}
          >
            {expanded ? 'Show Less' : `Show All ${records.length}`}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs min-w-[800px]">
          <thead className="sticky top-0">
            <tr style={{ background: 'var(--hover)' }}>
              <th className="text-left py-2 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>#</th>
              {columns.map(col => (
                <th key={col} className="text-left py-2 px-3 font-bold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRecords.map((record, idx) => (
              <tr key={idx} style={{ borderTop: '1px solid var(--divider)' }}>
                <td className="py-2 px-3 font-mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                {columns.map(col => (
                  <td key={col} className="py-2 px-3 max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }} title={record[col]}>
                    {record[col] || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Validation Summary ────────────────────────────────────────────────────────

function ValidationSummary({ analytics }: { analytics: TaskWiseAnalytics }) {
  const { validation } = analytics
  const allPassed = validation.totalRecordsMatch && validation.parentWiseTotalMatch && validation.overallStatusTotalMatch
  
  return (
    <div className={cn(
      "p-4 rounded-xl border",
      allPassed ? "bg-green-500/5 border-green-500/20" : "bg-amber-500/5 border-amber-500/20"
    )}>
      <div className="flex items-center gap-2 mb-3">
        {allPassed ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        )}
        <span className={cn("text-xs font-bold uppercase tracking-widest", allPassed ? "text-green-400" : "text-amber-400")}>
          Validation Summary
        </span>
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          {validation.totalRecordsMatch ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
          <span style={{ color: 'var(--text-secondary)' }}>Total records count: {analytics.rawRowCount}</span>
        </div>
        <div className="flex items-center gap-2">
          {validation.overallStatusTotalMatch ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
          <span style={{ color: 'var(--text-secondary)' }}>Overall status totals match</span>
        </div>
        {analytics.parentColumn && (
          <div className="flex items-center gap-2">
            {validation.parentWiseTotalMatch ? <CheckCircle className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-red-400" />}
            <span style={{ color: 'var(--text-secondary)' }}>Parent-wise totals match</span>
          </div>
        )}
        {validation.blankParentCount > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span style={{ color: 'var(--text-muted)' }}>{validation.blankParentCount} records with blank parent</span>
          </div>
        )}
        {validation.missingFields.length > 0 && (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span style={{ color: 'var(--text-muted)' }}>Missing columns: {validation.missingFields.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TaskWiseStatus({ analytics, onChange }: TaskWiseStatusProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ACCEPTED_EXT = ['.xlsx', '.xls', '.csv']

  const processFile = useCallback(async (file: File) => {
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
      const result = await parseTaskWiseFile(file)
      onChange(result)
      toast({ 
        title: 'Task-Wise Analysis Complete', 
        description: `${result.rawRowCount} records processed from ${file.name}` 
      })
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
    e.target.value = ''
  }, [processFile])

  const handleRemove = () => {
    onChange(null)
    setError(null)
  }

  return (
    <div className="space-y-5">
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
                  Drag & Drop Task Tracker File
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
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
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
            className="space-y-5"
          >
            {/* File info + Remove button */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{analytics.uploadedFileName}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {analytics.rawRowCount} records · {analytics.uniqueParents} parents · {analytics.uniqueStatuses.length} statuses
                </span>
              </div>
              <button
                onClick={handleRemove}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>

            {/* Detected Columns Info */}
            <div className="p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>
                Detected Columns
              </span>
              <div className="flex flex-wrap gap-1.5">
                {analytics.detectedColumns.map(col => (
                  <span 
                    key={col} 
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[10px] font-medium",
                      col === analytics.statusColumn ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                      col === analytics.parentColumn ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                      "bg-hover text-text-muted border border-border"
                    )}
                  >
                    {col}
                    {col === analytics.statusColumn && ' (Status)'}
                    {col === analytics.parentColumn && ' (Parent)'}
                  </span>
                ))}
              </div>
            </div>

            {/* Overall Status Summary */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <BarChart3 className="w-3.5 h-3.5" /> Overall Status Summary
              </h4>
              <OverallStatusTable data={analytics.overallStatus} />
            </div>

            {/* Parent-Wise Status */}
            {analytics.parentColumn && analytics.parentWiseStatus.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <ListTree className="w-3.5 h-3.5" /> Parent-Wise Status
                </h4>
                <ParentWiseTable data={analytics.parentWiseStatus} statuses={analytics.uniqueStatuses} />
              </div>
            )}

            {/* All Records */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Table2 className="w-3.5 h-3.5" /> All Records
              </h4>
              <AllRecordsTable records={analytics.allRecords} columns={analytics.detectedColumns} />
            </div>

            {/* Validation Summary */}
            <ValidationSummary analytics={analytics} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
