import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Trash2, Copy, Search, Filter, Columns, Download, Upload,
  GripVertical, ChevronUp, ChevronDown, Check, X, Calendar, Clipboard, AlertCircle, Clock
} from 'lucide-react'
import { useDailyReportStore } from '../store'
import { usePermissions } from '@/hooks/usePermissions'
import type { SupportLogRecord, ConfigCategory } from '../types'
import { GlassCard } from '@/components/ui/GlassCard'
import * as XLSX from 'xlsx'
import XLSXStyle from 'xlsx-js-style'



const COLUMNS = [
  { id: 'support_id', label: 'Support ID', type: 'text', defaultWidth: 120 },
  { id: 'bug_id', label: 'Bug ID', type: 'text', defaultWidth: 100 },
  { id: 'branch', label: 'Branch', type: 'select', category: 'branch', defaultWidth: 120 },
  { id: 'description', label: 'Description', type: 'textarea', defaultWidth: 200 },
  { id: 'received_date', label: 'Received Date', type: 'date', defaultWidth: 140 },
  { id: 'qa', label: 'QA', type: 'select', category: 'qa', defaultWidth: 140 },
  { id: 'tc_count', label: 'TC Count', type: 'number', defaultWidth: 100 },
  { id: 'estimation_hrs', label: 'Estimation (Hrs)', type: 'number', defaultWidth: 140 },
  { id: 'actual_start_date', label: 'Actual Start Date', type: 'date', defaultWidth: 140 },
  { id: 'planned_end_date', label: 'Planned End Date', type: 'date', defaultWidth: 140 },
  { id: 'actual_end_date', label: 'Actual End Date', type: 'date', defaultWidth: 140 },
  { id: 'status', label: 'Status', type: 'select', category: 'status', defaultWidth: 120 },
  { id: 'comments', label: 'Comments', type: 'textarea', defaultWidth: 200 },
  { id: 'blocked_hours', label: 'Blocked Hours', type: 'number', defaultWidth: 120 },
  { id: 'retesting_status', label: 'Retesting Status', type: 'select', category: 'retesting_status', defaultWidth: 140 },
  { id: 'retesting_estimation_hrs', label: 'Retesting Est (Hrs)', type: 'number', defaultWidth: 140 },
  { id: 'issue_source', label: 'Issue Source', type: 'select', category: 'issue_source', defaultWidth: 150 },
]

