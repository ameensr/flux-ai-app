// src/modules/QAWeeklyReport/components/ReleaseReadinessModal.tsx
// Redesigned Release Readiness Meter Modal with simplified calculation

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gauge, CheckCircle, Bug } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface ReleaseReadinessModalProps {
  isOpen: boolean
  onClose: () => void
  releaseReadinessScore: number
  passedCases: number
  totalCases: number
  openBugsCount: number
  blockedCases: number
  closureRate: number
  projectName: string
}

export function ReleaseReadinessModal({
  isOpen,
  onClose,
  passedCases,
  totalCases,
  openBugsCount,
  projectName
}: ReleaseReadinessModalProps) {
  useBodyScrollLock(isOpen)

  // Escape to close (backdrop click and the X button already close it)
  React.useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  // Simplified calculation with only 2 factors
  const passRate = totalCases > 0 ? (passedCases / totalCases) * 100 : 100
  const passRateWeight = 60
  const openBugsWeight = 40

  // Open Bugs Factor: More bugs = lower score
  // Using logarithmic scale for better distribution
  const openBugsFactor = openBugsCount === 0 ? 100 : Math.max(0, 100 - (Math.log10(openBugsCount + 1) * 40))

  const passRateContribution = (passRate / 100) * passRateWeight
  const openBugsContribution = (openBugsFactor / 100) * openBugsWeight

  const finalScore = Math.round(passRateContribution + openBugsContribution)

  const getScoreColor = (score: number) => {
    if (score >= 85) return { text: 'text-green-400', bg: 'bg-green-500', glow: 'rgba(16,185,129,0.5)' }
    if (score >= 70) return { text: 'text-amber-400', bg: 'bg-amber-500', glow: 'rgba(245,158,11,0.5)' }
    return { text: 'text-red-400', bg: 'bg-red-500', glow: 'rgba(239,68,68,0.5)' }
  }

  const scoreColors = getScoreColor(finalScore)

  const getStatusLabel = (score: number) => {
    if (score >= 85) return { icon: '🟢', text: 'Ready for Production' }
    if (score >= 70) return { icon: '🟡', text: 'Needs Attention' }
    return { icon: '🔴', text: 'Not Ready' }
  }

  const status = getStatusLabel(finalScore)

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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal - Centered */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="release-readiness-title"
              className="pointer-events-auto w-full max-w-4xl"
            >
              <div
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
                style={{
                  boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 80px -20px ${scoreColors.glow}`
                }}
              >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-amber-500/5 opacity-50 pointer-events-none" />
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-green-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />

                {/* Content */}
                <div className="relative z-10 flex flex-col min-h-0">
                  {/* Header */}
                  <div className="shrink-0 flex items-start justify-between p-5 sm:px-6 pb-3 border-b border-border/30">
                    <div className="flex-1 min-w-0">
                      <motion.h2
                        id="release-readiness-title"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl font-bold text-text-primary flex items-center gap-2.5"
                      >
                        <div className="w-9 h-9 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                          <Gauge className="w-4 h-4 text-green-400" />
                        </div>
                        Release Readiness
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-xs text-text-secondary mt-1.5 ml-11 truncate"
                      >
                        {projectName}
                      </motion.p>
                    </div>
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 }}
                      whileHover={{ scale: 1.1, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={onClose}
                      aria-label="Close Release Readiness"
                      className="shrink-0 w-8 h-8 rounded-lg bg-surface-elevated hover:bg-hover border border-border/30 flex items-center justify-center text-text-secondary hover:text-text-primary transition-all"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>

                  {/* Body — only this area scrolls, so the header stays put */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)] gap-5 lg:gap-6 items-start">

                      {/* ── Left column: score, calculation, ranges ── */}
                      <div className="flex flex-col gap-4">
                        {/* Score Display */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.2 }}
                          className="bg-surface-elevated/40 backdrop-blur-sm rounded-2xl border border-border/30 p-5"
                        >
                          <div className="relative flex flex-col items-center py-2">
                            {/* Circular Progress */}
                            <div className="relative w-44 h-44 sm:w-48 sm:h-48">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background circle */}
                                <circle
                                  cx="50" cy="50" r="42"
                                  fill="none"
                                  stroke="rgba(255,255,255,0.06)"
                                  strokeWidth="8"
                                />
                                {/* Progress circle */}
                                <motion.circle
                                  cx="50" cy="50" r="42"
                                  fill="none"
                                  stroke="url(#readinessGradient)"
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 42}
                                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - finalScore / 100) }}
                                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                                  style={{ filter: `drop-shadow(0 0 8px ${scoreColors.glow})` }}
                                />
                                <defs>
                                  <linearGradient id="readinessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={finalScore >= 85 ? '#10b981' : finalScore >= 70 ? '#f59e0b' : '#ef4444'} />
                                    <stop offset="100%" stopColor={finalScore >= 85 ? '#34d399' : finalScore >= 70 ? '#fbbf24' : '#f87171'} />
                                  </linearGradient>
                                </defs>
                              </svg>

                              {/* Score text */}
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.5 }}
                                  className={`text-5xl font-black ${scoreColors.text}`}
                                >
                                  {finalScore}%
                                </motion.span>
                                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted mt-1">
                                  Readiness
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.7 }}
                              className={`mt-5 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border text-center ${finalScore >= 85 ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                                  finalScore >= 70 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                    'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}
                            >
                              {status.icon} {status.text}
                            </motion.div>
                          </div>
                        </motion.div>

                        {/* Calculation Summary */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="bg-gradient-to-br from-accent/10 to-green-500/5 rounded-xl p-4 border border-accent/20"
                        >
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">Calculation</div>
                          <div className="font-mono text-sm space-y-1.5">
                            <div className="flex justify-between gap-3 text-text-secondary">
                              <span>Pass Rate ({passRate.toFixed(1)}% × {passRateWeight}%)</span>
                              <span className="text-green-400 shrink-0">+{passRateContribution.toFixed(1)}</span>
                            </div>
                            <div className="flex justify-between gap-3 text-text-secondary">
                              <span>Bugs Factor ({openBugsFactor.toFixed(1)}% × {openBugsWeight}%)</span>
                              <span className="text-amber-400 shrink-0">+{openBugsContribution.toFixed(1)}</span>
                            </div>
                            <div className="border-t border-border/30 pt-2 mt-2 flex justify-between gap-3 font-bold">
                              <span className="text-text-primary">Final Score</span>
                              <span className={`${scoreColors.text} shrink-0`}>{finalScore}%</span>
                            </div>
                          </div>
                        </motion.div>

                        {/* Score Ranges */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Score Ranges</div>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-green-400 font-bold">Ready</div>
                              <div className="text-sm font-black text-green-400">85-100</div>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-amber-400 font-bold">Attention</div>
                              <div className="text-sm font-black text-amber-400">70-84</div>
                            </div>
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-center">
                              <div className="text-[10px] text-red-400 font-bold">Not Ready</div>
                              <div className="text-sm font-black text-red-400">0-69</div>
                            </div>
                          </div>
                        </motion.div>
                      </div>

                      {/* ── Right column: contributing factors + explanation ── */}
                      <div className="flex flex-col gap-4">
                        <div className="text-xs font-bold text-text-muted uppercase tracking-wider">
                          Contributing Factors
                        </div>

                        {/* Release Pass Rate */}
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                          className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30"
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary">Release Pass Rate</div>
                                <div className="text-xs text-text-muted">Weight: {passRateWeight}%</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-2xl font-bold ${passRate >= 80 ? 'text-green-400' : passRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {passRate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-text-muted">+{passRateContribution.toFixed(1)} pts</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${passRate}%` }}
                              transition={{ duration: 0.8, delay: 0.4 }}
                              className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                            />
                          </div>

                          <div className="text-xs text-text-muted font-mono bg-black/20 rounded-lg px-3 py-2">
                            {passedCases} passed / {totalCases} total = {passRate.toFixed(1)}%
                          </div>
                        </motion.div>

                        {/* Open Bugs Factor */}
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.4 }}
                          className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-4 border border-border/30"
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Bug className="w-5 h-5 text-amber-400" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-text-primary">Open Bugs Factor</div>
                                <div className="text-xs text-text-muted">Weight: {openBugsWeight}%</div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className={`text-2xl font-bold ${openBugsFactor >= 80 ? 'text-green-400' : openBugsFactor >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                {openBugsFactor.toFixed(1)}%
                              </div>
                              <div className="text-xs text-text-muted">+{openBugsContribution.toFixed(1)} pts</div>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-2">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${openBugsFactor}%` }}
                              transition={{ duration: 0.8, delay: 0.5 }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                            />
                          </div>

                          <div className="text-xs text-text-muted font-mono bg-black/20 rounded-lg px-3 py-2">
                            {openBugsCount} open bugs → {openBugsFactor.toFixed(1)}% factor
                          </div>
                        </motion.div>

                        {/* Factor Explanations */}
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className="pt-4 border-t border-border/30"
                        >
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">💡 How It Works</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-muted leading-relaxed">
                            <div className="bg-surface-elevated/30 rounded-lg p-3 border border-border/20">
                              <div className="flex items-center gap-2 mb-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                                <span className="font-semibold text-text-secondary">Release Pass Rate (60%)</span>
                              </div>
                              <p>Percentage of release testing items that passed. Calculated as passed cases divided by total cases. Higher pass rates indicate better quality and release readiness.</p>
                            </div>
                            <div className="bg-surface-elevated/30 rounded-lg p-3 border border-border/20">
                              <div className="flex items-center gap-2 mb-1.5">
                                <Bug className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="font-semibold text-text-secondary">Open Bugs Factor (40%)</span>
                              </div>
                              <p>Measures the impact of unresolved bugs on release readiness. Uses a logarithmic scale where 0 bugs = 100% factor, and more bugs progressively reduce the score. This ensures even a few critical bugs significantly impact readiness.</p>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
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
