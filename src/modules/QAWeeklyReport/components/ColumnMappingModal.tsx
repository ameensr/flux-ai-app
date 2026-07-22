// src/modules/QAWeeklyReport/components/ColumnMappingModal.tsx
// "Import from DUP" column mapping interface. Shown when importing QA Daily
// Update data into the QA Report, letting users map each dynamic DUP column
// to an existing QA Report column, create a new one, or skip it — using
// stable column IDs so a later rename in the Daily Update module never
// breaks the mapping. Choices can be saved as the project's (or
// organization's) default mapping for future imports.

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, Upload } from 'lucide-react'
import type { ColumnConfig, DailyReportTableKey } from '@/modules/DailyUpdateReport/types'
import { qaFieldsForTable, buildDefaultMapping, fetchSavedMapping, saveMapping, qaReportEligibleColumns, type MappingEntry, type MappingAction } from '../dupImportMapping'

interface ColumnMappingModalProps {
  open: boolean
  onClose: () => void
  tableKey: DailyReportTableKey
  columns: ColumnConfig[]
  projectId: string | null
  onConfirm: (mapping: Record<string, MappingEntry>, remember: boolean) => void
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({ open, onClose, tableKey, columns, projectId, onConfirm }) => {
  const [entries, setEntries] = useState<MappingEntry[]>([])
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const qaFields = qaFieldsForTable(tableKey)
  // Columns with "Include in QA Report" disabled never appear here — they're
  // excluded from Import from DUP entirely. Referenced separately from
  // `columns` (which stays the full list) so lookups elsewhere are unaffected.
  const eligibleColumns = qaReportEligibleColumns(columns)
  const excludedCount = columns.length - eligibleColumns.length

  useEffect(() => {
    if (!open) return
    setLoading(true)
      ; (async () => {
        const saved = await fetchSavedMapping(tableKey, projectId)
        const defaults = buildDefaultMapping(columns, tableKey)
        const merged = defaults.map(d => saved?.[d.dupColumnId] ? { ...d, ...saved[d.dupColumnId], internalKey: d.internalKey } : d)
        setEntries(merged)
        setLoading(false)
      })()
  }, [open, tableKey, projectId, columns])

  const updateEntry = (dupColumnId: string, patch: Partial<MappingEntry>) => {
    setEntries(prev => prev.map(e => e.dupColumnId === dupColumnId ? { ...e, ...patch } : e))
  }

  const handleConfirm = async () => {
    const map: Record<string, MappingEntry> = {}
    entries.forEach(e => { map[e.dupColumnId] = e })
    if (remember) {
      await saveMapping(tableKey, projectId, entries)
    }
    onConfirm(map, remember)
  }

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[86] w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                  <Upload className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Map QA Daily Update Columns</h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Choose how each column should be imported into the QA Report
                    {excludedCount > 0 && ` · ${excludedCount} column${excludedCount === 1 ? '' : 's'} excluded ("Include in QA Report" off)`}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[1fr_28px_1fr] gap-2 px-1 pb-1">
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>QA Daily Update Column</span>
                    <span />
                    <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>QA Report Column</span>
                  </div>
                  {entries.map(entry => {
                    const col = eligibleColumns.find(c => c.id === entry.dupColumnId)
                    if (!col) return null // excluded (Include in QA Report off) or no longer exists
                    return (
                      <div key={entry.dupColumnId} className="grid grid-cols-[1fr_28px_1fr] gap-2 items-center px-1 py-1.5 rounded-xl" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                        <div className="px-2 flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{col.display_name}</span>
                          {col.is_system && <span className="text-[8px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase shrink-0">Sys</span>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 mx-auto" style={{ color: 'var(--text-muted)' }} />
                        <div className="flex items-center gap-1.5 pr-1">
                          <select
                            value={entry.action}
                            onChange={e => {
                              const action = e.target.value as MappingAction
                              const targetField = action === 'map_existing' ? qaFields[0]?.key : action === 'create_new' ? col.display_name : undefined
                              updateEntry(entry.dupColumnId, { action, targetField })
                            }}
                            className="px-2 py-1.5 rounded-lg text-xs focus:outline-none shrink-0"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          >
                            <option value="map_existing">Map to existing</option>
                            <option value="create_new">Create new</option>
                            <option value="skip">Skip</option>
                          </select>
                          {entry.action === 'map_existing' && (
                            <select
                              value={entry.targetField || ''}
                              onChange={e => updateEntry(entry.dupColumnId, { targetField: e.target.value })}
                              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none min-w-0"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            >
                              {qaFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                            </select>
                          )}
                          {entry.action === 'create_new' && (
                            <input
                              value={entry.targetField || ''}
                              onChange={e => updateEntry(entry.dupColumnId, { targetField: e.target.value })}
                              placeholder="New column name"
                              className="flex-1 px-2 py-1.5 rounded-lg text-xs focus:outline-none min-w-0"
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 flex items-center justify-between gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded border-white/20 text-accent-gold" />
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Save this mapping for future imports</span>
              </label>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button onClick={handleConfirm} disabled={loading} className="px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50" style={{ background: 'var(--accent)', color: '#000' }}>
                  Import Rows
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(content, document.body)
}
