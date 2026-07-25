import React from 'react'
import { motion, type Variants } from 'framer-motion'
import { Cpu, GitBranch, CheckCircle2, TrendingDown, Layers, CalendarRange, Clock3, FileCheck2, ChevronDown } from 'lucide-react'
import { HeroMetricSummary } from './HeroMetricSummary'

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
  /** Passed through so this section keeps participating in the parent's staggered entrance reveal. */
  sectionVariants?: Variants
  theme: 'light' | 'dark'
  projectName: string
  reportTitle?: string
  subtitle?: string
  weekStart: string
  weekEnd: string
  reportMeta: ReportMeta
  releaseCount: number
  passRate: number
  defectClosureRate: number
  qualityStats: QualityStats
  /** Two accent gradients (already theme-adapted by the caller), reserved for the headline tiles only. */
  gradientWarm: string
  gradientCool: string
  CountUpNumber: React.ComponentType<{ end: number; suffix?: string; decimals?: number }>
  onOpenQualityModal: () => void
  onOpenReleaseScopeModal: () => void
  onScrollNext: () => void
  rightRailContent?: React.ReactNode
  bottomContent?: React.ReactNode
  /** Data-driven typing summary under metric tiles — only when Defect Closure Trend is absent */
  metricSummaryLines?: string[]
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

