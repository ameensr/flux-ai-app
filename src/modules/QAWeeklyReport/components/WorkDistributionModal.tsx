// src/modules/QAWeeklyReport/components/WorkDistributionModal.tsx
// Interactive 3D Card Modal for Work Distribution breakdown

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Wrench, TrendingUp } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'
import { PremiumTooltip, glowStyle } from './report-preview/chartTheme'

interface WorkDistributionModalProps {
  isOpen: boolean
  onClose: () => void
  workDistributionData: Array<{ name: string; value: number; hex: string }>
  projectName: string
}

export function WorkDistributionModal({
  isOpen,
  onClose,
  workDistributionData,
  projectName
}: WorkDistributionModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()

  const totalWork = workDistributionData.reduce((sum, item) => sum + item.value, 0)
  const chartTheme = isDark ? 'dark' as const : 'light' as const

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
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="pointer-events-auto w-full max-w-3xl max-h-[85vh] overflow-y-auto"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className={`relative rounded-[28px] border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'}`}
              >
                {/* Premium Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-blue-500/5 opacity-50 pointer-events-none z-0" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
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
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        Work Distribution
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {projectName} • Team Workload Distribution
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

                  {/* Body */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column: Chart */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-6 border border-border/30"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Work Distribution Chart</h3>
                        <ResponsiveContainer width="100%" height={280}>
                          <PieChart>
                            <Pie
                              data={workDistributionData}
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
                              {workDistributionData.map((entry, idx) => (
                                <Cell key={idx} fill={entry.hex} style={glowStyle(entry.hex, chartTheme)} />
                              ))}
                            </Pie>
                            <Tooltip content={<PremiumTooltip theme={chartTheme} />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center mt-2">
                          <div className="text-3xl font-bold text-text-primary">{totalWork}</div>
                          <div className="text-sm text-text-muted">Total Work Items</div>
                        </div>
                      </motion.div>

                      {/* Right Column: Breakdown Cards */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="space-y-3"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Workload Breakdown</h3>
                        {workDistributionData.map((item, idx) => {
                          const percentage = totalWork > 0 ? ((item.value / totalWork) * 100).toFixed(1) : '0.0'
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
                                    style={{ backgroundColor: `${item.hex}20` }}
                                  >
                                    {item.name.includes('Support') ? (
                                      <Wrench className="w-5 h-5" style={{ color: item.hex }} />
                                    ) : (
                                      <TrendingUp className="w-5 h-5" style={{ color: item.hex }} />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-text-primary">{item.name}</div>
                                    <div className="text-xs text-text-muted">{percentage}% of total workload</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold" style={{ color: item.hex }}>
                                    {item.value}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </motion.div>
                    </div>

                    {/* Summary */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Work Distribution Insights</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                          This chart shows how QA resources are allocated across different work categories this week.
                          Support tickets fix represents time spent on production issues and bug fixes, while new features
                          represents testing effort for new development work.
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
