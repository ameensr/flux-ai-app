// src/components/ai/RequireFullNameGate.tsx
// Blocks the app after 1 day without a full name — Qaly Triage-style terminal UI.
// "Remind me later" may be used once; gate returns the next calendar day (no more snooze).

import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogOut, Loader2, Clock } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ROUTES } from '@/lib/routes'
import { NAME_GATE_SNOOZE_KEY } from '@/lib/nameGateSnooze'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

interface SnoozeRecord {
  userId: string
  /** True once Remind me Later has been used (only allowed once). */
  used: boolean
  /** Hide gate until this timestamp (start of next local calendar day). */
  snoozeUntil: number
}

function needsFullNameGate(fullName: string | null | undefined, createdAt: string | null | undefined): boolean {
  if (fullName?.trim()) return false
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created >= ONE_DAY_MS
}

/** Midnight at the start of the next local calendar day. */
function startOfNextLocalDay(from = Date.now()): number {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function readSnooze(userId: string): SnoozeRecord | null {
  try {
    const raw = localStorage.getItem(NAME_GATE_SNOOZE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SnoozeRecord
    if (!parsed || parsed.userId !== userId) return null
    return parsed
  } catch {
    return null
  }
}

function writeSnooze(record: SnoozeRecord): void {
  try {
    localStorage.setItem(NAME_GATE_SNOOZE_KEY, JSON.stringify(record))
  } catch { /* ignore */ }
}

function clearSnooze(): void {
  try {
    localStorage.removeItem(NAME_GATE_SNOOZE_KEY)
  } catch { /* ignore */ }
}

function TriageLine({
  children,
  tone = 'process',
  cursor = false,
}: {
  children: React.ReactNode
  tone?: 'process' | 'pass' | 'fail' | 'muted'
  cursor?: boolean
}) {
  const toneClass =
    tone === 'pass'
      ? 'text-green-600/90 dark:text-green-400/80'
      : tone === 'fail'
        ? 'text-red-600/90 dark:text-red-400/80'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-secondary'

  return (
    <div className={`flex items-start gap-1.5 font-medium ${toneClass}`}>
      <span className="shrink-0 select-none opacity-70">&gt;</span>
      <span className="flex-1 min-w-0">{children}</span>
      {cursor && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
          className="inline-block w-1.5 h-3.5 bg-text-secondary/70 ml-0.5 mt-0.5 shrink-0"
        />
      )}
    </div>
  )
}

export function RequireFullNameGate() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile, setProfile, setUser, isAuthenticated } = useAppStore()

  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [reminding, setReminding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bootLine, setBootLine] = useState(0)
  /** Bumps when snooze storage changes so open/canRemind recalculate. */
  const [snoozeTick, setSnoozeTick] = useState(0)

  const snooze = useMemo(
    () => (profile?.id ? readSnooze(profile.id) : null),
    [profile?.id, snoozeTick],
  )

  const baseNeedsGate = useMemo(
    () => isAuthenticated && needsFullNameGate(profile?.full_name, profile?.created_at),
    [isAuthenticated, profile?.full_name, profile?.created_at],
  )

  const isSnoozedNow = Boolean(snooze?.used && snooze.snoozeUntil > Date.now())
  const canRemind = baseNeedsGate && !snooze?.used
  const open = baseNeedsGate && !isSnoozedNow

  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return
    setName('')
    setError(null)
    setBootLine(0)
    const timers = [
      window.setTimeout(() => setBootLine(1), 280),
      window.setTimeout(() => setBootLine(2), 620),
      window.setTimeout(() => setBootLine(3), 980),
      window.setTimeout(() => setBootLine(4), 1320),
    ]
    return () => timers.forEach(clearTimeout)
  }, [open])

  const handleRemindLater = useCallback(() => {
    if (!profile?.id || !canRemind || reminding) return
    setReminding(true)
    writeSnooze({
      userId: profile.id,
      used: true,
      snoozeUntil: startOfNextLocalDay(),
    })
    setSnoozeTick((t) => t + 1)
    toast({
      title: 'Reminder set',
      description: 'We’ll ask for your name again tomorrow. This can only be postponed once.',
    })
    setReminding(false)
  }, [profile?.id, canRemind, reminding, toast])

  if (typeof document === 'undefined') return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      setError('name length must be >= 2')
      return
    }
    if (!profile?.id) return

    setSubmitting(true)
    setError(null)
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: trimmed })
        .eq('id', profile.id)

      if (updateError) throw updateError

      await supabase.auth.updateUser({ data: { full_name: trimmed } }).catch(() => null)

      clearSnooze()
      setSnoozeTick((t) => t + 1)
      setProfile({ ...profile, full_name: trimmed })
      toast({ title: 'Identity confirmed', description: `Welcome, ${trimmed}.` })
    } catch (err: any) {
      setError(err.message || 'write failed — retry')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      setUser(null)
      setProfile(null)
      navigate(ROUTES.login, { replace: true })
    } catch {
      navigate(ROUTES.login, { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="name-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 backdrop-blur-xl"
          style={{
            background: 'color-mix(in srgb, var(--overlay) 85%, transparent)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-gate-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden w-full max-w-md font-mono text-xs md:text-sm px-6 py-8 rounded-2xl border backdrop-blur-2xl"
            style={{
              background: 'color-mix(in srgb, var(--modal-bg) 78%, transparent)',
              borderColor: 'var(--glass-border)',
              boxShadow: 'var(--shadow)',
              color: 'var(--text-primary)',
            }}
          >
            {/* Soft glass sheen */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-2xl opacity-40"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent)',
              }}
            />

            <div className="relative">
              {/* Triage brand row */}
              <div
                className="w-full pb-4 mb-5"
                style={{ borderBottom: '1px solid var(--divider)' }}
              >
                <span id="name-gate-title" className="font-bold tracking-[0.12em]">
                  <span style={{ color: 'var(--accent)' }}>qaly.ai</span>
                  <span className="mx-1.5" style={{ color: 'var(--border)' }}>/</span>
                  <span style={{ color: 'var(--text-muted)' }}>QALY COPILOT</span>
                </span>
                <p
                  className="text-[10px] mt-2 tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  IDENTITY TRIAGE · ACCESS GATE
                </p>
              </div>

              {/* Boot / scan lines */}
              <div className="flex flex-col gap-2 w-full min-h-[140px] mb-6">
                {bootLine >= 0 && (
                  <TriageLine tone="process" cursor={bootLine === 0}>
                    Reading profile record...
                  </TriageLine>
                )}
                {bootLine >= 1 && (
                  <TriageLine tone="fail">
                    [FAIL] full_name is null
                  </TriageLine>
                )}
                {bootLine >= 2 && (
                  <TriageLine tone="process" cursor={bootLine === 2}>
                    Checking account age...
                  </TriageLine>
                )}
                {bootLine >= 3 && (
                  <TriageLine tone="pass">
                    [PASS] account_age &gt;= 1 day
                  </TriageLine>
                )}
                {bootLine >= 4 && (
                  <TriageLine tone="process" cursor={!name && !submitting}>
                    {canRemind
                      ? 'Awaiting operator identity input'
                      : 'Reminder used — enter full_name to continue'}
                  </TriageLine>
                )}
              </div>

              {/* Prompt */}
              <div className="pt-5 mb-4" style={{ borderTop: '1px solid var(--divider)' }}>
                <p
                  className="text-sm md:text-base font-bold tracking-tight mb-1"
                  style={{ color: 'var(--text-primary)' }}
                >
                  What&apos;s Your Name?
                </p>
                <p
                  className="text-[11px] leading-relaxed mb-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {canRemind
                    ? 'Profile incomplete. Enter full_name to unlock, or remind once for tomorrow.'
                    : 'Profile incomplete. Reminder already used — enter full_name to unlock the application.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div
                    className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all backdrop-blur-sm"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'color-mix(in srgb, var(--input-bg) 90%, transparent)',
                    }}
                  >
                    <span className="select-none shrink-0" style={{ color: 'var(--accent)' }}>
                      &gt;
                    </span>
                    <input
                      id="qaly-full-name"
                      type="text"
                      autoFocus
                      autoComplete="name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value)
                        if (error) setError(null)
                      }}
                      disabled={submitting || loggingOut || reminding || bootLine < 4}
                      placeholder="type full_name…"
                      className="flex-1 min-w-0 bg-transparent outline-none text-sm disabled:opacity-50 placeholder:opacity-60"
                      style={{ color: 'var(--text-primary)' }}
                      aria-label="Full name"
                    />
                    {!name && bootLine >= 4 && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="inline-block w-1.5 h-3.5 shrink-0"
                        style={{ background: 'var(--text-secondary)' }}
                      />
                    )}
                  </div>

                  {error && (
                    <TriageLine tone="fail">[FAIL] {error}</TriageLine>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || loggingOut || reminding || !name.trim() || bootLine < 4}
                    className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all disabled:opacity-40 border"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                      background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
                      color: 'var(--accent)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        writing profile…
                      </>
                    ) : (
                      <>submit · confirm identity</>
                    )}
                  </button>

                  {canRemind && (
                    <button
                      type="button"
                      onClick={handleRemindLater}
                      disabled={submitting || loggingOut || reminding || bootLine < 4}
                      className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all disabled:opacity-40 border"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'color-mix(in srgb, var(--surface) 50%, transparent)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {reminding ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      Remind me Later
                    </button>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between gap-3 pt-4"
                style={{ borderTop: '1px solid var(--divider)' }}
              >
                <p className="text-[10px] tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  status:{' '}
                  <span className="text-amber-700 dark:text-amber-400">
                    {canRemind ? 'blocked' : 'blocked · no reminder left'}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={submitting || loggingOut || reminding}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 text-red-700 dark:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  {loggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                  logout
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
