// src/pages/Settings.tsx
// User settings — AI is platform-managed; no API key inputs for normal users.

import React from 'react'
import { motion } from 'framer-motion'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { Shield, Database, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Settings = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-12"
    >
      <CinematicHeading
        title="Settings"
        subtitle="Manage your workspace preferences."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Platform-managed AI notice */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">AI — Platform Managed</h3>
                <p className="text-sm text-text-muted">No configuration needed.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/15 space-y-3">
              {[
                'AI providers are configured centrally by your administrator',
                'Your requests are processed through a secure backend gateway',
                'API keys are never stored in your browser or exposed to clients',
                'Provider switching and upgrades happen automatically',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-400/80">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/5 flex items-center gap-3">
              <Shield className="w-4 h-4 text-accent-gold shrink-0" />
              <p className="text-xs text-text-muted leading-relaxed">
                This platform operates like Cursor AI or ChatGPT Teams — AI infrastructure is managed for you. Contact your admin if you experience any AI issues.
              </p>
            </div>
          </GlassCard>

          {/* Workspace Storage */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Workspace Storage</h3>
                <p className="text-sm text-text-muted">Manage your local and cloud data.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">Cloud Sync</h4>
                  <p className="text-xs text-text-muted">Automatically save history to cloud</p>
                </div>
                <div className="w-12 h-6 rounded-full bg-accent-gold/20 relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-accent-gold" />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5">
                <div>
                  <h4 className="text-sm font-bold text-white">History Retention</h4>
                  <p className="text-xs text-text-muted">Store reports for 30 days</p>
                </div>
                <span className="text-xs font-bold text-text-muted">30 DAYS</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="bg-accent-gold text-background">
            <h3 className="text-lg font-black uppercase tracking-widest mb-4">Flux Pro</h3>
            <p className="text-sm font-medium mb-8 leading-relaxed opacity-80">
              Upgrade to Pro for unlimited cloud history, collaborative workspaces, and priority AI access.
            </p>
            <button className="w-full py-4 rounded-xl bg-background text-white font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all">
              Upgrade Now
            </button>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}
