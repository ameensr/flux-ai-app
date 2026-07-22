import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Copy, Search, Filter, Download, Upload,
  GripVertical, ChevronUp, ChevronDown, X, Clipboard, Settings2, Gauge
} from 'lucide-react'
import { useDailyReportStore } from '../store'
import { usePermissions } from '@/hooks/usePermissions'
import type { ReleaseTestingRecord } from '../types'
import { GlassCard } from '@/components/ui/GlassCard'
<<<<<<< Updated upstream
import * as XLSX from 'xlsx'
import XLSXStyle from 'xlsx-js-style'



const COLUMNS = [
  { id: 'task_id', label: 'Task ID', type: 'text', defaultWidth: 120 },
  { id: 'description', label: 'Description', type: 'textarea', defaultWidth: 200 },
  { id: 'qa', label: 'QA', type: 'select', category: 'qa', defaultWidth: 140 },
  { id: 'initial_round_estimation_hrs', label: 'Initial Est (Hrs)', type: 'number', defaultWidth: 140 },
  { id: 'testing_status', label: 'Testing Status', type: 'select', category: 'testing_status', defaultWidth: 140 },
  { id: 'smoke_testing_status', label: 'Smoke Status', type: 'select', category: 'smoke_status', defaultWidth: 140 },
  { id: 'scope_of_testing_for_smoke', label: 'Smoke Test Scope', type: 'textarea', defaultWidth: 200 },
  { id: 'smoke_testing_estimation_hrs', label: 'Smoke Est (Hrs)', type: 'number', defaultWidth: 140 },
  { id: 'overall_scope_of_testing', label: 'Overall Scope', type: 'textarea', defaultWidth: 200 },
  { id: 'overall_estimation_hrs', label: 'Overall Est (Hrs)', type: 'number', defaultWidth: 140 },
]
=======
import { useDynamicColumns } from '../useDynamicColumns'
import { findDashboardRoleColumn } from '../columnConfigStore'
import {
  buildHeaderColumnMap,
  buildConfigRefAOA,
  columnsForExport,
  columnsForPaste,
  columnsForTemplate,
  emptyReleaseSystemFields,
  formatExportCell,
  normalizeHeader,
  parseImportRow,
  sampleValueForColumn,
} from '../importExportUtils'
import { CellDisplay, CellEditor, defaultWidthForType } from './DynamicCell'
import { CustomizeColumnsDrawer } from './CustomizeColumnsDrawer'
import { DashboardMetricsModal } from './DashboardMetricsModal'
import { ValidationTooltip } from './ValidationTooltip'
>>>>>>> Stashed changes

