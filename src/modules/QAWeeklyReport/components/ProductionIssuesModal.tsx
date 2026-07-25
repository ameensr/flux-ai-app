// src/modules/QAWeeklyReport/components/ProductionIssuesModal.tsx
// Interactive 3D Card Modal for Production Issue Categories breakdown

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts'
import { PremiumTooltip, BarFillGradient, BAR_RADIUS, legendPreset } from './report-preview/chartTheme'

interface ProductionIssuesModalProps {
  isOpen: boolean
  onClose: () => void
  prodIssuesData: Array<{ category: string; lastWeek: number; mtd: number }>
  projectName: string
}

export function ProductionIssuesModal({
  isOpen,
  onClose,
  prodIssuesData,
  projectName
}: ProductionIssuesModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()

  const totalLastWeek = prodIssuesData.reduce((sum, item) => sum + item.lastWeek, 0)
  const totalMTD = prodIssuesData.reduce((sum, item) => sum + item.mtd, 0)
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
                className={`relative rounded-[28px] border overflow-hidden transition-all duration-300 ${isDark ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'}`}
              >
                {/* Premium Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5 opacity-50 pointer-events-none z-0" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-red-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

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
                        <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-orange-400" />
                        </div>
                        Production Issue Categories
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {projectName} • Last Week vs Month-to-Date
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
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 }}
                        className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30"
                      >
                        <div className="text-xs text-text-muted mb-1">Last Week Total</div>
                        <div className="text-3xl font-bold text-accent-gold">{totalLastWeek}</div>
                        <div className="text-xs text-text-muted mt-1">Production issues</div>
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30"
                      >
                        <div className="text-xs text-text-muted mb-1">Month-to-Date Total</div>
                        <div className="text-3xl font-bold text-blue-400">{totalMTD}</div>
                        <div className="text-xs text-text-muted mt-1">Cumulative issues</div>
                      </motion.div>
                    </div>

                    {/* Chart */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-6 border border-border/30 mb-6"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4">Category Comparison</h3>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prodIssuesData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                            <defs>
                              <BarFillGradient id="modalProdIssuesLastWeekGrad" color="#d4af37" theme={chartTheme} />
                              <BarFillGradient id="modalProdIssuesMtdGrad" color="#3b82f6" theme={chartTheme} />
                            </defs>
                            <XAxis
                              dataKey="category"
                              stroke="var(--chart-text)"
                              fontSize={11}
                              axisLine={false}
                              tickLine={false}
                              angle={-15}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis stroke="var(--chart-text)" fontSize={11} axisLine={false} tickLine={false} />
                            <Tooltip content={<PremiumTooltip theme={chartTheme} />} />
                            <Legend {...legendPreset} />
                            <Bar
                              dataKey="lastWeek"
                              name="Last Week"
                              fill="url(#modalProdIssuesLastWeekGrad)"
                              radius={BAR_RADIUS}
                              animationBegin={100}
                              animationDuration={800}
                            />
                            <Bar
                              dataKey="mtd"
                              name="MTD"
                              fill="url(#modalProdIssuesMtdGrad)"
                              radius={BAR_RADIUS}
                              animationBegin={100}
                              animationDuration={800}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* Detailed Breakdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="space-y-3"
                    >
                      <h3 className="text-lg font-semibold text-text-primary">Detailed Breakdown</h3>
                      {prodIssuesData.map((item, idx) => {
                        const trend = item.lastWeek > 0 ? ((item.mtd - item.lastWeek) / item.lastWeek * 100).toFixed(0) : '0'
                        const trendValue = parseFloat(trend)

                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 + (idx * 0.05) }}
                            className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 hover:border-border/60 transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-text-primary">{item.category}</div>
                              <div className="flex items-center gap-2">
                                {trendValue > 0 ? (
                                  <TrendingUp className="w-4 h-4 text-red-400" />
                                ) : trendValue < 0 ? (
                                  <TrendingDown className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Minus className="w-4 h-4 text-text-muted" />
                                )}
                                <span className={`text-xs font-bold ${trendValue > 0 ? 'text-red-400' : trendValue < 0 ? 'text-green-400' : 'text-text-muted'}`}>
                                  {trendValue !== 0 ? `${Math.abs(trendValue)}%` : 'No change'}
                                </span>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-text-muted">Last Week</div>
                                <div className="text-xl font-bold text-accent-gold">{item.lastWeek}</div>
                              </div>
                              <div>
                                <div className="text-xs text-text-muted">Month-to-Date</div>
                                <div className="text-xl font-bold text-blue-400">{item.mtd}</div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>

                    {/* Insights */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <div className="bg-orange-500/10 rounded-lg p-4 border border-orange-500/20">
                        <h4 className="text-sm font-semibold text-text-primary mb-2">Production Issue Insights</h4>
                        <p className="text-xs text-text-muted leading-relaxed">
                          This breakdown shows production issues by category, comparing last week's count with the month-to-date total.
                          Escaped issues are bugs that reached production, while support fixes and change requests represent reactive work.
                          Monitor trends to identify recurring problem areas that may need preventive measures.
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
