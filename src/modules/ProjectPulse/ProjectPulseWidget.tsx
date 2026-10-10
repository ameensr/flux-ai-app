// src/modules/ProjectPulse/ProjectPulseWidget.tsx
// Minimal, elegant Dashboard widget for Project Pulse.

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAppStore } from '@/store/useAppStore'
import { useAIAccess } from '@/hooks/useAIAccess'
import {
  LifeBuoy,
  Rocket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Activity,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadProjectPulseData } from './projectPulseService'
import type { ProjectPulseSummary, AIRiskItem } from './types'

export const ProjectPulseWidget: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, role } = useAppStore()
  const { canGenerate } = useAIAccess()

  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [summary, setSummary] = useState<ProjectPulseSummary>({
    supportHealth: {
      openIssues: 0,
      overdueIssues: 0,
      effortOverruns: 0,
    },
    releaseHealth: {
      pendingTasks: 0,
      overdueTasks: 0,
      effortOverruns: 0,
    },
    activeProjectsCount: 0,
    approachingDeadlinesCount: 0,
  })
  const [risks, setRisks] = useState<AIRiskItem[]>([])
  const [scopedProjectsCount, setScopedProjectsCount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const hasFetched = useRef(false)

  const fetchData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true)
      else setLoading(true)
      setError(null)

      const userNameStr =
        profile?.full_name ||
        (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null) ||
        user?.email?.split('@')[0]

      const ctx = {
        userId: user?.id,
        userName: userNameStr ? String(userNameStr) : undefined,
        role: role || profile?.role || 'free',
      }

      const canUseAI = canGenerate('dashboard')
      const data = await loadProjectPulseData(ctx, canUseAI)

      setSummary(data.summary)
      setRisks(data.risks)
      setScopedProjectsCount(data.scopedProjectsCount || data.summary.activeProjectsCount || 0)
    } catch (err: any) {
      console.warn('[ProjectPulseWidget] Data load error:', err)
      setError(err?.message || 'Failed to load project pulse data')
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [user, profile, role, canGenerate])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData()
  }, [fetchData])

  // Format 2-digit numbers
  const formatNumber = (num: number): string => {
    return num < 10 && num >= 0 ? `0${num}` : String(num)
  }

  // Total risk counts
  const totalRisks =
    summary.supportHealth.overdueIssues +
    summary.releaseHealth.overdueTasks +
    summary.supportHealth.effortOverruns +
    summary.releaseHealth.effortOverruns

  // Dynamic minimal status
  const pulseStatus = useMemo(() => {
    if (totalRisks === 0) {
      return {
        label: 'Optimal',
        dotClass: 'bg-emerald-500',
        badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      }
    }
    if (totalRisks <= 2) {
      return {
        label: `${totalRisks} Minor Delay${totalRisks > 1 ? 's' : ''}`,
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      }
    }
    return {
      label: `${totalRisks} Action Items`,
      dotClass: 'bg-rose-500',
      badgeClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    }
  }, [totalRisks])

  // Role Scope Label
  const roleLabel =
    role === 'manager'
      ? 'Manager'
      : role === 'qa_lead'
      ? 'QA Lead'
      : role === 'qa_engineer'
      ? 'QA Engineer'
      : role === 'admin' || role === 'super_admin'
      ? 'Admin'
      : 'Personal'

  return (
    <GlassCard
      hoverEffect={false}
      className="p-5 sm:p-6 flex flex-col justify-between h-full relative overflow-hidden border border-border/60 bg-card/60 backdrop-blur-xl"
    >
      {/* Subtle background ambient warmth */}
      <div
        className="absolute w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-[0.06] -top-20 -right-20"
        style={{ background: 'radial-gradient(circle, var(--accent, #6366f1) 0%, transparent 70%)' }}
      />

      <div className="space-y-5 relative z-10">
        {/* ── Minimal Header ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Minimal pulse icon with gentle breathing micro-animation */}
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0"
            >
              <Activity className="w-3.5 h-3.5 text-accent" />
            </motion.div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
                  Project Pulse
                </h2>
                <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded bg-muted/40 font-medium shrink-0">
                  {roleLabel} Scope
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate">
                {scopedProjectsCount > 0
                  ? `${scopedProjectsCount} connected project${scopedProjectsCount === 1 ? '' : 's'}`
                  : 'Portfolio health & active delivery status'}
              </p>
            </div>
          </div>

          {/* Right Header: Minimal Status Pill & Refresh */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors',
                pulseStatus.badgeClass
              )}
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', pulseStatus.dotClass)} />
                <span className={cn('relative inline-flex rounded-full h-1.5 w-1.5', pulseStatus.dotClass)} />
              </span>
              <span>{pulseStatus.label}</span>
            </div>

            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing || loading}
              title="Refresh Project Pulse"
              className="w-7 h-7 rounded-lg border border-border/50 hover:border-accent/40 bg-background/50 hover:bg-muted/40 text-text-muted hover:text-foreground flex items-center justify-center transition-all disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', isRefreshing ? 'animate-spin text-accent' : '')} />
            </button>
          </div>
        </div>

        {/* ── Minimal Metrics Columns ───────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {[1, 2].map((col) => (
              <div key={col} className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3 animate-pulse">
                <div className="w-24 h-4 rounded bg-muted/60" />
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="w-10 h-6 rounded bg-muted/80" />
                      <div className="w-12 h-2.5 rounded bg-muted/50" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-destructive/10 text-destructive text-xs border border-destructive/20">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Support Health Column */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-background/40 hover:border-border transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <LifeBuoy className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-semibold text-foreground">Support Health</span>
                </div>
                <button
                  onClick={() => navigate('/support-tracker')}
                  className="text-[11px] text-text-muted hover:text-accent font-medium inline-flex items-center gap-0.5 transition-colors"
                >
                  <span>Tracker</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Open */}
                <div
                  onClick={() => navigate('/support-tracker?status=open')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/support-tracker?status=open')}
                  className="p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5"
                >
                  <div className="text-xl sm:text-2xl font-bold font-clash text-foreground group-hover/m:text-accent transition-colors">
                    {formatNumber(summary.supportHealth.openIssues)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Open Issues
                  </div>
                </div>

                {/* 2. Overdue */}
                <div
                  onClick={() => navigate('/support-tracker?overdue=true')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/support-tracker?overdue=true')}
                  className={cn(
                    'p-2 rounded-lg transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5',
                    summary.supportHealth.overdueIssues > 0
                      ? 'bg-rose-500/10 hover:bg-rose-500/15'
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div
                    className={cn(
                      'text-xl sm:text-2xl font-bold font-clash transition-colors',
                      summary.supportHealth.overdueIssues > 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-foreground group-hover/m:text-accent'
                    )}
                  >
                    {formatNumber(summary.supportHealth.overdueIssues)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Overdue
                  </div>
                </div>

                {/* 3. Overruns */}
                <div
                  onClick={() => navigate('/support-tracker?overrun=true')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/support-tracker?overrun=true')}
                  className={cn(
                    'p-2 rounded-lg transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5',
                    summary.supportHealth.effortOverruns > 0
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div
                    className={cn(
                      'text-xl sm:text-2xl font-bold font-clash transition-colors',
                      summary.supportHealth.effortOverruns > 0
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-foreground group-hover/m:text-accent'
                    )}
                  >
                    {formatNumber(summary.supportHealth.effortOverruns)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Overruns
                  </div>
                </div>
              </div>
            </div>

            {/* Release Task Health Column */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-border/50 bg-background/40 hover:border-border transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-text-muted" />
                  <span className="text-xs font-semibold text-foreground">Release Health</span>
                </div>
                <button
                  onClick={() => navigate('/release-tracker')}
                  className="text-[11px] text-text-muted hover:text-accent font-medium inline-flex items-center gap-0.5 transition-colors"
                >
                  <span>Tracker</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* 1. Pending */}
                <div
                  onClick={() => navigate('/release-tracker?status=pending')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?status=pending')}
                  className="p-2 rounded-lg bg-muted/20 hover:bg-muted/40 transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5"
                >
                  <div className="text-xl sm:text-2xl font-bold font-clash text-foreground group-hover/m:text-accent transition-colors">
                    {formatNumber(summary.releaseHealth.pendingTasks)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Pending Tasks
                  </div>
                </div>

                {/* 2. Overdue */}
                <div
                  onClick={() => navigate('/release-tracker?status=overdue')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?status=overdue')}
                  className={cn(
                    'p-2 rounded-lg transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5',
                    summary.releaseHealth.overdueTasks > 0
                      ? 'bg-rose-500/10 hover:bg-rose-500/15'
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div
                    className={cn(
                      'text-xl sm:text-2xl font-bold font-clash transition-colors',
                      summary.releaseHealth.overdueTasks > 0
                        ? 'text-rose-500 dark:text-rose-400'
                        : 'text-foreground group-hover/m:text-accent'
                    )}
                  >
                    {formatNumber(summary.releaseHealth.overdueTasks)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Overdue
                  </div>
                </div>

                {/* 3. Overruns */}
                <div
                  onClick={() => navigate('/release-tracker?overrun=true')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?overrun=true')}
                  className={cn(
                    'p-2 rounded-lg transition-all cursor-pointer text-center sm:text-left group/m hover:-translate-y-0.5',
                    summary.releaseHealth.effortOverruns > 0
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'bg-muted/20 hover:bg-muted/40'
                  )}
                >
                  <div
                    className={cn(
                      'text-xl sm:text-2xl font-bold font-clash transition-colors',
                      summary.releaseHealth.effortOverruns > 0
                        ? 'text-amber-500 dark:text-amber-400'
                        : 'text-foreground group-hover/m:text-accent'
                    )}
                  >
                    {formatNumber(summary.releaseHealth.effortOverruns)}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5 truncate">
                    Overruns
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Minimal AI Risk Summary ───────────────────────────────────────── */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
              AI Risk Summary
            </span>
          </div>

          {loading ? (
            <div className="space-y-2 py-1">
              <div className="h-10 rounded-lg bg-muted/20 animate-pulse" />
              <div className="h-10 rounded-lg bg-muted/20 animate-pulse" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {risks.slice(0, 2).map((risk) => {
                const isCritical = risk.severity === 'critical'
                const isHealthy = risk.itemType === 'healthy'

                return (
                  <div
                    key={risk.id}
                    onClick={() => navigate(risk.targetRoute)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(risk.targetRoute)}
                    className="group flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-muted/15 hover:bg-muted/30 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          isHealthy ? 'bg-emerald-500' : isCritical ? 'bg-rose-500' : 'bg-amber-500'
                        )}
                      />
                      <div className="min-w-0 flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                        <span className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                          {risk.title}
                        </span>
                        {risk.projectName && (
                          <span className="text-[10px] text-text-muted px-1.5 py-0.2 rounded bg-muted/50 truncate shrink-0">
                            {risk.projectName}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1 text-[11px] text-text-muted group-hover:text-accent transition-colors">
                      <span className="hidden sm:inline font-medium">{risk.actionLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Minimal Footer ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border/40 text-[11px] text-text-muted">
        <span>Verified from actual tracker records.</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/support-tracker')}
            className="hover:text-foreground transition-colors font-medium"
          >
            Support Tracker
          </button>
          <span>·</span>
          <button
            onClick={() => navigate('/release-tracker')}
            className="hover:text-foreground transition-colors font-medium"
          >
            Release Tracker
          </button>
        </div>
      </div>
    </GlassCard>
  )
}
