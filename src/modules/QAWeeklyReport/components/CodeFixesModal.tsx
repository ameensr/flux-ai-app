// src/modules/QAWeeklyReport/components/CodeFixesModal.tsx
// Interactive 3D Card Modal for Code Fixes Testing breakdown

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Wrench, CheckCircle2, XCircle, AlertTriangle, Clock, User, FileText, Bug, ChevronDown, ChevronUp } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { PremiumTooltip, legendPreset, glowStyle } from './report-preview/chartTheme'
import { isResolvedSupportStatus, isInProgressStatus } from '../types'

interface SupportTicket {
  id: string
  taskId: string
  description: string
  assignedQA: string
  status: string
  priority?: string
  remarks?: string
}

interface CodeFixesModalProps {
  isOpen: boolean
  onClose: () => void
  supportTickets: SupportTicket[]
  projectName: string
}

// Status helpers for support tickets
const isOpenStatus = (status: string) => {
  const s = (status || '').toLowerCase()
  return s === 'open' || s === 'new' || s === 'pending'
}

const isBlockedStatus = (status: string) => {
  const s = (status || '').toLowerCase()
  return s === 'blocked' || s === 'on hold' || s === 'waiting'
}

export function CodeFixesModal({
  isOpen,
  onClose,
  supportTickets,
  projectName
}: CodeFixesModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()
  const chartTheme = isDark ? 'dark' as const : 'light' as const
  const [showDetails, setShowDetails] = useState(false)

  // Calculate statistics
  const stats = useMemo(() => {
    const resolved = supportTickets.filter(t => isResolvedSupportStatus(t.status)).length
    const inProgress = supportTickets.filter(t => isInProgressStatus(t.status)).length
    const open = supportTickets.filter(t => isOpenStatus(t.status)).length
    const blocked = supportTickets.filter(t => isBlockedStatus(t.status)).length
    const other = supportTickets.length - resolved - inProgress - open - blocked

    return { resolved, inProgress, open, blocked, other, total: supportTickets.length }
  }, [supportTickets])

  // Group by assignee
  const assigneeStats = useMemo(() => {
    const map = new Map<string, { total: number; resolved: number; open: number }>()
    supportTickets.forEach(ticket => {
      const assignee = ticket.assignedQA || 'Unassigned'
      const current = map.get(assignee) || { total: 0, resolved: 0, open: 0 }
      current.total++
      if (isResolvedSupportStatus(ticket.status)) current.resolved++
      if (isOpenStatus(ticket.status)) current.open++
      map.set(assignee, current)
    })
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
  }, [supportTickets])

  // Priority breakdown
  const priorityStats = useMemo(() => {
    const critical = supportTickets.filter(t => t.priority?.toLowerCase() === 'critical').length
    const high = supportTickets.filter(t => t.priority?.toLowerCase() === 'high').length
    const medium = supportTickets.filter(t => t.priority?.toLowerCase() === 'medium').length
    const low = supportTickets.filter(t => t.priority?.toLowerCase() === 'low').length
    return { critical, high, medium, low }
  }, [supportTickets])

  // Pie chart data
  const pieData = [
    { name: 'Completed', value: stats.resolved, hex: '#10b981' },
    { name: 'In Progress', value: stats.inProgress, hex: '#3b82f6' },
    { name: 'Open', value: stats.open, hex: '#f97316' },
    { name: 'Blocked', value: stats.blocked, hex: '#ef4444' },
    { name: 'Other', value: stats.other, hex: '#6b7280' },
  ].filter(d => d.value > 0)

  const resolutionRate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0

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

          {/* 3D Card Modal */}
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
              className="pointer-events-auto w-full max-w-4xl max-h-[85vh] overflow-y-auto"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className={`relative rounded-[28px] border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'}`}
              >
                {/* Premium Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-violet-500/25 via-purple-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5 opacity-50 pointer-events-none z-0" />

                {/* Glow effects */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-start justify-between p-6 pb-4 border-b border-border/30">
                    <div className="flex-1">
                      <motion.h2
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-bold text-text-primary flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-violet-400" />
                        </div>
                        Code Fixes Testing
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {projectName} • {stats.total} Tickets • {resolutionRate}% Completion Rate
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

                  {/* Body */}
                  <div className="p-6">
                    {/* Tickets List */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Bug className="w-4 h-4 text-violet-400" />
                        Support Tickets
                      </h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {supportTickets.length === 0 ? (
                          <p className="text-xs text-text-muted text-center py-8">No support tickets logged</p>
                        ) : (
                          supportTickets.map((ticket, idx) => {
                            const statusConfig = isResolvedSupportStatus(ticket.status)
                              ? { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' }
                              : isInProgressStatus(ticket.status)
                              ? { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' }
                              : isOpenStatus(ticket.status)
                              ? { icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' }
                              : isBlockedStatus(ticket.status)
                              ? { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' }
                              : { icon: Clock, color: 'text-text-muted', bg: 'bg-surface-secondary', border: 'border-border/30' }

                            const StatusIcon = statusConfig.icon

                            return (
                              <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.55 + idx * 0.02 }}
                                className={`p-3 rounded-xl border ${statusConfig.border} ${statusConfig.bg} hover:scale-[1.01] transition-transform`}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`w-8 h-8 rounded-lg ${statusConfig.bg} border ${statusConfig.border} flex items-center justify-center shrink-0`}>
                                    <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[10px] font-mono font-bold text-violet-400">{ticket.taskId}</span>
                                    </div>
                                    <p className="text-xs font-semibold text-text-primary truncate">{ticket.description}</p>
                                    <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[10px] text-text-muted flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {ticket.assignedQA || 'Unassigned'}
                                      </span>
                                      <span className={`text-[10px] font-semibold ${statusConfig.color}`}>
                                        {ticket.status}
                                      </span>
                                    </div>
                                    {ticket.remarks && (
                                      <p className="text-[10px] text-text-muted mt-1.5 line-clamp-2">{ticket.remarks}</p>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })
                        )}
                      </div>
                    </motion.div>

                    {/* More Details Toggle */}
                    <button
                      onClick={() => setShowDetails(!showDetails)}
                      className="mt-4 text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                    >
                      {showDetails ? 'Hide' : 'More Details'}
                      {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {/* Detailed Report Section */}
                    <AnimatePresence>
                      {showDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Status Distribution Chart */}
                              <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-5 border border-border/30">
                                <h3 className="text-sm font-semibold text-text-primary mb-4">Status Distribution</h3>
                                <div className="h-52">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        cornerRadius={6}
                                        stroke="none"
                                        dataKey="value"
                                        animationBegin={100}
                                        animationDuration={800}
                                      >
                                        {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.hex} style={glowStyle(entry.hex, chartTheme)} />
                                        ))}
                                      </Pie>
                                      <Tooltip content={<PremiumTooltip theme={chartTheme} />} />
                                      <Legend {...legendPreset} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* QA Engineers Performance */}
                              <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-5 border border-border/30">
                                <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                                  <User className="w-4 h-4 text-violet-400" />
                                  QA Engineers
                                </h3>
                                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                                  {assigneeStats.length === 0 ? (
                                    <p className="text-xs text-text-muted text-center py-4">No assignees found</p>
                                  ) : (
                                    assigneeStats.map((engineer) => {
                                      const rate = engineer.total > 0 ? Math.round((engineer.resolved / engineer.total) * 100) : 0
                                      return (
                                        <div
                                          key={engineer.name}
                                          className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-secondary/50 border border-border/20 hover:border-border/40 transition-all"
                                        >
                                          <div className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-xs font-bold text-violet-400 shrink-0">
                                            {engineer.name.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-text-primary truncate">{engineer.name}</p>
                                            <p className="text-[10px] text-text-muted">
                                              {engineer.total} tickets • {rate}% completed
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-xs font-bold text-green-400">{engineer.resolved}</span>
                                            <span className="text-[10px] text-text-muted">/</span>
                                            <span className="text-xs font-bold text-orange-400">{engineer.open}</span>
                                          </div>
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Insights */}
                            <div className="bg-violet-500/10 rounded-lg p-4 border border-violet-500/20">
                              <h4 className="text-sm font-semibold text-text-primary mb-2">Code Fixes Insights</h4>
                              <p className="text-xs text-text-muted leading-relaxed">
                                {stats.total === 0
                                  ? 'No support tickets have been logged for this report yet.'
                                  : resolutionRate >= 90
                                  ? `Excellent work! ${stats.resolved} of ${stats.total} tickets completed with a ${resolutionRate}% completion rate. Support backlog is well managed.`
                                  : resolutionRate >= 70
                                  ? `Good progress with ${resolutionRate}% completion rate. ${stats.open + stats.blocked} tickets still need attention.`
                                  : `${stats.open + stats.blocked} tickets require immediate attention. Current completion rate is ${resolutionRate}%. ${priorityStats.critical + priorityStats.high} high-priority items pending.`
                                }
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
