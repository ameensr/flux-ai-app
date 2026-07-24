import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ReleaseItem } from '../types'
import { isPassStatus } from '../types'
import { useDailyReportStore } from '@/modules/DailyUpdateReport/store'
import { useColumnConfigStore } from '@/modules/DailyUpdateReport/columnConfigStore'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Copy, Download, Upload, Search, Columns, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { ColumnMappingModal } from './ColumnMappingModal'
import { applyReleaseMapping, type MappingEntry } from '../dupImportMapping'

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'text-text-muted', 'In Progress': 'text-yellow-400',
  'Pass': 'text-green-400', 'Fail': 'text-red-400', 'Blocked': 'text-orange-400',
}
const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'text-red-500', 'High': 'text-orange-400', 'Medium': 'text-yellow-400', 'Low': 'text-green-400',
}

const newItem = (): ReleaseItem => ({
  id: crypto.randomUUID(), taskId: '', featureName: '', assignee: '',
  status: 'Not Started', priority: 'Medium', remarks: '',
})

const sel = 'bg-transparent border-none focus:outline-none text-sm text-white w-full'
const cell = 'px-3 py-2 border-b border-white/5'

// Define column configuration for the Release Testing Status table
const RELEASE_COLUMNS = [
  { id: 'taskId', label: 'Task ID', defaultVisible: true },
  { id: 'featureName', label: 'Feature Name', defaultVisible: true },
  { id: 'assignee', label: 'Assignee', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'priority', label: 'Priority', defaultVisible: true },
  { id: 'remarks', label: 'Remarks', defaultVisible: true },
]

