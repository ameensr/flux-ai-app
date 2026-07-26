// src/components/ai/RequireFullNameGate.tsx
// Blocks the app after 1 day without a full name — Qaly Triage-style terminal UI.

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { LogOut, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ROUTES } from '@/lib/routes'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function needsFullNameGate(fullName: string | null | undefined, createdAt: string | null | undefined): boolean {
  if (fullName?.trim()) return false
  if (!createdAt) return false
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) return false
  return Date.now() - created >= ONE_DAY_MS
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
  const [error, setError] = useState<string | null>(null)
  const [bootLine, setBootLine] = useState(0)

  const open = useMemo(
    () => isAuthenticated && needsFullNameGate(profile?.full_name, profile?.created_at),
    [isAuthenticated, profile?.full_name, profile?.created_at]
  )

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
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="name-gate-title"
        >
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md font-mono text-xs md:text-sm px-6 py-8 rounded-2xl bg-surface-elevated/40 border border-border/30 shadow-inner"
          >
            {/* Triage brand row — same pattern as QATriageLoader */}
            <div className="w-full border-b border-border/40 pb-4 mb-5">
              <span id="name-gate-title" className="font-bold tracking-[0.12em]">
                <span className="text-accent-gold">qaly.ai</span>
                <span className="mx-1.5 text-border">/</span>
                <span className="text-text-muted">QALY COPILOT</span>
              </span>
              <p className="text-[10px] text-text-muted mt-2 tracking-wide">
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
                  Awaiting operator identity input
                </TriageLine>
              )}
            </div>

            {/* Prompt */}
            <div className="border-t border-border/30 pt-5 mb-4">
              <p className="text-sm md:text-base font-bold text-text-primary tracking-tight mb-1">
                What&apos;s Your Name?
              </p>
              <p className="text-[11px] text-text-muted leading-relaxed mb-4">
                Profile incomplete. Enter full_name to unlock the application.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div
                  className="flex items-center gap-2 rounded-xl border border-border/40 bg-background/40 px-3 py-2.5 focus-within:border-accent-gold/40 focus-within:ring-1 focus-within:ring-accent-gold/20 transition-all"
                >
                  <span className="text-accent-gold select-none shrink-0">&gt;</span>
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
                    disabled={submitting || loggingOut || bootLine < 4}
                    placeholder="type full_name…"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted/60 disabled:opacity-50"
                    aria-label="Full name"
                  />
                  {!name && bootLine >= 4 && (
                    <motion.span
                      animate={{ opacity: [1, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      className="inline-block w-1.5 h-3.5 bg-text-secondary/70 shrink-0"
                    />
                  )}
                </div>

                {error && (
                  <TriageLine tone="fail">[FAIL] {error}</TriageLine>
                )}

                <button
                  type="submit"
                  disabled={submitting || loggingOut || !name.trim() || bootLine < 4}
                  className="w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-[0.14em] flex items-center justify-center gap-2 transition-all disabled:opacity-40 border border-accent-gold/30 bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/15"
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
              </form>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/30">
              <p className="text-[10px] text-text-muted tracking-wide">
                status:{' '}
                <span className="text-amber-600/90 dark:text-amber-400/80">blocked</span>
              </p>
              <button
                type="button"
                onClick={handleLogout}
                disabled={submitting || loggingOut}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 text-red-600/90 dark:text-red-400/80 hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
              >
                {loggingOut ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                logout
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
