import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import {
  Bug, FileText, PenTool, ArrowRight, Zap, Lock,
  Clock, Calendar, Sparkles, Hammer,
} from 'lucide-react'

// ── Brand ────────────────────────────────────────────────────────────────────
import { BRAND } from '@/lib/brand'
import { AnnouncementsWidget } from '@/modules/Announcements/AnnouncementsWidget'
import { ProjectPulseWidget } from '@/modules/ProjectPulse/ProjectPulseWidget'


// ── Motivational lines (rotates daily) ────────────────────────────────────────
const MOTIV_LINES = [
  'Build quality. Ship confidence.',
  'Every bug found is a user saved.',
  'Precision today, excellence tomorrow.',
  'Let AI handle the grind. You focus on craft.',
  'Test smarter. Release bolder.',
  'Quality is not an act — it\'s a habit.',
  'One test case closer to perfection.',
]

// ── Date & Time Widget ────────────────────────────────────────────────────────
const DateTimeWidget = () => {
  const [now, setNow] = useState(new Date())
  const [motivIndex] = useState(() => Math.floor(Date.now() / 86400000) % MOTIV_LINES.length)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000) // update every 30s
    return () => clearInterval(timer)
  }, [])

  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-panel px-5 sm:px-6 py-4 flex flex-col items-end gap-2 min-w-[180px]"
    >
      {/* Time */}
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-accent-gold" />
        <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
          {time}
        </span>
      </div>
      {/* Date */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        <span className="text-[11px] sm:text-xs text-text-muted whitespace-nowrap">
          {date}
        </span>
      </div>
      {/* Motivational line */}
      <div className="flex items-center gap-1.5 mt-1 pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
        <Sparkles className="w-3 h-3 text-accent-gold shrink-0" />
        <span className="text-[10px] sm:text-[11px] italic text-text-secondary leading-tight">
          {MOTIV_LINES[motivIndex]}
        </span>
      </div>
    </motion.div>
  )
}

