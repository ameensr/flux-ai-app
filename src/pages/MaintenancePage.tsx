// src/pages/MaintenancePage.tsx
// Premium maintenance page — shown to roles that are locked during maintenance.

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { RefreshCw, Shield, Database, Rocket, CheckCircle2, Mail, LogOut } from 'lucide-react'

function useCountdown(endTime: string | null) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    if (!endTime) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: false })
      return
    }

    const tick = () => {
      const now = new Date().getTime()
      const end = new Date(endTime).getTime()
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true })
        return
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  return timeLeft
}

export const MaintenancePage: React.FC = () => {
  const { config, fetchConfig, isRoleLocked } = useMaintenanceStore()
  const { profile, role } = useAppStore()
  const countdown = useCountdown(config.end_time)
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    // Re-fetch latest maintenance config from DB
    await fetchConfig()
    // After fetch, check if user is still locked
    const stillLocked = useMaintenanceStore.getState().isRoleLocked(role)
    if (!stillLocked) {
      // Maintenance ended — go to dashboard
      window.location.href = '/dashboard'
    } else {
      setChecking(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const assurances = [
    { icon: Shield, text: 'Your account is safe' },
    { icon: Database, text: 'No data will be lost' },
    { icon: CheckCircle2, text: 'Existing reports remain secure' },
    { icon: Rocket, text: 'Improvements are being deployed' },
  ]

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden" style={{ background: 'var(--bg, #0a0a0f)' }}>
      {/* Animated Aurora Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Aurora blobs */}
        <motion.div
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 30, 0],
            scale: [1, 1.3, 0.9, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 dark:opacity-20"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)', opacity: 0.15 }}
        />
        <motion.div
          animate={{
            x: [0, -60, 40, 0],
            y: [0, 40, -80, 0],
            scale: [1, 0.8, 1.2, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)', opacity: 0.1 }}
        />
        <motion.div
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 60, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[30%] right-[20%] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)', opacity: 0.08 }}
        />

        {/* Animated grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
            opacity: 0.3,
          }}
        />

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: `${Math.random() * 100}%`,
              y: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1,
            }}
            animate={{
              y: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
              x: [`${Math.random() * 100}%`, `${Math.random() * 100}%`],
            }}
            transition={{
              duration: Math.random() * 20 + 15,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className="absolute w-1 h-1 rounded-full"
            style={{ background: 'var(--text-muted)', opacity: 0.2 }}
          />
        ))}
      </div>

      {/* Center Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          {/* Glass Card */}
          <div
            className="rounded-3xl p-8 sm:p-10 text-center backdrop-blur-xl"
            style={{
              background: 'var(--surface, rgba(255,255,255,0.03))',
              border: '1px solid var(--border, rgba(255,255,255,0.08))',
              boxShadow: 'var(--shadow, 0 8px 64px rgba(0,0,0,0.4))',
            }}
          >
            {/* Animated Icon */}
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--hover)',
                border: '1px solid var(--border)',
              }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--accent)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.109l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </motion.div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
              We'll Be Back Shortly
            </h1>

            {/* Reason */}
            <p className="text-sm sm:text-base leading-relaxed mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {config.custom_message || config.reason || 'We\'re upgrading the platform to provide a faster, smarter and more reliable experience.'}
            </p>

            {/* Countdown */}
            {config.show_countdown && config.end_time && !countdown.expired && (
              <div className="mb-8">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
                  Estimated Completion
                </p>
                <div className="flex items-center justify-center gap-3">
                  {[
                    { value: countdown.hours, label: 'h' },
                    { value: countdown.minutes, label: 'm' },
                    { value: countdown.seconds, label: 's' },
                  ].map((unit, i) => (
                    <div key={i} className="flex items-baseline gap-0.5">
                      <span
                        className="text-3xl sm:text-4xl font-bold tabular-nums"
                        style={{ color: 'var(--accent)' }}
                      >
                        {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{unit.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="w-full h-px mb-6" style={{ background: 'var(--divider)' }} />

            {/* Assurance Bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left">
              {assurances.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <Icon className="w-3 h-3" style={{ color: '#34d399' }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{text}</span>
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div className="w-full h-px mb-6" style={{ background: 'var(--divider)' }} />

            {/* Support Contact */}
            {config.support_email && (
              <div className="mb-6">
                <p className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Need urgent access?</p>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Contact your Administrator</p>
                <a
                  href={`mailto:${config.support_email}`}
                  className="inline-flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: 'var(--accent)' }}
                >
                  <Mail className="w-3 h-3" />
                  {config.support_email}
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={checking}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                style={{
                  background: 'var(--hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', checking && 'animate-spin')} />
                {checking ? 'Checking...' : 'Refresh'}
              </button>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:brightness-110"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171',
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>

            {/* Branding */}
            {config.show_branding && (
              <p className="mt-6 text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--text-muted)' }}>
                Qaly AI Engine
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
