// src/modules/DailyUpdateReport/components/DashboardMetricsModal.tsx
// Dedicated, single-purpose modal for configuring which column feeds the
// /daily-report summary dashboard cards for a given table, and which
// "bucket" (Completed / Blocked / Pending / Other) each of that column's
// options counts toward.
//
// This intentionally lives OUTSIDE the Customize Columns drawer. Burying
// this cross-cutting "which column feeds the dashboard" setting three
// levels deep inside every dropdown column's edit panel there meant you had
// to already know which column to open just to find the setting — easy to
// miss, and unrelated to the rest of that panel (name/type/description/
// placeholder/etc.). Surfacing it here, as its own small screen launched
// directly from the table toolbar (right next to Customize Columns), keeps
// it discoverable and keeps each surface single-purpose.

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gauge, Info, Save, AlertTriangle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useColumnConfigStore, findDashboardRoleColumn, isOptionBasedType } from '../columnConfigStore'
import type { ColumnConfig, DailyReportTableKey, DashboardRole, OutcomeBucket, DropdownOptionItem } from '../types'

const DASHBOARD_ROLE_FOR_TABLE: Record<DailyReportTableKey, DashboardRole> = {
  support: 'testing_status',
  release: 'smoke_status',
}
const TABLE_LABEL: Record<DailyReportTableKey, string> = {
  support: 'Support & Exception Log',
  release: 'Release Testing Log',
}
const CARD_NAMES: Record<DailyReportTableKey, { completed: string; pending: string; blocked: string }> = {
  support: { completed: 'Passed/Fixed', pending: 'Pending Run', blocked: 'Blocked Issues' },
  release: { completed: 'Smoke Passed', pending: 'Pending Smoke', blocked: 'Blocked Issues' },
}