export const ReleaseTable: React.FC = () => {
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
  const columnButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize column visibility from store or use defaults
  const visibleColumns: Record<string, boolean> = form.visibleReleaseColumns || RELEASE_COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)

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

  // Get status options from Daily Report configuration (testing_status for release testing)
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

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const normalizedStatus = status.toLowerCase()
    if (normalizedStatus.includes('pass')) return 'text-green-400'
    if (normalizedStatus.includes('fail')) return 'text-red-400'
    if (normalizedStatus.includes('blocked')) return 'text-orange-400'
    if (normalizedStatus.includes('progress')) return 'text-yellow-400'
    return 'text-text-muted'
  }

  const items = form.releaseItems
  const filtered = items.filter(i =>
    [i.taskId, i.featureName, i.assignee, i.remarks].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  const update = (id: string, patch: Partial<ReleaseItem>) =>
    setForm({ releaseItems: items.map(i => i.id === id ? { ...i, ...patch } : i) })

  // Dedicated setter for dynamic "Create New" columns — merges into the
  // existing customFields object instead of replacing it, so editing one
  // custom column never clobbers another custom column's value on the row.
  const updateCustomField = (id: string, key: string, value: string) =>
    setForm({ releaseItems: items.map(i => i.id === id ? { ...i, customFields: { ...i.customFields, [key]: value } } : i) })

  const addRow = () => setForm({ releaseItems: [...items, newItem()] })

  const deleteSelected = () => {
    const next = selected.size ? items.filter(i => !selected.has(i.id)) : items.slice(0, -1)
    setForm({ releaseItems: next }); setSelected(new Set())
  }

  const duplicate = () => {
    const dupes = items.filter(i => selected.has(i.id)).map(i => ({ ...i, id: crypto.randomUUID() }))
    setForm({ releaseItems: [...items, ...dupes] })
  }

  const exportCSV = () => {
    const visibleColumnsList = RELEASE_COLUMNS.filter(col => visibleColumns[col.id])
    const dynamicHeaderLabels = Object.values(customFieldLabelMap)
    const header = [...visibleColumnsList.map(col => col.label), ...dynamicHeaderLabels].join(',')
    const rows = items.map(i => {
      const values = [
        ...visibleColumnsList.map(col => `"${i[col.id as keyof ReleaseItem] || ''}"`),
        ...customFieldKeys.map(key => `"${i.customFields?.[key] ?? ''}"`),
      ]
      return values.join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'release-testing-status.csv'; a.click()
    toast({ title: 'Export successful', description: `Exported ${items.length} rows with ${visibleColumnsList.length + dynamicHeaderLabels.length} columns to CSV` })
  }

  const toggleColumn = (colId: string) => {
    const updated = { ...visibleColumns, [colId]: !visibleColumns[colId] }
    setForm({ visibleReleaseColumns: updated })
  }

  const visibleColumnsList = RELEASE_COLUMNS.filter(col => visibleColumns[col.id])

  // Any custom fields created via "Create New" during Import from DUP
  const customFieldLabelMap: Record<string, string> = {}
  items.forEach(i => {
    if (!i.customFields) return
    Object.keys(i.customFields).forEach(key => {
      if (!customFieldLabelMap[key]) {
        const col = getColumns('release').find(c => c.internal_key === key)
        customFieldLabelMap[key] = col?.display_name || key
      }
    })
  })
  const customFieldKeys = Object.keys(customFieldLabelMap)

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
      let rows = useDailyReportStore.getState().releaseRows
      // Bug fix 1: store may be empty if user never visited /daily-report — fetch from DB
      if (!rows.length) {
        await fetchReportRows()
        rows = useDailyReportStore.getState().releaseRows
      }
      if (!rows.length) {
        toast({ title: 'No daily report data', description: 'Release Testing Log in Daily Update Report is empty for this project.' })
        return
      }
      await fetchColumnConfigs('release', form.projectId)
      setShowMappingModal(true)
    } finally {
      setImporting(false)
    }
  }

  const handleMappingConfirm = async (mapping: Record<string, MappingEntry>) => {
    setShowMappingModal(false)
    setImporting(true)
    try {
      let rows = useDailyReportStore.getState().releaseRows
      if (!rows.length) {
        await fetchReportRows()
        rows = useDailyReportStore.getState().releaseRows
      }
      const columns = getColumns('release')
      const { items: mappedItems } = await applyReleaseMapping(rows, columns, mapping)

      const existingIds = new Set(items.map(i => i.taskId).filter(Boolean))
      const imported = mappedItems.filter(r => r.taskId && !existingIds.has(r.taskId))
      if (!imported.length) {
        toast({ title: 'Already imported', description: 'All rows from Daily Report are already present.' })
        return
      }
      setForm({ releaseItems: [...items, ...imported] })
      toast({ title: 'Imported from Daily Report', description: `${imported.length} row${imported.length === 1 ? '' : 's'} added to Release Testing Log.` })
    } finally {
      setImporting(false)
    }
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const passRate = items.length ? Math.round(items.filter(i => isPassStatus(i.status)).length / items.length * 100) : 0

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="label-xs">Release Testing Log</span>
            {items.length > 0 && (
              <span
                className="text-[10px] font-bold text-green-400 cursor-help"
                title={`Base on completed status: ${items.filter(i => isPassStatus(i.status)).length} passed out of ${items.length} total items`}
              >
                {passRate}% Pass Rate
              </span>
            )}
          </div>
        </div>
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
              {RELEASE_COLUMNS.map(col => (
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
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-3 py-2 w-8"><input type="checkbox" className="accent-accent-gold" onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} /></th>
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
              <tr><td colSpan={visibleColumnsList.length + customFieldKeys.length + 1} className="text-center py-8 text-text-muted text-xs">No items. Click Add to create one.</td></tr>
            )}
            {filtered.map(item => (
              <tr key={item.id} className={cn('hover:bg-white/[0.02] transition-colors', selected.has(item.id) && 'bg-accent-gold/5')}>
                <td className={cell}><input type="checkbox" className="accent-accent-gold" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                {visibleColumns.taskId && (
                  <td className={cell}><input className={sel} value={item.taskId} onChange={e => update(item.id, { taskId: e.target.value })} placeholder="RT-001" /></td>
                )}
                {visibleColumns.featureName && (
                  <td className={cell}><input className={sel} value={item.featureName} onChange={e => update(item.id, { featureName: e.target.value })} placeholder="Feature name" /></td>
                )}
                {visibleColumns.assignee && (
                  <td className={cell}><input className={sel} value={item.assignee} onChange={e => update(item.id, { assignee: e.target.value })} placeholder="Name" /></td>
                )}
                {visibleColumns.status && (
                  <td className={cell}>
                    <select className={`${sel} field-input py-0.5 px-1 text-xs ${getStatusColor(item.status)}`} value={item.status} onChange={e => update(item.id, { status: e.target.value as any })}>
                      {statusOptions.length > 0 ? (
                        statusOptions.map(s => <option key={s} value={s}>{s}</option>)
                      ) : (
                        ['Not Started', 'In Progress', 'Pass', 'Fail', 'Blocked'].map(s => <option key={s}>{s}</option>)
                      )}
                    </select>
                  </td>
                )}
                {visibleColumns.priority && (
                  <td className={cell}>
                    <select className={`${sel} field-input py-0.5 px-1 text-xs ${getPriorityColor(item.priority)}`} value={item.priority} onChange={e => update(item.id, { priority: e.target.value as any })}>
                      {priorityOptions.length > 0 ? (
                        priorityOptions.map(p => <option key={p} value={p}>{p}</option>)
                      ) : (
                        ['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)
                      )}
                    </select>
                  </td>
                )}
                {visibleColumns.remarks && (
                  <td className={cell}><input className={sel} value={item.remarks} onChange={e => update(item.id, { remarks: e.target.value })} placeholder="Remarks" /></td>
                )}
                {customFieldKeys.map(key => (
                  <td key={key} className={cell}>
                    <input
                      className={sel}
                      value={item.customFields?.[key] ?? ''}
                      onChange={e => updateCustomField(item.id, key, e.target.value)}
                      placeholder={customFieldLabelMap[key]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">{items.length} item{items.length !== 1 ? 's' : ''} • {visibleColumnsList.length} of {RELEASE_COLUMNS.length} columns visible</p>

      <ColumnMappingModal
        open={showMappingModal}
        onClose={() => setShowMappingModal(false)}
        tableKey="release"
        columns={getColumns('release')}
        projectId={form.projectId || null}
        onConfirm={handleMappingConfirm}
      />
    </GlassCard>
  )
}
