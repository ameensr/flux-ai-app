// src/modules/QAWeeklyReport/components/ImportFromQAOHModal.tsx
// "Import From QAOH" modal — shared by Support & Exception Log and Release
// Testing Log. Fetches records from the QA Operations Hub (support_issues /
// release_tasks), applies date-range filtering, lets the user review and
// select rows, then calls onConfirm with the chosen records.
//
// Follows the same modal structure, styling, and interaction pattern as
// ColumnMappingModal / the existing Import from DUP workflow.

import React, { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Calendar, AlertCircle, CheckSquare, Square } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { SupportIssue } from '@/modules/SupportIssueTracker/types'
import type { ReleaseTask } from '@/modules/ReleaseTaskTracker/types'
import {
  fetchQAOHSupportIssues,
  fetchQAOHReleaseTasks,
  isWithinDateRange,
} from '../qaohImportMapping'

export type QAOHImportTableKey = 'support' | 'release'

interface ImportFromQAOHModalProps {
  open: boolean
  onClose: () => void
  tableKey: QAOHImportTableKey
  projectId: string
  onConfirm: (records: SupportIssue[] | ReleaseTask[]) => void
}

type AnyRecord = SupportIssue | ReleaseTask

function getReceivedDate(record: AnyRecord, tableKey: QAOHImportTableKey): string | null {
  if (tableKey === 'support') {
    return (record as SupportIssue).received_date || null
  }
  // release_tasks uses received_date_time (ISO timestamp)
  return (record as ReleaseTask).received_date_time || null
}

function getRecordLabel(record: AnyRecord, tableKey: QAOHImportTableKey): string {
  if (tableKey === 'support') {
    const s = record as SupportIssue
    return `${s.issue_id} — ${s.description?.slice(0, 60) || '(no description)'}`
  }
  const r = record as ReleaseTask
  return `${r.task_id} — ${r.description?.slice(0, 60) || '(no description)'}`
}

function getRecordSub(record: AnyRecord, tableKey: QAOHImportTableKey): string {
  if (tableKey === 'support') {
    const s = record as SupportIssue
    return `${s.tester_name || 'Unassigned'} · ${s.testing_status || ''} · ${s.received_date || ''}`
  }
  const r = record as ReleaseTask
  const dt = r.received_date_time ? r.received_date_time.split('T')[0] : ''
  return `${r.assigned_to_name || 'Unassigned'} · ${r.task_status || ''} · ${dt}`
}

