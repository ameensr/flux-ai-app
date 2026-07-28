import React, { useRef, useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { SupportTicket } from '../types'
import { useDailyReportStore } from '@/modules/DailyUpdateReport/store'
import { useColumnConfigStore } from '@/modules/DailyUpdateReport/columnConfigStore'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Copy, Download, Upload, Search, Columns, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { ColumnMappingModal } from './ColumnMappingModal'
import { applySupportMapping, mergeSupportImport, type MappingEntry } from '../dupImportMapping'
import {
  applyVisibilityToSchema,
  buildDestinationColumnsFromMapping,
  ensureAssigneeColumnInSchema,
  hydrateSchemaFromLegacy,
  mergeColumnSchemas,
  orderedVisibleColumns,
  visibilityMapFromSchema,
} from '../qaReportColumnSchema'

const newTicket = (): SupportTicket => ({
  id: crypto.randomUUID(), taskId: '', description: '', assignedQA: '',
  status: 'Open', priority: 'Medium', remarks: '',
})

const sel = 'bg-transparent border-none focus:outline-none text-sm text-white w-full'
const cell = 'px-3 py-2 border-b border-white/5'

export const SupportLog: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const { fetchReportRows, dropdownConfigs, fetchDropdownConfigs } = useDailyReportStore()
  const { getColumns, fetchColumnConfigs } = useColumnConfigStore()
  const { isDark } = useTheme()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const [showMappingModal, setShowMappingModal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const columnButtonRef = useRef<HTMLButtonElement>(null)

  // Fetch dropdown configs on mount
  useEffect(() => {
    if (dropdownConfigs.length === 0) {
      fetchDropdownConfigs()
    }
  }, [])

  const tickets = form.supportTickets

  // Discover custom field keys/labels from rows (legacy reports / before schema sync)
  const legacyCustomLabels: Record<string, string> = {}
  tickets.forEach(t => {
    if (!t.customFields) return
    Object.keys(t.customFields).forEach(key => {
      if (!legacyCustomLabels[key]) {
        const col = getColumns('support').find(c => c.internal_key === key)
        legacyCustomLabels[key] = col?.display_name || key
      }
    })
  })

  const columnSchema = hydrateSchemaFromLegacy(
    'support',
    form.supportColumnSchema,
    form.visibleSupportColumns,
    legacyCustomLabels,
  )
  const visibleColumnsList = orderedVisibleColumns(columnSchema)
  const visibleColumns = visibilityMapFromSchema(columnSchema)

  // Calculate dropdown position when menu opens
  useEffect(() => {
    if (showColumnMenu && columnButtonRef.current) {
      const rect = columnButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      })
    }
  }, [showColumnMenu])

  // Get status options from Daily Report configuration
  const statusOptions = dropdownConfigs
    .filter(c => c.category === 'testing_status' && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => c.value)

  // Get priority options from Daily Report configuration
  const priorityOptions = dropdownConfigs
    .filter(c => c.category === 'priority' && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(c => c.value)

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    const normalizedPriority = priority.toLowerCase()
    if (normalizedPriority.includes('critical')) return 'text-red-500'
    if (normalizedPriority.includes('high')) return 'text-orange-400'
    if (normalizedPriority.includes('medium')) return 'text-yellow-400'
    if (normalizedPriority.includes('low')) return 'text-green-400'
    return 'text-text-secondary'
  }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    if (!q) return true
    const builtin = [t.taskId, t.description, t.assignedQA, t.remarks].some(v => v.toLowerCase().includes(q))
    const custom = Object.values(t.customFields || {}).some(v => String(v ?? '').toLowerCase().includes(q))
    return builtin || custom
  })

  const update = (id: string, patch: Partial<SupportTicket>) =>
    setForm({ supportTickets: tickets.map(t => t.id === id ? { ...t, ...patch } : t) })

  // Dedicated setter for dynamic "Create New" columns — merges into the
  // existing customFields object instead of replacing it, so editing one
  // custom column never clobbers another custom column's value on the row.
  const updateCustomField = (id: string, key: string, value: string) =>
    setForm({ supportTickets: tickets.map(t => t.id === id ? { ...t, customFields: { ...t.customFields, [key]: value } } : t) })

  const addRow = () => setForm({ supportTickets: [...tickets, newTicket()] })

  const deleteSelected = () => {
    const next = selected.size ? tickets.filter(t => !selected.has(t.id)) : tickets.slice(0, -1)
    setForm({ supportTickets: next })
    setSelected(new Set())
  }

  const duplicate = () => {
    const dupes = tickets.filter(t => selected.has(t.id)).map(t => ({ ...t, id: crypto.randomUUID() }))
    setForm({ supportTickets: [...tickets, ...dupes] })
  }

  const exportCSV = () => {
    const header = visibleColumnsList.map(col => col.label).join(',')
    const rows = tickets.map(t => {
      const values = visibleColumnsList.map(col => {
        if (col.kind === 'custom') return `"${t.customFields?.[col.id] ?? ''}"`
        return `"${(t as any)[col.id] ?? ''}"`
      })
      return values.join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'support-log.csv'; a.click()
    toast({ title: 'Export successful', description: `Exported ${tickets.length} rows with ${visibleColumnsList.length} columns to CSV` })
  }

  const toggleColumn = (colId: string) => {
    const nextSchema = applyVisibilityToSchema(columnSchema, colId)
    setForm({
      supportColumnSchema: nextSchema,
      visibleSupportColumns: visibilityMapFromSchema(nextSchema),
    })
  }

  const importFromDailyReport = async () => {
    // ⚠️ CRITICAL: The Daily Update Report module tracks its OWN selected
    // project (`useDailyReportStore.selectedProjectId`), completely
    // independent of this QA Weekly Report's `form.projectId`. If the user
    // previously viewed /daily-report for a different project (or never
    // synced the two), importing without reconciling them would silently
    // pull another project's rows/columns into THIS report. Always scope
    // the import to the QA report's own project — never the Daily Report
    // module's currently-selected one — by re-selecting it there first
    // (which also correctly (re)loads project membership/role before rows).
    if (!form.projectId) {
      toast({ variant: 'destructive', title: 'No project selected', description: 'Select a project for this QA report before importing from Daily Update Report.' })
      return
    }
    setImporting(true)
    try {
      if (useDailyReportStore.getState().selectedProjectId !== form.projectId) {
        await useDailyReportStore.getState().setSelectedProjectId(form.projectId)
      }
      // Always refresh from DB — stale in-memory supportRows were a common
      // cause of blank Support imports while Release looked fine.
      await fetchReportRows({ force: true })
      const rows = useDailyReportStore.getState().supportRows
      if (!rows.length) {
        toast({ title: 'No daily report data', description: 'Support & Exception Log in Daily Update Report is empty for this project.' })
        return
      }
      await fetchColumnConfigs('support', form.projectId)
      setShowMappingModal(true)
    } finally {
      setImporting(false)
    }
  }

  const handleMappingConfirm = async (mapping: Record<string, MappingEntry>, _remember: boolean, destinationOrder: string[]) => {
    setShowMappingModal(false)
    setImporting(true)
    try {
      await fetchReportRows({ force: true })
      const rows = useDailyReportStore.getState().supportRows
      const columns = getColumns('support')
      const { items } = await applySupportMapping(rows, columns, mapping)

      const { rows: mergedRows, added, updated } = mergeSupportImport(tickets, items)
      if (!added && !updated) {
        toast({ title: 'Nothing to import', description: 'No Support rows were returned from Daily Update Report.' })
        return
      }

      const incomingSchema = ensureAssigneeColumnInSchema(
        'support',
        buildDestinationColumnsFromMapping('support', columns, mapping, destinationOrder),
        mergedRows.some(r => !!r.assignedQA),
      )
      const nextSchema = tickets.length === 0
        ? incomingSchema
        : mergeColumnSchemas(columnSchema, incomingSchema)

      setForm({
        supportTickets: mergedRows,
        supportColumnSchema: nextSchema,
        visibleSupportColumns: visibilityMapFromSchema(nextSchema),
      })
      const parts = [
        added ? `${added} added` : null,
        updated ? `${updated} updated` : null,
      ].filter(Boolean).join(', ')
      toast({ title: 'Imported from Daily Report', description: `${parts} in Support & Exception Log.` })
    } finally {
      setImporting(false)
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="label-xs">Support & Exception Log</span>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
            <Search className="w-3 h-3 text-text-muted" />
            <input className="bg-transparent text-xs text-white focus:outline-none w-32 placeholder:text-text-muted" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={addRow}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-accent-gold hover:bg-accent-gold/20 transition-all"
              title="Add new row"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={deleteSelected}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
              title="Delete selected rows"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={duplicate}
              disabled={selected.size === 0}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all disabled:opacity-30"
              title="Duplicate selected rows"
            >
              <Copy className="w-3 h-3" /> Dupe
            </button>
            <button
              onClick={importFromDailyReport}
              disabled={importing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all disabled:opacity-50 whitespace-nowrap"
              title="Import data from Daily Update Report"
            >
              <Upload className={`w-3 h-3 ${importing ? 'animate-spin' : ''}`} /> {importing ? 'Loading…' : 'Import from DUP'}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all"
              title="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              ref={columnButtonRef}
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all"
              title="Customize columns"
            >
              <Columns className="w-3 h-3" /> Columns
            </button>
          </div>
        </div>
      </div>

      {showColumnMenu && ReactDOM.createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowColumnMenu(false)} />
          <div
            className={cn(
              "fixed w-56 rounded-xl shadow-2xl z-[9999] backdrop-blur-xl",
              "border max-h-80 overflow-y-auto",
              isDark
                ? "bg-[#1a1625] border-white/20"
                : "bg-white border-gray-200"
            )}
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`
            }}
          >
            <div className={cn(
              "px-3 py-2 border-b sticky top-0 z-10",
              isDark ? "bg-[#1a1625] border-white/10" : "bg-white border-gray-200"
            )}>
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-wider",
                isDark ? "text-white" : "text-gray-900"
              )}>Show/Hide Columns</p>
            </div>
            <div className="py-1">
              {columnSchema.map(col => (
                <button
                  key={col.id}
                  onClick={() => toggleColumn(col.id)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-xs transition-all flex items-center justify-between group",
                    isDark
                      ? "text-text-secondary hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <span className="flex-1 truncate">{col.label}</span>
                  {visibleColumns[col.id] ? (
                    <Eye className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                  ) : (
                    <EyeOff className={cn(
                      "w-3.5 h-3.5 flex-shrink-0",
                      isDark ? "text-text-muted" : "text-gray-400"
                    )} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-3 py-2 w-8"><input type="checkbox" className="accent-accent-gold" onChange={e => setSelected(e.target.checked ? new Set(tickets.map(t => t.id)) : new Set())} /></th>
              {visibleColumnsList.map(col => (
                <th key={col.id} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted font-bold">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={visibleColumnsList.length + 1} className="text-center py-8 text-text-muted text-xs">No tickets. Click Add to create one.</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className={cn('hover:bg-white/[0.02] transition-colors', selected.has(t.id) && 'bg-accent-gold/5')}>
                <td className={cell}><input type="checkbox" className="accent-accent-gold" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                {visibleColumnsList.map(col => {
                  if (col.kind === 'custom') {
                    return (
                      <td key={col.id} className={cell}>
                        <input
                          className={sel}
                          value={t.customFields?.[col.id] ?? ''}
                          onChange={e => updateCustomField(t.id, col.id, e.target.value)}
                          placeholder={col.label}
                        />
                      </td>
                    )
                  }
                  if (col.id === 'taskId') {
                    return <td key={col.id} className={cell}><input className={sel} value={t.taskId} onChange={e => update(t.id, { taskId: e.target.value })} placeholder="TK-001" /></td>
                  }
                  if (col.id === 'description') {
                    return <td key={col.id} className={cell}><input className={sel} value={t.description} onChange={e => update(t.id, { description: e.target.value })} placeholder="Issue description" /></td>
                  }
                  if (col.id === 'assignedQA') {
                    return <td key={col.id} className={cell}><input className={sel} value={t.assignedQA} onChange={e => update(t.id, { assignedQA: e.target.value })} placeholder="Name" /></td>
                  }
                  if (col.id === 'status') {
                    const fallbackStatuses = ['Open', 'In Progress', 'Resolved', 'Closed']
                    const opts = statusOptions.length > 0 ? statusOptions : fallbackStatuses
                    const statusOpts = t.status && !opts.includes(t.status) ? [t.status, ...opts] : opts
                    return (
                      <td key={col.id} className={cell}>
                        <select className={`${sel} field-input py-0.5 px-1 text-xs`} value={t.status} onChange={e => update(t.id, { status: e.target.value as any })}>
                          {statusOpts.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    )
                  }
                  if (col.id === 'priority') {
                    return (
                      <td key={col.id} className={cell}>
                        <select className={`${sel} field-input py-0.5 px-1 text-xs ${getPriorityColor(t.priority)}`} value={t.priority} onChange={e => update(t.id, { priority: e.target.value as any })}>
                          {priorityOptions.length > 0 ? (
                            priorityOptions.map(p => <option key={p} value={p}>{p}</option>)
                          ) : (
                            ['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)
                          )}
                        </select>
                      </td>
                    )
                  }
                  if (col.id === 'remarks') {
                    return <td key={col.id} className={cell}><input className={sel} value={t.remarks} onChange={e => update(t.id, { remarks: e.target.value })} placeholder="Remarks" /></td>
                  }
                  return null
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} • {visibleColumnsList.length} of {columnSchema.length} columns visible</p>

      <ColumnMappingModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        tableKey="support"
        columns={getColumns('support')}
        projectId={form.projectId || null}
        onConfirm={handleMappingConfirm}
      />
    </GlassCard >
  )
}
