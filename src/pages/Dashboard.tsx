import React from 'react'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { useNavigate } from 'react-router-dom'
import { useAppStore } from "@/store/useAppStore"
import { usePermissions } from "@/hooks/usePermissions"
import { ROUTES } from '@/lib/routes'
import {
  Bug,
  FileText,
  PenTool,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  History,
  Lock
} from "lucide-react"

const modules = [
  {
    id: 'bug-refiner',
    title: 'AI Bug Refiner',
    description: 'Transform messy QA notes into professional, JIRA-ready bug reports in seconds.',
    icon: Bug,
    color: 'from-amber-500/20 to-transparent'
  },
  {
    id: 'test-generator',
    title: 'Test Case Gen',
    description: 'Generate comprehensive test suites with edge cases, risks, and automation scripts.',
    icon: FileText,
    color: 'from-blue-500/20 to-transparent'
  },
  {
    id: 'writing-assistant',
    title: 'Writing Assistant',
    description: 'Elevate your QA communication. Professional rewrites, summaries, and meeting notes.',
    icon: PenTool,
    color: 'from-purple-500/20 to-transparent'
  }
]

const MODULE_ROUTES: Record<string, string> = {
  'bug-refiner':       ROUTES.bugRefiner,
  'test-generator':    ROUTES.testGenerator,
  'writing-assistant': ROUTES.writingAssistant,
}

export const Dashboard = () => {
  const navigate = useNavigate()
  const { profile, user } = useAppStore()
  const { canView } = usePermissions()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-10"
    >
      <header className="mb-10 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <Zap className="w-3 h-3 text-accent-gold" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-gold">System Operational</span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.75rem,6vw,3.5rem)] font-clash font-bold text-white mb-3 leading-tight break-words">
              Welcome back, <span className="text-accent-gold">{displayName}</span>
            </h1>
            <p className="text-base sm:text-xl text-text-secondary font-montreal max-w-xl leading-relaxed">
              Your AI-powered QA command center is ready. What would you like to build today?
            </p>
          </div>

          <div className="flex gap-3 sm:gap-4 shrink-0">
            <div className="glass-panel px-4 sm:px-6 py-3 sm:py-4 flex flex-col items-center justify-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-white">128</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted whitespace-nowrap">Reports Generated</span>
            </div>
            <div className="glass-panel px-4 sm:px-6 py-3 sm:py-4 flex flex-col items-center justify-center gap-1">
              <span className="text-xl sm:text-2xl font-bold text-white">94%</span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-text-muted whitespace-nowrap">AI Accuracy</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
        {modules.map((module, index) => {
          const accessible = canView(module.id)
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                onClick={() => accessible && navigate(MODULE_ROUTES[module.id])}
                className={cn('h-full group', accessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
              >
                <div className={cn(
                  "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br blur-3xl opacity-0 transition-opacity duration-700",
                  accessible && "group-hover:opacity-100",
                  module.color
                )} />
                <div className="relative z-10">
                  <div className={cn(
                    "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-5 sm:mb-6 transition-colors duration-500",
                    accessible && "group-hover:bg-accent-gold group-hover:text-background"
                  )}>
                    {accessible
                      ? <module.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      : <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />
                    }
                  </div>
                  <h3 className={cn(
                    "text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3 transition-colors",
                    accessible && "group-hover:text-accent-gold"
                  )}>
                    {module.title}
                  </h3>
                  <p className="text-text-secondary mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                    {module.description}
                  </p>
                  <div className={cn(
                    "flex items-center gap-2 font-bold text-xs sm:text-sm",
                    accessible ? "text-accent-gold" : "text-text-muted"
                  )}>
                    <span>{accessible ? 'LAUNCH MODULE' : 'UPGRADE TO UNLOCK'}</span>
                    {accessible
                      ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      : <Lock className="w-3 h-3" />
                    }
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <GlassCard hoverEffect={false}>
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-accent-gold" />
              Recent Activities
            </h2>
            <button className="text-xs text-text-muted hover:text-accent-gold transition-colors">VIEW ALL</button>
          </div>
          <div className="space-y-4 sm:space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-accent-gold/10 transition-colors shrink-0">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary group-hover:text-accent-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">Login Flow Regression Suite</h4>
                  <p className="text-[11px] text-text-muted uppercase tracking-wider truncate">Generated 2 hours ago • Gemini Pro</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-gold opacity-0 group-hover:opacity-100 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard hoverEffect={false} className="bg-gradient-to-br from-white/5 to-transparent border-accent-gold/20">
          <div className="flex items-center gap-2 mb-5 sm:mb-6">
            <Sparkles className="w-5 h-5 text-accent-gold" />
            <h2 className="text-lg sm:text-xl font-bold">Flux Pro Tip</h2>
          </div>
          <p className="text-text-secondary mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
            You can now export test cases directly to <span className="text-white font-bold">Playwright</span> or <span className="text-white font-bold">Cypress</span> scripts using the "Smart Assistant" panel in the Test Case Generator.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Shield className="w-3 h-3" /> SOC2 Compliant
            </div>
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Clock className="w-3 h-3" /> Real-time Sync
            </div>
          </div>
        </GlassCard>
      </section>
    </motion.div>
  )
}
