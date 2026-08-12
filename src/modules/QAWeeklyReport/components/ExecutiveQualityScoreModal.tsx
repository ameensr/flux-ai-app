// src/modules/QAWeeklyReport/components/ExecutiveQualityScoreModal.tsx
// Interactive 3D Card Popup for Executive Quality Score breakdown explanation

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, TrendingUp, CheckCircle, Target } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import type { QAReportForm } from '../types'
import { getQualityScoreComponents } from '../utils/qualityCalculator'

interface ExecutiveQualityScoreModalProps {
  isOpen: boolean
  onClose: () => void
  data: QAReportForm
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
}

const COMPONENT_ICONS = {
  passRate: CheckCircle,
  defectClosure: Target,
} as const

const COMPONENT_COLORS = {
  passRate: '#10b981',
  defectClosure: '#d4af37',
} as const

export function ExecutiveQualityScoreModal({
  isOpen,
  onClose,
  data,
  score,
  label,
  color
}: ExecutiveQualityScoreModalProps) {
  useBodyScrollLock(isOpen)

  const components = getQualityScoreComponents(data)

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          <div className="fixed inset-y-0 right-0 z-[101] flex items-center justify-end p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, x: 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 80 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 28,
              }}
              className="pointer-events-auto w-[420px] max-h-[90vh] overflow-y-auto"
            >
              <div
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(212, 175, 55, 0.3)',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-green-500/5 opacity-50" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between p-5 pb-3 border-b border-border/30">
                    <div className="flex-1">
                      <motion.h2
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold text-text-primary flex items-center gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
                          <Star className="w-4 h-4 text-accent" />
                        </div>
                        Executive Quality Score
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs text-text-secondary mt-1.5 ml-11"
                      >
                        {data.projectName} • Pass rate & defect closure
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

                  <div className="p-5">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.25 }}
                      className="mb-5"
                    >
                      <div className="bg-gradient-to-br from-accent/10 via-green-500/10 to-accent/5 rounded-xl p-6 border border-accent/20 text-center">
                        <div className="text-xs text-text-muted mb-1 uppercase tracking-widest font-bold">Overall Quality Score</div>
                        <div className={`text-6xl font-black mb-2 ${getScoreColorClass(score)}`}>
                          {score}
                        </div>
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold ${color}`}>
                          <Star className="w-4 h-4" />
                          {label}
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mb-5"
                    >
                      <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-accent" />
                        Score Components
                      </h3>

                      <div className="space-y-3">
                        {components.map((component, idx) => {
                          const Icon = COMPONENT_ICONS[component.key]
                          const componentColor = COMPONENT_COLORS[component.key]

                          return (
                            <motion.div
                              key={component.key}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.35 + idx * 0.05 }}
                              className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 hover:border-border/60 transition-all"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                  <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: `${componentColor}20` }}
                                  >
                                    <Icon className="w-5 h-5" style={{ color: componentColor }} />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-sm font-semibold text-text-primary">{component.name}</div>
                                    <div className="text-xs text-text-muted">{component.detail}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-2xl font-bold ${getScoreColorClass(component.value)}`}>
                                    {component.value}%
                                  </div>
                                  <div className="text-xs text-text-muted">Max {component.weight} pts</div>
                                </div>
                              </div>

                              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${component.value}%` }}
                                  transition={{ duration: 0.8, delay: 0.4 + idx * 0.05 }}
                                  className="h-full rounded-full"
                                  style={{ backgroundColor: componentColor }}
                                />
                              </div>

                              <div className="mt-2 text-xs text-text-muted flex justify-between">
                                <span>
                                  {component.value}% × {component.weight} ÷ 100
                                </span>
                                <span className="font-bold text-accent">+{component.points} points</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="mt-4 pt-4 border-t border-border/30"
                    >
                      <h3 className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Calculation Formula</h3>
                      <div className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30">
                        <div className="font-mono text-xs text-text-secondary leading-relaxed space-y-2">
                          <div className="text-accent font-bold mb-3">
                            Score = (Pass% × 55 + Closure% × 45) ÷ 100
                          </div>
                          <div className="space-y-1.5 text-[11px]">
                            {components.map(comp => (
                              <div key={comp.key} className="flex items-center gap-2 opacity-80">
                                <span className="text-text-muted">•</span>
                                <span className="text-text-primary">{comp.name}:</span>
                                <span className="text-accent">{comp.value}%</span>
                                <span className="text-text-muted">×</span>
                                <span className="text-accent">{comp.weight}</span>
                                <span className="text-text-muted">÷ 100 =</span>
                                <span className="text-accent font-semibold">{comp.points} pts</span>
                              </div>
                            ))}
                            <div className="border-t border-border/20 pt-2 mt-2">
                              <div className="flex items-center gap-2 font-bold">
                                <span className="text-text-primary">Final Score:</span>
                                <span className={`${getScoreColorClass(score)} text-lg`}>{score}</span>
                                <span className="text-text-muted font-normal">
                                  ({components.map(c => c.points).join(' + ')} pts)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="mt-4"
                    >
                      <h3 className="text-xs font-semibold text-text-muted mb-2 uppercase tracking-wider">Score Ranges</h3>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-green-400 font-bold mb-0.5">Excellent</div>
                          <div className="text-sm font-black text-green-400">90-100</div>
                        </div>
                        <div className="bg-accent/10 border border-accent/20 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-accent font-bold mb-0.5">Good</div>
                          <div className="text-sm font-black text-accent">75-89</div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-orange-400 font-bold mb-0.5">Fair</div>
                          <div className="text-sm font-black text-orange-400">60-74</div>
                        </div>
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-red-400 font-bold mb-0.5">Attention</div>
                          <div className="text-sm font-black text-red-400">0-59</div>
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
