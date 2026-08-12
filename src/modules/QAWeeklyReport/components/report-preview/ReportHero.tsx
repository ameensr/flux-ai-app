import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { Mail, Sparkles, Wrench, CalendarRange, Clock3, FileCheck2, ChevronDown } from 'lucide-react'

interface QualityStats {
  score: number
  label: string
  desc: string
  color: string
}

interface ReportMeta {
  generatedDate?: string
  status?: 'Draft' | 'Final'
  createdBy?: string
}

interface ReportHeroProps {
  sectionRef: React.RefObject<HTMLDivElement | null>
  visible: boolean
  sectionVariants?: Variants
  theme: 'light' | 'dark'
  projectName: string
  reportTitle?: string
  subtitle?: string
  weekStart: string
  weekEnd: string
  reportMeta: ReportMeta
  supportEmails: number
  newFeatures: number
  codeFixes: number
  qualityStats: QualityStats
  CountUpNumber: React.ComponentType<{ end: number; suffix?: string; decimals?: number }>
  onOpenQualityModal: () => void
  onScrollNext: () => void
  onNavigateToSection?: (section: string) => void
  onOpenProductionIssuesModal?: () => void
  bottomContent?: React.ReactNode
  showQualityScore?: boolean
}

function formatGeneratedDate(iso?: string): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

function formatWeekDate(raw: string, includeYear: boolean): string {
  if (!raw) return raw
  const d = new Date(`${raw}T00:00:00`)
  if (isNaN(d.getTime())) return raw
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: includeYear ? 'numeric' : undefined
  })
}

