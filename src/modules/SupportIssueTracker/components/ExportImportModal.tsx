// src/modules/SupportIssueTracker/components/ExportImportModal.tsx
// Export and Import modal for Support Issue Tracker.
// Respects 'can_export' and 'can_import' permissions.
// Export respects active Product, Status, Tester, and Date filters.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Download, Upload, FileSpreadsheet, FileText, Check, AlertCircle,
  HelpCircle, ShieldCheck
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useSupportTrackerStore } from '../store'
import {
  exportSupportIssuesToCSV,
  exportSupportIssuesToExcel,
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

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialTab)
  const filteredIssues = getFilteredIssues()

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // Handle Export
  const handleExport = (format: 'excel' | 'csv') => {
    const timestamp = new Date().toISOString().split('T')[0]
    const filename = `support-issues-report-${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`

    if (format === 'excel') {
      exportSupportIssuesToExcel(filteredIssues, filename)
    } else {
      exportSupportIssuesToCSV(filteredIssues, filename)
    }

    logHistoryEvent({
      issue_id: 'EXPORT',
      product_name: filters.selectedProductId !== 'all'
        ? products.find(p => p.id === filters.selectedProductId)?.name || 'Filtered Product'
        : 'All Products',
      user_name: 'Ameen SR',
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

  // Handle Import File Change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet)

        if (!Array.isArray(json) || json.length === 0) {
          setImportErrors(['Uploaded file contains no rows or invalid format.'])
          return
        }

        const validProducts = new Set(products.map(p => p.name.toLowerCase()))
        const errors: string[] = []
        const parsedRows = json.map((row: any, idx: number) => {
          const rowNum = idx + 2
          const prodName = String(row['Product'] || row['product'] || '').trim()
          const desc = String(row['Support Issue Description'] || row['Description'] || row['description'] || '').trim()

          if (!prodName) {
            errors.push(`Row ${rowNum}: Product column is missing.`)
          } else if (!validProducts.has(prodName.toLowerCase())) {
            errors.push(`Row ${rowNum}: Product '${prodName}' does not exist in Project Hub. Products must match Project Hub.`)
          }

          if (!desc) {
            errors.push(`Row ${rowNum}: Description is missing.`)
          }

          const matchedProj = products.find(p => p.name.toLowerCase() === prodName.toLowerCase())

          return {
            rowNum,
            project_id: matchedProj?.id || products[0]?.id,
            product_name: matchedProj?.name || prodName,
            issue_id: row['Support Issue ID'] || row['Issue ID'] || `SUP-${1025 + issues.length + idx}`,
            description: desc,
            received_date: row['Received Date'] || new Date().toISOString().split('T')[0],
            start_date: row['Start Date'] || null,
            finish_date: row['Finish Date'] || null,
            tester_name: row["Who's Testing"] || row['Tester'] || 'Unassigned',
            estimated_hours: Number(row['Estimation Hrs'] || row['Estimated Hours'] || 8),
            actual_hours: Number(row['Actual Hrs'] || row['Actual Hours'] || 0),
            testing_status: row['Testing Status'] || row['Status'] || 'Not Started',
            comments: row['Comments'] || ''
          }
        })

        setImportErrors(errors)
        setImportPreview(parsedRows)
      } catch (err: any) {
        setImportErrors([`Failed to parse file: ${err.message}`])
      }
    }

    reader.readAsArrayBuffer(file)
  }

  // Confirm Import
  const handleConfirmImport = async () => {
    if (importPreview.length === 0 || importErrors.length > 0) return

    setIsProcessing(true)
    try {
      const currentUser = { name: 'Ameen SR' }
      let importedCount = 0

      for (const row of importPreview) {
        await addOrUpdateIssue(row, currentUser)
        importedCount++
      }

      logHistoryEvent({
        issue_id: 'IMPORT',
        product_name: 'All Products',
        user_name: currentUser.name,
        action: 'Import',
        field: 'Bulk Dataset',
        old_value: null,
        new_value: `${importedCount} support issues imported`
      })

      toast({
        title: 'Import Successful',
        description: `Imported ${importedCount} support issues successfully.`
      })
      onClose()
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

  // Sample CSV Template download
  const handleDownloadSample = () => {
    const p1 = products[0]?.name || 'Qaly AI Engine Core'
    const sampleHeaders = [
      'Product',
      'Support Issue ID',
      'Support Issue Description',
      'Received Date',
      'Start Date',
      'Finish Date',
      "Who's Testing",
      'Estimation Hrs',
      'Actual Hrs',
      'Testing Status',
      'Comments'
    ]
    const sampleRows = [
      [p1, 'SUP-1050', 'Sample defect description for automated test run', '2026-10-07', '2026-10-07', '', 'Ameen SR', 8, 2, 'In Testing', 'Verification sample']
    ]
    const content = [sampleHeaders.join(','), ...sampleRows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'support_issue_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-surface-elevated border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
          style={{ backgroundColor: 'var(--modal-bg, #141c2b)' }}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  {activeTab === 'export' ? <Download className="w-5 h-5" /> : <Upload className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    {activeTab === 'export' ? 'Export Support Issues' : 'Import Support Issues'}
                  </h3>
                  <p className="text-xs text-text-muted">
                    {activeTab === 'export'
                      ? 'Export the filtered dataset to Excel or CSV format'
                      : 'Bulk import issues mapped to existing Project Hub products'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-white/5">
              {canExport && (
                <button
                  type="button"
                  onClick={() => setActiveTab('export')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'export'
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  Export Data
                </button>
              )}
              {canImport && (
                <button
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'import'
                      ? 'bg-accent text-white shadow-xs'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  Import Data
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
              {activeTab === 'export' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface border border-white/10 space-y-2">
                    <span className="text-xs font-semibold text-text-primary block">
                      Active Scope Summary
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs text-text-muted">
                      <div>
                        Total Records:{' '}
                        <strong className="text-text-primary">{filteredIssues.length}</strong>
                      </div>
                      <div>
                        Scope:{' '}
                        <strong className="text-accent">
                          {filters.selectedProductId !== 'all'
                            ? products.find(p => p.id === filters.selectedProductId)?.name || 'Filtered'
                            : 'All Products'}
                        </strong>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted pt-1 border-t border-white/5">
                      Export will respect all currently applied product, status, tester, and date range filters.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleExport('excel')}
                      className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                          .XLSX
                        </Badge>
                      </div>
                      <span className="font-bold text-xs text-text-primary block">
                        Microsoft Excel
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Formatted workbook with autofit columns
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExport('csv')}
                      className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <FileText className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                        <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                          .CSV
                        </Badge>
                      </div>
                      <span className="font-bold text-xs text-text-primary block">
                        Standard CSV
                      </span>
                      <span className="text-[10px] text-text-muted">
                        Comma-separated plain text file
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'import' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-dashed border-white/20 bg-surface text-center space-y-2">
                    <Upload className="w-8 h-8 text-accent mx-auto" />
                    <div>
                      <span className="font-semibold text-xs text-text-primary block">
                        Upload Excel or CSV file
                      </span>
                      <span className="text-[11px] text-text-muted">
                        File must include Product (matching Project Hub), Description, and Status columns
                      </span>
                    </div>

                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="support-import-file-input"
                    />
                    <label
                      htmlFor="support-import-file-input"
                      className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white cursor-pointer transition-colors"
                    >
                      Browse Files
                    </label>

                    {importFile && (
                      <div className="text-xs text-accent font-medium mt-1">
                        Selected: {importFile.name} ({importPreview.length} rows parsed)
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Need a template format?</span>
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="text-accent hover:underline font-medium"
                    >
                      Download Sample CSV Template
                    </button>
                  </div>

                  {importErrors.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1 text-xs text-rose-300">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>Validation Errors:</span>
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

                  {importPreview.length > 0 && importErrors.length === 0 && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>
                          Ready to import <strong>{importPreview.length}</strong> valid rows.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        {isProcessing ? 'Importing...' : 'Confirm Import'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end shrink-0 bg-surface/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-white/10 text-text-primary border border-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
