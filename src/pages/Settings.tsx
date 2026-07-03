import React from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Shield, Sparkles, CheckCircle2, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'
import { SecuritySettings } from '@/components/SecuritySettings'

// ── Appearance mode card ──────────────────────────────────────────────────────
const ModeCard = ({
  id, label, description, icon: Icon, active, onClick,
}: {
  id: string
  label: string
  description: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'w-full text-left rounded-xl p-4 transition-all duration-200 group',
      'flex items-start gap-4 border',
    )}
    style={{
      background: active ? 'rgba(99,102,241,0.08)' : 'var(--hover)',
      borderColor: active ? 'rgba(99,102,241,0.4)' : 'var(--border)',
      boxShadow: active ? '0 0 0 1px rgba(99,102,241,0.2)' : 'none',
    }}
  >
    {/* Icon */}
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors"
      style={{
        background: active ? 'rgba(99,102,241,0.15)' : 'var(--surface-elevated)',
        color: active ? '#818CF8' : 'var(--text-muted)',
      }}
    >
      <Icon className="w-4 h-4" />
    </div>

    {/* Text */}
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-sm font-semibold"
          style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {label}
        </span>
        {/* Radio indicator */}
        <div
          className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
          style={{
            borderColor: active ? '#6366F1' : 'var(--border)',
            background: active ? '#6366F1' : 'transparent',
          }}
        >
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </div>
  </button>
)

// ── Settings ──────────────────────────────────────────────────────────────────
export const Settings = () => {
  const { theme, setTheme } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="py-6 sm:py-10 max-w-3xl"
    >
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          Settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Manage your workspace preferences.
        </p>
      </div>

      <div className="flex flex-col gap-5">

        {/* ── Appearance ── */}
        <GlassCard hoverEffect={false}>
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)' }}
            >
              <Monitor className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Appearance
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Choose your preferred interface mode.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <ModeCard
              id="light"
              label="Light Mode"
              description="Clean workspace with bright surfaces. Ideal for well-lit environments."
              icon={Sun}
              active={theme === 'light'}
              onClick={() => setTheme('light')}
            />
            <ModeCard
              id="dark"
              label="Dark Mode"
              description="Optimized for focus and low-light environments. Easier on the eyes."
              icon={Moon}
              active={theme === 'dark'}
              onClick={() => setTheme('dark')}
            />
          </div>
        </GlassCard>

        {/* ── AI Platform ── */}
        <GlassCard hoverEffect={false}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                AI — Platform Managed
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No configuration needed.</p>
            </div>
          </div>

          <div
            className="rounded-xl p-4 space-y-2.5"
            style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}
          >
            {[
              'AI providers are configured centrally by your administrator',
              'Your requests are processed through a secure backend gateway',
              'API keys are never stored in your browser or exposed to clients',
              'Provider switching and upgrades happen automatically',
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs leading-relaxed text-emerald-400/80">{item}</p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 p-3 rounded-lg flex items-start gap-2.5"
            style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
          >
            <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'var(--accent)' }} />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              This platform operates like Cursor AI or ChatGPT Teams — AI infrastructure is managed for you.
              Contact your admin if you experience any AI issues.
            </p>
          </div>
        </GlassCard>


        {/* ── Security ── */}
        <SecuritySettings />

        {/* ── Upgrade ── */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(45,140,255,0.08) 100%)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                Qaly Pro
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Unlimited cloud history, collaborative workspaces, and priority AI access.
              </p>
            </div>
            <button
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              Upgrade
            </button>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
