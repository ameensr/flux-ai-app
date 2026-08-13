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
  onOpenReleaseFeaturesModal?: () => void
  onOpenCodeFixesModal?: () => void
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
  onOpenReleaseFeaturesModal,
  onOpenCodeFixesModal,
  bottomContent,
  showQualityScore = true,
}) => {
  const generatedLabel = formatGeneratedDate(reportMeta.generatedDate)

  // Colour is carried by a tinted wash plus the icon tile, top hairline and
  // numeral — a shade of the metric's hue rather than a saturated fill, so the
  // cards read as coloured without shouting over the Quality Score card.
  const kpiPalette = theme === 'dark'
    ? {
        blue: {
          icon: 'text-blue-300', value: 'text-blue-200',
          tile: 'bg-blue-400/25', ring: 'border-blue-400/40',
          rail: 'from-blue-400 via-cyan-300/70 to-transparent',
          glow: 'rgba(59,130,246,0.30)',
          tint: 'linear-gradient(135deg, rgba(59,130,246,0.28) 0%, rgba(6,182,212,0.14) 55%, rgba(6,182,212,0.03) 100%)',
        },
        amber: {
          icon: 'text-amber-300', value: 'text-amber-200',
          tile: 'bg-amber-400/25', ring: 'border-amber-400/40',
          rail: 'from-amber-400 via-yellow-300/70 to-transparent',
          glow: 'rgba(245,158,11,0.30)',
          tint: 'linear-gradient(135deg, rgba(245,158,11,0.28) 0%, rgba(234,179,8,0.14) 55%, rgba(234,179,8,0.03) 100%)',
        },
        violet: {
          icon: 'text-violet-300', value: 'text-violet-200',
          tile: 'bg-violet-400/25', ring: 'border-violet-400/40',
          rail: 'from-violet-400 via-pink-300/70 to-transparent',
          glow: 'rgba(168,85,247,0.30)',
          tint: 'linear-gradient(135deg, rgba(168,85,247,0.28) 0%, rgba(236,72,153,0.14) 55%, rgba(236,72,153,0.03) 100%)',
        },
      }
    : {
        blue: {
          icon: 'text-blue-600', value: 'text-blue-700',
          tile: 'bg-blue-100', ring: 'border-blue-300',
          rail: 'from-blue-500 via-cyan-400/60 to-transparent',
          glow: 'rgba(59,130,246,0.20)',
          tint: 'linear-gradient(135deg, rgba(59,130,246,0.20) 0%, rgba(6,182,212,0.10) 55%, rgba(6,182,212,0.02) 100%)',
        },
        amber: {
          icon: 'text-amber-600', value: 'text-amber-700',
          tile: 'bg-amber-100', ring: 'border-amber-300',
          rail: 'from-amber-500 via-yellow-400/60 to-transparent',
          glow: 'rgba(245,158,11,0.20)',
          tint: 'linear-gradient(135deg, rgba(245,158,11,0.22) 0%, rgba(234,179,8,0.10) 55%, rgba(234,179,8,0.02) 100%)',
        },
        violet: {
          icon: 'text-violet-600', value: 'text-violet-700',
          tile: 'bg-violet-100', ring: 'border-violet-300',
          rail: 'from-violet-500 via-pink-400/60 to-transparent',
          glow: 'rgba(168,85,247,0.20)',
          tint: 'linear-gradient(135deg, rgba(168,85,247,0.20) 0%, rgba(236,72,153,0.10) 55%, rgba(236,72,153,0.02) 100%)',
        },
      }

  const kpiCards = [
    {
      label: 'Support Emails',
      value: supportEmails,
      icon: Mail,
      accent: kpiPalette.blue,
      onClick: () => onOpenProductionIssuesModal?.(),
    },
    {
      label: 'New Release Features',
      value: newFeatures,
      icon: Sparkles,
      accent: kpiPalette.amber,
      onClick: () => onOpenReleaseFeaturesModal?.(),
    },
    {
      label: 'Support Fix Testing',
      value: codeFixes,
      icon: Wrench,
      accent: kpiPalette.violet,
      onClick: () => onOpenCodeFixesModal?.(),
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
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  kpi.onClick?.()
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${kpi.label}: ${kpi.value}`}
              className={`relative overflow-hidden rounded-[28px] p-6 group cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl active:scale-[0.98] ${glassCard} ${glassCardHover}`}
              style={{ willChange: 'transform' }}
            >
              {/* Tinted wash — a light shade of the metric's hue over the glass */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: kpi.accent.tint }}
              />

              {/* Accent hairline */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${kpi.accent.rail} pointer-events-none`} />

              {/* Soft accent glow, lifts on hover */}
              <div
                className="absolute -top-16 -right-12 w-40 h-40 rounded-full blur-3xl pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle, ${kpi.accent.glow}, transparent 70%)` }}
              />

              {/* Premium border glow on hover */}
              <div
                className="absolute inset-0 rounded-[28px] pointer-events-none opacity-0 group-hover:opacity-60 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${kpi.accent.glow}, transparent 40%, transparent 60%, ${kpi.accent.glow})`,
                }}
              />

              <div className="relative z-10 flex items-center justify-between gap-3 mb-5">
                <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${theme === 'dark' ? 'text-white/55' : 'text-slate-500'}`}>
                  {kpi.label}
                </span>
                <span className={`w-11 h-11 rounded-2xl border ${kpi.accent.tile} ${kpi.accent.ring} backdrop-blur-sm flex items-center justify-center shrink-0`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.accent.icon}`} />
                </span>
              </div>

              <span className={`relative z-10 text-5xl sm:text-6xl font-black block leading-none tracking-tight ${kpi.accent.value}`}>
                <CountUpNumber end={kpi.value} />
              </span>

              <span className={`relative z-10 text-xs font-medium mt-3 block ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                This week's count
              </span>

              {/* Click indicator */}
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <span className={`text-[8px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>View</span>
                </div>
              </div>
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
