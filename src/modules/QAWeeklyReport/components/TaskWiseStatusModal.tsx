// src/modules/QAWeeklyReport/components/TaskWiseStatusModal.tsx
// Interactive 3D Card Popup for Task-Wise Status with Parent-wise breakdown

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, LayoutGrid, CheckCircle, AlertTriangle, FileSpreadsheet, Search, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { TaskWiseAnalytics } from './ReleaseBugStatus/taskWiseTypes'
import { ContinuousQATriage } from './ContinuousQATriage'

interface TaskWiseStatusModalProps {
  isOpen: boolean
  onClose: () => void
  taskWiseStatus: TaskWiseAnalytics | null
  projectName: string
}

// Status color mapping
function getStatusColor(status: string, idx: number): string {
  const s = (status || '').toLowerCase()
  if (['closed', 'done', 'completed', 'resolved', 'verified'].some(v => s.includes(v))) return '#10b981'
  if (['open', 'new', 'active'].some(v => s.includes(v))) return '#3b82f6'
  if (['in progress', 'in-progress', 'wip'].some(v => s.includes(v))) return '#8b5cf6'
  if (['blocked', 'failed', 'rejected'].some(v => s.includes(v))) return '#ef4444'
  if (['deferred', 'on hold', 'pending'].some(v => s.includes(v))) return '#f59e0b'
  if (['fixed', 'ready'].some(v => s.includes(v))) return '#06b6d4'
  const palette = ['#6366f1', '#ec4899', '#14b8a6', '#f97316', '#84cc16']
  return palette[idx % palette.length]
}

