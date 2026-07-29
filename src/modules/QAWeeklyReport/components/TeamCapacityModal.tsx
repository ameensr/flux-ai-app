// src/modules/QAWeeklyReport/components/TeamCapacityModal.tsx
// Interactive 3D Card Modal for Team Capacity Distribution breakdown

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, CheckCircle, AlertCircle, Ban, Clock, Activity } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { TeamCapacityData } from '../types/teamCapacity'
import { calculateCapacityStats, getCapacityDistribution } from '../types/teamCapacity'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { PremiumTooltip, glowStyle } from './report-preview/chartTheme'

interface TeamCapacityModalProps {
  isOpen: boolean
  onClose: () => void
  data: TeamCapacityData
  projectName: string
}

const EXPECTED_HOURS = 40

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

  if (!stats || !Array.isArray(data?.members)) {
    return null
  }

  const distribution = getCapacityDistribution(stats)
  const totalMembers = stats.total_members
  const totalLeave = data.members.reduce((sum, m) => sum + (Number(m.leave_hours) || 0), 0)
  const expectedTotal = totalMembers * EXPECTED_HOURS
  const availableHours = Math.max(0, expectedTotal - totalLeave)

  const chartData = distribution.map(d => ({
    name: d.label,
    value: d.count,
    hex: d.color,
  }))

  const getStatusIcon = (label: string) => {
    switch (label) {
      case 'Available':
        return CheckCircle
      case 'On Leave':
        return Clock
      case 'No Logs':
        return AlertCircle
      default:
        return Ban
    }
  }

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
              initial={{ opacity: 0, scale: 0.85, y: 50, rotateX: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 50, rotateX: 12 }}
              transition={{
                type: 'spring',
                stiffness: 280,
                damping: 22,
                duration: 0.35,
              }}
              className="pointer-events-auto w-full max-w-3xl max-h-[85vh] overflow-y-auto"
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
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
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
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={3}
                              cornerRadius={6}
                              stroke="none"
                              dataKey="value"
                              animationBegin={100}
                              animationDuration={800}
                            >
                              {chartData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.hex} style={glowStyle(entry.hex, chartTheme)} />
                              ))}
                            </Pie>
                            <Tooltip content={<PremiumTooltip theme={chartTheme} />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-2">
                          <div className="text-3xl font-bold text-text-primary">{totalMembers}</div>
                          <div className="text-sm text-text-muted">Total Team Members</div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="space-y-3"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Availability Breakdown</h3>
                        {distribution.map((item, idx) => {
                          const Icon = getStatusIcon(item.label)
                          const percentage = item.percentage.toFixed(1)
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
                                    <div className="text-xs text-text-muted">{percentage}% of total</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold" style={{ color: item.color }}>
                                    {item.count}
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Total Members</div>
                          <div className="text-2xl font-bold text-text-primary">{stats.total_members}</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Available</div>
                          <div className="text-2xl font-bold text-green-400">{stats.available}</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Avg Hours</div>
                          <div className="text-2xl font-bold text-text-primary">{stats.average_hours}h</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Capacity</div>
                          <div className="text-2xl font-bold text-accent-gold">{stats.estimated_capacity_percent}%</div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Team Availability Details</h3>
                      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border/30">
                              <th className="text-left py-3 px-3 font-semibold text-text-muted">Employee</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Logged Hours</th>
                              <th className="text-right py-3 px-3 font-semibold text-text-muted">Leave Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.members.map((member, idx) => (
                              <motion.tr
                                key={member.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.65 + idx * 0.03 }}
                                className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                              >
                                <td className="py-3 px-3 text-text-primary font-medium">{member.name}</td>
                                <td
                                  className="py-3 px-3 text-right font-semibold"
                                  style={{
                                    color: member.logged_hours > 0 ? 'var(--text-primary)' : '#ef4444',
                                  }}
                                >
                                  {member.logged_hours}h
                                </td>
                                <td
                                  className="py-3 px-3 text-right font-semibold"
                                  style={{
                                    color: member.leave_hours > 0 ? '#eab308' : 'var(--text-muted)',
                                  }}
                                >
                                  {member.leave_hours}h
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                          {stats.estimated_capacity_percent >= 80 ? (
                            <span className="text-green-400 font-semibold">Your team is operating at strong capacity this week.</span>
                          ) : stats.estimated_capacity_percent >= 60 ? (
                            <span className="text-yellow-400 font-semibold">Your team is operating at moderate capacity this week.</span>
                          ) : (
                            <span className="text-red-400 font-semibold">Team capacity is reduced this week — consider workload adjustments.</span>
                          )}
                        </p>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent-gold" />
                        Team Capacity Calculation
                      </h3>

                      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 space-y-3">
                        <div className="bg-black/20 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                          <div className="text-accent-gold mb-2">Formula:</div>
                          <div className="text-text-secondary whitespace-nowrap">
                            Capacity % = (Expected Hours − Leave Hours) / Expected Hours × 100
                          </div>
                        </div>

                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                          <div className="text-xs font-semibold text-blue-400 mb-2">This report:</div>
                          <div className="space-y-1 text-xs text-text-secondary">
                            <div className="flex justify-between">
                              <span>Total Team Members:</span>
                              <span className="font-semibold text-text-primary">{stats.total_members}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Expected Hours per Person:</span>
                              <span className="font-semibold text-text-primary">{EXPECTED_HOURS}h / week</span>
                            </div>
                            <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                              <span>Expected Total Hours:</span>
                              <span className="font-semibold text-text-primary">
                                {stats.total_members} × {EXPECTED_HOURS} = {expectedTotal}h
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Leave Hours:</span>
                              <span className="font-semibold text-yellow-400">{totalLeave}h</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Available Hours:</span>
                              <span className="font-semibold text-green-400">
                                {expectedTotal} − {totalLeave} = {availableHours}h
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                              <span className="font-bold">Team Capacity:</span>
                              <span className="font-bold text-accent-gold">
                                {stats.estimated_capacity_percent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-text-muted italic">
                          Leave reduces available testing capacity. Logged hours are shown for reference; capacity % is driven by leave against the expected {EXPECTED_HOURS}h week.
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
