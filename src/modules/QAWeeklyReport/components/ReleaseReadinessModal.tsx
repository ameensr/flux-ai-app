// src/modules/QAWeeklyReport/components/ReleaseReadinessModal.tsx
// Interactive 3D Card Modal for Release Readiness Meter with calculation explanation

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Gauge, CheckCircle, AlertCircle, Ban, Calculator } from 'lucide-react'
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
  releaseReadinessScore,
  passedCases,
  totalCases,
  openBugsCount,
  blockedCases,
  closureRate,
  projectName
}: ReleaseReadinessModalProps) {
  useBodyScrollLock(isOpen)

  // Recalculate factors for display
  const passPctFactor = totalCases > 0 ? passedCases / totalCases : 1.0
  const openBugsFactor = 1 - openBugsCount / (openBugsCount + 5)
  const blockersFactor = 1 - blockedCases / (blockedCases + 3)
  const closureFactor = closureRate / 100

  const passContribution = (passPctFactor * 50).toFixed(1)
  const bugsContribution = (openBugsFactor * 20).toFixed(1)
  const blockersContribution = (blockersFactor * 15).toFixed(1)
  const closureContribution = (closureFactor * 15).toFixed(1)

  const factorsData = [
    {
      name: 'Test Pass Rate',
      weight: '50%',
      score: (passPctFactor * 100).toFixed(1),
      contribution: passContribution,
      icon: CheckCircle,
      color: '#10b981',
      formula: `(${passedCases} passed ÷ ${totalCases} total) × 50`
    },
    {
      name: 'Open Bugs Factor',
      weight: '20%',
      score: (openBugsFactor * 100).toFixed(1),
      contribution: bugsContribution,
      icon: AlertCircle,
      color: '#f59e0b',
      formula: `(1 - ${openBugsCount} ÷ ${openBugsCount + 5}) × 20`
    },
    {
      name: 'Blockers Factor',
      weight: '15%',
      score: (blockersFactor * 100).toFixed(1),
      contribution: blockersContribution,
      icon: Ban,
      color: '#ef4444',
      formula: `(1 - ${blockedCases} ÷ ${blockedCases + 3}) × 15`
    },
    {
      name: 'Closure Rate',
      weight: '15%',
      score: closureRate.toFixed(1),
      contribution: closureContribution,
      icon: CheckCircle,
      color: '#3b82f6',
      formula: `(${closureRate.toFixed(1)}% ÷ 100) × 15`
    }
  ]

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
                className="relative bg-gradient-to-br from-surface via-surface-secondary to-surface-elevated border border-border/50 rounded-2xl shadow-2xl overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 100px -20px rgba(16, 185, 129, 0.3)'
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
                          <Gauge className="w-5 h-5 text-green-400" />
                        </div>
                        Release Readiness Meter
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-sm text-text-secondary mt-2"
                      >
                        {projectName} • Calculation Breakdown
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
                    {/* Luxury Speedometer Gauge */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 }}
                      className={`bg-gradient-to-br ${releaseReadinessScore >= 90 ? 'from-green-500/10 to-emerald-500/5 border-green-500/20' : releaseReadinessScore >= 70 ? 'from-amber-500/10 to-yellow-500/5 border-amber-500/20' : 'from-red-500/10 to-rose-500/5 border-red-500/20'} rounded-xl p-4 border mb-6 relative overflow-hidden`}
                    >
                      {/* Ambient glow effect */}
                      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent opacity-50" />

                      <div className="text-xs text-text-muted mb-2 text-center">Final Release Readiness Score</div>

                      {/* Speedometer SVG */}
                      <div className="relative w-full max-w-[240px] mx-auto aspect-square flex items-center justify-center">
                        <svg viewBox="0 0 200 140" className="w-full h-full">
                          <defs>
                            {/* Gradients for zones */}
                            <linearGradient id="criticalZone" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#dc2626" stopOpacity="0.5" />
                            </linearGradient>
                            <linearGradient id="cautionZone" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#d97706" stopOpacity="0.5" />
                            </linearGradient>
                            <linearGradient id="optimalZone" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#059669" stopOpacity="0.5" />
                            </linearGradient>
                            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#fbbf24" />
                              <stop offset="50%" stopColor="#fcd34d" />
                              <stop offset="100%" stopColor="#fbbf24" />
                            </linearGradient>
                            <radialGradient id="centerGlow">
                              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.5" />
                              <stop offset="100%" stopColor="#d97706" stopOpacity="0.2" />
                            </radialGradient>
                            {/* Shadow filter */}
                            <filter id="needleShadow">
                              <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                              <feOffset dx="1" dy="2" result="offsetblur" />
                              <feComponentTransfer>
                                <feFuncA type="linear" slope="0.5" />
                              </feComponentTransfer>
                              <feMerge>
                                <feMergeNode />
                                <feMergeNode in="SourceGraphic" />
                              </feMerge>
                            </filter>
                          </defs>

                          {/* Outer ring */}
                          <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                          {/* Speed zones (arcs) */}
                          {/* Critical zone: 0-70% (210° to 270°) */}
                          <motion.path
                            d="M 25.25 64.95 A 75 75 0 0 1 65.25 25.25"
                            fill="none"
                            stroke="url(#criticalZone)"
                            strokeWidth="20"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.3 }}
                          />

                          {/* Caution zone: 70-90% (270° to 300°) */}
                          <motion.path
                            d="M 65.25 25.25 A 75 75 0 0 1 100 15"
                            fill="none"
                            stroke="url(#cautionZone)"
                            strokeWidth="20"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                          />

                          {/* Optimal zone: 90-100% (300° to 330°) */}
                          <motion.path
                            d="M 100 15 A 75 75 0 0 1 134.75 25.25"
                            fill="none"
                            stroke="url(#optimalZone)"
                            strokeWidth="20"
                            strokeLinecap="round"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1, delay: 0.7 }}
                          />

                          {/* Tick marks and numbers */}
                          {[0, 25, 50, 70, 90, 100].map((value, idx) => {
                            const angle = 210 + (value * 1.2) // 210° start, 120° range
                            const rad = (angle * Math.PI) / 180
                            const x1 = 100 + 65 * Math.cos(rad)
                            const y1 = 100 + 65 * Math.sin(rad)
                            const x2 = 100 + 72 * Math.cos(rad)
                            const y2 = 100 + 72 * Math.sin(rad)
                            const textX = 100 + 55 * Math.cos(rad)
                            const textY = 100 + 55 * Math.sin(rad)

                            return (
                              <g key={value}>
                                <motion.line
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke="rgba(255,255,255,0.4)"
                                  strokeWidth={value % 25 === 0 ? "2" : "1"}
                                  strokeLinecap="round"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: 0.9 + idx * 0.05 }}
                                />
                                {value % 25 === 0 && (
                                  <motion.text
                                    x={textX}
                                    y={textY}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="text-[10px] font-bold fill-text-muted"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 + idx * 0.05 }}
                                  >
                                    {value}
                                  </motion.text>
                                )}
                              </g>
                            )
                          })}

                          {/* Zone labels */}
                          <motion.text
                            x="45"
                            y="85"
                            textAnchor="middle"
                            className="text-[8px] font-bold uppercase tracking-wider fill-red-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.2 }}
                          >
                            Critical
                          </motion.text>
                          <motion.text
                            x="85"
                            y="40"
                            textAnchor="middle"
                            className="text-[8px] font-bold uppercase tracking-wider fill-amber-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.3 }}
                          >
                            Caution
                          </motion.text>
                          <motion.text
                            x="120"
                            y="30"
                            textAnchor="middle"
                            className="text-[8px] font-bold uppercase tracking-wider fill-green-400"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4 }}
                          >
                            Optimal
                          </motion.text>

                          {/* Animated needle */}
                          <motion.g
                            initial={{ rotate: -60 }}
                            animate={{ rotate: releaseReadinessScore * 1.2 - 60 }}
                            transition={{
                              type: "spring",
                              stiffness: 60,
                              damping: 15,
                              delay: 0.8,
                              duration: 1.5
                            }}
                            style={{ originX: '100px', originY: '100px' }}
                            filter="url(#needleShadow)"
                          >
                            {/* Needle body */}
                            <path
                              d="M 100 100 L 100 40 L 102 100 Z"
                              fill="url(#needleGradient)"
                              stroke="#d97706"
                              strokeWidth="0.5"
                            />
                            {/* Needle glow */}
                            <motion.circle
                              cx="100"
                              cy="40"
                              r="3"
                              fill="#fbbf24"
                              animate={{
                                opacity: [0.6, 1, 0.6],
                                scale: [1, 1.2, 1]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            />
                          </motion.g>

                          {/* Center hub */}
                          <motion.circle
                            cx="100"
                            cy="100"
                            r="12"
                            fill="url(#centerGlow)"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1, type: "spring", stiffness: 200 }}
                          />
                          <motion.circle
                            cx="100"
                            cy="100"
                            r="8"
                            fill="rgba(0,0,0,0.4)"
                            stroke="#fbbf24"
                            strokeWidth="2"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.1, type: "spring", stiffness: 200 }}
                          />
                          <motion.circle
                            cx="100"
                            cy="100"
                            r="4"
                            fill="#fbbf24"
                            animate={{
                              opacity: [1, 0.5, 1]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        </svg>

                        {/* Digital readout overlay */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 1.5 }}
                          className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                        >
                          <div className="bg-black/60 backdrop-blur-sm rounded-md px-2.5 py-1 border border-accent-gold/30 shadow-lg">
                            <motion.div
                              className={`text-2xl font-black tabular-nums ${releaseReadinessScore >= 90 ? 'text-green-400' : releaseReadinessScore >= 70 ? 'text-amber-400' : 'text-red-400'}`}
                              animate={{
                                textShadow: [
                                  '0 0 10px rgba(251, 191, 36, 0.5)',
                                  '0 0 20px rgba(251, 191, 36, 0.8)',
                                  '0 0 10px rgba(251, 191, 36, 0.5)'
                                ]
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                            >
                              {releaseReadinessScore}%
                            </motion.div>
                          </div>
                        </motion.div>
                      </div>

                      {/* Status label */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.6 }}
                        className={`mt-2 text-center text-[10px] font-bold uppercase tracking-widest ${releaseReadinessScore >= 90 ? 'text-green-400' : releaseReadinessScore >= 70 ? 'text-amber-500' : 'text-red-400'}`}
                      >
                        {releaseReadinessScore >= 90 ? '🟢 Ready for Production' : releaseReadinessScore >= 70 ? '🟡 Needs Attention' : '🔴 Not Ready'}
                      </motion.div>
                    </motion.div>

                    {/* Calculation Formula */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-surface-elevated/50 backdrop-blur-sm rounded-xl p-5 border border-border/30 mb-6"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator className="w-5 h-5 text-accent-gold" />
                        <h3 className="text-lg font-semibold text-text-primary">Calculation Formula</h3>
                      </div>
                      <div className="bg-black/20 rounded-lg p-4 font-mono text-xs text-text-secondary overflow-x-auto">
                        <div className="whitespace-nowrap">
                          Readiness Score = (Pass Rate × 50%) + (Bugs Factor × 20%) + (Blockers Factor × 15%) + (Closure Rate × 15%)
                        </div>
                        <div className="mt-3 text-accent-gold whitespace-nowrap">
                          = {passContribution} + {bugsContribution} + {blockersContribution} + {closureContribution} = {releaseReadinessScore}%
                        </div>
                      </div>
                    </motion.div>

                    {/* Factor Breakdown */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="space-y-3 mb-6"
                    >
                      <h3 className="text-lg font-semibold text-text-primary">Factor Breakdown</h3>
                      {factorsData.map((factor, idx) => {
                        const Icon = factor.icon
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + (idx * 0.05) }}
                            className="bg-surface-elevated/50 backdrop-blur-sm rounded-lg p-4 border border-border/30 hover:border-border/60 transition-all"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${factor.color}20` }}
                                >
                                  <Icon className="w-5 h-5" style={{ color: factor.color }} />
                                </div>
                                <div>
                                  <div className="text-sm font-semibold text-text-primary">{factor.name}</div>
                                  <div className="text-xs text-text-muted">Weight: {factor.weight}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-accent-gold">{factor.contribution}</div>
                                <div className="text-xs text-text-muted">points</div>
                              </div>
                            </div>
                            <div className="bg-black/20 rounded-lg p-3">
                              <div className="text-xs text-text-muted mb-1">Raw Score: {factor.score}%</div>
                              <div className="font-mono text-xs text-text-secondary">
                                {factor.formula}
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 h-2 bg-black/20 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${parseFloat(factor.score)}%` }}
                                transition={{ delay: 0.5 + (idx * 0.1), duration: 0.8 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: factor.color }}
                              />
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>

                    {/* Explanation */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="pt-6 border-t border-border/30"
                    >
                      <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
                        <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                          <span>💡</span> How It Works
                        </h4>
                        <div className="text-xs text-text-muted leading-relaxed space-y-2">
                          <p>
                            <strong className="text-text-secondary">Test Pass Rate (50%):</strong> The percentage of test cases that passed.
                            Higher pass rates indicate better quality and readiness.
                          </p>
                          <p>
                            <strong className="text-text-secondary">Open Bugs Factor (20%):</strong> Calculates impact of unresolved bugs.
                            Fewer open bugs improve the score. Formula normalizes using a baseline of 5 bugs.
                          </p>
                          <p>
                            <strong className="text-text-secondary">Blockers Factor (15%):</strong> Measures impact of blocked test cases.
                            Fewer blockers mean smoother release path. Normalized using baseline of 3 blockers.
                          </p>
                          <p>
                            <strong className="text-text-secondary">Closure Rate (15%):</strong> Percentage of reported bugs that have been closed.
                            Higher closure rates show effective bug resolution.
                          </p>
                          <p className="mt-3 pt-3 border-t border-border/20">
                            <strong className="text-accent-gold">Scoring Guide:</strong> 90-100% = Ready for Production,
                            70-89% = Needs Attention, Below 70% = Not Ready for Release
                          </p>
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
