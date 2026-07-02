import React from 'react'
import { motion } from 'framer-motion'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { GlassCard } from '@/components/ui/GlassCard'
import { Shield, Database, Sparkles, CheckCircle2, Palette } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { THEME_LABELS, type ThemeId } from '@/lib/themes'

const THEME_IDS = Object.keys(THEME_LABELS) as ThemeId[]

export const Settings = () => {
  const { theme, setTheme } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="Settings"
        subtitle="Manage your workspace preferences."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Theme Switcher */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.1)' }}>
                <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Appearance</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Choose your interface theme.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {THEME_IDS.map(id => {
                const active = theme === id
                return (
                  <button
                    key={id}
                    onClick={() => setTheme(id)}
                    className="px-4 py-3 rounded-xl text-sm font-bold transition-all text-left"
                    style={{
                      backgroundColor: active ? 'var(--accent)' : 'var(--hover)',
                      color: active ? 'var(--accent-fg)' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {THEME_LABELS[id]}
                  </button>
                )
              })}
            </div>
          </GlassCard>

          {/* Platform-managed AI notice */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                <Sparkles className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>AI — Platform Managed</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No configuration needed.</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl space-y-3" style={{ backgroundColor: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)' }}>
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

            <div className="mt-6 p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: 'var(--hover)', border: '1px solid var(--border)' }}>
              <Shield className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                This platform operates like Cursor AI or ChatGPT Teams — AI infrastructure is managed for you. Contact your admin if you experience any AI issues.
              </p>
            </div>
          </GlassCard>

          {/* Workspace Storage */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}>
                <Database className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Workspace Storage</h3>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your local and cloud data.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: 'var(--hover)' }}>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Cloud Sync</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Automatically save history to cloud</p>
                </div>
                <div className="w-12 h-6 rounded-full relative cursor-pointer" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: 'var(--hover)' }}>
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>History Retention</h4>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Store reports for 30 days</p>
                </div>
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>30 DAYS</span>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
            <h3 className="text-lg font-black uppercase tracking-widest mb-4">Flux Pro</h3>
            <p className="text-sm font-medium mb-8 leading-relaxed opacity-80">
              Upgrade to Pro for unlimited cloud history, collaborative workspaces, and priority AI access.
            </p>
            <button
              className="w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] transition-all"
              style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
            >
              Upgrade Now
            </button>
          </GlassCard>
        </div>
      </div>
    </motion.div>
  )
}
