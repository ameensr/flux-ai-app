// src/modules/QAWeeklyReport/components/TeamCapacityModal.tsx
// Interactive 3D Card Modal for Team Capacity Distribution breakdown

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, CheckCircle, AlertCircle, Ban, Clock, Activity } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { TeamCapacityData, CapacityDistribution } from '../types/teamCapacity'
import { getCapacityDistribution } from '../types/teamCapacity'
import { useTheme } from '@/context/ThemeContext'
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
  const { isDark } = useTheme()
  const chartTheme = isDark ? 'dark' as const : 'light' as const

  // Lock scroll when modal is open and preserve scroll position
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      // Store scroll position for restoration
      return () => {
        // Restore scroll position when modal closes
        const scrollYTop = document.body.style.top
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''

        // Extract the numeric value from the top style (e.g., "-100px" -> 100)
        if (scrollYTop) {
          const scrollValue = parseInt(scrollYTop.replace('px', '')) * -1
          window.scrollTo(0, scrollValue)
        }
      }
    }
  }, [isOpen])

  const distribution = getCapacityDistribution(data.stats)
  const totalMembers = data.stats.total_members

  // Chart data for donut
  const chartData = distribution.map(d => ({
    name: d.label,
    value: d.count,
    hex: d.color
  }))

  // Get icon for each status
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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Compact 3D Card Modal with internal scroll */}
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
              className="pointer-events-auto w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(99, 102, 241, 0.3)'
                }}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-50" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

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

                  {/* Body */}
                  <div className="p-6">
                    {/* Data Source Indicator */}
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
                      {/* Left Column: Chart */}
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

                      {/* Right Column: Breakdown Cards */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="space-y-3"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Status Breakdown</h3>
                        {distribution.map((item, idx) => {
                          const Icon = getStatusIcon(item.label)
                          const percentage = item.percentage.toFixed(1)
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + (idx * 0.05) }}
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

                    {/* Capacity Metrics */}
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
                          <div className="text-2xl font-bold text-text-primary">{data.stats.total_members}</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Available</div>
                          <div className="text-2xl font-bold text-green-400">{data.stats.available}</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Avg Hours</div>
                          <div className="text-2xl font-bold text-text-primary">{data.stats.average_hours}h</div>
                        </div>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <div className="text-xs text-text-muted mb-1">Capacity</div>
                          <div className="text-2xl font-bold text-accent-gold">{data.stats.estimated_capacity_percent}%</div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Team Availability Table */}
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
                              <th className="text-center py-3 px-3 font-semibold text-text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.members.map((member, idx) => {
                              let statusColor = '#10b981'
                              let statusLabel = 'Available'
                              if (member.status === 'on-leave') {
                                statusColor = '#eab308'
                                statusLabel = 'On Leave'
                              } else if (member.status === 'no-logs') {
                                statusColor = '#ef4444'
                                statusLabel = 'No Logs'
                              }

                              return (
                                <motion.tr
                                  key={member.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.65 + (idx * 0.03) }}
                                  className="border-b border-border/20 hover:bg-white/[0.02] transition-colors"
                                >
                                  <td className="py-3 px-3 text-text-primary font-medium">{member.name}</td>
                                  <td className="py-3 px-3 text-right font-semibold" style={{
                                    color: member.logged_hours > 0 ? 'var(--text-primary)' : '#ef4444'
                                  }}>
                                    {member.logged_hours}h
                                  </td>
                                  <td className="py-3 px-3 text-right font-semibold" style={{
                                    color: member.leave_hours > 0 ? '#eab308' : 'var(--text-muted)'
                                  }}>
                                    {member.leave_hours}h
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span
                                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
                                      style={{
                                        backgroundColor: `${statusColor}20`,
                                        color: statusColor,
                                        border: `1px solid ${statusColor}40`
                                      }}
                                    >
                                      {statusLabel}
                                    </span>
                                  </td>
                                </motion.tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>

                    {/* Capacity Insights */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-6"
                    >
                      <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Capacity Insights</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {data.stats.estimated_capacity_percent >= 80 ? (
                            <span className="text-green-400 font-semibold">✅ Your team is operating at strong capacity this week.</span>
                          ) : data.stats.estimated_capacity_percent >= 60 ? (
                            <span className="text-yellow-400 font-semibold">⚠️ Your team is operating at moderate capacity this week.</span>
                          ) : (
                            <span className="text-red-400 font-semibold">🔴 Your team capacity is reduced this week, consider workload adjustments.</span>
                          )}
                        </p>
                      </div>
                    </motion.div>

                    {/* Calculation Methodology */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.75 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        How We Calculate Capacity
                      </h3>

                      <div className="space-y-4">
                        {/* Status Determination */}
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            Member Status Determination
                          </h4>
                          <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
                            <div className="flex items-start gap-2">
                              <span className="inline-block w-24 font-semibold text-green-400 shrink-0">Available:</span>
                              <span>Team member has logged work hours and leave is less than 50% of the expected 40-hour work week. Example: 15h logged + 8h leave = <strong className="text-green-400">Available</strong> (8h is only 20% of 40h).</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="inline-block w-24 font-semibold text-yellow-400 shrink-0">On Leave:</span>
                              <span>Team member's leave hours exceed 50% of the expected work week (≥20 hours). Example: 5h logged + 30h leave = <strong className="text-yellow-400">On Leave</strong> (30h is 75% of 40h).</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="inline-block w-24 font-semibold text-red-400 shrink-0">No Logs:</span>
                              <span>Team member has no logged hours and no leave hours recorded for the week.</span>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/20">
                            <p className="text-xs text-text-muted italic">
                              💡 <strong>Why this approach?</strong> Taking a few hours of leave shouldn't mark someone as "On Leave" for the entire week. This percentage-based method ensures fair representation of actual availability.
                            </p>
                          </div>
                        </div>

                        {/* Capacity Calculation */}
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <h4 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-accent-gold" />
                            Team Capacity Calculation
                          </h4>

                          <div className="space-y-3">
                            {/* Formula Display */}
                            <div className="bg-black/20 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                              <div className="text-accent-gold mb-2">Formula:</div>
                              <div className="text-text-secondary whitespace-nowrap">
                                Capacity % = (Total Logged Hours / Expected Total Hours) × 100
                              </div>
                            </div>

                            {/* Calculation Example */}
                            <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                              <div className="text-xs font-semibold text-blue-400 mb-2">Example Calculation:</div>
                              <div className="space-y-1 text-xs text-text-secondary">
                                <div className="flex justify-between">
                                  <span>Total Team Members:</span>
                                  <span className="font-semibold text-text-primary">{data.stats.total_members}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Expected Hours per Person:</span>
                                  <span className="font-semibold text-text-primary">40 hours/week</span>
                                </div>
                                <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                                  <span>Expected Total Hours:</span>
                                  <span className="font-semibold text-text-primary">{data.stats.total_members} × 40 = {data.stats.total_members * 40}h</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Actual Logged Hours:</span>
                                  <span className="font-semibold text-green-400">
                                    {data.members.reduce((sum, m) => sum + m.logged_hours, 0)}h
                                  </span>
                                </div>
                                <div className="flex justify-between border-t border-blue-500/20 pt-1 mt-1">
                                  <span className="font-bold">Team Capacity:</span>
                                  <span className="font-bold text-accent-gold">
                                    {data.stats.estimated_capacity_percent}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-2">
                              <p className="text-xs text-text-muted italic">
                                💡 <strong>Why this approach?</strong> This formula measures actual productivity based on hours worked, not just headcount. A team member working 15 hours contributes 37.5% capacity, giving a more accurate picture than a binary "available/unavailable" status.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Key Benefits */}
                        <div className="bg-accent-gold/5 border border-accent-gold/20 rounded-lg p-4">
                          <h4 className="text-sm font-bold text-accent-gold mb-2">Benefits of This Methodology</h4>
                          <ul className="space-y-1.5 text-xs text-text-secondary">
                            <li className="flex items-start gap-2">
                              <span className="text-green-400 shrink-0">✓</span>
                              <span><strong>Fair Representation:</strong> Accounts for partial availability instead of treating members as fully available or completely unavailable.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-400 shrink-0">✓</span>
                              <span><strong>Accurate Metrics:</strong> Reflects actual work output rather than just counting heads.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-400 shrink-0">✓</span>
                              <span><strong>Flexible Threshold:</strong> 50% leave threshold adapts to different work arrangements and partial leaves.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-green-400 shrink-0">✓</span>
                              <span><strong>Better Planning:</strong> Provides realistic capacity data for sprint and testing planning.</span>
                            </li>
                          </ul>
                        </div>
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