// ── Something is building Section ─────────────────────────────────────────────
const SomethingBuildingSection = () => {
  return (
    <GlassCard
      hoverEffect={false}
      className="p-8 sm:p-10 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[260px] h-full"
    >
      {/* Background ambient lighting */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 -top-16 -left-16"
        style={{ background: 'radial-gradient(circle, var(--accent, #6366f1) 0%, transparent 70%)' }}
      />
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 -bottom-16 -right-16"
        style={{ background: 'radial-gradient(circle, var(--accent-gold, #f59e0b) 0%, transparent 70%)' }}
      />

      {/* Animated icon design */}
      <div className="relative mb-5 flex items-center justify-center">
        {/* Soft pulsing halo */}
        <motion.div
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0.35, 0.15, 0.35],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute w-16 h-16 rounded-2xl bg-accent/20 blur-md pointer-events-none"
        />

        {/* Icon container with gentle floating micro-animation */}
        <motion.div
          animate={{
            y: [0, -4, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-14 h-14 rounded-2xl border border-white/10 dark:border-white/15 shadow-lg flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="relative flex items-center justify-center">
            {/* Gentle tilting hammer */}
            <motion.div
              animate={{
                rotate: [-6, 6, -6],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <Hammer className="w-6 h-6 text-accent" />
            </motion.div>

            {/* Micro sparkling star with pulse */}
            <motion.div
              animate={{
                scale: [0.8, 1.25, 0.8],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-2.5 -right-2.5 text-accent-gold"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.div>
          </div>

          {/* Micro pulsing live indicator dot in corner */}
          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent" />
          </span>
        </motion.div>
      </div>

      {/* Badge / Pill */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3"
        style={{
          background: 'rgba(99, 102, 241, 0.1)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          color: 'var(--accent, #6366f1)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        In Development
      </motion.div>

      {/* Main Text */}
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-lg sm:text-xl font-bold tracking-tight text-foreground mb-1.5"
      >
        Something is building
      </motion.h2>

      {/* Minimal Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs sm:text-sm text-text-muted max-w-sm leading-relaxed"
      >
        Exciting new QA intelligence and productivity features are on the way.
      </motion.p>
    </GlassCard>
  )
}


// ── Module cards ──────────────────────────────────────────────────────────────
const modules = [
  {
    id: 'bug-refiner',
    title: 'AI Bug Refiner',
    description: 'Transform messy QA notes into professional, JIRA-ready bug reports in seconds.',
    icon: Bug,
    color: 'from-amber-500/25 dark:from-amber-500/20 to-transparent',
  },
  {
    id: 'test-generator',
    title: 'Test Cases',
    description: 'Generate comprehensive test suites with edge cases, risks, and automation scripts.',
    icon: FileText,
    color: 'from-blue-500/25 dark:from-blue-500/20 to-transparent',
  },
  {
    id: 'writing-assistant',
    title: 'Writing Assistant',
    description: 'Elevate your QA communication. Professional rewrites, summaries, and meeting notes.',
    icon: PenTool,
    color: 'from-purple-500/25 dark:from-purple-500/20 to-transparent',
  },
]

const MODULE_ROUTES: Record<string, string> = {
  'bug-refiner': ROUTES.bugRefiner,
  'test-generator': ROUTES.testGenerator,
  'writing-assistant': ROUTES.writingAssistant,
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const navigate = useNavigate()
  const { profile, user } = useAppStore()
  const { canView, can } = usePermissions()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'
  const canViewQuickDetails = can('dashboard', 'can_view_quick_details')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-10"
    >
      {/* Header */}
      <header className="mb-6 sm:mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-3"
        >
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <Zap className="w-3 h-3 text-accent-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-gold">System Operational</span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-5 sm:gap-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-clash font-bold text-foreground mb-2 leading-tight break-words">
              Welcome back, <span className="text-accent-gold">{displayName}</span>
            </h1>
            <p className="text-sm sm:text-base text-text-secondary font-montreal max-w-xl leading-relaxed">
              Your {BRAND.name} command center is ready. What would you like to build today?
            </p>
          </div>

          <div className="flex gap-3 sm:gap-4 shrink-0">
            <DateTimeWidget />
          </div>
        </div>
      </header>

      {/* Top Showcase: Project Pulse (if permitted) / Something is Building (fallback) + Announcements (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 sm:gap-6 mb-8 sm:mb-10 items-stretch">
        {canViewQuickDetails ? <ProjectPulseWidget /> : <SomethingBuildingSection />}
        <AnnouncementsWidget />
      </div>

      {/* Core AI Modules (Compact Launch Section) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-accent-gold" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-text-primary">
              AI Launch Modules
            </h2>
          </div>
          <span className="text-[11px] text-text-muted">Instant launch QA copilot tools</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {modules.map((module, index) => {
            const accessible = canView(module.id)
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <GlassCard
                  onClick={() => accessible && navigate(MODULE_ROUTES[module.id])}
                  className={cn(
                    'p-4 sm:p-5 h-full group flex flex-col justify-between transition-all duration-300 relative overflow-hidden',
                    accessible
                      ? 'cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 hover:border-indigo-500/50 dark:hover:border-accent-gold/50 hover:bg-indigo-50/50 dark:hover:bg-white/[0.05]'
                      : 'cursor-not-allowed opacity-60'
                  )}
                >
                  <div className={cn(
                    'absolute top-0 right-0 w-28 h-28 bg-gradient-to-br blur-2xl opacity-0 transition-opacity duration-500 pointer-events-none',
                    accessible && 'group-hover:opacity-100',
                    module.color,
                  )} />

                  <div>
                    {/* Top Row: Icon + Launch Button */}
                    <div className="flex items-center justify-between gap-3 mb-3 relative z-10">
                      <div className={cn(
                        'w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0 transition-all duration-300',
                        accessible && 'group-hover:bg-indigo-600 dark:group-hover:bg-accent-gold group-hover:text-white dark:group-hover:text-background group-hover:border-indigo-600 dark:group-hover:border-accent-gold group-hover:shadow-md group-hover:shadow-indigo-500/25'
                      )}>
                        {accessible
                          ? <module.icon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-accent-gold group-hover:text-white dark:group-hover:text-background transition-colors" />
                          : <Lock className="w-4 h-4 text-text-muted" />}
                      </div>

                      <div className={cn(
                        'inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg border transition-all duration-300 shadow-2xs',
                        accessible
                          ? 'bg-slate-100 dark:bg-white/5 text-indigo-600 dark:text-accent-gold border-slate-200 dark:border-white/10 group-hover:bg-indigo-600 dark:group-hover:bg-accent-gold group-hover:text-white dark:group-hover:text-background group-hover:border-indigo-600 dark:group-hover:border-accent-gold group-hover:shadow-md group-hover:shadow-indigo-500/20'
                          : 'text-text-muted border-border/40'
                      )}>
                        <span>{accessible ? 'Launch' : 'Locked'}</span>
                        {accessible
                          ? <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                          : <Lock className="w-2.5 h-2.5" />}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="relative z-10">
                      <h3 className={cn(
                        'text-sm sm:text-base font-bold text-foreground mb-1 leading-snug transition-colors duration-300',
                        accessible && 'group-hover:text-indigo-600 dark:group-hover:text-accent-gold'
                      )}>
                        {module.title}
                      </h3>
                      <p className="text-text-secondary text-xs leading-relaxed line-clamp-2">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })}
        </div>
      </section>
    </motion.div>
  )
}