export function TaskWiseStatusModal({
  isOpen,
  onClose,
  taskWiseStatus,
  projectName
}: TaskWiseStatusModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setExpandedParents({})
    }
  }, [isOpen])

  if (!taskWiseStatus) return null

  const filteredParents = taskWiseStatus.parentWiseStatus.filter(p =>
    p.parent.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleParent = (parent: string) => {
    setExpandedParents(prev => ({ ...prev, [parent]: !prev[parent] }))
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
            className="fixed inset-0 z-[100]"
            style={{ background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.35)' }}
            onClick={onClose}
          />

          {/* 3D Card Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-hidden"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className={`relative rounded-[28px] border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'}`}
              >
                {/* Premium Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-purple-500/5 opacity-50 pointer-events-none z-0" />

                {/* Glow effects */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Continuous typing animation */}
                <ContinuousQATriage opacity="opacity-[0.15]" position="bottom" />

                {/* Content */}
                <div className="relative z-10 flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="flex items-start justify-between p-6 pb-4 border-b border-border/30 shrink-0">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <LayoutGrid className="w-5 h-5 text-blue-400" />
                        </div>
                        Task-Wise Status Breakdown
                      </h2>
                      <p className="text-sm text-text-secondary mt-2">
                        {projectName} • {taskWiseStatus.rawRowCount} Records • {taskWiseStatus.uniqueParents} Parents
                      </p>
                    </div>
                    <button
                      onClick={onClose}
                      className="w-9 h-9 rounded-lg bg-surface-elevated hover:bg-hover border border-border/30 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Body - Scrollable */}
                  <div className="p-6 overflow-y-auto flex-1">
                    {/* Data Source Badge */}
                    <div className="mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        {taskWiseStatus.uploadedFileName}
                        <span className="text-text-muted ml-1">
                          ({new Date(taskWiseStatus.uploadedAt).toLocaleDateString()})
                        </span>
                      </div>
                    </div>

                    {/* Summary KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: 'Total Records', val: taskWiseStatus.rawRowCount, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Unique Parents', val: taskWiseStatus.uniqueParents, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { label: 'Unique Statuses', val: taskWiseStatus.uniqueStatuses?.length || 0, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Blank Parents', val: taskWiseStatus.validation?.blankParentCount || 0, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                      ].map((kpi) => (
                        <div
                          key={kpi.label}
                          className={`p-4 rounded-xl border border-border/30 ${kpi.bg} flex flex-col justify-between min-h-[80px]`}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted block mb-2">{kpi.label}</span>
                          <span className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Overall Status Summary */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Overall Status Distribution</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {taskWiseStatus.overallStatus.map((status, idx) => {
                          const color = getStatusColor(status.status, idx)
                          const percent = taskWiseStatus.rawRowCount > 0 ? ((status.count / taskWiseStatus.rawRowCount) * 100).toFixed(1) : '0'
                          return (
                            <div
                              key={status.status}
                              className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 hover:border-border/60 transition-all"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-xs font-medium text-text-primary truncate">{status.status}</span>
                              </div>
                              <div className="flex items-end justify-between">
                                <span className="text-xl font-bold" style={{ color }}>{status.count}</span>
                                <span className="text-[10px] text-text-muted">{percent}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                        <Search className="w-4 h-4 text-text-muted" />
                        <input
                          type="text"
                          placeholder="Search parents..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="text-text-muted hover:text-text-primary">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Parent-Wise Breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-4">
                        Parent-Wise Breakdown
                        <span className="ml-2 text-sm font-normal text-text-muted">
                          ({filteredParents.length} of {taskWiseStatus.parentWiseStatus.length})
                        </span>
                      </h3>

                      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {filteredParents.map((parent) => {
                          const isExpanded = expandedParents[parent.parent]
                          return (
                            <div
                              key={parent.parent}
                              className={`rounded-xl border overflow-hidden transition-all ${isDark ? 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12]' : 'bg-white border-slate-200 hover:border-slate-300'}`}
                            >
                              {/* Parent Header */}
                              <button
                                onClick={() => toggleParent(parent.parent)}
                                className="w-full flex items-center justify-between p-4 text-left hover:bg-hover/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${isDark ? 'bg-accent-gold/10 text-accent-gold' : 'bg-amber-100 text-amber-700'}`}>
                                    {parent.total}
                                  </div>
                                  <span className="font-medium text-text-primary truncate" title={parent.parent}>{parent.parent}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  {/* Mini status pills */}
                                  <div className="hidden sm:flex items-center gap-1">
                                    {taskWiseStatus.uniqueStatuses.slice(0, 4).map((status, sIdx) => {
                                      const count = parent.statusCounts?.[status] || 0
                                      if (count === 0) return null
                                      return (
                                        <span
                                          key={status}
                                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                          style={{
                                            backgroundColor: `${getStatusColor(status, sIdx)}20`,
                                            color: getStatusColor(status, sIdx)
                                          }}
                                        >
                                          {count}
                                        </span>
                                      )
                                    })}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-text-muted" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-text-muted" />
                                  )}
                                </div>
                              </button>

                              {/* Expanded Content */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                        {taskWiseStatus.uniqueStatuses.map((status, sIdx) => {
                                          const count = parent.statusCounts?.[status] || 0
                                          const color = getStatusColor(status, sIdx)
                                          return (
                                            <div
                                              key={status}
                                              className={`p-2.5 rounded-lg border ${isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-50 border-slate-100'}`}
                                            >
                                              <div className="flex items-center gap-1.5 mb-1">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                                <span className="text-[10px] text-text-muted truncate">{status}</span>
                                              </div>
                                              <span className="text-lg font-bold" style={{ color: count > 0 ? color : 'var(--text-muted)' }}>
                                                {count}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}

                        {filteredParents.length === 0 && (
                          <div className={`p-8 text-center rounded-xl border border-dashed ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <Search className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
                            <p className="text-sm text-text-muted">No parents found matching "{searchQuery}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Validation Summary */}
                    {taskWiseStatus.validation && (
                      <div className="mt-6 pt-6 border-t border-border/30">
                        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${taskWiseStatus.validation.totalRecordsMatch ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                            {taskWiseStatus.validation.totalRecordsMatch ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          Data Validation
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <ValidationItem
                            label="Total Records"
                            value={taskWiseStatus.rawRowCount.toString()}
                            passed={taskWiseStatus.validation.totalRecordsMatch}
                            isDark={isDark}
                          />
                          <ValidationItem
                            label="Status Totals"
                            value="Match"
                            passed={taskWiseStatus.validation.overallStatusTotalMatch}
                            isDark={isDark}
                          />
                          {taskWiseStatus.parentColumn && (
                            <ValidationItem
                              label="Parent Totals"
                              value="Match"
                              passed={taskWiseStatus.validation.parentWiseTotalMatch}
                              isDark={isDark}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

function ValidationItem({ label, value, passed, isDark }: { label: string; value: string; passed: boolean; isDark: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${passed ? (isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200') : (isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200')}`}>
      <div className="flex items-center gap-2">
        {passed ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <X className="w-4 h-4 text-red-400" />
        )}
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <span className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
    </div>
  )
}