// Renders raw YYYY-MM-DD form values as a refined "Jul 9" / "Jul 9, 2026" date for the
// metadata rail — falls back to the raw string untouched if it isn't a parseable date, so
// no data ever silently disappears.
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
  releaseCount,
  passRate,
  defectClosureRate,
  qualityStats,
  gradientWarm,
  gradientCool,
  CountUpNumber,
  onOpenQualityModal,
  onOpenReleaseScopeModal,
  onScrollNext,
  rightRailContent,
  bottomContent,
  metricSummaryLines,
}) => {
  const generatedLabel = formatGeneratedDate(reportMeta.generatedDate)

  return (
    <motion.section
      ref={sectionRef}
      variants={sectionVariants}
      className="grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] lg:gap-10 gap-8 items-stretch pt-2 relative w-full"
      style={{ display: visible ? undefined : 'none' }}
    >
      {/* Premium Background Ambient Gradient Orbs & Glowing Aura */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.18, 0.32, 0.18],
            x: [0, 40, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 left-1/4 w-96 h-96 bg-gradient-to-tr from-amber-500/20 via-accent-gold/15 to-transparent rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1.1, 0.9, 1.1],
            opacity: [0.15, 0.28, 0.15],
            x: [0, -50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute -bottom-10 right-1/3 w-96 h-96 bg-gradient-to-bl from-blue-600/20 via-purple-500/15 to-transparent rounded-full blur-[100px]"
        />
      </div>

      {/* Floating Micro Particle Sparkles */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 0.6, 0],
              y: [-10, -60],
              x: [0, (i % 2 === 0 ? 15 : -15)]
            }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.8
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-accent-gold/40 shadow-[0_0_8px_#d4af37]"
            style={{
              left: `${15 + i * 14}%`,
              top: `${40 + (i % 3) * 15}%`
            }}
          />
        ))}
      </div>

      {/* Subtle floating accent icons — decorative only */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 6, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-10 right-[40%] text-accent-gold/15 pointer-events-none hidden sm:block z-0"
      >
        <Cpu className="w-10 h-10" />
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0], rotate: [0, -8, 8, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-5 left-[20%] text-blue-500/10 pointer-events-none hidden sm:block z-0"
      >
        <GitBranch className="w-9 h-9" />
      </motion.div>

      {/* 1. Left Column: Executive Quality Score Gauge (Profile Card mapping) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 16 }}
        onClick={onOpenQualityModal}
        className={`p-6 rounded-[28px] flex flex-col items-center justify-between text-center relative overflow-hidden cursor-pointer group glassmorphic-card transition-all duration-300 h-full ${theme === 'dark' ? 'bg-[#0e1322]/70 hover:bg-[#0e1322]/90 border border-white/[0.05] hover:border-white/[0.09]' : 'bg-white hover:bg-slate-50 border border-transparent'}`}
        style={{ boxShadow: theme === 'dark' ? '0 4px 20px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.15)' : '0 4px 20px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.04)' }}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
            <span className="text-[9px] font-bold text-accent-gold uppercase tracking-wider">Expand</span>
            <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 relative z-10">Executive Quality Score</span>
        <div className="relative w-40 h-40 flex items-center justify-center my-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8" strokeDasharray="188.4 251.2" strokeLinecap="round" />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#d4af37"
              strokeWidth="8"
              initial={{ strokeDasharray: '0 251.2' }}
              animate={{ strokeDasharray: `${(qualityStats.score / 100) * 188.4} 251.2` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 ${theme === 'dark' ? 5 : 3}px rgba(212,175,55,${theme === 'dark' ? 0.55 : 0.3}))` }}
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className={`text-5xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
              <CountUpNumber end={qualityStats.score} />
            </span>
            <span className={`text-[10px] mt-1 font-bold uppercase tracking-widest ${qualityStats.color.split(' ')[0]}`}>{qualityStats.label}</span>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className={`p-3 rounded-xl border text-xs leading-normal w-full mt-auto ${qualityStats.color} relative z-10`}
        >
          <p className="font-semibold">{qualityStats.desc}</p>
        </motion.div>
      </motion.div>

      {/* 2. Middle Column: Text and Gradients */}
      <div className="flex flex-col gap-5 relative z-10 h-full min-h-0">
        {/* Premium segmented metadata rail — a single glass strip with icon-led segments
            and hairline dividers, instead of disconnected shouting pill badges. */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className={`inline-flex items-stretch flex-wrap w-fit rounded-2xl border backdrop-blur-xl overflow-hidden ${theme === 'dark' ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white/80 border-slate-200/80'}`}
          style={{ boxShadow: theme === 'dark' ? '0 2px 16px rgba(0,0,0,0.18)' : '0 2px 16px rgba(15,23,42,0.05)' }}
        >
          {/* QA Status */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${passRate >= 75 ? 'bg-green-400' : 'bg-accent-gold'}`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${passRate >= 75 ? 'bg-green-400' : 'bg-accent-gold'}`} />
            </span>
            <span className={`text-[11px] font-bold tracking-wide ${passRate >= 75 ? 'text-green-400' : 'text-accent-gold'}`}>
              {passRate >= 75 ? 'Stable' : 'Warning'}
            </span>
          </div>

          <div className={`w-px my-2 ${theme === 'dark' ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />

          {/* Reporting Week */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <CalendarRange className={`w-3.5 h-3.5 shrink-0 ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`} />
            <span className={`text-[11px] font-semibold tracking-wide font-mono ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
              {formatWeekDate(weekStart, false)} – {formatWeekDate(weekEnd, true)}
            </span>
          </div>

          {reportMeta.status && (
            <>
              <div className={`w-px my-2 ${theme === 'dark' ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-2 px-4 py-2.5">
                <FileCheck2 className={`w-3.5 h-3.5 shrink-0 ${reportMeta.status === 'Final' ? 'text-accent-gold' : theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`} />
                <span className={`text-[11px] font-bold tracking-wide ${reportMeta.status === 'Final' ? 'text-accent-gold' : theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                  {reportMeta.status}
                </span>
              </div>
            </>
          )}

          {generatedLabel && (
            <>
              <div className={`w-px my-2 ${theme === 'dark' ? 'bg-white/[0.08]' : 'bg-slate-200'}`} />
              <div className="flex items-center gap-2 px-4 py-2.5">
                <Clock3 className={`w-3.5 h-3.5 shrink-0 ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`} />
                <span className={`text-[11px] font-medium tracking-wide ${theme === 'dark' ? 'text-white/45' : 'text-slate-500'}`}>
                  {generatedLabel}
                </span>
              </div>
            </>
          )}
        </motion.div>
        <div className="flex flex-col gap-2">
          <span className="text-accent-gold font-clash font-extrabold uppercase text-sm tracking-widest">{projectName}</span>
          <h1 className={`font-clash font-black text-4xl sm:text-5xl tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {reportTitle || 'Weekly Status Report'}
          </h1>
        </div>
        <p className={`text-base sm:text-lg font-normal leading-relaxed max-w-2xl ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
          {subtitle || 'Executive-level verification metrics, team load, release health and issue analytics.'}
        </p>

        {/* Headline metric tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className={`relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg group ${gradientWarm}`}
          >
            {/* Shimmer Light Beam */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 pointer-events-none"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Test Pass Rate</span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </span>
            </div>
            <span className="text-4xl font-black block leading-none"><CountUpNumber end={passRate} suffix="%" /></span>
            <span className="text-xs font-medium text-white/75 mt-1 block">Across all release testing items</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className={`relative overflow-hidden rounded-[24px] p-5 text-white shadow-lg group ${gradientCool}`}
          >
            {/* Shimmer Light Beam */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 6, ease: 'easeInOut', delay: 1 }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 pointer-events-none"
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Defect Closure</span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4 text-white" />
              </span>
            </div>
            <span className="text-4xl font-black block leading-none"><CountUpNumber end={defectClosureRate} suffix="%" /></span>
            <span className="text-xs font-medium text-white/75 mt-1 block">Closed vs. reported defects</span>
          </motion.div>

          {/* Interactive Release Scope Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.4 }}
            onClick={onOpenReleaseScopeModal}
            className={`relative overflow-hidden rounded-[24px] p-5 shadow-lg bg-gradient-to-br from-[#1e293b]/90 to-[#0f172a]/90 hover:scale-[1.02] hover:shadow-xl cursor-pointer transition-all duration-300 group border ${theme === 'dark' ? 'border-white/10 text-white' : 'border-slate-300/60 text-slate-100'}`}
          >
            {/* Shimmer Light Beam — white glare so it reads on the dark slate card */}
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 4, repeat: Infinity, repeatDelay: 5.5, ease: 'easeInOut', delay: 2 }}
              className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/25 to-transparent transform -skew-x-12 pointer-events-none z-[1]"
            />
            <div className="relative z-[2] flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Release Scope</span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white">
                <Layers className="w-4 h-4" />
              </span>
            </div>
            <span className="relative z-[2] text-4xl font-black block leading-none"><CountUpNumber end={releaseCount} /></span>
            <span className="relative z-[2] text-xs font-medium text-white/75 mt-1 block">Total release items tracked</span>
          </motion.div>
        </div>

        {/* Fills leftover height under the metric cards so bottoms align with side cards —
            typing lives here (bottom-anchored) instead of leaving an empty void. */}
        {metricSummaryLines && metricSummaryLines.length > 0 ? (
          <div className="flex-1 min-h-[4.5rem] mt-3 relative">
            <HeroMetricSummary theme={theme} lines={metricSummaryLines} fill />
          </div>
        ) : (
          <div className="flex-1 min-h-0" aria-hidden />
        )}

      </div>

      {/* 3. Right Column: Support Tickets and KPIs (rightRailContent) */}
      <div className={`flex flex-col gap-6 h-full w-full ${bottomContent ? 'lg:row-span-2' : ''}`}>
        {rightRailContent}
      </div>

      {/* 4. Bottom Content (Spans Left & Middle columns) */}
      {bottomContent && (
        <div className="col-span-1 lg:col-span-2 w-full mt-2">
          {bottomContent}
        </div>
      )}

      {/* Minimal scroll cue — sits in the center column under the metric cards */}
      <div className="lg:col-start-2 flex justify-center pt-2">
        <button
          type="button"
          onClick={onScrollNext}
          className={`inline-flex items-center gap-1.5 group cursor-pointer bg-transparent border-0 p-0 ${
            theme === 'dark' ? 'text-white/35 hover:text-white/60' : 'text-slate-400/70 hover:text-slate-500'
          } transition-colors`}
          aria-label="Scroll to explore"
        >
          <span className="text-[10px] font-medium tracking-[0.18em] uppercase">
            Scroll to Explore
          </span>
          <motion.span
            animate={{ y: [0, 3, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex"
          >
            <ChevronDown className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" strokeWidth={1.75} />
          </motion.span>
        </button>
      </div>
    </motion.section>
  )
}
