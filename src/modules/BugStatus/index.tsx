// src/modules/BugStatus/index.tsx
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, FileSpreadsheet, X, AlertTriangle, RefreshCw, Trash2,
  Download, Printer, Bug, BarChart3, ListTree, Table2,
  CheckCircle, AlertCircle, Search, Filter, ExternalLink,
  Layers, Activity, FolderTree, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { GlassCard } from '@/components/ui/GlassCard'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { pressTap, springSettle, springMove } from '@/lib/motion'
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

function isClosedStatus(status: string): boolean {
  const s = (status || '').toLowerCase()
  return ['closed', 'done', 'fixed', 'resolved', 'verified'].some(v => s.includes(v))
}

function withAlpha(hex: string, alpha: number): string {
  const raw = hex.replace('#', '')
  const n = parseInt(raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

function SectionHeading({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint?: string }) {
  return (
    <div className="flex items-end justify-between gap-3 mb-3">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid var(--glass-border)' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h3 className="font-clash font-bold text-base tracking-tight" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          {hint && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
        </div>
      </div>
    </div>
  )
}

function OverallStatusTable({ data }: { data: { status: string; count: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0) || 1

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <div className="px-4 pt-4 pb-3">
        <div className="h-3 rounded-full overflow-hidden flex" style={{ background: 'var(--hover)' }}>
          {data.map((row, idx) => {
            const pct = (row.count / total) * 100
            if (pct <= 0) return null
            return (
              <motion.div
                key={row.status}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={springMove}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{ backgroundColor: getStatusColor(row.status, idx) }}
                title={`${row.status}: ${row.count}`}
              />
            )
          })}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {data.map((row, idx) => (
            <span
              key={row.status}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold"
              style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(row.status, idx) }} />
              {row.status}
            </span>
          ))}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderTop: '1px solid var(--divider)' }}>
            <th className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Status</th>
            <th className="text-right py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Share</th>
            <th className="text-right py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const pct = (row.count / total) * 100
            const color = getStatusColor(row.status, idx)
            return (
              <tr key={row.status} className="group" style={{ borderTop: '1px solid var(--divider)' }}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 10px ${withAlpha(color, 0.55)}` }} />
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{row.status}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end gap-3">
                    <div className="hidden sm:block w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--hover)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-xs tabular-nums w-12 text-right" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-clash font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{row.count}</td>
              </tr>
            )
          })}
          <tr style={{ borderTop: '1px solid var(--border)', background: 'var(--hover)' }}>
            <td className="py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total</td>
            <td className="py-3 px-4 text-right text-xs" style={{ color: 'var(--text-muted)' }}>100%</td>
            <td className="py-3 px-4 text-right font-clash font-black tabular-nums" style={{ color: 'var(--accent)' }}>{data.reduce((s, d) => s + d.count, 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function ParentWiseCards({ data, statuses, parentColumn, onSelectParent }: {
  data: { parent: string; total: number; statusCounts: Record<string, number> }[]
  statuses: string[]
  parentColumn?: string | null
  onSelectParent?: (parent: string) => void
}) {
  const [query, setQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const q = query.trim().toLowerCase()

  const statusParentCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    statuses.forEach(status => {
      counts[status] = data.filter(row => (row.statusCounts[status] || 0) > 0).length
    })
    return counts
  }, [data, statuses])

  const filtered = useMemo(() => {
    return data.filter(row => {
      if (selectedStatus) {
        if (!((row.statusCounts[selectedStatus] || 0) > 0)) {
          return false
        }
      }
      if (q) {
        const matchesParent = row.parent.toLowerCase().includes(q)
        const matchesStatus = statuses.some(
          status => status.toLowerCase().includes(q) && (row.statusCounts[status] || 0) > 0,
        )
        if (!matchesParent && !matchesStatus) return false
      }
      return true
    })
  }, [data, q, statuses, selectedStatus])

  return (
    <div className="space-y-3.5">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          autoComplete="off"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={selectedStatus ? `Search within parents having status "${selectedStatus}"…` : `Search ${parentColumn || 'parents'} live or filter by status…`}
          className="w-full h-12 pl-11 pr-11 rounded-2xl text-sm outline-none transition-shadow"
          style={{
            background: 'color-mix(in srgb, var(--surface) 72%, transparent)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)',
            boxShadow: '0 12px 40px -20px rgba(0,0,0,0.45)',
            backdropFilter: 'blur(20px) saturate(180%)',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'var(--hover)' }}
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <div className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider shrink-0 mr-1" style={{ color: 'var(--text-muted)' }}>
          <Filter className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
          Status:
        </div>
        <button
          type="button"
          onClick={() => setSelectedStatus(null)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 cursor-pointer",
            !selectedStatus
              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
              : "bg-[var(--hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
          )}
        >
          <span>All</span>
          <span className="text-[10px] opacity-75 tabular-nums">({data.length})</span>
        </button>
        {statuses.map((status, idx) => {
          const isSelected = selectedStatus === status
          const color = getStatusColor(status, idx)
          const count = statusParentCounts[status] || 0
          if (count === 0) return null
          return (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(isSelected ? null : status)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] transition-all shrink-0 cursor-pointer",
                isSelected
                  ? "font-medium text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)]"
              )}
              style={{
                background: isSelected ? withAlpha(color, 0.12) : 'var(--hover)',
                border: `1px solid ${isSelected ? withAlpha(color, 0.45) : 'var(--border)'}`,
              }}
              title={`Filter parents with ${status} status (${count} parents)`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span>{status}</span>
              <span
                className="text-[10px] font-mono tabular-nums opacity-75"
                style={{ color: isSelected ? color : 'inherit' }}
              >
                {count}
              </span>
              {isSelected && (
                <X className="w-3 h-3 ml-0.5 opacity-70 hover:opacity-100" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between px-0.5 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {selectedStatus || q
              ? `${filtered.length} of ${data.length} parent ${filtered.length === 1 ? 'group' : 'groups'} matching`
              : `${data.length} parent ${data.length === 1 ? 'group' : 'groups'}`}
          </span>
          {selectedStatus && (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                background: withAlpha(getStatusColor(selectedStatus, statuses.indexOf(selectedStatus)), 0.1),
                color: getStatusColor(selectedStatus, statuses.indexOf(selectedStatus)),
                border: `1px solid ${withAlpha(getStatusColor(selectedStatus, statuses.indexOf(selectedStatus)), 0.25)}`,
              }}
            >
              <span>Status: {selectedStatus}</span>
              <button
                type="button"
                onClick={() => setSelectedStatus(null)}
                className="hover:opacity-70 p-0.5 rounded cursor-pointer"
                aria-label="Clear status filter"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
        {(selectedStatus || query) && (
          <button
            type="button"
            onClick={() => { setSelectedStatus(null); setQuery('') }}
            className="text-[11px] font-medium hover:underline cursor-pointer"
            style={{ color: 'var(--accent)' }}
          >
            Reset all filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-1">
        <AnimatePresence>
          {filtered.map(row => (
            <motion.div
              key={row.parent}
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              whileHover={{
                y: -2.5,
                boxShadow: '0 12px 28px -6px rgba(0,0,0,0.32), 0 0 0 1px var(--glass-border)',
              }}
              whileTap={pressTap}
              transition={springSettle}
              onClick={() => onSelectParent?.(row.parent)}
              className="group relative overflow-hidden rounded-xl border transition-all duration-200 flex flex-col justify-between cursor-pointer"
              style={{
                background: 'var(--card-bg)',
                borderColor: 'var(--border)',
                boxShadow: '0 2px 8px -2px rgba(0,0,0,0.12)',
              }}
              title={`Click to view bugs for ${row.parent}`}
            >
              <div
                className="absolute inset-x-0 top-0 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'linear-gradient(90deg, transparent, var(--glass-border), transparent)' }}
              />

              <div className="p-3.5 flex flex-col gap-2.5 justify-between h-full">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="min-w-0 flex items-center gap-2">
                    <FolderTree className="w-3.5 h-3.5 shrink-0 transition-colors group-hover:text-[var(--accent)]" style={{ color: 'var(--text-muted)' }} />
                    <h4 className="font-semibold text-xs leading-snug truncate" style={{ color: 'var(--text-primary)' }} title={row.parent}>
                      {row.parent}
                    </h4>
                    <ExternalLink className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-70 transition-opacity shrink-0 ml-0.5" />
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    <span className="text-xs font-mono font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {row.total}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                      {row.total === 1 ? 'bug' : 'bugs'}
                    </span>
                  </div>
                </div>

                <div className="h-1 rounded-full overflow-hidden flex" style={{ background: 'var(--hover)' }}>
                  {statuses.map((status, idx) => {
                    const count = row.statusCounts[status] || 0
                    if (!count || !row.total) return null
                    return (
                      <div
                        key={status}
                        className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                        style={{ width: `${(count / row.total) * 100}%`, backgroundColor: getStatusColor(status, idx) }}
                        title={`${status}: ${count} (${Math.round((count / row.total) * 100)}%)`}
                      />
                    )
                  })}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {statuses.map((status, idx) => {
                    const count = row.statusCounts[status] || 0
                    if (!count) return null
                    const color = getStatusColor(status, idx)
                    const isCurrentFilter = selectedStatus === status
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedStatus(isCurrentFilter ? null : status)
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] transition-all text-left cursor-pointer",
                          isCurrentFilter
                            ? "font-medium"
                            : "hover:bg-[var(--hover)]"
                        )}
                        style={{
                          background: isCurrentFilter ? withAlpha(color, 0.14) : 'var(--hover)',
                          border: `1px solid ${isCurrentFilter ? withAlpha(color, 0.45) : 'transparent'}`,
                          color: isCurrentFilter ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                        title={`Filter by ${status} (${count} in this parent)`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="truncate max-w-[110px]">{status}</span>
                        <span
                          className="font-mono text-[10px] font-semibold tabular-nums ml-0.5"
                          style={{ color: isCurrentFilter ? color : 'var(--text-muted)' }}
                        >
                          {count}
                        </span>
                      </button>
                    )
                  })}
                  {row.total === 0 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>No bugs</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div
          className="rounded-2xl py-10 px-6 text-center"
          style={{
            background: 'var(--card-bg)',
            border: '1px dashed var(--border)',
          }}
        >
          <Search className="w-5 h-5 mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            No parents match {selectedStatus ? `status "${selectedStatus}"` : ''}{selectedStatus && query ? ' and ' : ''}{query ? `“${query}”` : ''}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Try selecting a different status or clearing your search.</p>
          {(selectedStatus || query) && (
            <button
              type="button"
              onClick={() => { setSelectedStatus(null); setQuery('') }}
              className="mt-3.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
              style={{ background: 'var(--hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
            >
              Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AllRecordsTable({ records, columns, statusColumn }: { records: Record<string, any>[]; columns: string[]; statusColumn: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const displayRecords = expanded ? records : records.slice(0, 10)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--hover)' }}>
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Showing {displayRecords.length} of {records.length}
        </span>
        {records.length > 10 && (
          <motion.button
            whileTap={pressTap}
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--accent-fg)', background: 'var(--accent)' }}
          >
            {expanded ? 'Show less' : `Show all ${records.length}`}
          </motion.button>
        )}
      </div>

      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs min-w-[800px]">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)', background: 'var(--surface-elevated)' }}>#</th>
              {columns.map(col => (
                <th key={col} className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap" style={{ color: 'var(--text-muted)', background: 'var(--surface-elevated)' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRecords.map((record, idx) => (
              <tr key={idx} className="hover:bg-[var(--hover)] transition-colors" style={{ borderTop: '1px solid var(--divider)' }}>
                <td className="py-2.5 px-3 font-mono tabular-nums" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                {columns.map(col => {
                  const value = record[col]
                  const isStatus = statusColumn && col === statusColumn
                  if (isStatus && value) {
                    const colorIdx = columns.indexOf(col)
                    const color = getStatusColor(String(value), colorIdx)
                    return (
                      <td key={col} className="py-2.5 px-3">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                          style={{ background: withAlpha(color, 0.12), color, border: `1px solid ${withAlpha(color, 0.28)}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                          {value}
                        </span>
                      </td>
                    )
                  }
                  return (
                    <td key={col} className="py-2.5 px-3 max-w-[220px] truncate" style={{ color: 'var(--text-secondary)' }} title={value}>
                      {value || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ParentBugsModal({
  isOpen,
  onClose,
  parentName,
  records,
  columns,
  statusColumn,
  parentColumn,
  statuses,
  fileName,
}: {
  isOpen: boolean
  onClose: () => void
  parentName: string
  records: Record<string, any>[]
  columns: string[]
  statusColumn: string | null
  parentColumn: string | null
  statuses: string[]
  fileName: string
}) {
  useBodyScrollLock(isOpen)
  const [modalQuery, setModalQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setModalQuery('')
      setFilterStatus(null)
    }
  }, [isOpen, parentName])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const q = modalQuery.trim().toLowerCase()

  const parentStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    if (statusColumn) {
      records.forEach(r => {
        const st = String(r[statusColumn] || '')
        if (st) counts[st] = (counts[st] || 0) + 1
      })
    }
    return counts
  }, [records, statusColumn])

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filterStatus && statusColumn) {
        if (String(record[statusColumn] || '') !== filterStatus) return false
      }
      if (q) {
        const matchesAny = columns.some(col => {
          const val = record[col]
          return val && String(val).toLowerCase().includes(q)
        })
        if (!matchesAny) return false
      }
      return true
    })
  }, [records, columns, q, filterStatus, statusColumn])

  const exportParentRecords = async () => {
    const XLSX = await import('xlsx')
    const wb = XLSX.utils.book_new()
    const safeSheetName = (parentName || 'Bugs').slice(0, 31).replace(/[\\/?*[\]]/g, '_')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records), safeSheetName)
    XLSX.writeFile(wb, `${safeSheetName.toLowerCase()}-bugs-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const isBlankParent = parentName === 'No Parent Assigned'

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 overscroll-contain">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={springSettle}
            className="relative z-10 w-full max-w-4xl max-h-[85vh] rounded-xl border flex flex-col overflow-hidden shadow-2xl"
            style={{
              background: 'var(--surface-elevated)',
              borderColor: 'var(--border)',
            }}
          >
            {/* Minimal Header */}
            <div className="px-4 sm:px-5 py-3.5 border-b flex items-center justify-between gap-3" style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: isBlankParent ? 'rgba(245,158,11,0.12)' : 'var(--hover)',
                    border: `1px solid ${isBlankParent ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                  }}
                >
                  {isBlankParent ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <FolderTree className="w-4 h-4 text-[var(--accent)]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate" title={parentName}>
                      {parentName}
                    </h3>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--hover)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                      {records.length} {records.length === 1 ? 'bug' : 'bugs'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    {isBlankParent
                      ? `Unassigned parent tickets from ${fileName}`
                      : `${parentColumn || 'Parent'} group · ${fileName}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={exportParentRecords}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                  title="Export these bugs to Excel"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors hover:bg-[var(--hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Minimal Filter & Search Bar */}
            <div className="px-4 sm:px-5 py-2 border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'var(--divider)', background: 'var(--hover)' }}>
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 max-w-full sm:max-w-[60%]">
                <button
                  type="button"
                  onClick={() => setFilterStatus(null)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer shrink-0",
                    !filterStatus
                      ? "bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                  )}
                >
                  All ({records.length})
                </button>
                {statuses.map((status, idx) => {
                  const count = parentStatusCounts[status] || 0
                  if (!count) return null
                  const color = getStatusColor(status, idx)
                  const isAct = filterStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(isAct ? null : status)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer shrink-0",
                        isAct ? "font-medium" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                      )}
                      style={{
                        background: isAct ? withAlpha(color, 0.14) : 'transparent',
                        border: `1px solid ${isAct ? withAlpha(color, 0.45) : 'transparent'}`,
                        color: isAct ? 'var(--text-primary)' : undefined,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span>{status}</span>
                      <span className="font-mono text-[10px]" style={{ color: isAct ? color : 'var(--text-muted)' }}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="relative flex-1 min-w-[140px] sm:max-w-56 ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={modalQuery}
                  onChange={e => setModalQuery(e.target.value)}
                  placeholder="Filter bugs…"
                  className="w-full h-7 pl-7 pr-7 rounded-md text-xs outline-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
                {modalQuery && (
                  <button
                    type="button"
                    onClick={() => setModalQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded flex items-center justify-center text-[var(--text-muted)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Minimal Records Table */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[50vh] overscroll-contain">
              <table className="w-full text-xs min-w-[650px]">
                <thead className="sticky top-0 z-10">
                  <tr style={{ background: 'var(--surface-elevated)', borderBottom: '1px solid var(--divider)' }}>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] w-10">#</th>
                    {columns.map(col => (
                      <th key={col} className="text-left py-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record, idx) => (
                    <tr key={idx} className="hover:bg-[var(--hover)] transition-colors" style={{ borderTop: '1px solid var(--divider)' }}>
                      <td className="py-2 px-3 font-mono text-[11px] text-[var(--text-muted)]">{idx + 1}</td>
                      {columns.map(col => {
                        const value = record[col]
                        const isStatus = statusColumn && col === statusColumn
                        const isParent = parentColumn && col === parentColumn
                        if (isStatus && value) {
                          const colorIdx = columns.indexOf(col)
                          const color = getStatusColor(String(value), colorIdx)
                          return (
                            <td key={col} className="py-2 px-3">
                              <span
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium"
                                style={{ background: withAlpha(color, 0.12), color, border: `1px solid ${withAlpha(color, 0.25)}` }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                {value}
                              </span>
                            </td>
                          )
                        }
                        if (isParent && (!value || String(value).trim() === '' || String(value).trim() === 'No Parent Assigned')) {
                          return (
                            <td key={col} className="py-2 px-3">
                              <span className="italic text-[10px] text-amber-400">
                                (Unassigned)
                              </span>
                            </td>
                          )
                        }
                        return (
                          <td key={col} className="py-2 px-3 max-w-[220px] truncate text-[var(--text-secondary)]" title={value}>
                            {value || '—'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="py-8 text-center text-xs text-[var(--text-muted)]">
                        No bugs found matching current filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Minimal Footer */}
            <div className="px-4 sm:px-5 py-2.5 border-t flex items-center justify-between text-xs text-[var(--text-muted)]" style={{ borderColor: 'var(--divider)', background: 'var(--card-bg)' }}>
              <span>
                Showing {filteredRecords.length} of {records.length} {records.length === 1 ? 'bug' : 'bugs'}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                style={{ background: 'var(--hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

function ValidationSummary({
  analytics,
  onOpenBlankParents,
}: {
  analytics: BugStatusAnalytics
  onOpenBlankParents?: () => void
}) {
  const { validation } = analytics
  const allPassed = validation.totalRecordsMatch && validation.parentWiseTotalMatch && validation.overallStatusTotalMatch

  const checks = [
    { ok: validation.totalRecordsMatch, label: `Records counted · ${analytics.rawRowCount}` },
    { ok: validation.overallStatusTotalMatch, label: 'Overall totals match' },
    ...(analytics.parentColumn ? [{ ok: validation.parentWiseTotalMatch, label: 'Parent totals match' }] : []),
  ]

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: allPassed ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
        border: `1px solid ${allPassed ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.22)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        {allPassed ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-amber-400" />
        )}
        <span className={cn('text-[11px] font-bold uppercase tracking-[0.16em]', allPassed ? 'text-emerald-400' : 'text-amber-400')}>
          Data integrity
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {checks.map(check => (
          <span
            key={check.label}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {check.ok ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-red-400" />}
            {check.label}
          </span>
        ))}
        {validation.blankParentCount > 0 && (
          <motion.button
            whileTap={pressTap}
            type="button"
            onClick={onOpenBlankParents}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.32)',
              color: '#f59e0b',
            }}
            title="Click to view bugs with blank parents in a popup"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{validation.blankParentCount} blank parent{validation.blankParentCount === 1 ? '' : 's'}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold ml-0.5">
              View
            </span>
          </motion.button>
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
  const [selectedParentForModal, setSelectedParentForModal] = useState<string | null>(null)
  const [cachedModalData, setCachedModalData] = useState<{ parentName: string; records: Record<string, any>[] }>({
    parentName: '',
    records: [],
  })

  const parentModalRecords = useMemo(() => {
    if (!analytics || !selectedParentForModal || !analytics.parentColumn) return []
    const col = analytics.parentColumn
    if (selectedParentForModal === 'No Parent Assigned') {
      return analytics.allRecords.filter(record => {
        const val = record[col]
        return !val || String(val).trim() === '' || String(val).trim() === 'No Parent Assigned'
      })
    }
    return analytics.allRecords.filter(record => {
      const val = record[col]
      return val && String(val).trim().toLowerCase() === selectedParentForModal.trim().toLowerCase()
    })
  }, [analytics, selectedParentForModal])

  useEffect(() => {
    if (selectedParentForModal && parentModalRecords.length > 0) {
      setCachedModalData({
        parentName: selectedParentForModal,
        records: parentModalRecords,
      })
    }
  }, [selectedParentForModal, parentModalRecords])

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
        description: `${result.rawRowCount} bugs processed from ${file.name}`,
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

    const overallData = analytics.overallStatus.map(s => ({ Status: s.status, Count: s.count }))
    overallData.push({ Status: 'Total', Count: analytics.rawRowCount })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(overallData), 'Overall Status')

    if (analytics.parentWiseStatus.length > 0) {
      const parentData = analytics.parentWiseStatus.map(p => ({
        Parent: p.parent,
        Total: p.total,
        ...p.statusCounts,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(parentData), 'Parent-Wise Status')
    }

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
        <h1>Bug Status Report</h1>
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

  const closedCount = analytics
    ? analytics.overallStatus.filter(s => isClosedStatus(s.status)).reduce((sum, s) => sum + s.count, 0)
    : 0
  const closureRate = analytics && analytics.rawRowCount > 0
    ? Math.round((closedCount / analytics.rawRowCount) * 1000) / 10
    : 0

  const kpis = analytics ? [
    { label: 'Total bugs', val: analytics.rawRowCount, icon: Bug, tint: '#ef4444' },
    { label: 'Parents', val: analytics.uniqueParents, icon: FolderTree, tint: '#8b5cf6' },
    { label: 'Closure', val: `${closureRate}%`, icon: Activity, tint: '#10b981' },
    { label: 'Statuses', val: analytics.uniqueStatuses.length, icon: Layers, tint: '#6366f1' },
  ] : []

  return (
    <div className="relative py-6 sm:py-10 max-w-6xl mx-auto">
      <div
        className="pointer-events-none absolute -top-24 -left-16 w-80 h-80 rounded-full blur-[90px] opacity-25"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute top-40 -right-10 w-72 h-72 rounded-full blur-[90px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, transparent 70%)' }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.16em] mb-3"
              style={{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 28%, transparent)' }}
            >
              Defect analytics
            </div>
            <h1 className="font-clash font-black text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight flex items-center gap-2.5">
              <Bug className="w-8 h-8 text-accent-gold" />
              What&apos;s the Bug Status?
            </h1>
            <p className="text-sm text-text-secondary mt-1.5 max-w-xl">
              Drop a tracker export and instantly see status mix, parent groups, and a clean record table.
            </p>
          </div>
        </div>

        {!analytics && (
          <GlassCard hoverEffect={false} className="p-0">
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative rounded-2xl p-10 sm:p-14 flex flex-col items-center justify-center gap-5 cursor-pointer transition-all duration-200',
                isDragging && 'scale-[1.01]',
                isProcessing && 'pointer-events-none opacity-60',
              )}
              style={{
                background: isDragging ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                boxShadow: isDragging ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--glass-border)',
              }}
            >
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileSelect} />

              {isProcessing ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
                  <RefreshCw className="w-9 h-9 animate-spin" style={{ color: 'var(--accent)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Analyzing bug data…</span>
                </motion.div>
              ) : (
                <>
                  <div
                    className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(180deg, color-mix(in srgb, var(--accent) 22%, transparent), color-mix(in srgb, var(--accent) 8%, transparent))',
                      border: '1px solid var(--glass-border)',
                      boxShadow: '0 12px 40px color-mix(in srgb, var(--accent) 18%, transparent)',
                    }}
                  >
                    <Upload className="w-7 h-7" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="text-center">
                    <p className="font-clash text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                      Drop your bug tracker export
                    </p>
                    <p className="text-sm mt-1.5" style={{ color: 'var(--text-muted)' }}>
                      or click to <span className="font-semibold" style={{ color: 'var(--accent)' }}>browse</span> · Excel or CSV, up to 50MB
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {ACCEPTED_EXT.map(ext => (
                      <span
                        key={ext}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider"
                        style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                      >
                        {ext.replace('.', '')}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3.5 rounded-2xl mt-4"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)' }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-sm text-red-400">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto text-red-400 p-1 rounded-lg hover:bg-red-500/10">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {analytics && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={springMove} className="space-y-6">
              <GlassCard hoverEffect={false} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--accent) 14%, transparent)', border: '1px solid var(--glass-border)' }}
                  >
                    <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{analytics.uploadedFileName}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {analytics.rawRowCount} bugs · {analytics.uniqueParents} parents · {analytics.uniqueStatuses.length} statuses
                      {analytics.uploadedAt ? ` · ${new Date(analytics.uploadedAt).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {canExport(MODULE_KEY) && (
                      <>
                        <motion.button
                          whileTap={pressTap}
                          onClick={exportToExcel}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                        >
                          <Download className="w-3.5 h-3.5" /> Export
                        </motion.button>
                        <motion.button
                          whileTap={pressTap}
                          onClick={printReport}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'var(--hover)' }}
                        >
                          <Printer className="w-3.5 h-3.5" /> Print
                        </motion.button>
                      </>
                    )}
                    <motion.button
                      whileTap={pressTap}
                      onClick={handleRemove}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold"
                      style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </motion.button>
                  </div>
                </div>
              </GlassCard>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {kpis.map((kpi, i) => {
                  const Icon = kpi.icon
                  return (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...springSettle, delay: i * 0.04 }}
                      className="relative overflow-hidden rounded-2xl p-4"
                      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
                    >
                      <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${withAlpha(kpi.tint, 0.7)}, transparent)` }} />
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] uppercase font-bold tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>{kpi.label}</span>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: withAlpha(kpi.tint, 0.12) }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: kpi.tint }} />
                        </div>
                      </div>
                      <span className="font-clash text-3xl font-black tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>{kpi.val}</span>
                    </motion.div>
                  )
                })}
              </div>

              <div>
                <SectionHeading icon={BarChart3} title="Overall status" hint="Distribution across every ticket in the file" />
                <OverallStatusTable data={analytics.overallStatus} />
              </div>

              {analytics.parentColumn && analytics.parentWiseStatus.length > 0 && (
                <div>
                  <SectionHeading icon={ListTree} title="Parent-wise status" hint={`Grouped by ${analytics.parentColumn}`} />
                  <ParentWiseCards
                    data={analytics.parentWiseStatus}
                    statuses={analytics.uniqueStatuses}
                    parentColumn={analytics.parentColumn}
                    onSelectParent={(parent) => setSelectedParentForModal(parent)}
                  />
                </div>
              )}

              <div>
                <SectionHeading icon={Table2} title="All records" hint="Raw rows from the uploaded export" />
                <AllRecordsTable records={analytics.allRecords} columns={analytics.detectedColumns} statusColumn={analytics.statusColumn} />
              </div>

              <ValidationSummary
                analytics={analytics}
                onOpenBlankParents={() => setSelectedParentForModal('No Parent Assigned')}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {analytics && (
          <ParentBugsModal
            isOpen={Boolean(selectedParentForModal)}
            onClose={() => setSelectedParentForModal(null)}
            parentName={selectedParentForModal || cachedModalData.parentName}
            records={selectedParentForModal ? parentModalRecords : cachedModalData.records}
            columns={analytics.detectedColumns}
            statusColumn={analytics.statusColumn}
            parentColumn={analytics.parentColumn}
            statuses={analytics.uniqueStatuses}
            fileName={analytics.uploadedFileName}
          />
        )}
      </div>
    </div>
  )
}