export const ReleaseTestingStatus: React.FC = () => {
  const {
    releaseRows,
    setReleaseRows,
    syncStatus,
    isProjectViewer,
    selectedProjectId,
    projects,
  } = useDailyReportStore()

  const { can } = usePermissions()
  const canCreate = can('daily-report', 'can_create') && !isProjectViewer
  const canEdit = can('daily-report', 'can_edit') && !isProjectViewer
  const canDelete = can('daily-report', 'can_delete') && !isProjectViewer
  const canExport = can('daily-report', 'can_export')
  const canManageColumns = can('daily-report', 'can_manage_columns')

  const dyn = useDynamicColumns('release', selectedProjectId)
  const COLUMNS = dyn.columns

  const currentProject = projects.find(p => p.id === selectedProjectId)

  // Grid states
  const [search, setSearch] = useState('')
  const [smokeFilter, setSmokeFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({})
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
  const [showCustomizeDrawer, setShowCustomizeDrawer] = useState(false)
  const [showDashboardMetrics, setShowDashboardMetrics] = useState(false)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  // Cell inline editor state
  const [activeCell, setActiveCell] = useState<{ rowId: string; colId: string } | null>(null)
  const editorInputRef = useRef<any>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Auto-focus active cell input
  useEffect(() => {
    if (activeCell && editorInputRef.current) {
      editorInputRef.current.focus()
    }
  }, [activeCell])

  // Load custom field values for currently loaded rows
  useEffect(() => {
    dyn.loadCustomValuesForRows(releaseRows.map(r => r.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseRows.map(r => r.id).join(','), dyn.columns.length])

  // Get option labels for a system dropdown column by internal_key, reading
  // from the column's own dropdown_options (Customize Columns drawer) —
  // replaces the old category-based lookup against the now-removed
  // centralized Configuration page.
  const getColumnOptions = (internalKey: string) => {
    const col = COLUMNS.find(c => c.internal_key === internalKey)
    return (col?.dropdown_options || []).map(o => o.label)
  }

  const getColWidth = (colId: string, type: string) => columnWidths[colId] || defaultWidthForType(type as any)

  // Add row
  const addRow = () => {
    if (!canCreate) return
    const newRow: ReleaseTestingRecord = {
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      task_id: '',
      description: '',
      qa: '',
      initial_round_estimation_hrs: '',
      testing_status: '',
      smoke_testing_status: '',
      scope_of_testing_for_smoke: '',
      smoke_testing_estimation_hrs: '',
      overall_scope_of_testing: '',
      overall_estimation_hrs: ''
    }
    setReleaseRows([...releaseRows, newRow])
  }

  // Duplicate selected rows
  const duplicateSelected = () => {
    if (!canCreate) return
    if (selectedIds.size === 0) return
    const duplicated = releaseRows.filter(r => selectedIds.has(r.id)).map(r => ({
      ...r,
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      task_id: r.task_id ? `${r.task_id} (Copy)` : ''
    }))
    setReleaseRows([...releaseRows, ...duplicated])
    setSelectedIds(new Set())
  }

  // Delete selected rows
  const deleteSelected = () => {
    if (!canDelete) return
    if (selectedIds.size === 0) return

    const confirmMessage = selectedIds.size === 1
      ? 'Are you sure you want to delete this row? This action cannot be undone.'
      : `Are you sure you want to delete ${selectedIds.size} rows? This action cannot be undone.`

    if (!confirm(confirmMessage)) return

    const remainingRows = releaseRows.filter(r => !selectedIds.has(r.id))
    dyn.clearCustomValuesForRows(Array.from(selectedIds))

    setReleaseRows(remainingRows, true)
    setSelectedIds(new Set())
  }

  // Toggle selection
  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRows.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredRows.map(r => r.id)))
    }
  }

  // Update cell value
  const updateCell = (rowId: string, col: (typeof COLUMNS)[number], value: any) => {
    if (!canEdit) return
    if (col.is_system) {
      const nextRows = releaseRows.map(row => row.id === rowId ? { ...row, [col.internal_key]: value } : row)
      setReleaseRows(nextRows)
    } else {
      dyn.setCustomValue(rowId, col, value)
    }
  }

  // Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (sourceIndex === targetIndex || isNaN(sourceIndex)) return
    const nextRows = [...releaseRows]
    const [removed] = nextRows.splice(sourceIndex, 1)
    nextRows.splice(targetIndex, 0, removed)
    setReleaseRows(nextRows)
  }

  // Column Resizer
  const startResize = (e: React.MouseEvent, colId: string, type: string) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = getColWidth(colId, type)

    const doResize = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      setColumnWidths(prev => ({
        ...prev,
        [colId]: Math.max(80, startWidth + deltaX)
      }))
    }

    const endResize = () => {
      document.removeEventListener('mousemove', doResize)
      document.removeEventListener('mouseup', endResize)
    }

    document.addEventListener('mousemove', doResize)
    document.addEventListener('mouseup', endResize)
  }

  // Column that feeds dashboard smoke cards + the status filter dropdown
  const smokeRoleCol = findDashboardRoleColumn(COLUMNS, 'smoke_status')
  const smokeFilterOptions = smokeRoleCol
    ? (smokeRoleCol.dropdown_options || []).map(o => o.label)
    : getColumnOptions('smoke_testing_status')

  const commitImportedRows = async (
    parsed: ReturnType<typeof parseImportRow>[],
  ) => {
    if (!parsed.length) return

    const newRecords: ReleaseTestingRecord[] = parsed.map(p => ({
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      ...emptyReleaseSystemFields(),
      ...p.systemFields,
      ...(p.errors.length ? { errors: p.errors } : {}),
    } as ReleaseTestingRecord))

    const customPayloads = parsed.map(p => p.customFields)
    const priorCount = releaseRows.length

    await setReleaseRows([...releaseRows, ...newRecords], true)

    const afterRows = useDailyReportStore.getState().releaseRows
    const importedSynced = afterRows.slice(Math.max(0, afterRows.length - newRecords.length))
    const targetRows = importedSynced.length === newRecords.length
      ? importedSynced
      : useDailyReportStore.getState().releaseRows.slice(priorCount)

    for (let i = 0; i < targetRows.length; i++) {
      const customs = customPayloads[i] || {}
      for (const [key, val] of Object.entries(customs)) {
        if (val === undefined || val === null || val === '') continue
        const col = COLUMNS.find(c => c.internal_key === key && !c.is_system)
        if (col) await dyn.setCustomValue(targetRows[i].id, col, val)
      }
    }

    const errorCount = parsed.filter(p => p.errors.length > 0).length
    if (errorCount > 0) {
      alert(`Import completed with warnings: ${parsed.length - errorCount} rows clean, ${errorCount} row(s) have validation issues (highlighted). Custom and renamed columns were mapped from the file headers.`)
    } else {
      alert(`Successfully imported ${parsed.length} row(s) using the current column configuration.`)
    }
  }

  // Paste — positional onto currently visible columns (system + custom)
  const handleClipboardPaste = async (e: React.ClipboardEvent) => {
    if (!canEdit && !canCreate) return
    e.preventDefault()
    const raw = e.clipboardData.getData('Text')
    const lines = raw.split(/\r?\n/).filter(line => line.length > 0)
    if (!lines.length) return

    const pasteCols = columnsForPaste(COLUMNS)
    const headers = pasteCols.map(c => c.display_name)
    const parsed = lines.map(line => parseImportRow('release', headers, line.split('\t'), COLUMNS))
    await commitImportedRows(parsed)
  }

  const exportToCSV = () => {
    const activeHeaders = columnsForExport(COLUMNS)
    const headerRow = activeHeaders.map(h => `"${h.display_name.replace(/"/g, '""')}"`).join(',')
    const rows = filteredRows.map(row =>
      activeHeaders.map(h => formatExportCell(h, dyn.getCellValue(row, h) ?? '')).join(',')
    )
    const blob = new Blob([[headerRow, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Release_Testing_Log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToExcel = () => {
    const activeHeaders = columnsForExport(COLUMNS)
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`
    html += `<head><meta charset="utf-8"/><style>table { border-collapse: collapse; } th { background-color: #1f2937; color: #ffffff; font-weight: bold; } th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-family: sans-serif; font-size: 11px; }</style></head>`
    html += `<body><h2>Release Testing Log</h2><table><thead><tr>`
    activeHeaders.forEach(h => { html += `<th>${h.display_name}</th>` })
    html += `</tr></thead><tbody>`
    filteredRows.forEach(row => {
      html += `<tr>`
      activeHeaders.forEach(h => {
        const val = dyn.getCellValue(row, h) ?? ''
        html += `<td>${val.toString()}</td>`
      })
      html += `</tr>`
    })
    html += `</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Release_Testing_Log_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const activeHeaders = columnsForExport(COLUMNS)
    const formatted = JSON.stringify(filteredRows.map(row => {
      const obj: Record<string, any> = {}
      activeHeaders.forEach(h => { obj[h.display_name] = dyn.getCellValue(row, h) ?? '' })
      return obj
    }), null, 2)
    const blob = new Blob([formatted], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Release_Testing_Log_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const openPrintFriendly = (triggerPrint = false) => {
    const activeHeaders = columnsForExport(COLUMNS)
    const title = 'Release Testing Log'
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let html = `<html><head><title>${title}</title><style>`
    html += `body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif; padding: 40px; color: #111827; background-color: #ffffff; }`
    html += `h1 { font-size: 22px; margin-bottom: 5px; color: #111827; font-weight: 800; }`
    html += `.meta { font-size: 11px; color: #6b7280; margin-bottom: 25px; }`
    html += `table { width: 100%; border-collapse: collapse; margin-top: 10px; }`
    html += `th { background-color: #f3f4f6; color: #374151; font-weight: bold; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }`
    html += `th, td { border: 1px solid #e5e7eb; padding: 8px 10px; text-align: left; font-size: 10px; vertical-align: top; word-break: break-word; }`
    html += `tr:nth-child(even) { background-color: #f9fafb; }`
    html += `.no-print { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; background-color: #111827; color: #ffffff; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 12px; margin-bottom: 20px; text-decoration: none; }`
    html += `@media print { .no-print { display: none; } body { padding: 0; } }`
    html += `</style></head><body>`
    html += `<h1>${title}</h1>`
    html += `<div class="meta">Generated: ${new Date().toLocaleString()} | Row count: ${filteredRows.length}</div>`
    html += `<button class="no-print" onclick="window.print()">Print Document</button>`
    html += `<table><thead><tr>`
    activeHeaders.forEach(h => { html += `<th>${h.display_name}</th>` })
    html += `</tr></thead><tbody>`
    filteredRows.forEach(row => {
      html += `<tr>`
      activeHeaders.forEach(h => {
        const val = dyn.getCellValue(row, h) ?? ''
        html += `<td>${val.toString()}</td>`
      })
      html += `</tr>`
    })
    html += `</tbody></table>`
    if (triggerPrint) html += `<script>window.onload = function() { window.print(); }</script>`
    html += `</body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCreate) {
      alert('Permission Denied: You do not have permission to import records.')
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()
    const headerMap = buildHeaderColumnMap(COLUMNS)

    const finishWithRows = async (headers: string[], dataRows: string[][]) => {
      const matched = headers.filter(h => headerMap.has(normalizeHeader(h)))
      if (matched.length === 0) {
        alert('Error: No file headers match the current table columns. Use Template download so headers match your Customize Columns labels (including custom columns).')
        return
      }
      const parsed = dataRows.map(row => parseImportRow('release', headers, row, COLUMNS))
      await commitImportedRows(parsed)
    }

    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result as ArrayBuffer
<<<<<<< Updated upstream
          if (!data) throw new Error("Could not read file contents.")

=======
          if (!data) throw new Error('Could not read file contents.')
          const XLSX = await import('xlsx')
>>>>>>> Stashed changes
          const workbook = XLSX.read(new Uint8Array(data), { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          if (!firstSheetName) throw new Error('Excel file does not contain any sheets.')
          const worksheet = workbook.Sheets[firstSheetName]
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          const jsonData = rawData.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''))
          if (jsonData.length < 2) {
            alert('The Excel file must contain a header row and at least one data row.')
            return
          }
          const headers = jsonData[0].map((h: any) => (h ? h.toString().trim() : ''))
          const dataRows = jsonData.slice(1).map(row => row.map((c: any) => (c !== undefined && c !== null ? c.toString() : '')))
          await finishWithRows(headers, dataRows)
        } catch (error: any) {
          alert(`Failed to import Excel file: ${error?.message || error || 'Unknown error'}`)
        }
      }
      reader.onerror = () => alert('Failed to read the file from disk.')
      reader.readAsArrayBuffer(file)
    } else if (fileName.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const text = evt.target?.result as string
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length < 2) {
            alert('The CSV file must contain a header row and at least one data row.')
            return
          }
          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
          const dataRows = lines.slice(1).map(line =>
            (line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(','))
              .map(val => val.replace(/^"|"$/g, '').trim())
          )
          await finishWithRows(headers, dataRows)
        } catch (error: any) {
          alert(`Failed to import CSV file: ${error?.message || error}`)
        }
      }
      reader.onerror = () => alert('Failed to read the file from disk.')
      reader.readAsText(file)
    } else {
      alert('Unsupported file format. Please upload a .csv, .xls, or .xlsx file.')
    }

    e.target.value = ''
  }

<<<<<<< Updated upstream
  // Template Download builder
  const downloadTemplate = (format: 'xlsx' | 'xls' | 'csv') => {
=======
  const downloadTemplate = async (format: 'xlsx' | 'xls' | 'csv') => {
>>>>>>> Stashed changes
    if (!canExport) {
      alert('Permission Denied: You do not have permission to download templates.')
      return
    }
<<<<<<< Updated upstream
    const headers = COLUMNS.map(c => c.label)

    // Create a realistic sample row
    const sampleRow = COLUMNS.map(col => {
      switch (col.id) {
        case 'task_id': return 'TASK-001'
        case 'description': return 'Smoke test of login page.'
        case 'qa': return getDropdownOptions('qa')[0] || 'Sarah Jenkins'
        case 'initial_round_estimation_hrs': return 2
        case 'testing_status': return getDropdownOptions('testing_status')[0] || 'In Progress'
        case 'smoke_testing_status': return getDropdownOptions('smoke_status')[0] || 'Pass'
        case 'scope_of_testing_for_smoke': return 'Verify standard login, MFA flow, and social login redirects.'
        case 'smoke_testing_estimation_hrs': return 1
        case 'overall_scope_of_testing': return 'Check standard and admin users.'
        case 'overall_estimation_hrs': return 3
        default: return ''
      }
    })

=======
    const templateCols = columnsForTemplate(COLUMNS)
    const XLSX = await import('xlsx')
    const headers = templateCols.map(c => c.display_name)
    const sampleRow = templateCols.map(col => sampleValueForColumn(col, getColumnOptions))
>>>>>>> Stashed changes
    const aoaData = [headers, sampleRow]

    if (format === 'csv') {
      const csvWS = XLSX.utils.aoa_to_sheet(aoaData)
      const csvContent = XLSX.utils.sheet_to_csv(csvWS)
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Daily_Release_Testing_Log_Template.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoaData)
    ws['!cols'] = templateCols.map(col => ({ wch: Math.max(col.display_name.length + 5, 14) }))
    ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

    const headerStyle = {
      font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '333333' } },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'E2E8F0' } },
        bottom: { style: 'medium', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'E2E8F0' } },
        right: { style: 'thin', color: { rgb: 'E2E8F0' } },
      },
    }
    const dataStyle = {
      font: { name: 'Segoe UI', sz: 10, color: { rgb: '444444' } },
      alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: 'F1F5F9' } },
        bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
        left: { style: 'thin', color: { rgb: 'F1F5F9' } },
        right: { style: 'thin', color: { rgb: 'F1F5F9' } },
      },
    }

    for (const key in ws) {
      if (key.startsWith('!')) continue
      const cell = ws[key]
      const colLetter = key.replace(/[0-9]/g, '')
      const rowIdx = parseInt(key.replace(/[A-Z]/g, ''), 10)
      let colIdx = 0
      for (let i = 0; i < colLetter.length; i++) colIdx = colIdx * 26 + (colLetter.charCodeAt(i) - 64)
      colIdx = colIdx - 1
      const col = templateCols[colIdx]
      if (col) {
        if (col.column_type === 'number' || col.column_type === 'percentage') {
          cell.t = 'n'
          cell.z = col.internal_key.includes('count') ? '0' : '0.0'
        } else if (col.column_type === 'date') {
          cell.z = 'yyyy-mm-dd'
        }
      }
      if (format === 'xlsx') cell.s = rowIdx === 1 ? headerStyle : dataStyle
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Template')

    const configAOA = buildConfigRefAOA(COLUMNS)
    const configWS = XLSX.utils.aoa_to_sheet(configAOA)
    configWS['!cols'] = (configAOA[0] || []).map(() => ({ wch: 22 }))
    if (format === 'xlsx') {
      for (const key in configWS) {
        if (key.startsWith('!')) continue
        const cell = configWS[key]
        const rowIdx = parseInt(key.replace(/[A-Z]/g, ''), 10)
        cell.s = rowIdx === 1 ? headerStyle : dataStyle
      }
    }
    XLSX.utils.book_append_sheet(wb, configWS, 'Configurations Ref')

<<<<<<< Updated upstream
      XLSX.utils.book_append_sheet(wb, ws, 'Template')

      // Dynamic Dropdowns Configuration reference list
      const configAOA = [
        ['QA Options', 'Testing Status Options', 'Smoke Status Options'],
      ]
      const qas = getDropdownOptions('qa')
      const testingStatuses = getDropdownOptions('testing_status')
      const smokeStatuses = getDropdownOptions('smoke_status')

      const maxLen = Math.max(qas.length, testingStatuses.length, smokeStatuses.length)
      for (let i = 0; i < maxLen; i++) {
        configAOA.push([
          qas[i] || '',
          testingStatuses[i] || '',
          smokeStatuses[i] || ''
        ])
      }

      const configWS = XLSX.utils.aoa_to_sheet(configAOA)
      configWS['!cols'] = [{ wch: 18 }, { wch: 20 }, { wch: 18 }]

      if (format === 'xlsx') {
        for (const key in configWS) {
          if (key.startsWith('!')) continue
          const cell = configWS[key]
          const rowIdx = parseInt(key.replace(/[A-Z]/g, ''), 10)
          if (rowIdx === 1) {
            cell.s = headerStyle
          } else {
            cell.s = dataStyle
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, configWS, 'Configurations Ref')

      if (format === 'xlsx') {
        XLSXStyle.writeFile(wb, 'Daily_Release_Testing_Log_Template.xlsx')
      } else {
        XLSX.writeFile(wb, 'Daily_Release_Testing_Log_Template.xls', { bookType: 'biff8' })
      }
=======
    if (format === 'xlsx') {
      const XLSXStyle = (await import('xlsx-js-style')).default
      XLSXStyle.writeFile(wb, 'Daily_Release_Testing_Log_Template.xlsx')
    } else {
      XLSX.writeFile(wb, 'Daily_Release_Testing_Log_Template.xls', { bookType: 'biff8' })
>>>>>>> Stashed changes
    }
  }

  // Filter / search / sort — all visible columns; smoke filter uses dashboard-role column
  const filteredRows = releaseRows
    .filter(row => {
      const q = search.toLowerCase()
      const matchSearch = !q || COLUMNS.filter(c => c.is_visible).some(col => {
        const v = dyn.getCellValue(row, col)
        return (v ?? '').toString().toLowerCase().includes(q)
      })

      const smokeVal = smokeRoleCol
        ? (dyn.getCellValue(row, smokeRoleCol) ?? '').toString()
        : (row.smoke_testing_status || '')
      const matchSmoke = smokeFilter === '' || smokeVal === smokeFilter
      return matchSearch && matchSmoke
    })
    .sort((a, b) => {
      if (!sortColumn) return 0
      const col = COLUMNS.find(c => c.internal_key === sortColumn)
      const aVal = col ? (dyn.getCellValue(a, col) ?? '') : ((a as any)[sortColumn] ?? '')
      const bVal = col ? (dyn.getCellValue(b, col) ?? '') : ((b as any)[sortColumn] ?? '')

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
      }
      return sortDirection === 'asc'
        ? aVal.toString().localeCompare(bVal.toString())
        : bVal.toString().localeCompare(aVal.toString())
    })

  const handleHeaderClick = (colId: string) => {
    if (sortColumn === colId) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else setSortColumn(null)
    } else {
      setSortColumn(colId)
      setSortDirection('asc')
    }
  }

  const visibleColumnsList = COLUMNS.filter(c => c.is_visible)

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4 overflow-visible relative">

      {/* Active column preset indicator */}
      <div
        className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg w-fit"
        style={{
          background: dyn.scope === 'organization' ? 'rgba(96,165,250,0.08)' : 'rgba(212,175,55,0.08)',
          border: `1px solid ${dyn.scope === 'organization' ? 'rgba(96,165,250,0.2)' : 'rgba(212,175,55,0.2)'}`,
          color: dyn.scope === 'organization' ? '#60a5fa' : 'var(--accent)',
        }}
        title={dyn.scope === 'organization'
          ? 'This project has no column configuration of its own, so the shared Organization Default preset is currently loaded.'
          : "This project's own saved column configuration is currently loaded."}
      >
        <Settings2 className="w-3 h-3 shrink-0" />
        {dyn.scope === 'organization'
          ? 'Organization Default Column Customization Preset was loaded'
          : `Project-Specific Column Configuration Loaded${currentProject?.project_name ? ` — ${currentProject.project_name}` : ''}`}
      </div>

      {/* Grid Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[280px]">

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs flex-1 max-w-xs transition-all focus-within:border-accent-gold/40">
            <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <input
              type="text"
              placeholder="Search spreadsheet rows..."
              className="bg-transparent focus:outline-none w-full placeholder:text-text-muted text-white text-xs"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <X className="w-3 h-3 cursor-pointer text-text-muted hover:text-white" onClick={() => setSearch('')} />}
          </div>

          {/* Status filter — options from the Dashboard Metrics source column */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs text-text-secondary select-none">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={smokeFilter}
              onChange={e => setSmokeFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-white cursor-pointer font-semibold"
            >
              <option value="" className="bg-[#121214]">
                All {smokeRoleCol?.display_name || 'Smoke Statuses'}
              </option>
              {smokeFilterOptions.map(opt => (
                <option key={opt} value={opt} className="bg-[#121214]">{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button grouping — each logical cluster (plus its trailing
            divider) is wrapped in its own flex group with shrink-0, so a
            divider always wraps together with the buttons it separates
            instead of landing on its own line at narrower widths. */}
        <div className="flex items-center gap-2 flex-wrap text-xs">

          <div className="flex items-center gap-2 shrink-0">
            {/* Customize Columns button */}
            {canManageColumns && (
              <button
                onClick={() => setShowCustomizeDrawer(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold whitespace-nowrap bg-white/5 border border-white/10 text-text-secondary hover:text-white"
                title="Customize QA Daily Update Columns"
              >
                <Settings2 className="w-3.5 h-3.5" />
                Customize Columns
              </button>
            )}

            {/* Dashboard Metrics — which column feeds Smoke Passed, Pending
                Smoke, Blocked Issues cards + option buckets. */}
            {canManageColumns && (
              <button
                onClick={() => setShowDashboardMetrics(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold whitespace-nowrap bg-white/5 border border-white/10 text-text-secondary hover:text-white"
                title="Configure which column feeds the summary dashboard cards"
              >
                <Gauge className="w-3.5 h-3.5" />
                Dashboard Metrics
              </button>
            )}

            {canManageColumns && <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />}
          </div>

          {/* Import/Export */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Template Download button */}
            {canExport && (
              <div className="relative">
                <button
                  onClick={() => setShowTemplateMenu(p => !p)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold whitespace-nowrap ${showTemplateMenu ? 'bg-accent-gold text-black' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white'}`}
                >
                  <Clipboard className="w-3.5 h-3.5" /> Template
                </button>
                <AnimatePresence>
                  {showTemplateMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowTemplateMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 z-40 w-48 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-2.5 shadow-2xl flex flex-col gap-1"
                      >
                        <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block border-b border-[var(--divider)] pb-1 px-1.5">Download Template</span>
                        <button
                          onClick={() => { downloadTemplate('xlsx'); setShowTemplateMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          Excel (.xlsx)
                        </button>
                        <button
                          onClick={() => { downloadTemplate('xls'); setShowTemplateMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          Excel 97-2003 (.xls)
                        </button>
                        <button
                          onClick={() => { downloadTemplate('csv'); setShowTemplateMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          CSV (.csv)
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {canCreate && (
              <>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all font-semibold whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" /> Import
                </button>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".csv, .xls, .xlsx, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={handleFileImport}
                />
              </>
            )}

            {canExport && (
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(p => !p)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold whitespace-nowrap ${showExportMenu ? 'bg-accent-gold text-black' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white'}`}
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <AnimatePresence>
                  {showExportMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 z-40 w-44 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-2.5 shadow-2xl flex flex-col gap-1"
                      >
                        <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block border-b border-[var(--divider)] pb-1 px-1.5">Format</span>
                        <button
                          onClick={() => { exportToExcel(); setShowExportMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          Excel (.xls)
                        </button>
                        <button
                          onClick={() => { exportToCSV(); setShowExportMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          CSV (.csv)
                        </button>
                        <button
                          onClick={() => { openPrintFriendly(true); setShowExportMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          PDF (.pdf)
                        </button>
                        <button
                          onClick={() => { exportToJSON(); setShowExportMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          JSON (.json)
                        </button>
                        <button
                          onClick={() => { openPrintFriendly(false); setShowExportMenu(false); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-semibold"
                        >
                          Print-Friendly View
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

            {/* Row actions — matches the text-xs/font-semibold sizing of
                every other toolbar button (see SupportExceptionLog.tsx for
                the same fix and reasoning). */}
            {canCreate && (
              <button
                onClick={addRow}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-gold/15 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/25 transition-all font-semibold whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            )}
            {canCreate && (
              <button
                onClick={duplicateSelected}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-semibold whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5" /> Dupe
              </button>
            )}
            {canDelete && (
              <button
                onClick={deleteSelected}
                disabled={selectedIds.size === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 disabled:opacity-30 disabled:pointer-events-none transition-all font-semibold whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div
        className="w-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] relative focus:outline-none shadow-lg"
        onPaste={handleClipboardPaste}
        tabIndex={0}
      >
        <table className="border-collapse text-left text-xs min-w-full" style={{ width: 'max-content', minWidth: '100%' }}>
          <thead>
            <tr className="border-b-2 border-[var(--border)] bg-gradient-to-r from-[#1a1a1c] to-[#252527] text-[10px] font-black uppercase tracking-wider select-none text-text-muted sticky top-0 z-20 shadow-md">
              <th className="py-3.5 px-4 w-[100px] min-w-[100px] sticky left-0 z-30 bg-gradient-to-r from-[#1a1a1c] to-[#252527] border-r-2 border-[var(--divider)] shadow-[4px_0_8px_rgba(0,0,0,0.15)]">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 text-accent-gold focus:ring-2 focus:ring-accent-gold/50 focus:ring-offset-0 bg-white/5 cursor-pointer scale-110"
                  />
                  <span className="text-[9px] uppercase tracking-wider text-text-muted font-extrabold">No.</span>
                </div>
              </th>

              {visibleColumnsList.map(col => {
                const width = getColWidth(col.id, col.column_type)
                const isSorted = sortColumn === col.internal_key

                return (
                  <th
                    key={col.id}
                    className="p-0 border-r border-[var(--divider)] relative group hover:bg-white/[0.02] transition-colors"
                    style={{ minWidth: width, width }}
                  >
                    <div
                      className="py-3.5 px-4 h-full w-full flex items-center justify-between cursor-pointer"
                      onClick={() => handleHeaderClick(col.internal_key)}
                    >
                      <span className="truncate font-extrabold flex items-center gap-1">
                        {col.display_name}
                        {col.is_required && <span className="text-red-400">*</span>}
                      </span>
                      {isSorted && (
                        <div className="ml-2 shrink-0">
                          {sortDirection === 'asc' ?
                            <ChevronUp className="w-4 h-4 text-accent-gold animate-pulse" /> :
                            <ChevronDown className="w-4 h-4 text-accent-gold animate-pulse" />
                          }
                        </div>
                      )}
                    </div>
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 bg-accent-gold/60 hover:bg-accent-gold transition-all duration-200 z-10"
                      onMouseDown={(e) => startResize(e, col.id, col.column_type)}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const isSelected = selectedIds.has(row.id)
              const importErrors: string[] = (row as any).errors || []
              const requiredErrors = dyn.validateRow(row)
              const allErrors = [...importErrors, ...requiredErrors]
              const hasErrors = allErrors.length > 0
              const isEvenRow = idx % 2 === 0

              return (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`text-xs border-b border-[var(--divider)] transition-all duration-150 hover:bg-white/[0.02] ${isSelected ? 'bg-accent-gold/[0.08] hover:bg-accent-gold/[0.12]' : isEvenRow ? 'bg-white/[0.01]' : 'bg-transparent'
                    } ${hasErrors ? '!bg-red-500/[0.04] border-l-4 border-l-red-500/70' : ''}`}
                >
                  <td className="py-3 px-4 sticky left-0 z-10 bg-[inherit] border-r border-[var(--divider)] shadow-[4px_0_8px_rgba(0,0,0,0.08)]">
                    <div className="flex items-center justify-between gap-2 min-w-[92px]">
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab text-text-muted hover:text-white shrink-0 active:cursor-grabbing p-0.5 hover:bg-white/5 rounded transition-colors">
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(row.id)}
                          className="rounded border-white/20 text-accent-gold focus:ring-2 focus:ring-accent-gold/50 focus:ring-offset-0 bg-white/5 cursor-pointer scale-110"
                        />
                        <ValidationTooltip errors={allErrors} />
                      </div>
                      <span className="text-[10px] text-text-muted font-mono font-bold">{idx + 1}</span>
                    </div>
                  </td>

                  {visibleColumnsList.map(col => {
                    const isEditing = activeCell?.rowId === row.id && activeCell?.colId === col.id
                    const width = getColWidth(col.id, col.column_type)
                    const cellVal = dyn.getCellValue(row, col)

                    return (
                      <td
                        key={col.id}
                        className="p-0 border-r border-[var(--divider)] relative align-top"
                        style={{ minWidth: width, width }}
                        onDoubleClick={() => {
                          if (canEdit) setActiveCell({ rowId: row.id, colId: col.id })
                        }}
                      >
                        {isEditing ? (
                          <div className={col.column_type === 'long_text' || col.column_type === 'multiselect'
                            ? "absolute left-0 right-0 top-0 z-20 min-h-[96px] bg-[var(--surface-elevated)] border-2 border-accent-gold p-2 shadow-2xl rounded-lg"
                            : "absolute inset-0 z-20 bg-[var(--surface-elevated)] border-2 border-accent-gold flex items-center p-1"
                          }>
                            <CellEditor
                              column={col}
                              value={cellVal}
                              onChange={(v) => updateCell(row.id, col, v)}
                              onBlur={() => setActiveCell(null)}
                              inputRef={editorInputRef}
                            />
                          </div>
                        ) : (
                          <div className={`py-3 px-4 w-full h-full text-text-secondary cursor-text hover:bg-[var(--hover)]/30 select-none min-h-[42px] transition-colors ${col.column_type === 'long_text' ? 'whitespace-pre-wrap break-words leading-relaxed' : 'truncate'}`}>
                            <CellDisplay column={col} value={cellVal} />
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumnsList.length + 1} className="py-16 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clipboard className="w-8 h-8 text-white/10" />
                    <span className="text-sm font-semibold">No Release Testing Log Entries</span>
                    <span className="text-xs max-w-xs leading-normal">
                      Click **Add Row** or copy/paste rows from Microsoft Excel using standard keyboard triggers.
                    </span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[10px] text-text-muted font-bold mt-1 px-1">
        <span>Rows: {filteredRows.length} selected: {selectedIds.size}</span>
        <span className="flex items-center gap-1.5">
          {syncStatus === 'synced' && <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Synced to Database</>}
          {syncStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Saving changes...</>}
          {syncStatus === 'local' && <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Draft Saved (Offline Mode)</>}
          {syncStatus === 'error' && <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Connection Error (Local Draft Saved)</>}
        </span>
      </div>

      {/* Customize Columns Drawer */}
      <CustomizeColumnsDrawer
        open={showCustomizeDrawer}
        onClose={() => setShowCustomizeDrawer(false)}
        tableKey="release"
        projectId={selectedProjectId}
        projectName={currentProject?.project_name}
      />

      {/* Dashboard Metrics Modal */}
      <DashboardMetricsModal
        open={showDashboardMetrics}
        onClose={() => setShowDashboardMetrics(false)}
        tableKey="release"
      />
    </GlassCard>
  )
}
