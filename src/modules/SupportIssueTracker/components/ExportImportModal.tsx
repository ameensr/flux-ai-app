// src/modules/SupportIssueTracker/components/ExportImportModal.tsx
// Export and Import modal for Support Issue Tracker.
// Respects 'can_export' and 'can_import' permissions.
// Export respects active Product, Status, Tester, and Date filters.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { useSupportTrackerStore } from '../store'
import {
  exportSupportIssuesToCSV,
  exportSupportIssuesToExcel,
  downloadSupportImportTemplate,
  parseImportRow,
  logHistoryEvent
} from '../supportTrackerService'
import * as XLSX from 'xlsx'

interface Props {
  isOpen: boolean
  initialTab?: 'export' | 'import'
  onClose: () => void
}

export function ExportImportModal({ isOpen, initialTab = 'export', onClose }: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canExport = can('support-tracker', 'can_export')
  const canImport = can('support-tracker', 'can_import')

  const {
    getFilteredIssues,
    filters,
    products,
    dropdownConfigs,
    issues,
    addOrUpdateIssue
  } = useSupportTrackerStore()

  const isExport = initialTab === 'export'
  const filteredIssues = getFilteredIssues()

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [importSummary, setImportSummary] = useState<string | null>(null)

  const handleExport = (format: 'excel' | 'csv') => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `support-issues-report-${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`

    if (format === 'excel') {
      exportSupportIssuesToExcel(filteredIssues, filename)
    } else {
      exportSupportIssuesToCSV(filteredIssues, filename)
    }

    const actorName = (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string
    logHistoryEvent({
      issue_id: 'EXPORT',
      product_name: filters.selectedProductId !== 'all'
        ? products.find(p => p.id === filters.selectedProductId)?.name || 'Filtered Product'
        : 'All Products',
      user_name: actorName,
      action: 'Export',
      field: `${format.toUpperCase()} Export`,
      old_value: null,
      new_value: `${filteredIssues.length} issues exported`
    })

    toast({
      title: 'Export Generated',
      description: `Downloaded ${filteredIssues.length} issues as ${format.toUpperCase()}`
    })
    onClose()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportFile(file)
    setImportSummary(null)
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json(worksheet)
        if (!Array.isArray(json) || json.length === 0) {
          setImportErrors(['Uploaded file contains no rows or invalid format.'])
          setImportPreview([])
          return
        }
        const allErrors: string[] = []
        const parsedRows: any[] = []
        json.forEach((row: any, idx: number) => {
          const { parsed, errors } = parseImportRow(row, idx, products, issues, dropdownConfigs)
          allErrors.push(...errors)
          parsedRows.push({ rowNum: idx + 2, ...parsed })
        })
        setImportErrors(allErrors)
        setImportPreview(parsedRows)
      } catch (err: any) {
        setImportErrors([`Failed to parse file: ${err.message}`])
        setImportPreview([])
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const handleConfirmImport = async () => {
    if (importPreview.length === 0 || importErrors.length > 0) return
    setIsProcessing(true)
    try {
      const actorName = (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string
      const currentUser = { name: actorName, id: user?.id }
      let importedCount = 0
      let skippedCount = 0

      const existingKeys = new Set(
        issues.map(i =>
          `${i.description.trim().toLowerCase()}|${i.product_name.trim().toLowerCase()}`
        )
      )

      for (const row of importPreview) {
        const dedupKey = `${String(row.description).trim().toLowerCase()}|${String(row.product_name).trim().toLowerCase()}`
        if (existingKeys.has(dedupKey)) { skippedCount++; continue }
        existingKeys.add(dedupKey)
        await addOrUpdateIssue(row, currentUser)
        importedCount++
      }

      logHistoryEvent({
        issue_id: 'IMPORT',
        product_name: 'All Products',
        user_name: actorName,
        action: 'Import',
        field: 'Bulk Dataset',
        old_value: null,
        new_value: `${importedCount} support issues imported`
      })

      const msg = skippedCount > 0
        ? `Imported ${importedCount} issues. ${skippedCount} duplicate(s) skipped.`
        : `Imported ${importedCount} support issues successfully.`
      setImportSummary(msg)
      toast({ title: 'Import Successful', description: msg })
      setImportFile(null)
      setImportPreview([])
      setImportErrors([])
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: err.message || 'Error occurred while saving imported rows'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal */}
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
                  {isExport ? 'Export Support Issues' : 'Import Support Issues'}
                </h3>
                <p className="text-xs text-text-muted">
                  {isExport
                    ? 'Download the filtered dataset as Excel or CSV'
                    : 'Upload an Excel or CSV file to bulk-import issues'}
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
            {/* ── Export ── */}
            {isExport && canExport && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl border border-white/10 bg-surface-elevated/40 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted">Current Filter Scope:</span>
                    <strong className="text-text-primary font-bold">{filteredIssues.length} issues</strong>
                  </div>
                  <div className="text-[11px] text-text-muted pt-1">
                    Export respects active Product, Status, Tester, and Date Range filters.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleExport('excel')}
                    className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Download Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="h-11 rounded-xl bg-surface-elevated hover:bg-surface border border-white/10 text-text-primary text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Download CSV
                  </button>
                </div>
              </div>
            )}

            {/* ── Import ── */}
            {!isExport && canImport && (
              <div className="space-y-4">
                <p className="text-xs text-text-muted">
                  Upload an Excel or CSV file containing columns: <strong>Product, Description, Received Date, Status</strong> and any optional fields.
                </p>

                <button
                  type="button"
                  onClick={() => downloadSupportImportTemplate(products)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Excel Template (.xlsx)
                </button>

                <label className="border-2 border-dashed border-white/15 hover:border-accent/40 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-surface-elevated/30">
                  <Upload className="w-8 h-8 text-accent" />
                  <span className="text-xs font-bold text-text-primary">
                    {isProcessing ? 'Processing File...' : 'Choose .xlsx or .csv File'}
                  </span>
                  {importFile && !importSummary && (
                    <span className="text-[11px] text-accent font-medium">
                      {importFile.name} — {importPreview.length} row{importPreview.length !== 1 ? 's' : ''} parsed
                    </span>
                  )}
                  <span className="text-[10px] text-text-muted">Click to browse local files</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    disabled={isProcessing}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Validation errors */}
                {importErrors.length > 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1 text-xs text-rose-300">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>Validation Errors ({importErrors.length}):</span>
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                      {importErrors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                    {importErrors.length > 5 && (
                      <span className="text-[10px] text-rose-400 block pt-1">
                        + {importErrors.length - 5} more errors
                      </span>
                    )}
                  </div>
                )}

                {/* Ready to import */}
                {importPreview.length > 0 && importErrors.length === 0 && !importSummary && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs text-blue-300">
                    <span>
                      Ready to import <strong>{importPreview.length}</strong> valid row{importPreview.length !== 1 ? 's' : ''}.
                    </span>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={isProcessing}
                      className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? 'Importing...' : 'Confirm Import'}
                    </button>
                  </div>
                )}

                {/* Success summary */}
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