const BUCKET_OPTIONS: { value: OutcomeBucket; label: string; color: string; bg: string }[] = [
  { value: 'completed', label: 'Completed', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  { value: 'blocked', label: 'Blocked', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'pending', label: 'Pending', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  { value: 'other', label: 'Other', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
]

interface DashboardMetricsModalProps {
  open: boolean
  onClose: () => void
  tableKey: DailyReportTableKey
}

export const DashboardMetricsModal: React.FC<DashboardMetricsModalProps> = ({ open, onClose, tableKey }) => {
  const { toast } = useToast()
  const { getColumns, saveColumn } = useColumnConfigStore()
  const role = DASHBOARD_ROLE_FOR_TABLE[tableKey]
  const cardNames = CARD_NAMES[tableKey]
  const tableLabel = TABLE_LABEL[tableKey]

  const columns = getColumns(tableKey)
  // Any dropdown/multiselect/status column — system or custom — can be
  // picked as the dashboard's source, not just the original system column.
  const candidateColumns = useMemo(
    () => columns.filter(c => isOptionBasedType(c.column_type)),
    [columns]
  )
  const currentRoleCol = findDashboardRoleColumn(columns, role)

  const [selectedColumnId, setSelectedColumnId] = useState('')
  const [draftOptions, setDraftOptions] = useState<DropdownOptionItem[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const initialId = currentRoleCol?.id || candidateColumns[0]?.id || ''
    setSelectedColumnId(initialId)
    const col = candidateColumns.find(c => c.id === initialId)
    setDraftOptions(col ? col.dropdown_options.map(o => ({ ...o })) : [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tableKey])

  const handleSelectColumn = (id: string) => {
    setSelectedColumnId(id)
    const col = candidateColumns.find(c => c.id === id)
    setDraftOptions(col ? col.dropdown_options.map(o => ({ ...o })) : [])
  }

  const setOptionBucket = (optId: string, bucket: OutcomeBucket) => {
    setDraftOptions(prev => prev.map(o => o.id === optId ? { ...o, outcome_bucket: bucket } : o))
  }

  const selectedColumn = candidateColumns.find(c => c.id === selectedColumnId)
  const unassignedCount = draftOptions.filter(o => !o.outcome_bucket).length

  const handleSave = async () => {
    if (!selectedColumn) return
    setSaving(true)
    try {
      // ⚠️ Ordering matters here, same reasoning as the column-save ordering
      // fix elsewhere in this module: only one column per table+scope may
      // hold a given dashboard_role (enforced by a unique index). If a
      // DIFFERENT column currently holds the role, it must be cleared FIRST
      // — saving the newly selected column with the role while the old
      // holder still has it would briefly have two rows claiming the same
      // role and fail the unique constraint.
      if (currentRoleCol && currentRoleCol.id !== selectedColumn.id) {
        await saveColumn({ ...currentRoleCol, dashboard_role: null })
      }
      await saveColumn({ ...selectedColumn, dashboard_role: role, dropdown_options: draftOptions })
      toast({
        variant: 'success',
        title: 'Dashboard metrics updated',
        description: `"${selectedColumn.display_name}" now feeds the ${tableLabel} summary cards.`,
      })
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message || 'Could not update dashboard metrics.' })
    } finally {
      setSaving(false)
    }
  }

  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/50 dark:bg-black/60 backdrop-blur-sm"
          />
          {/* Centering wrapper — a flex container spanning the full
              viewport, rather than positioning the panel itself with
              top/left: 50% + translate(-50%,-50%). The translate approach
              can clip against the viewport edges (small windows, browser
              zoom, or when the panel's own height exceeds what fits above
              its center point) since translate offsets are computed
              relative to the element's own box, not the viewport bounds.
              A flex-centered wrapper with its own scroll + padding always
              keeps the panel fully reachable/visible regardless of its
              rendered height. */}
          <div className="fixed inset-0 z-[81] flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-[540px] max-h-[85vh] my-auto flex flex-col rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                    <Gauge className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>Dashboard Metrics</h2>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{tableLabel}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl transition-all hover:scale-105 shrink-0" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }} aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body — min-h-0 is required here. A flex child defaults to
                min-height: auto, which lets it grow to fit all its content
                and IGNORE the ancestor's max-h-[85vh], so overflow-y-auto
                below never actually engages — the whole modal just grows
                taller than the viewport instead of scrolling internally,
                pushing the footer (Save/Cancel) off-screen. min-h-0 lets
                this flex child actually shrink to the space flex-1 gives
                it, which is what makes overflow-y-auto take effect. */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 flex flex-col gap-5">
                {/* ⚠️ The icon is in its own flex row wrapper, separate from
                  the <p>. Making the <p> itself the flex container (as this
                  previously was) turns every text run AND each <strong>
                  tag between them into its own flex item — flexbox then
                  lays those fragments out as a row/wrap grid instead of
                  letting them flow as normal paragraph text, which is what
                  produced the jumbled "words in boxes" rendering. A plain
                  block-level <p> with inline <strong> tags flows correctly. */}
                <div className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Choose which column drives the <strong style={{ color: 'var(--text-secondary)' }}>{cardNames.completed}</strong>, <strong style={{ color: 'var(--text-secondary)' }}>{cardNames.pending}</strong>, and <strong style={{ color: 'var(--text-secondary)' }}>{cardNames.blocked}</strong> summary cards above this table, then tell each of its options which bucket it counts toward.
                  </p>
                </div>

                {candidateColumns.length === 0 ? (
                  <div className="rounded-xl p-4 text-center" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                    <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-400" />
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>No dropdown or status columns available.</p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Add one from Customize Columns first, then come back here to wire it into the dashboard.</p>
                  </div>
                ) : (
                  <>
                    {/* Source column picker */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Source Column
                      </label>
                      <select
                        value={selectedColumnId}
                        onChange={e => handleSelectColumn(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      >
                        {candidateColumns.map(c => (
                          <option key={c.id} value={c.id}>{c.display_name} ({c.is_system ? 'System' : 'Custom'})</option>
                        ))}
                      </select>
                      {currentRoleCol && currentRoleCol.id !== selectedColumnId && (
                        <p className="text-[10px] flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Info className="w-3 h-3 shrink-0" /> Currently "{currentRoleCol.display_name}" feeds these cards. Saving will switch it to your selection above.
                        </p>
                      )}
                    </div>

                    {/* Bucket assignment per option */}
                    {selectedColumn && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                            Option Buckets
                          </label>
                          {unassignedCount > 0 && (
                            <span className="text-[10px] font-semibold text-amber-400">{unassignedCount} unassigned (counts as "Other")</span>
                          )}
                        </div>

                        {draftOptions.length === 0 ? (
                          <p className="text-[11px] italic" style={{ color: 'var(--text-muted)' }}>This column has no options configured yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* Fixed-width label column (grid, not
                              flex-justify-between) so every row's bucket
                              pill group starts at the exact same X position
                              regardless of how long that row's option label
                              is — previously each row's buttons landed at a
                              different horizontal offset because
                              justify-between pushed them flush against
                              variable-width label text. */}
                            {draftOptions.map(opt => (
                              <div
                                key={opt.id}
                                className="grid items-center gap-3 px-3 py-2 rounded-xl"
                                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', gridTemplateColumns: '1fr auto' }}
                              >
                                <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                                <div className="grid grid-cols-4 gap-1 shrink-0">
                                  {BUCKET_OPTIONS.map(b => {
                                    const active = (opt.outcome_bucket || 'other') === b.value
                                    return (
                                      <button
                                        key={b.value}
                                        type="button"
                                        onClick={() => setOptionBucket(opt.id, b.value)}
                                        title={b.label}
                                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap"
                                        style={{
                                          // Unselected pills previously used a
                                          // fully transparent background with
                                          // only var(--border) (~14% opacity)
                                          // to define their edge — on top of
                                          // the option row's own subtle
                                          // surface-elevated background that
                                          // was nearly invisible, making 3 of
                                          // every 4 buttons look like blank
                                          // space. Give unselected pills a
                                          // visible neutral background + a
                                          // solid (not near-transparent)
                                          // border so every pill always reads
                                          // as a clickable button.
                                          background: active ? b.bg : 'var(--hover)',
                                          borderColor: active ? b.color : 'rgba(148,163,184,0.35)',
                                          color: active ? b.color : 'var(--text-secondary)',
                                        }}
                                      >
                                        {active && <Check className="w-2.5 h-2.5 shrink-0" />}
                                        {b.label}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="shrink-0 px-6 py-4 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !selectedColumn}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                  style={{ background: 'var(--accent)', color: '#000' }}
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(modalContent, document.body)
}
