// src/modules/BugStatus/index.tsx
import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, X, AlertTriangle, RefreshCw, Trash2,
  Download, Printer, Bug, BarChart3, ListTree, Table2,
  CheckCircle, CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { parseBugStatusFile } from './bugStatusParser'
import type { BugStatusAnalytics } from './bugStatusTypes'

const MODULE_KEY = 'bug-status'

function getStatusColor(status: string, idx: number): string {
  const s = (status || '').toLowerCase()
  if (['closed', 'done', 'fixed', 'resolved', 'verified'].some(v => s.includes(v))) return '#10b981'
  if (['open', 'new', 'active'].some(v => s.includes(v))) return '#3b82f6'
  if (['in progress', 'in-progress', 'wip'].some(v => s.includes(v))) return '#8b5cf6'
  if (['blocked', 'failed', 'rejected', 'reopen'].some(v => s.includes(v))) return '#ef4444'
  if (['deferred', 'on hold', 'pending'].some(v => s.includes(v))) return '#f59e0b'
  const palette = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16']
  return palette[idx % palette.length]
}

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
          {data.map((row, idx) => (
            <tr key={row.status} style={{ borderTop: '1px solid var(--divider)' }}>
              <td className="py-2 px-3 font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(row.status, idx) }} />
                {row.status}
              </td>
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

function AllRecordsTable({ records, columns }: { records: Record<string, any>[]; columns: string[] }) {
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

function ValidationSummary({ analytics }: { analytics: BugStatusAnalytics }) {
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
      </div>
    </div>
  )
}

export function BugStatus() {
  const { toast } = useToast()
  const { canExport } = usePermissions()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [analytics, setAnalytics] = useState<BugStatusAnalytics | null>(null)
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
      const result = await parseBugStatusFile(file)
      setAnalytics(result)
      toast({ 
        title: 'Bug Status Analysis Complete', 
        description: `${result.rawRowCount} bugs processed from ${file.name}` 
      })
    } catch (err: any) {
      setError(err.message)
      toast({ variant: 'destructive', title: 'Parse Failed', description: err.message })
    } finally {
      setIsProcessing(false)
    }
  }, [toast])

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
    setAnalytics(null)
    setError(null)
  }

  const exportToExcel = async () => {
    if (!analytics) return
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    
    // Overall Status sheet
    const overallData = analytics.overallStatus.map(s => ({ Status: s.status, Count: s.count }))
    overallData.push({ Status: 'Total', Count: analytics.rawRowCount })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overallData), 'Overall Status')
    
    // Parent-wise sheet
    if (analytics.parentWiseStatus.length > 0) {
      const parentData = analytics.parentWiseStatus.map(p => ({
        Parent: p.parent,
        Total: p.total,
        ...p.statusCounts
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parentData), 'Parent-Wise Status')
    }
    
    // All Records sheet
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(analytics.allRecords), 'All Records')
    
    XLSX.writeFile(wb, `bug-status-report-${new Date().toISOString().split('T')[0]}.xlsx`)
    toast({ title: 'Export Complete', description: 'Bug status report exported to Excel' })
  }

  const printReport = () => {
    if (!analytics) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bug Status Report - ${analytics.uploadedFileName}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; max-width: 1000px; margin: 0 auto; }
          h1 { color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
          h2 { color: #475569; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
          th { background: #f8fafc; font-weight: 600; }
          .summary { display: flex; gap: 20px; margin: 20px 0; }
          .stat { background: #f8fafc; padding: 15px; border-radius: 8px; flex: 1; }
          .stat-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>🐛 Bug Status Report</h1>
        <p><strong>File:</strong> ${analytics.uploadedFileName} | <strong>Date:</strong> ${new Date(analytics.uploadedAt).toLocaleDateString()}</p>
        
        <div class="summary">
          <div class="stat"><div class="stat-value">${analytics.rawRowCount}</div><div class="stat-label">Total Bugs</div></div>
          <div class="stat"><div class="stat-value">${analytics.uniqueParents}</div><div class="stat-label">Unique Parents</div></div>
          <div class="stat"><div class="stat-value">${analytics.uniqueStatuses.length}</div><div class="stat-label">Status Types</div></div>
        </div>

        <h2>Overall Status Distribution</h2>
        <table>
          <tr><th>Status</th><th>Count</th><th>Percentage</th></tr>
          ${analytics.overallStatus.map(s => `<tr><td>${s.status}</td><td>${s.count}</td><td>${((s.count / analytics.rawRowCount) * 100).toFixed(1)}%</td></tr>`).join('')}
          <tr style="font-weight:bold;background:#f1f5f9"><td>Total</td><td>${analytics.rawRowCount}</td><td>100%</td></tr>
        </table>

        ${analytics.parentWiseStatus.length > 0 ? `
        <h2>Parent-Wise Status</h2>
        <table>
          <tr><th>Parent</th><th>Total</th>${analytics.uniqueStatuses.map(s => `<th>${s}</th>`).join('')}</tr>
          ${analytics.parentWiseStatus.map(p => `<tr><td>${p.parent}</td><td><strong>${p.total}</strong></td>${analytics.uniqueStatuses.map(s => `<td>${p.statusCounts[s] || 0}</td>`).join('')}</tr>`).join('')}
        </table>
        ` : ''}

        <p style="margin-top:40px;color:#94a3b8;font-size:12px;">Generated by Qaly AI Engine</p>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Bug className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>What's the Bug Status?</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Upload your bug tracker export to analyze status distribution</p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      {!analytics && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300',
            isDragging ? 'border-red-400 bg-red-500/5 scale-[1.01]' : 'border-border hover:border-red-400/40 hover:bg-hover',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />

          {isProcessing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 animate-spin text-red-400" />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Analyzing bug data...</span>
            </motion.div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                <Upload className="w-7 h-7 text-red-400" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Drag & Drop Bug Tracker Export</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  or click to <span className="text-red-400">Browse Excel File</span>
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
            className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mt-4"
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
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {/* File info + Actions */}
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <FileSpreadsheet className="w-5 h-5 text-red-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{analytics.uploadedFileName}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {analytics.rawRowCount} bugs · {analytics.uniqueParents} parents · {analytics.uniqueStatuses.length} statuses
                </span>
              </div>
              <div className="flex items-center gap-2">
                {canExport(MODULE_KEY) && (
                  <>
                    <button onClick={exportToExcel} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-green-500/10" style={{ color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <Download className="w-3 h-3" /> Export XLS
                    </button>
                    <button onClick={printReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-blue-500/10" style={{ color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' }}>
                      <Printer className="w-3 h-3" /> Print Report
                    </button>
                  </>
                )}
                <button onClick={handleRemove} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  <Trash2 className="w-3 h-3" /> Remove
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Bugs', val: analytics.rawRowCount, color: 'text-red-400', bg: 'bg-red-500/10' },
                { label: 'Unique Parents', val: analytics.uniqueParents, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { label: 'Status Types', val: analytics.uniqueStatuses.length, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Blank Parents', val: analytics.validation.blankParentCount, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              ].map(kpi => (
                <div key={kpi.label} className={`p-4 rounded-xl border border-border/30 ${kpi.bg}`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>{kpi.label}</span>
                  <span className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</span>
                </div>
              ))}
            </div>

            {/* Overall Status */}
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

            {/* Validation */}
            <ValidationSummary analytics={analytics} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