export const ImportFromQAOHModal: React.FC<ImportFromQAOHModalProps> = ({
  open,
  onClose,
  tableKey,
  projectId,
  onConfirm,
}) => {
  useBodyScrollLock(open)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [allRecords, setAllRecords] = useState<AnyRecord[]>([])
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirming, setConfirming] = useState(false)

  const title = tableKey === 'support'
    ? 'Import From QAOH — Support Issues'
    : 'Import From QAOH — Release Tasks'

  const sourceLabel = tableKey === 'support'
    ? 'Support Issue Register'
    : 'Release Task Register'

  // Fetch records whenever the modal opens or projectId changes
  const loadRecords = useCallback(async () => {
    if (!projectId) {
      setError('No project selected. Select a project for this QA report before importing.')
      return
    }
    setLoading(true)
    setError(null)
    setAllRecords([])
    setSelected(new Set())
    try {
      const records: AnyRecord[] = tableKey === 'support'
        ? await fetchQAOHSupportIssues(projectId)
        : await fetchQAOHReleaseTasks(projectId)
      setAllRecords(records)
    } catch (e: any) {
      setError(e?.message || 'Failed to load records from QA Operations Hub.')
    } finally {
      setLoading(false)
    }
  }, [projectId, tableKey])

  useEffect(() => {
    if (open) {
      setDateFrom('')
      setDateTo('')
      loadRecords()
    }
  }, [open, loadRecords])

  // Filtered records based on date range
  const filtered = allRecords.filter(r =>
    isWithinDateRange(getReceivedDate(r, tableKey), dateFrom || null, dateTo || null),
  )

  // Date range validation
  const dateRangeInvalid =
    !!dateFrom && !!dateTo && new Date(dateFrom) > new Date(dateTo)

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(r => r.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleConfirm = async () => {
    const chosen = filtered.filter(r => selected.has(r.id))
    if (!chosen.length) return
    setConfirming(true)
    try {
      onConfirm(chosen as SupportIssue[] | ReleaseTask[])
    } finally {
      setConfirming(false)
    }
  }

  const resetDates = () => {
    setDateFrom('')
    setDateTo('')
  }

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[86] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-6 py-4 shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
                  >
                    <Upload className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {title}
                    </h2>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Source: {sourceLabel} · Project-scoped
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl transition-all"
                  style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Date range filters */}
              <div
                className="px-6 py-3 shrink-0 flex items-end gap-3 flex-wrap"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-elevated)' }}
              >
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Received Date From
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <Calendar className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={e => setDateFrom(e.target.value)}
                      className="text-xs bg-transparent focus:outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Received Date To
                  </label>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <Calendar className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={e => setDateTo(e.target.value)}
                      className="text-xs bg-transparent focus:outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    onClick={resetDates}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                    style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Clear Dates
                  </button>
                )}
                {dateRangeInvalid && (
                  <span className="flex items-center gap-1 text-[11px] text-red-400">
                    <AlertCircle className="w-3 h-3" /> "From" must be before "To"
                  </span>
                )}
              </div>

              {/* Record list */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                {loading && (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
                  </div>
                )}

                {!loading && error && (
                  <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{error}</p>
                  </div>
                )}

                {!loading && !error && allRecords.length === 0 && (
                  <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    No records found in {sourceLabel} for this project.
                  </p>
                )}

                {!loading && !error && allRecords.length > 0 && filtered.length === 0 && (
                  <p className="text-xs text-center py-10" style={{ color: 'var(--text-muted)' }}>
                    No records match the selected date range.
                    {(dateFrom || dateTo) && (
                      <> <button onClick={resetDates} className="underline ml-1">Clear dates</button> to see all {allRecords.length} records.</>
                    )}
                  </p>
                )}

                {!loading && !error && filtered.length > 0 && (
                  <>
                    {/* Select-all row */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={toggleAll}
                        className="flex items-center gap-2 text-xs font-semibold transition-all"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {selected.size === filtered.length && filtered.length > 0
                          ? <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                          : <Square className="w-4 h-4" />
                        }
                        {selected.size === filtered.length && filtered.length > 0
                          ? 'Deselect all'
                          : `Select all (${filtered.length})`
                        }
                      </button>
                      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {selected.size} of {filtered.length} selected
                        {allRecords.length !== filtered.length && ` (${allRecords.length} total, filtered by date)`}
                      </span>
                    </div>

                    {/* Record rows */}
                    <div className="flex flex-col gap-1.5">
                      {filtered.map(record => {
                        const isSelected = selected.has(record.id)
                        return (
                          <button
                            key={record.id}
                            onClick={() => toggleOne(record.id)}
                            className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all"
                            style={{
                              background: isSelected ? 'rgba(212,175,55,0.08)' : 'var(--surface-elevated)',
                              border: `1px solid ${isSelected ? 'rgba(212,175,55,0.3)' : 'var(--border)'}`,
                            }}
                          >
                            <div className="mt-0.5 shrink-0">
                              {isSelected
                                ? <CheckSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                : <Square className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {getRecordLabel(record, tableKey)}
                              </p>
                              <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                                {getRecordSub(record, tableKey)}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div
                className="shrink-0 px-6 py-4 flex items-center justify-between gap-3"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}
              >
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {selected.size > 0
                    ? `${selected.size} record${selected.size !== 1 ? 's' : ''} will be imported`
                    : 'Select records to import'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={selected.size === 0 || confirming || dateRangeInvalid}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    {confirming ? 'Importing…' : `Import ${selected.size > 0 ? selected.size : ''} Record${selected.size !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
