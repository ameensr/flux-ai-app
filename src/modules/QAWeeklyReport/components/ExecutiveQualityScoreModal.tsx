// src/modules/QAWeeklyReport/components/ExecutiveQualityScoreModal.tsx
// Interactive 3D Card Popup for Executive Quality Score breakdown explanation

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, TrendingUp, AlertTriangle, CheckCircle, Zap, Shield, Users, Target } from 'lucide-react'
import type { QAReportForm } from '../types'

interface ExecutiveQualityScoreModalProps {
  isOpen: boolean
  onClose: () => void
  data: QAReportForm
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
}

export function ExecutiveQualityScoreModal({
  isOpen,
  onClose,
  data,
  score,
  label,
  color
}: ExecutiveQualityScoreModalProps) {

  // Calculate all component scores
  const releaseCount = data.releaseItems?.length || 0
  const releasePassed = data.releaseItems?.filter(i => i?.status === 'Pass').length || 0
  const releaseFailed = data.releaseItems?.filter(i => i?.status === 'Fail').length || 0

  const activeDefectsTotal = data.defectsLastWeek?.reported || 0
  const defectsClosed = data.defectsLastWeek?.closed || 0
  const defectsOpen = data.defectsLastWeek?.open || 0

  const escapedIssues = data.lastWeek?.escapedIssue || 0
  
  const supportTicketsCount = data.supportTickets?.length || 0
  const criticalSupport = data.supportTickets?.filter(t => t?.priority === 'Critical').length || 0
  const highSupport = data.supportTickets?.filter(t => t?.priority === 'High').length || 0

  const teamFeatureSize = data.newFeatureTeam?.length || 0
  const teamSupportSize = data.supportTeam?.length || 0
  const teamAutomationSize = data.automationTeam?.length || 0
  const totalTeam = teamFeatureSize + teamSupportSize + teamAutomationSize

  // Component calculations
  const components = [
    {
      name: 'Release Pass Rate',
      weight: 35,
      value: releaseCount > 0 ? Math.round((releasePassed / releaseCount) * 100) : 100,
      icon: CheckCircle,
      color: '#10b981',
      detail: `${releasePassed} of ${releaseCount} releases passed`,
      active: releaseCount > 0
    },
    {
      name: 'Failed Release Penalty',
      weight: 15,
      value: releaseCount > 0 ? Math.round(100 - (releaseFailed / releaseCount) * 100) : 100,
      icon: AlertTriangle,
      color: '#f87171',
      detail: `${releaseFailed} failed releases`,
      active: releaseCount > 0
    },
    {
      name: 'Defect Closure Rate',
      weight: 20,
      value: activeDefectsTotal > 0 ? Math.round((defectsClosed / activeDefectsTotal) * 100) : 100,
      icon: Target,
      color: '#d4af37',
      detail: `${defectsClosed} of ${activeDefectsTotal} defects closed`,
      active: activeDefectsTotal > 0
    },
    {
      name: 'Open Defects Penalty',
      weight: 15,
      value: Math.max(100 - defectsOpen * 10, 0),
      icon: Shield,
      color: '#fb923c',
      detail: `${defectsOpen} defects currently open`,
      active: true
    },
    {
      name: 'Escaped Defects Penalty',
      weight: 20,
      value: Math.max(100 - escapedIssues * 15, 0),
      icon: AlertTriangle,
      color: '#ef4444',
      detail: `${escapedIssues} defects escaped to production`,
      active: true
    },
    {
      name: 'Critical Support Penalty',
      weight: 15,
      value: supportTicketsCount > 0 ? Math.max(100 - criticalSupport * 25 - highSupport * 10, 0) : 100,
      icon: Zap,
      color: '#a855f7',
      detail: `${criticalSupport} critical, ${highSupport} high priority tickets`,
      active: supportTicketsCount > 0
    },
    {
      name: 'Automation Coverage',
      weight: 10,
      value: totalTeam > 0 ? Math.round((teamAutomationSize / totalTeam) * 100) : 0,
      icon: Users,
      color: '#3b82f6',
      detail: `${teamAutomationSize} of ${totalTeam} team members on automation`,
      active: totalTeam > 0
    }
  ]

  const activeComponents = components.filter(c => c.active)
  const totalWeight = activeComponents.reduce((sum, c) => sum + c.weight, 0)

  // Get score color class
  const getScoreColorClass = (value: number) => {
    if (value >= 90) return 'text-green-400'
    if (value >= 75) return 'text-accent-gold'
    if (value >= 60) return 'text-orange-400'
    return 'text-red-400'
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
              className="pointer-events-auto w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
            >
              <div
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(212, 175, 55, 0.3)'
                }}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-green-500/5 opacity-50" />

                {/* Glow effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

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
                        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Star className="w-5 h-5 text-accent" />
                        </div>
                        Executive Quality Score
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {data.projectName} • Comprehensive quality health metric
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
                    {/* Overall Score Display */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mb-8"
                    >
                      <div className={`bg-gradient-to-br from-accent/10 via-green-500/10 to-accent/5 rounded-xl p-8 border border-accent/20 text-center`}>
                        <div className="text-sm text-text-muted mb-2 uppercase tracking-widest font-bold">Overall Quality Score</div>
                        <div className={`text-7xl font-black mb-3 ${getScoreColorClass(score)}`}>
                          {score}
                        </div>
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${color}`}>
                          <Star className="w-4 h-4" />
                          {label}
                        </div>
                      </div>
                    </motion.div>

                    {/* Score Components Breakdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mb-8"
                    >
                      <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        Score Components
                      </h3>
                      
                      <div className="space-y-3">
                        {activeComponents.map((component, idx) => {
                          const Icon = component.icon
                          const weightedContribution = Math.round((component.value * component.weight) / totalWeight)
                          
                          return (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.35 + (idx * 0.05) }}
                              className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 hover:border-border/60 transition-all"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${component.color}20` }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: component.color }} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-text-primary">{component.name}</div>
                                    <div className="text-xs text-text-muted">{component.detail}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${getScoreColorClass(component.value)}`}>
                                    {component.value}
                                  </div>
                                  <div className="text-xs text-text-muted">Weight: {component.weight}%</div>
                                </div>
                              </div>

                              {/* Progress bar showing component value */}
                              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${component.value}%` }}
                                  transition={{ duration: 0.8, delay: 0.4 + (idx * 0.05) }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: component.color }}
                                />
                              </div>

                              {/* Contribution to total score */}
                              <div className="mt-2 text-xs text-text-muted flex justify-between">
                                <span>Contribution to total:</span>
                                <span className="font-bold text-accent">+{weightedContribution} points</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>

                    {/* Calculation Formula */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-6 pt-6 border-t border-border/30"
                    >
                      <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Calculation Formula</h3>
                      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                        <div className="font-mono text-xs text-text-secondary leading-relaxed space-y-2">
                          <div className="text-accent font-bold mb-3">Score = Σ (Component Value × Component Weight) / Total Weight</div>
                          
                          <div className="space-y-1.5 text-[11px]">
                            {activeComponents.map((comp, idx) => (
                              <div key={idx} className="flex items-center gap-2 opacity-80">
                                <span className="text-text-muted">•</span>
                                <span className="text-text-primary">{comp.name}:</span>
                                <span className="text-accent">{comp.value}</span>
                                <span className="text-text-muted">×</span>
                                <span className="text-accent">{comp.weight}%</span>
                                <span className="text-text-muted">=</span>
                                <span className="text-accent font-semibold">{Math.round((comp.value * comp.weight) / 100)}</span>
                              </div>
                            ))}
                            <div className="border-t border-border/20 pt-2 mt-2">
                              <div className="flex items-center gap-2 font-bold">
                                <span className="text-text-primary">Final Score:</span>
                                <span className={`${getScoreColorClass(score)} text-lg`}>{score}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Score Thresholds Reference */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-6"
                    >
                      <h3 className="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wider">Score Ranges</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                          <div className="text-xs text-green-400 font-bold mb-1">Excellent</div>
                          <div className="text-lg font-black text-green-400">90-100</div>
                        </div>
                        <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 text-center">
                          <div className="text-xs text-accent font-bold mb-1">Good</div>
                          <div className="text-lg font-black text-accent">75-89</div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
                          <div className="text-xs text-orange-400 font-bold mb-1">Fair</div>
                          <div className="text-lg font-black text-orange-400">60-74</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                          <div className="text-xs text-red-400 font-bold mb-1">Needs Attention</div>
                          <div className="text-lg font-black text-red-400">0-59</div>
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
