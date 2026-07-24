import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Layers } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useColumnConfigStore } from '@/modules/DailyUpdateReport/columnConfigStore'
import { QATriageLoader, type LineData } from './QATriageLoader'
import { ContinuousQATriage } from './ContinuousQATriage'

interface ReleaseScopeModalProps {
  isOpen: boolean
  onClose: () => void
  releaseData: any[]
  visibleColumns: Record<string, boolean>
  projectId?: string
  projectName: string
}

// Unified column interface
interface ModalColumn {
  id: string
  label: string
  isCustomField?: boolean
}

// Base columns — must mirror the ReleaseItem fields used by ReleaseTable.tsx,
// since that's the actual shape of the data passed in as `releaseData`.
// (The DailyUpdateReport column-config store uses a different internal_key
// naming scheme and must NOT be used to derive these base columns.)
const DEFAULT_RELEASE_COLUMNS: ModalColumn[] = [
  { id: 'taskId', label: 'Task ID' },
  { id: 'featureName', label: 'Feature Name' },
  { id: 'assignee', label: 'Assignee' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'remarks', label: 'Remarks' },
]

// Loading script for the shared "qaly.ai / TRIAGE" terminal loader — mirrors the
// defect-triage script's rhythm but with release-specific phrasing.
const RELEASE_TRIAGE_SEQUENCE: LineData[] = [
  { id: 1, type: 'process', text: '> Loading release scope...' },
  { id: 2, type: 'process', text: '> Reading testing records...' },
  { id: 3, type: 'process', text: '> Mapping release status...' },
  { id: 4, type: 'process', text: '> Cross-checking sprint coverage...' },
  { id: 5, type: 'pass', text: '[PASS] Release records validated' },
  { id: 6, type: 'complete', text: '[PASS] Release scope synchronized' },
]