export const SupportExceptionLog: React.FC = () => {
  const {
    supportRows,
    setSupportRows,
    dropdownConfigs,
    syncStatus,
    overdueOnlyFilter
  } = useDailyReportStore()

  const todayStr = new Date().toISOString().split('T')[0]

  const { can } = usePermissions()
  const canCreate = can('daily-report', 'can_create')
  const canEdit = can('daily-report', 'can_edit')
  const canDelete = can('daily-report', 'can_delete')
  const canExport = can('daily-report', 'can_export')

  const getRowHealth = (row: SupportLogRecord) => {
    if (row.actual_end_date) {
      return { icon: '✅', label: 'Completed' }
    }
    if (!row.planned_end_date) {
      return { icon: '🟢', label: 'On Track' }
    }
    if (row.planned_end_date === todayStr) {
      return { icon: '🟡', label: 'Due Today' }
    }
    if (row.planned_end_date < todayStr) {
      return { icon: '🔴', label: 'Overdue' }
    }
    return { icon: '🟢', label: 'On Track' }
  }

  const getDaysOverdueText = (plannedDateStr: string) => {
    if (!plannedDateStr) return ''
    const t = new Date(todayStr).getTime()
    const p = new Date(plannedDateStr).getTime()
    const diffTime = t - p
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return ''
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day overdue'
    return `${diffDays} days overdue`
  }

  // Grid states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultWidth }), {})
  )
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    COLUMNS.reduce((acc, col) => ({ ...acc, [col.id]: true }), {})
  )
  const [showColumnMenu, setShowColumnMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showTemplateMenu, setShowTemplateMenu] = useState(false)
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

  // Get active dropdown options filtered by config state (is_active === true)
  const getDropdownOptions = (category: ConfigCategory) => {
    return dropdownConfigs
      .filter(c => c.category === category && c.is_active)
      .map(c => c.value)
  }

  // Actions
  const addRow = () => {
    if (!canCreate) return
    const newRow: SupportLogRecord = {
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      support_id: '',
      bug_id: '',
      branch: '',
      description: '',
      received_date: '',
      qa: '',
      tc_count: '',
      estimation_hrs: '',
      actual_start_date: '',
      planned_end_date: '',
      actual_end_date: '',
      status: '',
      comments: '',
      blocked_hours: '',
      retesting_status: '',
      retesting_estimation_hrs: ''
    }
    setSupportRows([...supportRows, newRow])
  }

  // Duplicate selected rows
  const duplicateSelected = () => {
    if (!canCreate) return
    if (selectedIds.size === 0) return
    const duplicated = supportRows.filter(r => selectedIds.has(r.id)).map(r => ({
      ...r,
      id: `temp-${Math.random().toString(36).substr(2, 9)}`,
      support_id: r.support_id ? `${r.support_id} (Copy)` : ''
    }))
    setSupportRows([...supportRows, ...duplicated])
    setSelectedIds(new Set())
  }

  // Delete selected rows
  const deleteSelected = () => {
    if (!canDelete) return
    if (selectedIds.size === 0) return
    // Force immediate sync to prevent rows from reappearing on refresh
    setSupportRows(supportRows.filter(r => !selectedIds.has(r.id)), true)
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
  const updateCell = (rowId: string, colId: string, value: any) => {
    if (!canEdit) return
    const nextRows = supportRows.map(row => {
      if (row.id === rowId) {
        return { ...row, [colId]: value }
      }
      return row
    })
    setSupportRows(nextRows)
  }

  // Native HTML5 Drag and Drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (sourceIndex === targetIndex || isNaN(sourceIndex)) return
    const nextRows = [...supportRows]
    const [removed] = nextRows.splice(sourceIndex, 1)
    nextRows.splice(targetIndex, 0, removed)
    setSupportRows(nextRows)
  }

  // Column Resizer logic
  const startResize = (e: React.MouseEvent, colId: string) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = columnWidths[colId] || 120

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

  // Excel paste integration (TSV)
  const handleClipboardPaste = (e: React.ClipboardEvent) => {
    if (!canEdit) return
    e.preventDefault()
    const raw = e.clipboardData.getData('Text')
    const lines = raw.split(/\r?\n/).filter(line => line.length > 0)

    // Map lines to new records
    const newRecords: SupportLogRecord[] = lines.map(line => {
      const parts = line.split('\t')
      return {
        id: `temp-${Math.random().toString(36).substr(2, 9)}`,
        support_id: parts[0] || '',
        bug_id: parts[1] || '',
        branch: parts[2] || '',
        description: parts[3] || '',
        received_date: parts[4] || '',
        qa: parts[5] || '',
        tc_count: parts[6] ? parseInt(parts[6], 10) || '' : '',
        estimation_hrs: parts[7] ? parseFloat(parts[7]) || '' : '',
        actual_start_date: parts[8] || '',
        planned_end_date: parts[9] || '',
        actual_end_date: parts[10] || '',
        status: parts[11] || '',
        comments: parts[12] || '',
        blocked_hours: parts[13] ? parseFloat(parts[13]) || '' : '',
        retesting_status: parts[14] || '',
        retesting_estimation_hrs: parts[15] ? parseFloat(parts[15]) || '' : '',
      }
    })

    setSupportRows([...supportRows, ...newRecords])
  }

  // CSV Export
  const exportToCSV = () => {
    const activeHeaders = COLUMNS.filter(c => visibleColumns[c.id])
    const headerRow = activeHeaders.map(h => `"${h.label.replace(/"/g, '""')}"`).join(',')

    const rows = filteredRows.map(row => {
      return activeHeaders.map(h => {
        const val = (row as any)[h.id] ?? ''
        const colDef = COLUMNS.find(c => c.id === h.id)
        if (colDef?.type === 'date' && val) {
          // Prepend single quote to force text formatting in Excel and prevent ### display narrow columns bug
          return `"'${val.toString().replace(/"/g, '""')}"`
        }
        return `"${val.toString().replace(/"/g, '""')}"`
      }).join(',')
    })

    const blob = new Blob([[headerRow, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Support_Exception_Log_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Excel (.xlsx/.xls layout format) Export
  const exportToExcel = () => {
    const activeHeaders = COLUMNS.filter(c => visibleColumns[c.id])
    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`
    html += `<head><meta charset="utf-8"/><style>table { border-collapse: collapse; } th { background-color: #1f2937; color: #ffffff; font-weight: bold; } th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-family: sans-serif; font-size: 11px; }</style></head>`
    html += `<body><h2>Support & Exception Log</h2><table><thead><tr>`
    activeHeaders.forEach(h => {
      html += `<th>${h.label}</th>`
    })
    html += `</tr></thead><tbody>`
    filteredRows.forEach(row => {
      html += `<tr>`
      activeHeaders.forEach(h => {
        const val = (row as any)[h.id] ?? ''
        html += `<td>${val.toString()}</td>`
      })
      html += `</tr>`
    })
    html += `</tbody></table></body></html>`

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Support_Exception_Log_${new Date().toISOString().split('T')[0]}.xls`
    a.click()
    URL.revokeObjectURL(url)
  }

  // JSON Export
  const exportToJSON = () => {
    const formatted = JSON.stringify(filteredRows.map(({ id, ...rest }) => rest), null, 2)
    const blob = new Blob([formatted], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Support_Exception_Log_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Print-Friendly / PDF Window
  const openPrintFriendly = (triggerPrint = false) => {
    const activeHeaders = COLUMNS.filter(c => visibleColumns[c.id])
    const title = 'Support & Exception Log'
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
    activeHeaders.forEach(h => {
      html += `<th>${h.label}</th>`
    })
    html += `</tr></thead><tbody>`
    filteredRows.forEach(row => {
      html += `<tr>`
      activeHeaders.forEach(h => {
        const val = (row as any)[h.id] ?? ''
        html += `<td>${val.toString()}</td>`
      })
      html += `</tr>`
    })
    html += `</tbody></table>`
    if (triggerPrint) {
      html += `<script>window.onload = function() { window.print(); }</script>`
    }
    html += `</body></html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  // CSV / Excel Import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCreate) {
      alert("Permission Denied: You do not have permission to import records.")
      return
    }
    const file = e.target.files?.[0]
    if (!file) return

    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result as ArrayBuffer
          if (!data) throw new Error("Could not read file contents.")

          const workbook = XLSX.read(new Uint8Array(data), { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          if (!firstSheetName) throw new Error("Excel file does not contain any sheets.")

          const worksheet = workbook.Sheets[firstSheetName]
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

          // Filter out empty rows from the spreadsheet
          const jsonData = rawData.filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''))

          if (jsonData.length < 2) {
            alert("The Excel file must contain a header row and at least one data row.")
            return
          }

          // First row is headers
          const headers = jsonData[0].map((h: any) => (h ? h.toString().trim() : ''))
          const categoryMap = COLUMNS.reduce((acc, col) => ({ ...acc, [col.label]: col.id }), {} as Record<string, string>)

          // Validate headers match
          const matchedColumns = headers.filter(h => categoryMap[h])
          if (matchedColumns.length === 0) {
            alert("Error: The uploaded Excel file headers do not match any columns in the table. Please make sure the column headers match the spreadsheet header names (e.g. Support ID, Bug ID, etc.).")
            return
          }

          const imported = jsonData.slice(1).map(row => {
            const record: any = { id: `temp-${Math.random().toString(36).substr(2, 9)}` }
            const rowErrors: string[] = []

            headers.forEach((h, idx) => {
              const colId = categoryMap[h]
              if (colId) {
                let val = row[idx] !== undefined && row[idx] !== null ? row[idx].toString().trim() : ''
                if (val.startsWith("'")) {
                  val = val.substring(1)
                }
                const colDef = COLUMNS.find(c => c.id === colId)
                if (colDef?.type === 'number') {
                  if (val === '') {
                    record[colId] = ''
                  } else {
                    const parsed = parseFloat(val)
                    if (isNaN(parsed)) {
                      rowErrors.push(`${h} must be a number (got: '${val}')`)
                      record[colId] = ''
                    } else {
                      record[colId] = parsed
                    }
                  }
                } else if (colDef?.type === 'date') {
                  if (val === '') {
                    record[colId] = ''
                  } else {
                    const dateObj = new Date(val)
                    if (isNaN(dateObj.getTime())) {
                      rowErrors.push(`${h} must be a valid date YYYY-MM-DD (got: '${val}')`)
                    }
                    record[colId] = val
                  }
                } else {
                  record[colId] = val
                }
              }
            })

            // Post-parsing validations
            if (!record.support_id) {
              rowErrors.push("Support ID is required.")
            }
            if (!record.description) {
              rowErrors.push("Description is required.")
            }

            if (record.branch) {
              const branches = getDropdownOptions('branch').map(b => b.toLowerCase())
              if (!branches.includes(record.branch.toLowerCase())) {
                rowErrors.push(`Branch '${record.branch}' is not configured.`)
              }
            }
            if (record.qa) {
              const qas = getDropdownOptions('qa').map(q => q.toLowerCase())
              if (!qas.includes(record.qa.toLowerCase())) {
                rowErrors.push(`QA '${record.qa}' is not configured.`)
              }
            }
            if (record.status) {
              const statuses = getDropdownOptions('status').map(s => s.toLowerCase())
              if (!statuses.includes(record.status.toLowerCase())) {
                rowErrors.push(`Status '${record.status}' is not configured.`)
              }
            }
            if (record.retesting_status) {
              const retestingStatuses = getDropdownOptions('retesting_status').map(r => r.toLowerCase())
              if (!retestingStatuses.includes(record.retesting_status.toLowerCase())) {
                rowErrors.push(`Retesting Status '${record.retesting_status}' is not configured.`)
              }
            }
            if (record.issue_source) {
              const issueSources = getDropdownOptions('issue_source').map(i => i.toLowerCase())
              if (!issueSources.includes(record.issue_source.toLowerCase())) {
                rowErrors.push(`Issue Source '${record.issue_source}' is not configured.`)
              }
            }

            if (rowErrors.length > 0) {
              record.errors = rowErrors
            }

            return record as SupportLogRecord
          })

          const errorCount = imported.filter(r => (r as any).errors).length
          if (errorCount > 0) {
            alert(`Import completed with warnings: ${imported.length - errorCount} rows successfully imported, and ${errorCount} rows have validation issues. Rows with errors are highlighted with alert icons. Please correct the cells inline inside the table.`)
          } else {
            alert(`Successfully imported ${imported.length} rows!`)
          }

          // Force immediate sync to prevent data loss on navigation
          setSupportRows([...supportRows, ...imported], true)
        } catch (error: any) {
          alert(`Failed to import Excel file: ${error?.message || error || "Unknown error parsing Excel sheet structure"}`)
        }
      }
      reader.onerror = () => {
        alert("Failed to read the file from disk.")
      }
      reader.readAsArrayBuffer(file)
    } else if (fileName.endsWith('.csv')) {
      if (!canCreate) {
        alert("Permission Denied: You do not have permission to import records.")
        return
      }
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
          if (lines.length < 2) {
            alert("The CSV file must contain a header row and at least one data row.")
            return
          }

          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())
          const categoryMap = COLUMNS.reduce((acc, col) => ({ ...acc, [col.label]: col.id }), {} as Record<string, string>)

          const matchedColumns = headers.filter(h => categoryMap[h])
          if (matchedColumns.length === 0) {
            alert("Error: The uploaded CSV file headers do not match any columns in the table.")
            return
          }

          const imported = lines.slice(1).map(line => {
            const rowData = (line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(','))
              .map(val => val.replace(/^"|"$/g, '').trim())

            const record: any = { id: `temp-${Math.random().toString(36).substr(2, 9)}` }
            const rowErrors: string[] = []

            headers.forEach((h, idx) => {
              const colId = categoryMap[h]
              if (colId) {
                let val = rowData[idx] ?? ''
                if (val.startsWith("'")) {
                  val = val.substring(1)
                }
                const colDef = COLUMNS.find(c => c.id === colId)
                if (colDef?.type === 'number') {
                  if (val === '') {
                    record[colId] = ''
                  } else {
                    const parsed = parseFloat(val)
                    if (isNaN(parsed)) {
                      rowErrors.push(`${h} must be a number (got: '${val}')`)
                      record[colId] = ''
                    } else {
                      record[colId] = parsed
                    }
                  }
                } else if (colDef?.type === 'date') {
                  if (val === '') {
                    record[colId] = ''
                  } else {
                    const dateObj = new Date(val)
                    if (isNaN(dateObj.getTime())) {
                      rowErrors.push(`${h} must be a valid date YYYY-MM-DD (got: '${val}')`)
                    }
                    record[colId] = val
                  }
                } else {
                  record[colId] = val
                }
              }
            })

            // Post-parsing validations
            if (!record.support_id) {
              rowErrors.push("Support ID is required.")
            }
            if (!record.description) {
              rowErrors.push("Description is required.")
            }

            if (record.branch) {
              const branches = getDropdownOptions('branch').map(b => b.toLowerCase())
              if (!branches.includes(record.branch.toLowerCase())) {
                rowErrors.push(`Branch '${record.branch}' is not configured.`)
              }
            }
            if (record.qa) {
              const qas = getDropdownOptions('qa').map(q => q.toLowerCase())
              if (!qas.includes(record.qa.toLowerCase())) {
                rowErrors.push(`QA '${record.qa}' is not configured.`)
              }
            }
            if (record.status) {
              const statuses = getDropdownOptions('status').map(s => s.toLowerCase())
              if (!statuses.includes(record.status.toLowerCase())) {
                rowErrors.push(`Status '${record.status}' is not configured.`)
              }
            }
            if (record.retesting_status) {
              const retestingStatuses = getDropdownOptions('retesting_status').map(r => r.toLowerCase())
              if (!retestingStatuses.includes(record.retesting_status.toLowerCase())) {
                rowErrors.push(`Retesting Status '${record.retesting_status}' is not configured.`)
              }
            }
            if (record.issue_source) {
              const issueSources = getDropdownOptions('issue_source').map(i => i.toLowerCase())
              if (!issueSources.includes(record.issue_source.toLowerCase())) {
                rowErrors.push(`Issue Source '${record.issue_source}' is not configured.`)
              }
            }

            if (rowErrors.length > 0) {
              record.errors = rowErrors
            }

            return record as SupportLogRecord
          })

          const errorCount = imported.filter(r => (r as any).errors).length
          if (errorCount > 0) {
            alert(`Import completed with warnings: ${imported.length - errorCount} rows successfully imported, and ${errorCount} rows have validation issues. Rows with errors are highlighted with alert icons. Please correct the cells inline inside the table.`)
          } else {
            alert(`Successfully imported ${imported.length} rows!`)
          }

          // Force immediate sync to prevent data loss on navigation
          setSupportRows([...supportRows, ...imported], true)
        } catch (error: any) {
          alert(`Failed to import CSV file: ${error?.message || error}`)
        }
      }
      reader.onerror = () => {
        alert("Failed to read the file from disk.")
      }
      reader.readAsText(file)
    } else {
      alert("Unsupported file format. Please upload a .csv, .xls, or .xlsx file.")
    }

    e.target.value = ''
  }

  // Template Download builder
  const downloadTemplate = (format: 'xlsx' | 'xls' | 'csv') => {
    if (!canExport) {
      alert("Permission Denied: You do not have permission to download templates.")
      return
    }
    const headers = COLUMNS.map(c => c.label)

    // Create a realistic sample row
    const sampleRow = COLUMNS.map(col => {
      switch (col.id) {
        case 'support_id': return '100/101'
        case 'bug_id': return 'BUG-999'
        case 'branch': return getDropdownOptions('branch')[0] || 'Dev'
        case 'description': return 'Initial investigation of exception trace.'
        case 'received_date': return '2026-07-03'
        case 'qa': return getDropdownOptions('qa')[0] || 'Sarah Jenkins'
        case 'tc_count': return 5
        case 'estimation_hrs': return 4.5
        case 'actual_start_date': return '2026-07-03'
        case 'planned_end_date': return '2026-07-04'
        case 'status': return getDropdownOptions('status')[0] || 'In Progress'
        case 'comments': return 'Retrying on staging server.'
        case 'blocked_hours': return 0
        case 'retesting_status': return getDropdownOptions('retesting_status')[0] || 'Pending'
        case 'retesting_estimation_hrs': return 1
        case 'issue_source': return getDropdownOptions('issue_source')[0] || 'Internal Testing'
        default: return ''
      }
    })

    const aoaData = [headers, sampleRow]

    if (format === 'csv') {
      const csvWS = XLSX.utils.aoa_to_sheet(aoaData)
      const csvContent = XLSX.utils.sheet_to_csv(csvWS)

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Daily_Support_Template.csv')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(aoaData)

      // Auto-fit column widths
      const colWidths = COLUMNS.map(col => {
        const labelLen = col.label.length
        return { wch: Math.max(labelLen + 5, 14) }
      })
      ws['!cols'] = colWidths

      // Freeze header row
      ws['!views'] = [{ state: 'frozen', ySplit: 1 }]

      // Cell styles
      const headerStyle = {
        font: { name: 'Segoe UI', sz: 10, bold: true, color: { rgb: '333333' } },
        fill: { fgColor: { rgb: 'F1F5F9' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'medium', color: { rgb: 'CBD5E1' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        }
      }

      const dataStyle = {
        font: { name: 'Segoe UI', sz: 10, color: { rgb: '444444' } },
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'F1F5F9' } },
          bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
          left: { style: 'thin', color: { rgb: 'F1F5F9' } },
          right: { style: 'thin', color: { rgb: 'F1F5F9' } }
        }
      }

      // Add types, formatting and borders to cells
      for (const key in ws) {
        if (key.startsWith('!')) continue
        const cell = ws[key]
        const colLetter = key.replace(/[0-9]/g, '')
        const rowIdx = parseInt(key.replace(/[A-Z]/g, ''), 10)

        let colIdx = 0
        for (let i = 0; i < colLetter.length; i++) {
          colIdx = colIdx * 26 + (colLetter.charCodeAt(i) - 64)
        }
        colIdx = colIdx - 1

        const col = COLUMNS[colIdx]
        if (col) {
          if (col.type === 'number') {
            cell.t = 'n'
            cell.z = col.id.includes('count') ? '0' : '0.0'
          } else if (col.type === 'date') {
            cell.z = 'yyyy-mm-dd'
          }
        }

        if (format === 'xlsx') {
          if (rowIdx === 1) {
            cell.s = headerStyle
          } else {
            cell.s = dataStyle
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Template')

      // Dynamic Dropdowns Configuration reference list
      const configAOA = [
        ['Branch Options', 'QA Options', 'Status Options', 'Retesting Status Options'],
      ]
      const branches = getDropdownOptions('branch')
      const qas = getDropdownOptions('qa')
      const statuses = getDropdownOptions('status')
      const retestingStatuses = getDropdownOptions('retesting_status')

      const maxLen = Math.max(branches.length, qas.length, statuses.length, retestingStatuses.length)
      for (let i = 0; i < maxLen; i++) {
        configAOA.push([
          branches[i] || '',
          qas[i] || '',
          statuses[i] || '',
          retestingStatuses[i] || ''
        ])
      }

      const configWS = XLSX.utils.aoa_to_sheet(configAOA)
      configWS['!cols'] = [{ wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]

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
        XLSXStyle.writeFile(wb, 'Daily_Support_Template.xlsx')
      } else {
        XLSX.writeFile(wb, 'Daily_Support_Template.xls', { bookType: 'biff8' })
      }
    }
  }

  // Filter & Search & Sort
  const filteredRows = supportRows
    .filter(row => {
      if (overdueOnlyFilter) {
        const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date < todayStr  // Changed: < instead of <=
        if (!isOverdue) return false
      }

      const matchSearch =
        (row.support_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (row.bug_id || '').toLowerCase().includes(search.toLowerCase()) ||
        (row.qa || '').toLowerCase().includes(search.toLowerCase()) ||
        (row.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (row.comments || '').toLowerCase().includes(search.toLowerCase())

      const matchStatus = statusFilter === '' || row.status === statusFilter
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      if (!sortColumn) return 0
      const aVal = (a as any)[sortColumn] ?? ''
      const bVal = (b as any)[sortColumn] ?? ''

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

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4 overflow-visible relative">

      {/* Grid Toolbar Controls */}
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

          {/* Status Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs text-text-secondary select-none">
            <Filter className="w-3.5 h-3.5 text-text-muted" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent focus:outline-none text-xs text-white cursor-pointer font-semibold"
            >
              <option value="" className="bg-[#121214]">All Statuses</option>
              {getDropdownOptions('status').map(opt => (
                <option key={opt} value={opt} className="bg-[#121214]">{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action button grouping */}
        <div className="flex items-center gap-2 flex-wrap text-xs">

          {/* Column Customizer button */}
          <div className="relative">
            <button
              onClick={() => setShowColumnMenu(p => !p)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold ${showColumnMenu ? 'bg-accent-gold text-black' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white'}`}
            >
              <Columns className="w-3.5 h-3.5" />
              Columns
            </button>
            <AnimatePresence>
              {showColumnMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 z-40 w-56 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border)] p-3 shadow-2xl flex flex-col gap-2"
                  >
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block border-b border-[var(--divider)] pb-1">Show/Hide Columns</span>
                    <div className="max-h-60 overflow-y-auto flex flex-col gap-1.5">
                      {COLUMNS.map(col => (
                        <label key={col.id} className="flex items-center gap-2.5 cursor-pointer text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                          <input
                            type="checkbox"
                            checked={visibleColumns[col.id]}
                            onChange={e => setVisibleColumns(prev => ({ ...prev, [col.id]: e.target.checked }))}
                            className="rounded border-white/10 text-accent-gold focus:ring-0 focus:ring-offset-0 bg-transparent"
                          />
                          {col.label}
                        </label>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Import/Export buttons */}
          {/* Template Download button */}
          {canExport && (
            <div className="relative">
              <button
                onClick={() => setShowTemplateMenu(p => !p)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold ${showTemplateMenu ? 'bg-accent-gold text-black' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white'}`}
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all font-semibold"
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-semibold ${showExportMenu ? 'bg-accent-gold text-black' : 'bg-white/5 border border-white/10 text-text-secondary hover:text-white'}`}
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

          <div className="w-px h-6 bg-white/10 mx-1" />

          {/* Row actions */}
          {canCreate && (
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-gold/15 border border-accent-gold/30 text-accent-gold hover:bg-accent-gold/25 transition-all font-extrabold uppercase tracking-wider text-[10px]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          )}
          {canCreate && (
            <button
              onClick={duplicateSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all font-semibold"
            >
              <Copy className="w-3.5 h-3.5" /> Dupe
            </button>
          )}
          {canDelete && (
            <button
              onClick={deleteSelected}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 disabled:opacity-30 disabled:pointer-events-none transition-all font-semibold"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet grid container */}
      <div
        className="w-full overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] relative focus:outline-none shadow-sm"
        onPaste={handleClipboardPaste}
        tabIndex={0}
      >
        <table className="border-collapse text-left text-xs min-w-full table-fixed" style={{ width: Object.values(columnWidths).reduce((a, b) => a + b, 0) + 120 }}>
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-secondary)] text-[10px] font-black uppercase tracking-wider select-none text-text-muted">
              {/* First cell: Drag and checkbox headers */}
              <th className="py-3 px-3.5 w-20 sticky left-0 z-30 bg-[inherit] border-r border-[var(--divider)] flex items-center justify-between gap-1 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                <input
                  type="checkbox"
                  checked={filteredRows.length > 0 && selectedIds.size === filteredRows.length}
                  onChange={toggleSelectAll}
                  className="rounded border-white/10 text-accent-gold focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                />
                <span className="text-[8px] uppercase tracking-wide text-text-muted">No.</span>
              </th>

              {/* Dynamic headers */}
              {COLUMNS.map(col => {
                if (!visibleColumns[col.id]) return null
                const width = columnWidths[col.id] || col.defaultWidth
                const isSorted = sortColumn === col.id

                return (
                  <th
                    key={col.id}
                    className="p-0 border-r border-[var(--divider)] relative group"
                    style={{ width }}
                  >
                    <div
                      className="py-3 px-3.5 h-full w-full flex items-center justify-between cursor-pointer hover:bg-[var(--hover)] transition-colors"
                      onClick={() => handleHeaderClick(col.id)}
                    >
                      <span className="truncate">{col.label}</span>
                      {isSorted && (sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-accent-gold ml-1" /> : <ChevronDown className="w-3.5 h-3.5 text-accent-gold ml-1" />)}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 group-hover:opacity-100 bg-accent-gold/40 hover:bg-accent-gold transition-opacity duration-300 z-10"
                      onMouseDown={(e) => startResize(e, col.id)}
                    />
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const isSelected = selectedIds.has(row.id)
              const hasErrors = !!(row as any).errors
              return (
                <tr
                  key={row.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, idx)}
                  className={`premium-table-row text-xs border-[var(--divider)] ${isSelected ? 'row-selected' : ''} ${hasErrors ? '!bg-red-500/[0.03] border-l-2 border-l-red-500/50' : ''}`}
                >
                  {/* Select + Drag cell */}
                  <td className="py-2.5 px-3 sticky left-0 z-10 bg-[inherit] border-r border-[var(--divider)] flex items-center justify-between gap-1 shadow-[2px_0_5px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-1">
                      <div className="cursor-grab text-text-muted hover:text-white shrink-0 active:cursor-grabbing p-0.5">
                        <GripVertical className="w-3 h-3" />
                      </div>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(row.id)}
                        className="rounded border-white/10 text-accent-gold focus:ring-0 focus:ring-offset-0 bg-transparent cursor-pointer"
                      />
                      <span className="cursor-default select-none text-[13px] ml-0.5" title={`Health: ${getRowHealth(row).label}`}>
                        {getRowHealth(row).icon}
                      </span>
                      {hasErrors && (
                        <div className="relative group shrink-0" title={(row as any).errors.join('\n')}>
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 animate-pulse cursor-help" />
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 hidden group-hover:block z-50 w-64 bg-red-950/95 border border-red-500/40 text-red-200 text-[10px] p-2.5 rounded-lg shadow-xl backdrop-blur-md">
                            <span className="font-bold block border-b border-red-500/20 pb-1 mb-1">Import Validation Errors</span>
                            {(row as any).errors.map((err: string, i: number) => (
                              <span key={i} className="block mt-0.5">• {err}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-text-muted font-mono">{idx + 1}</span>
                  </td>

                  {/* Dynamic cells */}
                  {COLUMNS.map(col => {
                    if (!visibleColumns[col.id]) return null
                    const isEditing = activeCell?.rowId === row.id && activeCell?.colId === col.id
                    const width = columnWidths[col.id] || col.defaultWidth
                    const cellVal = (row as any)[col.id] ?? ''

                    return (
                      <td
                        key={col.id}
                        className="p-0 border-r border-[var(--divider)] relative truncate align-top"
                        style={{ width }}
                        onDoubleClick={() => {
                          if (canEdit) {
                            setActiveCell({ rowId: row.id, colId: col.id })
                          }
                        }}
                      >
                        {isEditing ? (
                          <div className={col.type === 'textarea'
                            ? "absolute left-0 right-0 top-0 z-20 min-h-[96px] bg-[var(--surface-elevated)] border border-accent-gold p-1 shadow-2xl rounded-lg"
                            : "absolute inset-0 z-20 bg-[var(--surface-elevated)] border border-accent-gold flex items-center p-0.5"
                          }>
                            {col.type === 'select' ? (
                              <select
                                ref={editorInputRef}
                                value={cellVal}
                                onChange={e => updateCell(row.id, col.id, e.target.value)}
                                onBlur={() => setActiveCell(null)}
                                className="w-full h-full bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-0 focus:ring-0"
                              >
                                <option value="" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">Choose Option...</option>
                                {getDropdownOptions(col.category as ConfigCategory).map(opt => (
                                  <option key={opt} value={opt} className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">{opt}</option>
                                ))}
                              </select>
                            ) : col.type === 'textarea' ? (
                              <textarea
                                ref={editorInputRef}
                                value={cellVal}
                                onChange={e => updateCell(row.id, col.id, e.target.value)}
                                onBlur={() => setActiveCell(null)}
                                onPaste={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    setActiveCell(null)
                                  }
                                }}
                                className="w-full h-24 bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-1 focus:ring-0 resize-y font-sans"
                              />
                            ) : col.type === 'date' ? (
                              <input
                                ref={editorInputRef}
                                type="date"
                                value={cellVal}
                                onChange={e => updateCell(row.id, col.id, e.target.value)}
                                onBlur={() => setActiveCell(null)}
                                onPaste={e => e.stopPropagation()}
                                className="w-full h-full bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-1 focus:ring-0 dark:[color-scheme:dark]"
                              />
                            ) : (
                              <input
                                ref={editorInputRef}
                                type={col.type === 'number' ? 'number' : 'text'}
                                value={cellVal}
                                onChange={e => {
                                  const val = e.target.value
                                  updateCell(row.id, col.id, col.type === 'number' ? (val === '' ? '' : parseFloat(val)) : val)
                                }}
                                onBlur={() => setActiveCell(null)}
                                onPaste={e => e.stopPropagation()}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') setActiveCell(null)
                                }}
                                className="w-full h-full bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-1 focus:ring-0 font-sans"
                              />
                            )}
                          </div>
                        ) : (
                          <div className={`py-3 px-3.5 w-full h-full text-text-secondary cursor-text hover:bg-[var(--hover)]/15 select-none min-h-[38px] ${col.type === 'textarea' ? 'whitespace-pre-wrap break-words' : 'truncate'}`}>
                            {col.type === 'date' && cellVal ? (
                              col.id === 'planned_end_date' && !row.actual_end_date && cellVal <= todayStr ? (
                                <div
                                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold text-xs w-fit select-none group/overdue relative cursor-help"
                                  title="Planned End Date has passed. Actual End Date is still pending."
                                >
                                  <Clock className="w-3.5 h-3.5 shrink-0 animate-pulse text-rose-500" />
                                  <span>{cellVal}</span>
                                  <span className="text-[9px] uppercase tracking-wider font-extrabold bg-rose-500/20 px-1 rounded ml-1 text-rose-300">
                                    {getDaysOverdueText(cellVal)}
                                  </span>
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/overdue:block z-50 w-56 bg-rose-950/95 border border-rose-500/30 text-rose-200 text-[10px] p-2.5 rounded-lg shadow-xl backdrop-blur-md text-center leading-normal">
                                    Planned End Date has passed. Actual End Date is still pending.
                                  </div>
                                </div>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-text-muted shrink-0" />
                                  {cellVal}
                                </span>
                              )
                            ) : cellVal === '' ? (
                              <span className="text-[10px] italic text-text-muted select-none opacity-40">empty</span>
                            ) : (
                              cellVal
                            )}
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
                <td colSpan={COLUMNS.filter(c => visibleColumns[c.id]).length + 1} className="py-16 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clipboard className="w-8 h-8 text-white/10" />
                    <span className="text-sm font-semibold">No Log Entries Found</span>
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

      {/* Autosave status overlay indicator */}
      <div className="flex items-center justify-between text-[10px] text-text-muted font-bold mt-1 px-1">
        <span>Rows: {filteredRows.length} selected: {selectedIds.size}</span>
        <span className="flex items-center gap-1.5">
          {syncStatus === 'synced' && <><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Synced to Database</>}
          {syncStatus === 'saving' && <><span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" /> Saving changes...</>}
          {syncStatus === 'local' && <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> Draft Saved (Offline Mode)</>}
          {syncStatus === 'error' && <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Connection Error (Local Draft Saved)</>}
        </span>
      </div>
    </GlassCard>
  )
}
