// src/modules/ReleaseTaskTracker/components/ReleaseExportImportModal.tsx
// Export & Import modal for Release Tasks supporting Excel (.xlsx) and CSV.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Upload, FileSpreadsheet, CheckCircle2,
  AlertCircle, FileText
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { useReleaseTrackerStore } from '../store'
import { exportReleaseTasksToExcel, exportReleaseTasksToCSV } from '../releaseTrackerService'
import * as XLSX from 'xlsx'

interface Props {
  isOpen: boolean
  initialTab?: 'export' | 'import'
  onClose: () => void
}

export function ReleaseExportImportModal({
  isOpen,
  initialTab = 'export',
  onClose
}: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canExport = can('release-tracker', 'can_export')
  const canImport = can('release-tracker', 'can_import')

  const {
    getFilteredTasks,
    filters,
    products,
    tasks,
    addOrUpdateTask
  } = useReleaseTrackerStore()

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab)
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const filteredTasks = getFilteredTasks()

  if (!isOpen) return null

  const handleExport = (format: 'xlsx' | 'csv') => {
    try {
      const dateStr = new Date().toISOString().split('T')[0]
      const relLabel = filters.selectedRelease !== 'all' ? `_${filters.selectedRelease}` : ''
      const filename = `Release_Tasks${relLabel}_${dateStr}.${format}`

      if (format === 'xlsx') {
        exportReleaseTasksToExcel(filteredTasks, filename)
      } else {
        exportReleaseTasksToCSV(filteredTasks, filename)
      }

      toast({
        title: 'Export Complete',
        description: `Exported ${filteredTasks.length} release tasks to ${format.toUpperCase()}`
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: err.message || 'Could not export release tasks'
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportSummary(null)

    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error('Spreadsheet appears to be empty')
      }

      let importedCount = 0
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        'QA Admin'

      for (const row of jsonData) {
        const prodName = row['Product'] || row['product'] || products[0]?.name || 'General Product'
        const matchedProduct = products.find(
          p => p.name.toLowerCase() === String(prodName).toLowerCase()
        ) || products[0]

        const desc = row['Task Description'] || row['Description'] || row['description'] || 'Imported Task'
        const rel = row['Release'] || row['release'] || 'Release 1.0'
        const est = parseFloat(row['Estimated Hrs'] || row['estimated_hours'] || '0') || 0
        const prio = row['Priority'] || row['priority'] || 'Medium'
        const status = row['Task Status'] || row['Status'] || row['status'] || 'Not Started'
        const assignee = row['Assigned To'] || row['assigned_to'] || 'Unassigned'
        const comments = row['Comments'] || row['comments'] || ''

        await addOrUpdateTask(
          {
            project_id: matchedProduct?.id || products[0]?.id || '',
            product_name: matchedProduct?.name || prodName,
            product_code: matchedProduct?.project_code || null,
            release_version: String(rel).trim(),
            description: String(desc).trim(),
            priority: prio,
            estimated_hours: est,
            task_status: status,
            assigned_to_name: assignee,
            comments: String(comments)
          },
          { name: actorName, id: user?.id }
        )
        importedCount++
      }

      setImportSummary(`Successfully imported ${importedCount} release tasks!`)
      toast({
        title: 'Import Successful',
        description: `Imported ${importedCount} release tasks`
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err.message || 'Could not parse spreadsheet'
      })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-surface border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Export / Import Release Tasks
                </h3>
                <p className="text-xs text-text-muted">
                  Excel (.xlsx) and CSV spreadsheet integration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 bg-surface-elevated/40 px-5 pt-2 gap-2">
            {canExport && (
              <button
                type="button"
                onClick={() => setActiveTab('export')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'export'
                    ? 'border-emerald-400 text-emerald-300'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                Export
              </button>
            )}
            {canImport && (
              <button
                type="button"
                onClick={() => setActiveTab('import')}
                className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
                  activeTab === 'import'
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                Import
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {activeTab === 'export' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-white/10 bg-surface-elevated/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Current Filter Scope:</span>
                    <strong className="text-text-primary font-bold">{filteredTasks.length} tasks</strong>
                  </div>
                  <div className="text-[11px] text-text-muted pt-1">
                    Export preserves current Product ({filters.selectedProductId}), Release ({filters.selectedRelease}), Status, and Priority filters.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="h-11 rounded-xl bg-surface-elevated hover:bg-surface border border-white/10 text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'import' && (
              <div className="space-y-4">
                <p className="text-xs text-text-muted">
                  Upload an Excel or CSV file containing columns: <strong>Product, Release, Task Description, Priority, Estimated Hrs, Task Status, Assigned To</strong>.
                </p>

                <label className="border-2 border-dashed border-white/15 hover:border-accent/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-elevated/30">
                  <Upload className="w-8 h-8 text-accent" />
                  <span className="text-xs font-bold text-text-primary">
                    {importing ? 'Processing File...' : 'Choose .xlsx or .csv File'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Click to browse local files
                  </span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    disabled={importing}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {importSummary && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{importSummary}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/10 bg-surface-elevated/70 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-xl border border-white/10 text-xs font-medium text-text-primary hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