export const ReportHero: React.FC<ReportHeroProps> = ({
  sectionRef,
  visible,
  sectionVariants,
  theme,
  projectName,
  reportTitle,
  subtitle,
  weekStart,
  weekEnd,
  reportMeta,
  supportEmails,
  newFeatures,
  codeFixes,
  qualityStats,
  CountUpNumber,
  onOpenQualityModal,
  onScrollNext,
  onNavigateToSection,
  onOpenProductionIssuesModal,
  bottomContent,
  showQualityScore = true,
}) => {
  const generatedLabel = formatGeneratedDate(reportMeta.generatedDate)

  const kpiCards = [
    {
      label: 'Support Emails',
      value: supportEmails,
      icon: Mail,
      gradient: 'from-blue-500/90 to-cyan-500/90',
      glowColor: 'rgba(59,130,246,0.4)',
      iconBg: 'bg-white/20',
      onClick: () => onOpenProductionIssuesModal?.(),
    },
    {
      label: 'New Release Features',
      value: newFeatures,
      icon: Sparkles,
      gradient: 'from-amber-500/90 to-yellow-500/90',
      glowColor: 'rgba(245,158,11,0.4)',
      iconBg: 'bg-white/20',
      onClick: () => onNavigateToSection?.('releaseTesting'),
    },
    {
      label: 'Code Fixes Testing',
      value: codeFixes,
      icon: Wrench,
      gradient: 'from-purple-500/90 to-pink-500/90',
      glowColor: 'rgba(168,85,247,0.4)',
      iconBg: 'bg-white/20',
      onClick: () => onNavigateToSection?.('supportLog'),
    },
  ]

  // Glassmorphic card styles
  const glassCard = theme === 'dark'
    ? 'bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-2xl border border-white/[0.1] shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)]'
    : 'bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]'

  const glassCardHover = theme === 'dark'
    ? 'hover:border-accent-gold/30 hover:shadow-[0_12px_48px_rgba(0,0,0,0.5),0_0_0_1px_rgba(212,175,55,0.15),inset_0_1px_0_rgba(255,255,255,0.12)]'
    : 'hover:border-accent-gold/40 hover:shadow-[0_12px_48px_rgba(0,0,0,0.12),0_0_0_1px_rgba(212,175,55,0.2),inset_0_1px_0_rgba(255,255,255,1)]'

  return (
    <motion.section
      ref={sectionRef}
      variants={sectionVariants}
      className="flex flex-col gap-8 pt-2 relative w-full"
      style={{ display: visible ? undefined : 'none' }}
    >
      {/* Premium Ambient Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Primary gold orb */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.35, 0.2],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-amber-500/30 via-accent-gold/20 to-transparent rounded-full blur-[120px]"
        />
        {/* Secondary blue orb */}
        <motion.div
          animate={{
            scale: [1.2, 0.9, 1.2],
            opacity: [0.15, 0.3, 0.15],
            x: [0, -40, 0],
            y: [0, 25, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-20 right-1/4 w-[450px] h-[450px] bg-gradient-to-bl from-blue-500/25 via-purple-500/15 to-transparent rounded-full blur-[100px]"
        />
        {/* Accent purple orb */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
          className="absolute top-1/2 -right-20 w-[300px] h-[300px] bg-gradient-to-l from-purple-500/20 to-transparent rounded-full blur-[80px]"
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 flex flex-col gap-5">
        {/* Glassmorphic Metadata Rail */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`inline-flex items-stretch flex-wrap w-fit rounded-2xl overflow-hidden ${glassCard}`}
        >
          {/* Reporting Week */}
          <div className="flex items-center gap-2.5 px-5 py-3">
            <CalendarRange className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-accent-gold/70' : 'text-accent-gold'}`} />
            <span className={`text-xs font-semibold tracking-wide font-mono ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>
              {formatWeekDate(weekStart, false)} – {formatWeekDate(weekEnd, true)}
            </span>
          </div>

          {reportMeta.status && (
            <>
              <div className={`w-px my-2.5 ${theme === 'dark' ? 'bg-white/[0.1]' : 'bg-slate-200/80'}`} />
              <div className="flex items-center gap-2.5 px-5 py-3">
                <FileCheck2 className={`w-4 h-4 shrink-0 ${reportMeta.status === 'Final' ? 'text-accent-gold' : theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold tracking-wide ${reportMeta.status === 'Final' ? 'text-accent-gold' : theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                  {reportMeta.status}
                </span>
              </div>
            </>
          )}

          {generatedLabel && (
            <>
              <div className={`w-px my-2.5 ${theme === 'dark' ? 'bg-white/[0.1]' : 'bg-slate-200/80'}`} />
              <div className="flex items-center gap-2.5 px-5 py-3">
                <Clock3 className={`w-4 h-4 shrink-0 ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`} />
                <span className={`text-xs font-medium tracking-wide ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
                  {generatedLabel}
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* Title */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-col gap-3"
        >
          <span className="text-accent-gold font-clash font-extrabold uppercase text-sm tracking-[0.2em]">{projectName}</span>
          <h1 className={`font-clash font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.1] ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {reportTitle || 'Weekly Status Report'}
          </h1>
        </motion.div>

        {subtitle && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`text-sm sm:text-base font-normal leading-relaxed max-w-4xl px-4 py-3 rounded-xl border ${theme === 'dark' ? 'text-white/70 bg-white/[0.03] border-white/[0.08]' : 'text-slate-600 bg-slate-50/50 border-slate-200/50'}`}
          >
            <span className={`text-[10px] font-bold uppercase tracking-wider mr-2 ${theme === 'dark' ? 'text-accent-gold/70' : 'text-accent-gold'}`}>Description:</span>
            {subtitle}
          </motion.div>
        )}
      </div>

      {/* Main Content: KPI Cards + Quality Score */}
      <div className={`relative z-10 grid gap-6 ${showQualityScore ? 'grid-cols-1 lg:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}>
        
        {/* Glassmorphic KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {kpiCards.map((kpi, idx) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + idx * 0.1, duration: 0.5, ease: 'easeOut' }}
              onClick={kpi.onClick}
              className={`relative overflow-hidden rounded-[28px] p-6 text-white group cursor-pointer`}
              style={{
                background: `linear-gradient(135deg, ${kpi.gradient.includes('blue') ? 'rgba(59,130,246,0.9)' : kpi.gradient.includes('amber') ? 'rgba(245,158,11,0.9)' : 'rgba(168,85,247,0.9)'} 0%, ${kpi.gradient.includes('cyan') ? 'rgba(6,182,212,0.85)' : kpi.gradient.includes('yellow') ? 'rgba(234,179,8,0.85)' : 'rgba(236,72,153,0.85)'} 100%)`,
                boxShadow: `0 8px 32px ${kpi.glowColor}, 0 4px 16px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)`,
              }}
            >
              {/* Glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
              
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 + idx * 2, ease: 'easeInOut' }}
                className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 pointer-events-none"
              />

              {/* Hover glow */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: `radial-gradient(circle at 50% 0%, rgba(255,255,255,0.2), transparent 60%)` }}
              />
              
              <div className="relative z-10 flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/90">{kpi.label}</span>
                <span className={`w-11 h-11 rounded-2xl ${kpi.iconBg} backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20`}>
                  <kpi.icon className="w-5 h-5 text-white" />
                </span>
              </div>
              
              <span className="relative z-10 text-5xl sm:text-6xl font-black block leading-none tracking-tight">
                <CountUpNumber end={kpi.value} />
              </span>
              
              <span className="relative z-10 text-xs font-medium text-white/70 mt-3 block">This week's count</span>
            </motion.div>
          ))}
        </div>

        {/* Glassmorphic Quality Score Gauge - Right Side */}
        {showQualityScore && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            onClick={onOpenQualityModal}
            className={`p-5 rounded-[28px] flex flex-col items-center justify-center text-center relative overflow-hidden cursor-pointer group transition-all duration-500 h-fit ${glassCard} ${glassCardHover}`}
          >
            {/* Inner glow effect on hover */}
            <div className="absolute inset-0 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 30%, rgba(212,175,55,0.15), transparent 60%)`
              }}
            />

            {/* Expand hint */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-1 z-10">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-accent-gold/15 border border-accent-gold/25' : 'bg-accent-gold/10 border border-accent-gold/30'}`}>
                <span className="text-[8px] font-bold text-accent-gold uppercase tracking-wider">Details</span>
              </div>
            </div>

            <span className={`text-[9px] font-black uppercase tracking-[0.15em] mb-3 ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>
              Executive Quality Score
            </span>
            
            <div className="relative w-28 h-28 flex items-center justify-center">
              {/* Background glow */}
              <div 
                className="absolute inset-0 rounded-full blur-xl opacity-30"
                style={{ background: `radial-gradient(circle, rgba(212,175,55,0.5), transparent 70%)` }}
              />
              
              <svg className="w-full h-full transform -rotate-90 relative z-10" viewBox="0 0 100 100">
                {/* Track */}
                <circle 
                  cx="50" cy="50" r="42" 
                  fill="none" 
                  stroke={theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} 
                  strokeWidth="7" 
                  strokeLinecap="round" 
                />
                {/* Progress */}
                <motion.circle
                  cx="50" cy="50" r="42"
                  fill="none"
                  stroke="url(#scoreGradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 264' }}
                  animate={{ strokeDasharray: `${(qualityStats.score / 100) * 264} 264` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                  style={{ filter: `drop-shadow(0 0 8px rgba(212,175,55,0.5))` }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#d4af37" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="absolute flex flex-col items-center justify-center">
                <span className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  <CountUpNumber end={qualityStats.score} />
                </span>
                <span className={`text-[9px] mt-1 font-bold uppercase tracking-widest ${qualityStats.color.split(' ')[0]}`}>
                  {qualityStats.label}
                </span>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className={`p-3 rounded-xl text-[10px] leading-relaxed w-full mt-3 ${qualityStats.color} border`}
            >
              <p className="font-semibold">{qualityStats.desc}</p>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Bottom Content */}
      {bottomContent && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="relative z-10 w-full"
        >
          {bottomContent}
        </motion.div>
      )}

      {/* Scroll Cue */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center pt-4 relative z-10"
      >
        <button
          type="button"
          onClick={onScrollNext}
          className={`inline-flex items-center gap-2 group cursor-pointer bg-transparent border-0 p-2 rounded-xl transition-all duration-300 ${
            theme === 'dark' 
              ? 'text-white/40 hover:text-white/70 hover:bg-white/5' 
              : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
          }`}
          aria-label="Scroll to explore"
        >
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase">
            Scroll to Explore
          </span>
          <motion.span
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ChevronDown className="w-4 h-4" strokeWidth={2} />
          </motion.span>
        </button>
      </motion.div>
    </motion.section>
  )
}
