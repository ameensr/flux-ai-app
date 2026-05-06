import React from 'react'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { useAppStore } from "@/store/useAppStore"
import { 
  Bug, 
  FileText, 
  PenTool, 
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Clock,
  History
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

export const Dashboard = () => {
  const { setActiveModule, profile, user } = useAppStore()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-12"
    >
      <header className="mb-16">
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
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-6xl font-clash font-bold text-white mb-4">
              Welcome back, <span className="text-accent-gold">{displayName}</span>
            </h1>
            <p className="text-xl text-text-secondary font-montreal max-w-xl leading-relaxed">
              Your AI-powered QA command center is ready. What would you like to build today?
            </p>
          </div>
          
          <div className="flex gap-4">
            <div className="glass-panel px-6 py-4 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl font-bold text-white">128</span>
              <span className="text-[10px] uppercase tracking-widest text-text-muted">Reports Generated</span>
            </div>
            <div className="glass-panel px-6 py-4 flex flex-col items-center justify-center gap-1">
              <span className="text-2xl font-bold text-white">94%</span>
              <span className="text-[10px] uppercase tracking-widest text-text-muted">AI Accuracy</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {modules.map((module, index) => (
          <motion.div
            key={module.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard 
              onClick={() => setActiveModule(module.id as any)}
              className="h-full cursor-pointer group"
            >
              <div className={cn(
                "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700",
                module.color
              )} />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:bg-accent-gold group-hover:text-background transition-colors duration-500">
                  <module.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-accent-gold transition-colors">
                  {module.title}
                </h3>
                <p className="text-text-secondary mb-8 leading-relaxed group-hover:text-text-primary transition-colors">
                  {module.description}
                </p>
                <div className="flex items-center gap-2 text-accent-gold font-bold text-sm">
                  <span>LAUNCH MODULE</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <GlassCard hoverEffect={false}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <History className="w-5 h-5 text-accent-gold" />
              Recent Activities
            </h2>
            <button className="text-xs text-text-muted hover:text-accent-gold transition-colors">VIEW ALL</button>
          </div>
          
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-accent-gold/10 transition-colors">
                  <FileText className="w-5 h-5 text-text-secondary group-hover:text-accent-gold" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white">Login Flow Regression Suite</h4>
                  <p className="text-[11px] text-text-muted uppercase tracking-wider">Generated 2 hours ago • Gemini Pro</p>
                </div>
                <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-gold opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard hoverEffect={false} className="bg-gradient-to-br from-white/5 to-transparent border-accent-gold/20">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-accent-gold" />
            <h2 className="text-xl font-bold">Flux Pro Tip</h2>
          </div>
          <p className="text-text-secondary mb-8 leading-relaxed">
            You can now export test cases directly to <span className="text-white font-bold">Playwright</span> or <span className="text-white font-bold">Cypress</span> scripts using the "Smart Assistant" panel in the Test Case Generator.
          </p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Shield className="w-3 h-3" /> SOC2 Compliant
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Clock className="w-3 h-3" /> Real-time Sync
            </div>
          </div>
        </GlassCard>
      </section>
    </motion.div>
  )
}