export function ReleaseScopeModal({
  isOpen,
  onClose,
  releaseData = [],
  visibleColumns,
  projectId,
  projectName
}: ReleaseScopeModalProps) {
  const { isDark } = useTheme()
  const { getColumns, fetchColumnConfigs } = useColumnConfigStore()

  const [isAnalyzing, setIsAnalyzing] = useState(true)
  const [displayedRecordsCount, setDisplayedRecordsCount] = useState(0)

  // Base columns come straight from the ReleaseItem shape (matches ReleaseTable.tsx).
  // Any dynamic "Create New" custom fields imported from the Daily Update Report are
  // keyed by that report's column internal_key inside `record.customFields`, so their
  // display labels are resolved from that column config store — but only for keys that
  // actually appear on the data, never as the base column list itself.
  const dupReleaseColumns = getColumns('release')

  const customFieldKeys = Array.from(
    new Set(releaseData.flatMap(r => r?.customFields ? Object.keys(r.customFields) : []))
  )

  const availableColumns: ModalColumn[] = [
    ...DEFAULT_RELEASE_COLUMNS,
    ...customFieldKeys.map(key => ({
      id: key,
      label: dupReleaseColumns.find(c => c.internal_key === key)?.display_name || key,
      isCustomField: true,
    })),
  ]

  // Filter active columns based on visibility settings (defaulting to true if not explicitly set to false in some cases, or strictly adhering to visibleColumns)
  const activeColumns = availableColumns.filter(col =>
    col.isCustomField || (visibleColumns && visibleColumns[col.id] !== undefined ? visibleColumns[col.id] : true)
  )

  useEffect(() => {
    if (isOpen) {
      fetchColumnConfigs('release', projectId || null)
      setIsAnalyzing(true)
      setDisplayedRecordsCount(0)
    }
  }, [isOpen, fetchColumnConfigs, projectId])

  // Progressively reveal records once the triage loader completes
  useEffect(() => {
    if (!isAnalyzing && displayedRecordsCount < releaseData.length) {
      const recordTimer = setTimeout(() => {
        setDisplayedRecordsCount(prev => prev + 1)
      }, 100) // Reveal records quickly but smoothly
      return () => clearTimeout(recordTimer)
    }
  }, [isAnalyzing, displayedRecordsCount, releaseData.length])

  // Helper to determine semantic colors for status values
  const getSemanticColor = (value: string, columnId: string) => {
    if (columnId.toLowerCase().includes('status') || columnId.toLowerCase().includes('priority')) {
      const s = String(value).toLowerCase()
      if (['completed', 'pass', 'passed', 'verified', 'successful', 'done', 'fixed', 'closed'].some(kw => s.includes(kw))) {
        return 'text-green-500 font-bold'
      }
      if (['failed', 'blocked', 'critical', 'fail', 'high'].some(kw => s.includes(kw))) {
        return 'text-red-500 font-bold'
      }
      if (['in progress', 'pending', 'hold', 'medium'].some(kw => s.includes(kw))) {
        return 'text-yellow-500 font-bold'
      }
      if (['active', 'open', 'low'].some(kw => s.includes(kw))) {
        return 'text-blue-500 font-bold'
      }
    }
    return 'text-text-primary'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Compact 3D Card Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 50, rotateX: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 50, rotateX: 12 }}
              transition={{
                type: "spring",
                stiffness: 280,
                damping: 22,
                duration: 0.35
              }}
              className="pointer-events-auto w-full max-w-4xl max-h-[85vh] flex flex-col"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className={`relative flex flex-col h-full rounded-[28px] border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'}`}
              >
                {/* Premium Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse pointer-events-none z-0" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none z-0" style={{ animationDelay: '1s' }} />

                {/* Ambient continuous typing animation once loaded */}
                {!isAnalyzing && <ContinuousQATriage opacity="opacity-[0.15]" position="bottom" />}

                {isAnalyzing ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <QATriageLoader
                      onComplete={() => setIsAnalyzing(false)}
                      sequence={RELEASE_TRIAGE_SEQUENCE}
                      brandLabel="RELEASE TRIAGE"
                    />
                  </div>
                ) : (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 flex flex-col h-full min-h-0"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                      <div className="flex-1">
                        <motion.h2
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-2xl font-bold text-text-primary flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Layers className="w-5 h-5 text-blue-400" />
                          </div>
                          Release Testing Log
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm text-text-secondary mt-2 font-mono"
                        >
                          <span className="text-accent-gold font-bold">qaly.ai / RELEASE TRIAGE</span> • {projectName}
                        </motion.p>
                      </div>
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={onClose}
                        className="w-9 h-9 rounded-lg bg-surface-elevated hover:bg-hover border border-border/30 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>

                    {/* Body — release records, revealed progressively */}
                    <div className="p-6 relative z-10 overflow-y-auto flex-1 min-h-0">
                      <div className="flex flex-col gap-3">
                        {releaseData.slice(0, displayedRecordsCount).map((record, rIdx) => (
                          <motion.div
                            key={`record-${rIdx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4 p-4 rounded-xl border border-border/30 bg-surface-elevated/50 backdrop-blur-sm hover:border-border/60 transition-all"
                          >
                            <div className="font-bold w-8 pt-1 opacity-50 text-text-primary">
                              {String(rIdx + 1).padStart(2, '0')}
                            </div>
                            <div className="flex flex-col gap-2 flex-1">
                              {activeColumns.map(col => {
                                const value = (col.isCustomField ? record.customFields?.[col.id] : record[col.id]) || '-'
                                return (
                                  <div key={col.id} className="grid grid-cols-[140px_1fr] gap-2 items-baseline">
                                    <span className="text-text-muted text-xs font-mono uppercase tracking-wide">
                                      {col.label}
                                    </span>
                                    <span className={`text-sm font-mono ${getSemanticColor(String(value), col.id)}`}>
                                      {String(value)}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </motion.div>
                        ))}

                        {/* Typing Cursor when records are still loading */}
                        {displayedRecordsCount < releaseData.length && (
                          <motion.div
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.8, repeat: Infinity }}
                            className="w-2 h-4 mt-2 bg-text-muted"
                          />
                        )}

                        {/* End marker when all records loaded */}
                        {displayedRecordsCount === releaseData.length && releaseData.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="text-center py-4 opacity-40 italic text-text-secondary font-mono text-sm"
                          >
                            -- End of Release Scope --
                          </motion.div>
                        )}

                        {/* Empty state */}
                        {displayedRecordsCount === releaseData.length && releaseData.length === 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="py-4 opacity-50 italic text-text-secondary font-mono text-sm"
                          >
                            No release items found.
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
