import React from 'react'
import { motion } from 'framer-motion'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { FileText, Bug, PenTool, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOCK_HISTORY = [
  { id: 1, type: 'bug-report',  title: 'Login Flow Regression Suite',       module: 'Bug Refiner',        time: '2 hours ago',   icon: Bug,      color: 'text-amber-400' },
  { id: 2, type: 'test-case',   title: 'Checkout Payment Edge Cases',        module: 'Test Architect',     time: '5 hours ago',   icon: FileText, color: 'text-blue-400'  },
  { id: 3, type: 'writing',     title: 'Sprint Retrospective Summary',       module: 'Writing Assistant',  time: 'Yesterday',     icon: PenTool,  color: 'text-purple-400'},
  { id: 4, type: 'bug-report',  title: 'Profile Image Upload Crash',         module: 'Bug Refiner',        time: 'Yesterday',     icon: Bug,      color: 'text-amber-400' },
  { id: 5, type: 'test-case',   title: 'User Registration Validation Tests', module: 'Test Architect',     time: '2 days ago',    icon: FileText, color: 'text-blue-400'  },
]

export const History = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="History"
        subtitle="Your recent AI-generated reports, test suites, and documents."
        align="left"
      />

      <GlassCard hoverEffect={false}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent-gold" />
            Recent Activity
          </h2>
          <span className="text-xs text-text-muted uppercase tracking-widest font-bold">{MOCK_HISTORY.length} items</span>
        </div>

        <div className="space-y-3">
          {MOCK_HISTORY.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer"
            >
              <div className={cn('w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors', item.color)}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate group-hover:text-accent-gold transition-colors">{item.title}</p>
                <p className="text-[11px] text-text-muted uppercase tracking-wider mt-0.5">{item.module} · {item.time}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 group-hover:text-accent-gold transition-all shrink-0" />
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  )
}
