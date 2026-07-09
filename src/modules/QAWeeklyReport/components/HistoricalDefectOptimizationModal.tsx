import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Sparkles, Calendar, Target, BarChart3 } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { CountUpNumber } from './CountUpNumber'

interface HistoricalDefectOptimizationModalProps {
  isOpen: boolean
  onClose: () => void
  data: {
    previousFixedBugCount: number
    latestFixedBugCount: number
    reducedBugs?: number
    improvementPercentage?: number
    executiveSummary?: string
    trackingSince?: string
  }
  projectName: string
}

export const HistoricalDefectOptimizationModal: React.FC<HistoricalDefectOptimizationModalProps> = ({
  isOpen,
  onClose,
  data,
  projectName
}) => {
  const { theme: globalTheme } = useTheme()
  const theme = globalTheme === 'light' ? 'light' : 'dark'

  const isImprovement = (data.reducedBugs ?? 0) >= 0
  const improvementPercent = Math.abs(data.improvementPercentage ?? 0)

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
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
            onClick={onClose}
          />

          {/* Modal Container with 3D Transform */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ 
                opacity: 0, 
                scale: 0.8, 
                rotateX: -15,
                y: 100
              }}
              animate={{ 
                opacity: 1, 
                scale: 1, 
                rotateX: 0,
                y: 0
              }}
              exit={{ 
                opacity: 0, 
                scale: 0.8, 
                rotateX: 15,
                y: 100
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 25,
                duration: 0.4
              }}
              style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d'
              }}
              className="w-full max-w-5xl max-h-[90vh] overflow-auto pointer-events-auto"
            >
              <div 
                className={`rounded-3xl border backdrop-blur-2xl shadow-2xl relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-[#0a0a0f]/95 border-white/10' 
                    : 'bg-white/95 border-slate-200'
                }`}
                style={{
                  boxShadow: theme === 'dark'
                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
                    : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(212, 175, 55, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                }}
              >
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <motion.div
                    animate={{
                      x: [0, 100, -50, 0],
                      y: [0, -50, 100, 0],
                      scale: [1, 1.2, 0.9, 1],
                      rotate: [0, 90, 180, 270, 360]
                    }}
                    transition={{
                      duration: 20,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent rounded-full blur-3xl"
                  />
                  <motion.div
                    animate={{
                      x: [0, -100, 50, 0],
                      y: [0, 50, -100, 0],
                      scale: [1, 0.9, 1.2, 1],
                      rotate: [360, 270, 180, 90, 0]
                    }}
                    transition={{
                      duration: 25,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl"
                  />
                </div>

                {/* Header */}
                <div className={`relative z-10 px-8 py-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <motion.div
                          animate={{ rotate: [0, 360] }}
                          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                          className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30"
                        >
                          <TrendingUp className="w-5 h-5 text-green-400" />
                        </motion.div>
                        <div>
                          <h2 className={`text-2xl font-black font-clash ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            Historical Defect Optimization
                          </h2>
                          <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                            {projectName} • Quality Trend Analysis
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className={`p-2 rounded-xl transition-all ${
                        theme === 'dark'
                          ? 'hover:bg-white/10 text-white/70 hover:text-white'
                          : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="relative z-10 p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Column: Metrics */}
                    <div className="flex flex-col gap-6">
                      
                      {/* Previous vs Latest Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 }}
                          className={`p-5 rounded-2xl border ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20'
                              : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4 text-red-400" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>
                              Previous Count
                            </span>
                          </div>
                          <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <CountUpNumber end={data.previousFixedBugCount} />
                          </div>
                          <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-slate-600'}`}>
                            Fixed bugs (baseline)
                          </p>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className={`p-5 rounded-2xl border ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20'
                              : 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Target className="w-4 h-4 text-green-400" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                              Latest Count
                            </span>
                          </div>
                          <div className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <CountUpNumber end={data.latestFixedBugCount} />
                          </div>
                          <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-white/50' : 'text-slate-600'}`}>
                            Fixed bugs (current)
                          </p>
                        </motion.div>
                      </div>

                      {/* Tracking Since */}
                      {data.trackingSince && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className={`p-4 rounded-2xl border ${
                            theme === 'dark'
                              ? 'bg-white/5 border-white/10'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                              <Calendar className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                              <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                                Tracking Since
                              </p>
                              <p className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                {new Date(data.trackingSince).toLocaleDateString('en-GB', { 
                                  day: '2-digit', 
                                  month: 'long', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Visual Comparison Bar */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`p-6 rounded-2xl border ${
                          theme === 'dark'
                            ? 'bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10'
                            : 'bg-gradient-to-br from-slate-50 to-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white/70' : 'text-slate-700'}`}>
                            Visual Comparison
                          </span>
                          <BarChart3 className="w-4 h-4 text-accent-gold" />
                        </div>
                        
                        <div className="space-y-4">
                          {/* Previous Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-red-400">Previous</span>
                              <span className="text-xs font-mono font-bold text-red-400">
                                {data.previousFixedBugCount}
                              </span>
                            </div>
                            <div className={`h-8 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${Math.min((data.previousFixedBugCount / Math.max(data.previousFixedBugCount, data.latestFixedBugCount)) * 100, 100)}%` 
                                }}
                                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-end pr-2"
                              >
                                <span className="text-[10px] font-bold text-white">
                                  {Math.round((data.previousFixedBugCount / Math.max(data.previousFixedBugCount, data.latestFixedBugCount)) * 100)}%
                                </span>
                              </motion.div>
                            </div>
                          </div>

                          {/* Latest Bar */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-green-400">Latest</span>
                              <span className="text-xs font-mono font-bold text-green-400">
                                {data.latestFixedBugCount}
                              </span>
                            </div>
                            <div className={`h-8 rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ 
                                  width: `${Math.min((data.latestFixedBugCount / Math.max(data.previousFixedBugCount, data.latestFixedBugCount)) * 100, 100)}%` 
                                }}
                                transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-end pr-2"
                                style={{
                                  boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)'
                                }}
                              >
                                <span className="text-[10px] font-bold text-white">
                                  {Math.round((data.latestFixedBugCount / Math.max(data.previousFixedBugCount, data.latestFixedBugCount)) * 100)}%
                                </span>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                    </div>

                    {/* Right Column: Results & Insights */}
                    <div className="flex flex-col gap-6">
                      
                      {/* Key Results */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 }}
                        className={`p-6 rounded-2xl border relative overflow-hidden ${
                          isImprovement
                            ? theme === 'dark'
                              ? 'bg-gradient-to-br from-green-500/20 via-green-500/10 to-emerald-500/5 border-green-500/30'
                              : 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100/50 border-green-300'
                            : theme === 'dark'
                              ? 'bg-gradient-to-br from-red-500/20 via-red-500/10 to-rose-500/5 border-red-500/30'
                              : 'bg-gradient-to-br from-red-50 via-rose-50 to-red-100/50 border-red-300'
                        }`}
                      >
                        {/* Animated Icon */}
                        <motion.div
                          animate={{ 
                            rotate: isImprovement ? [0, 360] : [0, -360],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="absolute top-4 right-4 opacity-20"
                        >
                          {isImprovement ? (
                            <TrendingUp className="w-24 h-24 text-green-400" />
                          ) : (
                            <TrendingDown className="w-24 h-24 text-red-400" />
                          )}
                        </motion.div>

                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-4">
                            {isImprovement ? (
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            ) : (
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            )}
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                              isImprovement 
                                ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                            }`}>
                              {isImprovement ? 'Bugs Reduced' : 'Bugs Increased'}
                            </span>
                          </div>
                          
                          <div className={`text-6xl font-black mb-2 ${
                            isImprovement 
                              ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                              : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                          }`}>
                            {isImprovement ? '' : '+'}
                            <CountUpNumber end={Math.abs(data.reducedBugs ?? 0)} />
                          </div>
                          
                          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-slate-700'}`}>
                            {isImprovement ? 'Fewer bugs than previous period' : 'More bugs than previous period'}
                          </p>
                        </div>
                      </motion.div>

                      {/* Improvement Percentage */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 }}
                        className={`p-6 rounded-2xl border ${
                          isImprovement
                            ? theme === 'dark'
                              ? 'bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/25'
                              : 'bg-gradient-to-br from-emerald-50 to-green-100/50 border-emerald-200'
                            : theme === 'dark'
                              ? 'bg-gradient-to-br from-rose-500/15 to-rose-500/5 border-rose-500/25'
                              : 'bg-gradient-to-br from-rose-50 to-red-100/50 border-rose-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            isImprovement
                              ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                              : theme === 'dark' ? 'text-rose-400' : 'text-rose-600'
                          }`}>
                            {isImprovement ? 'Improvement Rate' : 'Regression Rate'}
                          </span>
                          {isImprovement ? (
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-rose-400" />
                          )}
                        </div>
                        
                        <div className={`text-5xl font-black mb-3 ${
                          isImprovement
                            ? theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                            : theme === 'dark' ? 'text-rose-400' : 'text-rose-600'
                        }`}>
                          <CountUpNumber end={improvementPercent} decimals={1} />%
                        </div>

                        {/* Animated Progress Bar */}
                        <div className={`h-3 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(improvementPercent, 100)}%` }}
                            transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              isImprovement
                                ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                : 'bg-gradient-to-r from-red-500 to-rose-400'
                            }`}
                            style={{
                              boxShadow: isImprovement
                                ? '0 0 15px rgba(34, 197, 94, 0.5)'
                                : '0 0 15px rgba(239, 68, 68, 0.5)'
                            }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-text-muted">0%</span>
                          <span className="text-[10px] text-text-muted">100%</span>
                        </div>
                      </motion.div>

                      {/* Executive Summary */}
                      {data.executiveSummary && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          className={`p-6 rounded-2xl border ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-accent-gold/10 to-accent-gold/5 border-accent-gold/20'
                              : 'bg-gradient-to-br from-amber-50 to-yellow-100/50 border-amber-200'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-accent-gold" />
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              theme === 'dark' ? 'text-accent-gold' : 'text-amber-600'
                            }`}>
                              Executive Summary
                            </span>
                          </div>
                          <p className={`text-base leading-relaxed font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-slate-800'
                          }`}>
                            {data.executiveSummary}
                          </p>
                        </motion.div>
                      )}

                    </div>

                  </div>
                </div>

                {/* Footer */}
                <div className={`relative z-10 px-8 py-4 border-t ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-slate-500'}`}>
                      Historical trend analysis • Quality optimization metrics
                    </p>
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-xl bg-accent-gold hover:bg-accent-gold/90 text-black font-bold text-xs uppercase tracking-widest transition-all"
                    >
                      Close
                    </button>
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
