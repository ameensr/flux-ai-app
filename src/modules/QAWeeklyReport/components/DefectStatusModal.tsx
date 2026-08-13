// src/modules/QAWeeklyReport/components/DefectStatusModal.tsx
// Interactive 3D Card Popup for Defect Status Breakdown with Release Bug Status details

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock, Ban, PauseCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { PremiumTooltip, glowStyle } from './report-preview/chartTheme'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { ReleaseBugAnalytics } from './ReleaseBugStatus/types'
import { QATriageLoader } from './QATriageLoader'
import { ContinuousQATriage } from './ContinuousQATriage'

interface DefectStatusModalProps {
  isOpen: boolean
  onClose: () => void
  releaseBugStatus?: ReleaseBugAnalytics | null
  fallbackData?: {
    open: number
    fixed: number
    closed: number
  }
  projectName: string
}

export function DefectStatusModal({
  isOpen,
  onClose,
  releaseBugStatus,
  fallbackData,
  projectName
}: DefectStatusModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()
  const hasReleaseBugData = !!releaseBugStatus?.metrics
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  useEffect(() => {
    if (isOpen) {
      setIsAnalyzing(true)
    }
  }, [isOpen])

  const metrics = hasReleaseBugData && releaseBugStatus?.metrics ? releaseBugStatus.metrics : null

  /**
   * Slices must be mutually exclusive, so this uses the parser's five disjoint
   * status groups (completed + resolved + active + deferred + invalid ===
   * totalBugs). It deliberately does NOT use `openBugs`, which is
   * `total - completed` and therefore already contains resolved, deferred and
   * invalid — charting it alongside those groups double-counted them, inflating
   * the "Total Defects" figure and skewing every percentage.
   */
  const chartData = metrics ? [
    { name: 'Active (New / In Progress)', value: metrics.activeBugs, hex: '#f87171', icon: AlertCircle },
    { name: 'Resolved (Ready for QA)', value: metrics.resolvedBugs, hex: '#fb923c', icon: Clock },
    { name: 'Closed', value: metrics.completedBugs, hex: '#10b981', icon: CheckCircle },
    ...(metrics.deferredBugs > 0 ? [{ name: 'Deferred', value: metrics.deferredBugs, hex: '#eab308', icon: PauseCircle }] : []),
    ...(metrics.invalidBugs > 0 ? [{ name: 'Invalid/Won\'t Fix', value: metrics.invalidBugs, hex: '#64748b', icon: Ban }] : [])
  ] : [
    { name: 'Open Defects', value: fallbackData?.open || 0, hex: '#f87171', icon: AlertCircle },
    { name: 'Fixed Defects', value: fallbackData?.fixed || 0, hex: '#fb923c', icon: Clock },
    { name: 'Closed Defects', value: fallbackData?.closed || 0, hex: '#10b981', icon: CheckCircle }
  ]

  // Prefer the parser's authoritative count so the centre figure always matches
  // "Total Bugs" elsewhere in the app; manual entry has no such total.
  const totalDefects = metrics ? metrics.totalBugs : chartData.reduce((sum, item) => sum + item.value, 0)
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
            className="fixed inset-0 z-[100]"
            style={{ background: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(15,23,42,0.35)' }}
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
                <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-purple-500/5 opacity-50 pointer-events-none z-0" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                {/* CONTINUOUS TYPING ANIMATION */}
                {!isAnalyzing && <ContinuousQATriage opacity="opacity-[0.15]" position="bottom" />}

                {isAnalyzing ? (
                  // Generous whitespace so the qaly.ai / QA TRIAGE sequence can breathe
                  <div className="relative z-10 flex min-h-[440px] sm:min-h-[520px] w-full items-center justify-center px-8 py-14 sm:px-14 sm:py-20">
                    <div className="w-full max-w-md">
                      <QATriageLoader onComplete={() => setIsAnalyzing(false)} />
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-4 border-b border-border/30">
                      <div className="flex-1">
                        <motion.h2
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 }}
                          className="text-2xl font-bold text-text-primary flex items-center gap-3"
                        >
                          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-accent" />
                          </div>
                          Defect Status Breakdown
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="text-sm text-text-secondary mt-2"
                        >
                          {projectName} • {hasReleaseBugData ? 'Release Bug Status Analytics' : 'Manual Entry Data'}
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
                    {/* Data Source Badge */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mb-6"
                    >
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${hasReleaseBugData
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${hasReleaseBugData ? 'bg-green-400' : 'bg-amber-400'} animate-pulse`} />
                        {hasReleaseBugData ? (
                          <>
                            Data from: {releaseBugStatus.uploadedFileName}
                            <span className="text-text-muted ml-1">
                              ({new Date(releaseBugStatus.uploadedAt).toLocaleDateString()})
                            </span>
                          </>
                        ) : (
                          'Data from Manual Entry'
                        )}
                      </div>
                    </motion.div>

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
                          <div className="text-3xl font-bold text-text-primary">{totalDefects}</div>
                          <div className="text-sm text-text-muted">Total Defects</div>
                        </div>
                      </motion.div>

                      {/* Right Column: Breakdown Cards */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 }}
                        className="space-y-3"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Detailed Breakdown</h3>
                        {chartData.map((item, idx) => {
                          const Icon = item.icon
                          const percentage = totalDefects > 0 ? ((item.value / totalDefects) * 100).toFixed(1) : '0.0'
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
                                    <Icon className="w-5 h-5" style={{ color: item.hex }} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-text-primary">{item.name}</div>
                                    <div className="text-xs text-text-muted">{percentage}% of total</div>
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

                    {/* Additional Metrics (only if Release Bug Status data available) */}
                    {hasReleaseBugData && metrics && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="mt-6 pt-6 border-t border-border/30"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Release Metrics</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <MetricCard
                            label="Closure Rate"
                            value={`${metrics.closurePercentage.toFixed(1)}%`}
                            trend={metrics.closurePercentage >= 70 ? 'up' : metrics.closurePercentage >= 50 ? 'neutral' : 'down'}
                            icon={CheckCircle}
                            color="#10b981"
                          />
                          <MetricCard
                            label="Active Rate"
                            value={`${metrics.activePercentage.toFixed(1)}%`}
                            trend={metrics.activePercentage <= 20 ? 'up' : metrics.activePercentage <= 40 ? 'neutral' : 'down'}
                            icon={AlertCircle}
                            color="#f87171"
                          />
                          <MetricCard
                            label="Deferred Rate"
                            value={`${metrics.deferredPercentage.toFixed(1)}%`}
                            trend={metrics.deferredPercentage <= 10 ? 'up' : metrics.deferredPercentage <= 20 ? 'neutral' : 'down'}
                            icon={PauseCircle}
                            color="#eab308"
                          />
                          <MetricCard
                            label="Invalid Rate"
                            value={`${metrics.invalidPercentage.toFixed(1)}%`}
                            trend="neutral"
                            icon={Ban}
                            color="#64748b"
                          />
                        </div>
                      </motion.div>
                    )}

                    {/* AI Summary (if available) */}
                    {hasReleaseBugData && releaseBugStatus.aiSummary && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-6 pt-6 border-t border-border/30"
                      >
                        <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                            <span className="text-sm">🤖</span>
                          </div>
                          AI Analysis
                        </h3>
                        <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {releaseBugStatus.aiSummary}
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Release Health (if available) */}
                    {hasReleaseBugData && releaseBugStatus.releaseHealth && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.65 }}
                        className="mt-6 pt-6 border-t border-border/30"
                      >
                        <div className="bg-gradient-to-br from-accent/10 via-purple-500/10 to-accent/5 rounded-xl p-6 border border-accent/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-text-muted mb-1">Release Health</div>
                              <div className="text-3xl font-bold text-text-primary flex items-center gap-3">
                                <span className="text-4xl">{releaseBugStatus.releaseHealth.emoji}</span>
                                {releaseBugStatus.releaseHealth.label}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-5xl font-bold text-accent">
                                {releaseBugStatus.releaseHealth.score}
                              </div>
                              <div className="text-sm text-text-muted">Health Score</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Invalid/Won't Fix Explanation */}
                    {hasReleaseBugData && metrics && metrics.invalidBugs > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="mt-6 pt-6 border-t border-border/30"
                      >
                        <div className="bg-slate-500/10 rounded-lg p-4 border border-slate-500/20">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Ban className="w-4 h-4 text-slate-400" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-text-primary mb-1">What is "Invalid/Won't Fix"?</h4>
                              <p className="text-xs text-text-muted leading-relaxed">
                                These are bugs that have been analyzed and determined to be not applicable for fixing. This includes:
                                <span className="block mt-2 ml-4">
                                  • <span className="text-text-secondary">Rejected:</span> Not a valid bug<br />
                                  • <span className="text-text-secondary">Duplicate:</span> Already reported elsewhere<br />
                                  • <span className="text-text-secondary">Non-reproducible:</span> Cannot be replicated<br />
                                  • <span className="text-text-secondary">Won't Fix:</span> Intentional behavior or low priority<br />
                                  • <span className="text-text-secondary">By Design:</span> Working as intended
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
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

// Helper component for metric cards
function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  color
}: {
  label: string
  value: string
  trend: 'up' | 'down' | 'neutral'
  icon: any
  color: string
}) {
  return (
    <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="text-xs text-text-muted">{label}</div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-xl font-bold text-text-primary">{value}</div>
        {trend !== 'neutral' && (
          <div className={`${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
        {trend === 'neutral' && (
          <Minus className="w-4 h-4 text-text-muted" />
        )}
      </div>
    </div>
  )
}
