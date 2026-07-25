// src/modules/QAWeeklyReport/components/ColumnMappingModal.tsx
// "Import from DUP" column mapping interface. Shown when importing QA Daily
// Update data into the QA Report, letting users map each dynamic DUP column
// to an existing QA Report column, create a new one, or skip it — using
// stable column IDs so a later rename in the Daily Update module never
// breaks the mapping. Choices can be saved as the project's (or
// organization's) default mapping for future imports.
//
// Destination column order is drag-reorderable and becomes the QA Report
// table schema order after import.

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { X, ArrowRight, Upload, GripVertical } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { ColumnConfig, DailyReportTableKey } from '@/modules/DailyUpdateReport/types'
import { qaFieldsForTable, buildDefaultMapping, fetchSavedMapping, saveMapping, qaReportEligibleColumns, type MappingEntry, type MappingAction } from '../dupImportMapping'
import { buildDestinationColumnsFromMapping, type QAReportTableColumn } from '../qaReportColumnSchema'

interface ColumnMappingModalProps {
  open: boolean
  onClose: () => void
  tableKey: DailyReportTableKey
  columns: ColumnConfig[]
  projectId: string | null
  onConfirm: (mapping: Record<string, MappingEntry>, remember: boolean, destinationOrder: string[]) => void
}

export const ColumnMappingModal: React.FC<ColumnMappingModalProps> = ({ open, onClose, tableKey, columns, projectId, onConfirm }) => {
  useBodyScrollLock(open)
  const [entries, setEntries] = useState<MappingEntry[]>([])
  const [destinationOrder, setDestinationOrder] = useState<string[]>([])
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)

  const qaFields = qaFieldsForTable(tableKey)
  const eligibleColumns = qaReportEligibleColumns(columns)
  const excludedCount = columns.length - eligibleColumns.length
  const colById = useMemo(() => new Map(eligibleColumns.map(c => [c.id, c])), [eligibleColumns])

  const resultingColumns: QAReportTableColumn[] = useMemo(
    () => buildDestinationColumnsFromMapping(tableKey, columns, entries, destinationOrder),
    [tableKey, columns, entries, destinationOrder],
  )

  // Keep destinationOrder in sync when mapping actions change (add/remove destinations).
  // Computed without destinationOrder so reordering itself does not retrigger this effect.
  useEffect(() => {
    const ids = buildDestinationColumnsFromMapping(tableKey, columns, entries).map(c => c.id)
    setDestinationOrder(prev => {
      const kept = prev.filter(id => ids.includes(id))
      const missing = ids.filter(id => !kept.includes(id))
      const next = [...kept, ...missing]
      if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev
      return next
    })
  }, [entries, tableKey, columns])

  useEffect(() => {
    if (!open) return
    setLoading(true)
      ; (async () => {
        const saved = await fetchSavedMapping(tableKey, projectId)
        const defaults = buildDefaultMapping(columns, tableKey)
        const merged = defaults.map(d => saved?.[d.dupColumnId] ? { ...d, ...saved[d.dupColumnId], internalKey: d.internalKey } : d)
        setEntries(merged)
        const initialDest = buildDestinationColumnsFromMapping(tableKey, columns, merged)
        setDestinationOrder(initialDest.map(c => c.id))
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
    onConfirm(map, remember, destinationOrder)
  }

  const destMeta = (id: string) => resultingColumns.find(c => c.id === id)

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[85] bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <div className="fixed inset-0 z-[86] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
              onClick={e => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col"
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
                      Map each source column, then drag to set the final QA Report column order
                      {excludedCount > 0 && ` · ${excludedCount} column${excludedCount === 1 ? '' : 's'} excluded ("Include in QA Report" off)`}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
                {loading ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Source → action → destination mapping rows */}
                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-[1fr_28px_1.4fr] gap-2 px-1 pb-1">
                        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Source (Daily Update)</span>
                        <span />
                        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Action → Destination</span>
                      </div>
                      {entries.map(entry => {
                        const col = colById.get(entry.dupColumnId)
                        if (!col) return null
                        const destLabel = entry.action === 'map_existing'
                          ? qaFields.find(f => f.key === entry.targetField)?.label || entry.targetField
                          : entry.action === 'create_new'
                            ? (entry.targetField || col.display_name)
                            : null
                        return (
                          <div key={entry.dupColumnId} className="grid grid-cols-[1fr_28px_1.4fr] gap-2 items-center px-2 py-2 rounded-xl" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{col.display_name}</span>
                              {col.is_system && <span className="text-[8px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase shrink-0">Sys</span>}
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 mx-auto" style={{ color: 'var(--text-muted)' }} />
                            <div className="flex flex-col gap-1.5 min-w-0">
                              <div className="flex items-center gap-1.5">
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
                              {destLabel && (
                                <span className="text-[10px] truncate px-0.5" style={{ color: 'var(--text-muted)' }}>
                                  {col.display_name} → {entry.action === 'create_new' ? `New Column: ${destLabel}` : destLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Resulting schema + drag reorder */}
                    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Resulting Columns</h3>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Drag ⠿ to set the order that will appear in the QA Report table
                        </p>
                      </div>
                      {destinationOrder.length === 0 ? (
                        <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>
                          No columns selected — map at least one source column (or Create New) to import.
                        </p>
                      ) : (
                        <Reorder.Group axis="y" values={destinationOrder} onReorder={setDestinationOrder} className="flex flex-col gap-1.5">
                          {destinationOrder.map((id, index) => {
                            const meta = destMeta(id)
                            if (!meta) return null
                            return (
                              <Reorder.Item
                                key={id}
                                value={id}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-grab active:cursor-grabbing"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                              >
                                <GripVertical className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                                <span className="text-[10px] font-bold w-5 shrink-0" style={{ color: 'var(--text-muted)' }}>{index + 1}.</span>
                                <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{meta.label}</span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full shrink-0"
                                  style={{
                                    background: meta.kind === 'custom' ? 'rgba(212,175,55,0.12)' : 'rgba(99,102,241,0.12)',
                                    color: meta.kind === 'custom' ? '#d4af37' : '#818CF8',
                                    border: `1px solid ${meta.kind === 'custom' ? 'rgba(212,175,55,0.25)' : 'rgba(99,102,241,0.25)'}`,
                                  }}
                                >
                                  {meta.kind === 'custom' ? 'New' : 'Existing'}
                                </span>
                              </Reorder.Item>
                            )
                          })}
                        </Reorder.Group>
                      )}
                    </div>
                  </>
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
                  <button
                    onClick={handleConfirm}
                    disabled={loading || destinationOrder.length === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                    style={{ background: 'var(--accent)', color: '#000' }}
                  >
                    Import Rows
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
