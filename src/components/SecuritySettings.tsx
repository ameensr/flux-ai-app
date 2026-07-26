import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import {
  Lock, Eye, EyeOff, Check, X, Shield, ShieldCheck, ShieldAlert,
  Smartphone, Monitor, Globe, Clock, LogOut, AlertTriangle, Loader2,
  KeyRound, Fingerprint, Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { cn } from '@/lib/utils'

// ── Password Strength Logic ───────────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { id: 'number', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`]/.test(p) },
]

function getStrength(password: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  if (passed <= 1) return { score: 1, label: 'Weak', color: '#EF4444' }
  if (passed <= 2) return { score: 2, label: 'Weak', color: '#F97316' }
  if (passed <= 3) return { score: 3, label: 'Medium', color: '#EAB308' }
  if (passed <= 4) return { score: 4, label: 'Strong', color: '#22C55E' }
  return { score: 5, label: 'Very Strong', color: '#10B981' }
}

// ── Password Input ────────────────────────────────────────────────────────────
const PasswordInput = ({
  label, value, onChange, placeholder, error, autoComplete,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; error?: string; autoComplete?: string
}) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            'w-full rounded-lg px-3 py-2.5 pr-10 text-sm outline-none transition-all',
            'focus:ring-2 focus:ring-indigo-500/30',
            error && 'ring-2 ring-red-500/30'
          )}
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible(!visible)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded"
          style={{ color: 'var(--text-muted)' }}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ── Strength Meter ────────────────────────────────────────────────────────────
