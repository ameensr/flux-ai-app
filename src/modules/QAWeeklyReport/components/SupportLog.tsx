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
import { applySupportMapping, type MappingEntry } from '../dupImportMapping'

const STATUS_COLORS: Record<string, string> = {
  'Open': 'text-red-400 border-red-400/30 bg-red-400/10',
  'In Progress': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'Resolved': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'Closed': 'text-green-400 border-green-400/30 bg-green-400/10',
}
const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'text-red-500', 'High': 'text-orange-400', 'Medium': 'text-yellow-400', 'Low': 'text-green-400',
}

const newTicket = (): SupportTicket => ({
  id: crypto.randomUUID(), taskId: '', description: '', assignedQA: '',
  status: 'Open', priority: 'Medium', remarks: '',
})

const sel = 'bg-transparent border-none focus:outline-none text-sm text-white w-full'
const cell = 'px-3 py-2 border-b border-white/5'

// Define column configuration for the Support Log table
const SUPPORT_COLUMNS = [
  { id: 'taskId', label: 'Task ID', defaultVisible: true },
  { id: 'description', label: 'Description', defaultVisible: true },
  { id: 'assignedQA', label: 'Assigned QA', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'remarks', label: 'Remarks', defaultVisible: true },
]

export const SupportLog: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const { supportRows: dailySupportRows, fetchReportRows, dropdownConfigs, fetchDropdownConfigs, selectedProjectId } = useDailyReportStore()
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

  // Initialize column visibility from store or use defaults
  const visibleColumns: Record<string, boolean> = form.visibleSupportColumns || SUPPORT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)

  // Fetch dropdown configs on mount
  useEffect(() => {
    if (dropdownConfigs.length === 0) {
      fetchDropdownConfigs()
    }
  }, [])

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

  const tickets = form.supportTickets
  const filtered = tickets.filter(t =>
    [t.taskId, t.description, t.assignedQA, t.remarks].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  const update = (id: string, patch: Partial<SupportTicket>) =>
    setForm({ supportTickets: tickets.map(t => t.id === id ? { ...t, ...patch } : t) })

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
    const visibleColumnsList = SUPPORT_COLUMNS.filter(col => visibleColumns[col.id])
    const dynamicHeaderLabels = Object.values(customFieldLabelMap)
    const header = [...visibleColumnsList.map(col => col.label), ...dynamicHeaderLabels].join(',')
    const rows = tickets.map(t => {
      const values = [
        ...visibleColumnsList.map(col => `"${t[col.id as keyof SupportTicket] || ''}"`),
        ...customFieldKeys.map(key => `"${t.customFields?.[key] ?? ''}"`),
      ]
      return values.join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'support-log.csv'; a.click()
    toast({ title: 'Export successful', description: `Exported ${tickets.length} rows with ${visibleColumnsList.length + dynamicHeaderLabels.length} columns to CSV` })
  }

  const toggleColumn = (colId: string) => {
    const updated = { ...visibleColumns, [colId]: !visibleColumns[colId] }
    setForm({ visibleSupportColumns: updated })
  }

  const visibleColumnsList = SUPPORT_COLUMNS.filter(col => visibleColumns[col.id])

  // Any custom fields created via "Create New" during Import from DUP,
  // collected from whatever tickets currently carry them, keyed by the
  // DUP column's stable internal_key with a human label for the header.
  const customFieldLabelMap: Record<string, string> = {}
  tickets.forEach(t => {
    if (!t.customFields) return
    Object.keys(t.customFields).forEach(key => {
      if (!customFieldLabelMap[key]) {
        const col = getColumns('support').find(c => c.internal_key === key)
        customFieldLabelMap[key] = col?.display_name || key
      }
    })
  })
  const customFieldKeys = Object.keys(customFieldLabelMap)

  const importFromDailyReport = async () => {
    setImporting(true)
    try {
      let rows = dailySupportRows
      // Bug fix 1: store may be empty if user never visited /daily-report — fetch from DB
      if (!rows.length) {
        await fetchReportRows()
        rows = useDailyReportStore.getState().supportRows
      }
      if (!rows.length) {
        toast({ title: 'No daily report data', description: 'Support & Exception Log in Daily Update Report is empty.' })
        return
      }
      // Ensure the dynamic column configuration (system + any custom columns)
      // for the source project is loaded before opening the mapping dialog.
      await fetchColumnConfigs('support', selectedProjectId || null)
      setShowMappingModal(true)
    } finally {
      setImporting(false)
    }
  }

  const handleMappingConfirm = async (mapping: Record<string, MappingEntry>) => {
    setShowMappingModal(false)
    setImporting(true)
    try {
      let rows = dailySupportRows
      if (!rows.length) {
        await fetchReportRows()
        rows = useDailyReportStore.getState().supportRows
      }
      const columns = getColumns('support')
      const { items } = await applySupportMapping(rows, columns, mapping)

      // Deduplicate by taskId to prevent double-import
      const existingIds = new Set(tickets.map(t => t.taskId).filter(Boolean))
      const imported = items.filter(r => r.taskId && !existingIds.has(r.taskId))
      if (!imported.length) {
        toast({ title: 'Already imported', description: 'All rows from Daily Report are already present.' })
        return
      }
      setForm({ supportTickets: [...tickets, ...imported] })
      toast({ title: 'Imported from Daily Report', description: `${imported.length} row${imported.length === 1 ? '' : 's'} added to Support & Exception Log.` })
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
              {SUPPORT_COLUMNS.map(col => (
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
                  <span className="flex-1">{col.label}</span>
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
              {customFieldKeys.map(key => (
                <th key={key} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted font-bold">{customFieldLabelMap[key]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={visibleColumnsList.length + customFieldKeys.length + 1} className="text-center py-8 text-text-muted text-xs">No tickets. Click Add to create one.</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className={cn('hover:bg-white/[0.02] transition-colors', selected.has(t.id) && 'bg-accent-gold/5')}>
                <td className={cell}><input type="checkbox" className="accent-accent-gold" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                {visibleColumns.taskId && (
                  <td className={cell}><input className={sel} value={t.taskId} onChange={e => update(t.id, { taskId: e.target.value })} placeholder="TK-001" /></td>
                )}
                {visibleColumns.description && (
                  <td className={cell}><input className={sel} value={t.description} onChange={e => update(t.id, { description: e.target.value })} placeholder="Issue description" /></td>
                )}
                {visibleColumns.assignedQA && (
                  <td className={cell}><input className={sel} value={t.assignedQA} onChange={e => update(t.id, { assignedQA: e.target.value })} placeholder="Name" /></td>
                )}
                {visibleColumns.status && (
                  <td className={cell}>
                    <select className={`${sel} field-input py-0.5 px-1 text-xs`} value={t.status} onChange={e => update(t.id, { status: e.target.value as any })}>
                      {statusOptions.length > 0 ? (
                        statusOptions.map(s => <option key={s} value={s}>{s}</option>)
                      ) : (
                        ['Open', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)
                      )}
                    </select>
                  </td>
                )}
                {visibleColumns.priority && (
                  <td className={`${cell}`}>
                    <select className={`${sel} field-input py-0.5 px-1 text-xs ${getPriorityColor(t.priority)}`} value={t.priority} onChange={e => update(t.id, { priority: e.target.value as any })}>
                      {priorityOptions.length > 0 ? (
                        priorityOptions.map(p => <option key={p} value={p}>{p}</option>)
                      ) : (
                        ['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)
                      )}
                    </select>
                  </td>
                )}
                {visibleColumns.remarks && (
                  <td className={cell}><input className={sel} value={t.remarks} onChange={e => update(t.id, { remarks: e.target.value })} placeholder="Remarks" /></td>
                )}
                {/* Dynamic columns created via "Create New" during Import from DUP */}
                {customFieldKeys.map(key => (
                  <td key={key} className={cell}>
                    <span className="text-xs text-text-secondary">{t.customFields?.[key] ?? ''}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} • {visibleColumnsList.length} of {SUPPORT_COLUMNS.length} columns visible</p>

      <ColumnMappingModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        tableKey="support"
        columns={getColumns('support')}
        projectId={selectedProjectId || null}
        onConfirm={handleMappingConfirm}
      />
    </GlassCard >
  )
}
