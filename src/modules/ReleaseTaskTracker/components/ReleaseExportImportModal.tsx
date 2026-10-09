// src/modules/ReleaseTaskTracker/components/ReleaseExportImportModal.tsx
// Export & Import modal for Release Tasks supporting Excel (.xlsx) and CSV.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Upload, CheckCircle2,
  AlertCircle, FileText
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { useReleaseTrackerStore } from '../store'
import { exportReleaseTasksToExcel, exportReleaseTasksToCSV, generateNextTaskId } from '../releaseTrackerService'
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

  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const filteredTasks = getFilteredTasks()
  const isExport = initialTab === 'export'

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
      let skippedCount = 0
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        'QA Admin'

      // Running snapshot — grows as we import so task_ids stay sequential
      let runningTasks = [...tasks]

      // Dedup key: description + release_version + product (case-insensitive)
      const existingKeys = new Set(
        tasks.map(t =>
          `${t.description.trim().toLowerCase()}|${t.release_version.trim().toLowerCase()}|${t.product_name.trim().toLowerCase()}`
        )
      )

      for (const row of jsonData) {
        const prodName = row['Product'] || row['product'] || products[0]?.name || 'General Product'
        const matchedProduct = products.find(
          p => p.name.toLowerCase() === String(prodName).toLowerCase()
        ) || products[0]

        const desc = String(row['Task Description'] || row['Description'] || row['description'] || 'Imported Task').trim()
        const rel = String(row['Release'] || row['release'] || 'Release 1.0').trim()
        const prodNameResolved = (matchedProduct?.name || String(prodName)).trim()

        // Skip exact duplicates already in the store
        const dedupKey = `${desc.toLowerCase()}|${rel.toLowerCase()}|${prodNameResolved.toLowerCase()}`
        if (existingKeys.has(dedupKey)) {
          skippedCount++
          continue
        }
        existingKeys.add(dedupKey)

        const testDesignEst = parseFloat(row['Test Design Est'] || row['test_design_est_hrs'] || '0') || 0
        const dataPrepEst = parseFloat(row['Data Prep Est'] || row['data_prep_est_hrs'] || '0') || 0
        const functionalTestingEst = parseFloat(row['Functional Testing Est'] || row['functional_testing_est_hrs'] || row['Estimated Hrs'] || row['estimated_hours'] || '0') || 0
        const retestingEst = parseFloat(row['Retesting Est'] || row['retesting_est_hrs'] || '0') || 0
        const prio = row['Priority'] || row['priority'] || 'Medium'
        const status = row['Task Status'] || row['Status'] || row['status'] || 'Not Started'
        const assignee = row['QA Engineer'] || row["Who's Testing"] || row['Assigned To'] || row['assigned_to'] || 'Unassigned'
        const comments = row['Comments'] || row['comments'] || ''
        const receivedDateTime = row['Received Date/Time'] || row['received_date_time'] || null
        const startDate = row['Actual Start Date'] || row['start_date'] || null
        const actualEndDate = row['Actual End Date'] || row['actual_end_date'] || null

        const nextTaskId = generateNextTaskId(runningTasks)

        const saved = await addOrUpdateTask(
          {
            task_id: nextTaskId,
            project_id: matchedProduct?.id || products[0]?.id || '',
            product_name: prodNameResolved,
            product_code: matchedProduct?.project_code || null,
            release_version: rel,
            description: desc,
            priority: prio,
            received_date_time: receivedDateTime,
            start_date: startDate,
            actual_end_date: actualEndDate,
            assigned_to_name: assignee,
            test_design_est_hrs: testDesignEst,
            data_prep_est_hrs: dataPrepEst,
            functional_testing_est_hrs: functionalTestingEst,
            retesting_est_hrs: retestingEst,
            task_status: status,
            comments: String(comments)
          },
          { name: actorName, id: user?.id }
        )
        runningTasks = [...runningTasks, saved]
        importedCount++
      }

      const msg = skippedCount > 0
        ? `Imported ${importedCount} tasks. ${skippedCount} duplicate(s) skipped.`
        : `Successfully imported ${importedCount} release tasks!`
      setImportSummary(msg)
      toast({ title: 'Import Complete', description: msg })
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
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isExport
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                  : 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
              }`}>
                {isExport ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {isExport ? 'Export Release Tasks' : 'Import Release Tasks'}
                </h3>
                <p className="text-xs text-text-muted">
                  {isExport ? 'Download tasks as Excel or CSV' : 'Upload an Excel or CSV file to bulk-import tasks'}
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

          {/* Content */}
          <div className="p-5 space-y-4">
            {isExport && canExport && (
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

            {!isExport && canImport && (
              <div className="space-y-4">
                <p className="text-xs text-text-muted">
                  Upload an Excel or CSV file containing columns: <strong>Product, Release, Task Description, QA Engineer, Test Design Est, Data Prep Est, Functional Testing Est, Retesting Est, Task Status</strong>.
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
