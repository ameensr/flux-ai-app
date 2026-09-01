// src/modules/QAWeeklyReport/components/TeamCapacityModal.tsx
// Interactive 3D Card Modal for Team Capacity Distribution breakdown

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, CheckCircle, Clock } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { TeamCapacityData } from '../types/teamCapacity'
import {
  calculateCapacityStats,
  getMembersWithUtilization,
  getUtilizationColor,
  getUtilizationLabel,
} from '../types/teamCapacity'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { PremiumTooltip, glowStyle } from './report-preview/chartTheme'

interface TeamCapacityModalProps {
  isOpen: boolean
  onClose: () => void
  data: TeamCapacityData
  projectName: string
}

export function TeamCapacityModal({
  isOpen,
  onClose,
  data,
  projectName
}: TeamCapacityModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()
  const chartTheme = isDark ? 'dark' as const : 'light' as const

  const stats = useMemo(
    () => (Array.isArray(data?.members) ? calculateCapacityStats(data.members) : null),
    [data?.members],
  )

  const membersWithUtil = useMemo(
    () => (Array.isArray(data?.members) ? getMembersWithUtilization(data.members) : []),
    [data?.members],
  )

  if (!stats || !Array.isArray(data?.members)) {
    return null
  }

  const totalMembers = stats.total_members
  const avgUtil = stats.average_utilization_percent ?? stats.estimated_capacity_percent

  const totalAvailableHours = Number(
    (stats.total_available_hours ?? membersWithUtil.reduce((s, m) => s + m.available_hours, 0)).toFixed(1),
  )
  const totalLeaveHours = Number(
    (stats.total_leave_hours ?? membersWithUtil.reduce((s, m) => s + m.leave_hours, 0)).toFixed(1),
  )
  const hoursTotal = Number((totalAvailableHours + totalLeaveHours).toFixed(1))

  const breakdownRows = [
    {
      label: 'Total Available',
      value: totalAvailableHours,
      color: '#10b981',
      icon: CheckCircle,
      detail: 'Sum of Available hours from Excel',
    },
    {
      label: 'Total Leave',
      value: totalLeaveHours,
      color: '#eab308',
      icon: Clock,
      detail: 'Sum of Leave hours from Excel',
    },
  ]

  const chartData = breakdownRows
    .filter(row => row.value > 0)
    .map(row => ({
      name: row.label,
      value: row.value,
      hex: row.color,
    }))

  const pieData =
    chartData.length > 0
      ? chartData
      : [{ name: 'No hours', value: 1, hex: '#64748b' }]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="pointer-events-auto w-full max-w-4xl max-h-[85vh] overflow-y-auto"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(99, 102, 241, 0.3)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-50" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between p-6 pb-4 border-b border-border/30">
                    <div className="flex-1">
                      <motion.h2
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl font-bold text-text-primary flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-green-400" />
                        </div>
                        Team Capacity Distribution
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {projectName} • {data.file_name ? `Data from: ${data.file_name}` : 'Team Availability Overview'}
                      </motion.p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onClose}
                      className="w-9 h-9 rounded-lg bg-surface-elevated hover:bg-hover border border-border/30 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>

                  <div className="p-6">
                    {data.file_name && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="mb-6"
                      >
                        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                          Data from: {data.file_name}
                          {data.period_start && data.period_end && (
                            <span className="text-text-muted ml-1">
                              ({data.period_start} to {data.period_end})
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-6 border border-border/30"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Distribution Chart</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={pieData.length > 1 ? 3 : 0}
                              cornerRadius={6}
                              stroke="none"
                              dataKey="value"
                              animationBegin={100}
                              animationDuration={800}
                            >
                              {pieData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.hex} style={glowStyle(entry.hex, chartTheme)} />
                              ))}
                            </Pie>
                            <Tooltip content={<PremiumTooltip theme={chartTheme} />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-2">
                          <div className="text-3xl font-bold text-text-primary tabular-nums">
                            {Number(hoursTotal.toFixed(1))}h
                          </div>
                          <div className="text-sm text-text-muted">Available + Leave Hours</div>
                          <div className="text-xs text-text-muted mt-1">{totalMembers} team members</div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="space-y-3"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Availability Breakdown</h3>
                        {breakdownRows.map((item, idx) => {
                          const Icon = item.icon
                          const percentage =
                            hoursTotal > 0
                              ? ((item.value / hoursTotal) * 100).toFixed(1)
                              : '0.0'
                          return (
                            <motion.div
                              key={item.label}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + idx * 0.05 }}
                              whileHover={{ scale: 1.02, x: 4 }}
                              className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 hover:border-border/60 transition-all"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${item.color}20` }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: item.color }} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-text-primary">{item.label}</div>
                                    <div className="text-xs text-text-muted">
                                      {item.detail} · {percentage}% of hours
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold tabular-nums" style={{ color: item.color }}>
                                    {item.value}h
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Capacity Metrics</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Avg Utilization</div>
                          <div className="text-2xl font-bold" style={{ color: getUtilizationColor(avgUtil) }}>
                            {avgUtil}%
                          </div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Total Logged</div>
                          <div className="text-2xl font-bold text-text-primary">
                            {stats.total_logged_hours ?? 0}h
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-text-primary">Employee Utilization</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                          Sorted by utilization · Logged ÷ Available
                        </span>
                      </div>
                      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30 overflow-x-auto max-h-[360px] overflow-y-auto">
                        <table className="w-full text-sm min-w-[640px]">
                          <thead className="sticky top-0 z-10 bg-surface-elevated">
                            <tr className="border-b border-border/30">
                              <th className="text-left py-3 px-3 font-semibold text-text-muted">Employee</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Logged</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Leave</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Effective</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Available</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Utilization</th>
                              <th className="text-left py-3 px-3 font-semibold text-text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {membersWithUtil.map((member, idx) => {
                              const utilColor = getUtilizationColor(member.utilization_percent)
                              const utilLabel = getUtilizationLabel(member.utilization_percent)
                              return (
                                <motion.tr
                                  key={member.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: Math.min(0.65 + idx * 0.02, 1.2) }}
                                  className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                                >
                                  <td className="py-3 px-3 text-text-primary font-medium">{member.name}</td>
                                  <td
                                    className="py-3 px-3 text-right font-semibold"
                                    style={{ color: member.logged_hours > 0 ? 'var(--text-primary)' : '#ef4444' }}
                                  >
                                    {member.logged_hours}h
                                  </td>
                                  <td
                                    className="py-3 px-3 text-right font-semibold"
                                    style={{ color: member.leave_hours > 0 ? '#eab308' : 'var(--text-muted)' }}
                                  >
                                    {member.leave_hours}h
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold text-text-primary">
                                    {member.effective_work}h
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold text-text-secondary">
                                    {member.available_hours}h
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold tabular-nums" style={{ color: utilColor }}>
                                      {member.utilization_percent}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span
                                      className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full"
                                      style={{
                                        color: utilColor,
                                        background: `${utilColor}18`,
                                        border: `1px solid ${utilColor}40`,
                                      }}
                                    >
                                      {utilLabel}
                                    </span>
                                  </td>
                                </motion.tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[10px] text-text-muted mt-2">
                        From Excel: Employee Name, Logged Hours, Leave Hours, Effective Work, Available, Utilization Percentage.
                        Missing Effective / Util are derived (Logged − Leave; Logged ÷ Available × 100).
                      </p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-6"
                    >
                      <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Capacity Insights</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {avgUtil >= 95 ? (
                            <span className="text-green-400 font-semibold">Team average utilization is at or near full capacity.</span>
                          ) : avgUtil >= 80 ? (
                            <span className="text-yellow-400 font-semibold">Team average utilization is healthy with some headroom.</span>
                          ) : (
                            <span className="text-blue-400 font-semibold">Team average utilization is below target — capacity may be underused.</span>
                          )}
                        </p>
                      </div>
                    </motion.div>
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