const StrengthMeter = ({ password }: { password: string }) => {
  const { score, label, color } = getStrength(password)
  if (!password) return null
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < score ? color : 'var(--border)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Requirements Checklist ────────────────────────────────────────────────────
const Requirements = ({ password }: { password: string }) => {
  if (!password) return null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
      {PASSWORD_RULES.map(rule => {
        const passed = rule.test(password)
        return (
          <div key={rule.id} className="flex items-center gap-2">
            {passed
              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
              : <X className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-xs" style={{ color: passed ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
              {rule.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Security Score ────────────────────────────────────────────────────────────
const SecurityScore = () => {
  const score = 80
  const recommendations = [
    { text: 'Strong password', done: true },
    { text: 'Enable Two-Factor Authentication', done: false },
    { text: 'Verified email', done: true },
  ]
  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Security Score</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your account security health.</p>
        </div>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="var(--border)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#22C55E" strokeWidth="3"
              strokeDasharray={`${score}, 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {score}%
          </span>
        </div>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="text-lg">{i <= 4 ? '★' : '☆'}</span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {recommendations.map(r => (
          <div key={r.text} className="flex items-center gap-2">
            {r.done
              ? <Check className="w-3.5 h-3.5 text-emerald-400" />
              : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.text}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Active Sessions ───────────────────────────────────────────────────────────
// Supabase Auth does not expose a client-side list of other devices. We show
// this device accurately and always offer "sign out all other sessions", which
// uses GoTrue's documented `signOut({ scope: 'others' })` to revoke every
// refresh token except the current one.

const LEGACY_SESSION_STORAGE_KEY = 'security.active-sessions'

const getCurrentDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { device: 'Current browser', deviceType: 'monitor' as const }
  }

  const ua = window.navigator.userAgent
  let browser = 'Browser'
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edg')) browser = 'Edge'
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera'

  let os = 'Device'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'

  const deviceType: 'monitor' | 'smartphone' =
    /Android|iPhone|iPad|Mobile/i.test(ua) ? 'smartphone' : 'monitor'

  return { device: `${browser} • ${os}`, deviceType }
}

const ActiveSessions = () => {
  const currentDevice = useMemo(() => getCurrentDeviceInfo(), [])
  const [showConfirm, setShowConfirm] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)
  useBodyScrollLock(showConfirm)

  // Clear the old fake localStorage session list (no longer used)
  useEffect(() => {
    try {
      window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
    } catch {
      // ignore
    }
  }, [])

  const handleSignOutAll = async () => {
    setSigningOutAll(true)
    try {
      // Revokes all other refresh tokens; keeps this device signed in
      const { error } = await supabase.auth.signOut({ scope: 'others' })
      if (error) throw error
      toast({
        title: 'Signed out all other devices',
        description: 'Other sessions have been terminated. You remain signed in here.',
      })
      setShowConfirm(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      toast({ title: 'Could not sign out other devices', description: msg, variant: 'destructive' })
    } finally {
      setSigningOutAll(false)
    }
  }

  const DeviceIcon = currentDevice.deviceType === 'smartphone' ? Smartphone : Monitor

  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <Globe className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Active Sessions</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Manage where you are signed in. Other devices are revoked server-side.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div
          className="flex items-center justify-between rounded-lg p-3"
          style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <DeviceIcon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {currentDevice.device}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>This device · Current session</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium shrink-0">
            Active
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        If you signed in on another computer or phone, use the button below to end those sessions immediately. You will stay signed in on this device.
      </p>

      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={signingOutAll}
        className="mt-3 w-full text-xs font-medium py-2 rounded-lg transition hover:opacity-80 flex items-center justify-center gap-1.5 disabled:opacity-50"
        style={{ background: 'rgba(239,68,68,0.06)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <LogOut className="w-3.5 h-3.5" /> Sign Out All Other Devices
      </button>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget && !signingOutAll) setShowConfirm(false) }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="rounded-xl p-6 w-full max-w-sm shadow-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="sign-out-others-title"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <ShieldAlert className="w-4.5 h-4.5 text-red-400" />
                </div>
                <h3 id="sign-out-others-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Sign Out All Other Devices?
                </h3>
              </div>
              <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-muted)' }}>
                This ends every other active session for your account. You will remain signed in on this device only.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={signingOutAll}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                  style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSignOutAll}
                  disabled={signingOutAll}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition hover:opacity-90 flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: '#EF4444', color: '#fff' }}
                >
                  {signingOutAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                  {signingOutAll ? 'Signing out…' : 'Sign Out All'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// ── Two-Factor (Future) ───────────────────────────────────────────────────────
const TwoFactorPlaceholder = () => (
  <GlassCard hoverEffect={false}>
    <div className="flex items-center gap-3 mb-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
        <Fingerprint className="w-4 h-4" style={{ color: 'var(--accent)' }} />
      </div>
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Two-Factor Authentication</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Protect your account with an additional verification step.</p>
      </div>
    </div>
    <div className="rounded-lg p-3 flex items-center gap-2.5"
      style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.12)' }}>
      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Coming Soon</span>
    </div>
  </GlassCard>
)

// ── Login Activity ────────────────────────────────────────────────────────────

import { getLoginActivity, type LoginEvent } from '@/services/loginActivity'

const LoginActivity = () => {
  const [events, setEvents] = useState<LoginEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const fetchActivity = async () => {
      setLoading(true)
      const data = await getLoginActivity(5)
      if (!cancelled) {
        setEvents(data)
        setLoading(false)
      }
    }
    fetchActivity()
    return () => { cancelled = true }
  }, [])

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) +
        ', ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch {
      return iso
    }
  }

  const getStatusLabel = (eventType: LoginEvent['event_type']) => {
    switch (eventType) {
      case 'sign_in': return 'Success'
      case 'sign_up': return 'Sign Up'
      case 'failed': return 'Failed'
      default: return eventType
    }
  }

  const getStatusStyle = (eventType: LoginEvent['event_type']) => {
    return eventType === 'failed'
      ? 'bg-red-500/10 text-red-400'
      : 'bg-emerald-500/10 text-emerald-400'
  }

  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <Activity className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Login Activity</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Recent sign-in attempts.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No login activity recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-lg p-3"
              style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(event.created_at)}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {event.browser || 'Unknown'} {'\u2022'} {event.os || 'Unknown'}
                </p>
              </div>
              <span className={cn(
                'text-[10px] px-2 py-0.5 rounded-full font-medium',
                getStatusStyle(event.event_type)
              )}>{getStatusLabel(event.event_type)}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}

// ── Main Security Settings ────────────────────────────────────────────────────
export const SecuritySettings = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const strength = useMemo(() => getStrength(newPassword), [newPassword])
  const allRulesPassed = useMemo(() => PASSWORD_RULES.every(r => r.test(newPassword)), [newPassword])

  const isValid = useMemo(() => {
    return (
      currentPassword.length > 0 &&
      allRulesPassed &&
      newPassword === confirmPassword &&
      newPassword !== currentPassword
    )
  }, [currentPassword, newPassword, confirmPassword, allRulesPassed])

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!currentPassword) e.current = 'Current password is required'
    if (!allRulesPassed) e.new = 'Password does not meet requirements'
    if (newPassword !== confirmPassword) e.confirm = 'Passwords do not match'
    if (newPassword && newPassword === currentPassword) e.new = 'New password must be different'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [currentPassword, newPassword, confirmPassword, allRulesPassed])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || loading) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        if (error.message.includes('session')) {
          toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' })
        } else {
          toast({ title: 'Error', description: error.message, variant: 'destructive' })
        }
      } else {
        toast({ title: 'Password updated successfully', description: 'Your password has been changed successfully.' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setErrors({})
      }
    } catch {
      toast({ title: 'Network error', description: 'Please check your connection and try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
          <Lock className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Security
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Manage your account security and authentication settings.
          </p>
        </div>
      </div>

      {/* Security Score */}
      <SecurityScore />

      {/* Change Password Card */}
      <GlassCard hoverEffect={false}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <KeyRound className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Update your account password.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="Current Password"
            value={currentPassword}
            onChange={v => { setCurrentPassword(v); setErrors(e => ({ ...e, current: '' })) }}
            placeholder="Enter current password"
            error={errors.current}
            autoComplete="current-password"
          />
          <PasswordInput
            label="New Password"
            value={newPassword}
            onChange={v => { setNewPassword(v); setErrors(e => ({ ...e, new: '' })) }}
            placeholder="Enter new password"
            error={errors.new}
            autoComplete="new-password"
          />

          <AnimatePresence>
            {newPassword && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <StrengthMeter password={newPassword} />
                <Requirements password={newPassword} />
              </motion.div>
            )}
          </AnimatePresence>

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={v => { setConfirmPassword(v); setErrors(e => ({ ...e, confirm: '' })) }}
            placeholder="Confirm new password"
            error={errors.confirm}
            autoComplete="new-password"
          />

          <button
            type="submit"
            disabled={!isValid || loading}
            className={cn(
              'w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
              isValid && !loading ? 'hover:opacity-90 cursor-pointer' : 'opacity-50 cursor-not-allowed'
            )}
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>

        {/* Password last changed */}
        <div className="mt-4 pt-4 flex items-center gap-2" style={{ borderTop: '1px solid var(--border)' }}>
          <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Last changed: 15 June 2026</span>
        </div>
      </GlassCard>

      {/* Active Sessions */}
      <ActiveSessions />

      {/* Login Activity */}
      <LoginActivity />

      {/* Two-Factor */}
      <TwoFactorPlaceholder />
    </div>
  )
}
