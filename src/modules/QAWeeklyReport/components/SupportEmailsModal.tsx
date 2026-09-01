// Elegant 3D modal for Hero → Support Emails (report-preview only).
// Production Issue Categories chart keeps ProductionIssuesModal unchanged.

import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Mail, TrendingUp, TrendingDown, Minus, Inbox } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { PremiumTooltip, BarFillGradient, BAR_RADIUS } from './report-preview/chartTheme'

interface CategoryRow {
  category: string
  lastWeek: number
  mtd: number
}

interface SupportEmailsModalProps {
  isOpen: boolean
  onClose: () => void
  supportEmails: number
  prodIssuesData: CategoryRow[]
  projectName: string
  weekStart?: string
  weekEnd?: string
}

function trendPct(lastWeek: number, mtd: number): number {
  if (lastWeek <= 0) return mtd > 0 ? 100 : 0
  return Math.round(((mtd - lastWeek) / lastWeek) * 100)
}

export function SupportEmailsModal({
  isOpen,
  onClose,
  supportEmails,
  prodIssuesData,
  projectName,
  weekStart,
  weekEnd,
}: SupportEmailsModalProps) {
  useBodyScrollLock(isOpen)
  const { isDark } = useTheme()
  const chartTheme = isDark ? ('dark' as const) : ('light' as const)

  const totalLastWeek = useMemo(
    () => prodIssuesData.reduce((sum, row) => sum + (row.lastWeek || 0), 0),
    [prodIssuesData],
  )
  const totalMtd = useMemo(
    () => prodIssuesData.reduce((sum, row) => sum + (row.mtd || 0), 0),
    [prodIssuesData],
  )
  const maxMtd = useMemo(
    () => Math.max(1, ...prodIssuesData.map((r) => r.mtd || 0)),
    [prodIssuesData],
  )

  const weekLabel =
    weekStart && weekEnd
      ? `${weekStart} → ${weekEnd}`
      : 'This reporting week'

  const shell = isDark
    ? 'bg-[#0c1220]/92 border-white/[0.08] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.75),0_0_0_1px_rgba(59,130,246,0.12)]'
    : 'bg-white/95 border-slate-200/80 shadow-[0_40px_100px_-24px_rgba(15,23,42,0.28),0_0_0_1px_rgba(59,130,246,0.08)]'

  const panel = isDark
    ? 'bg-white/[0.03] border-white/[0.06]'
    : 'bg-slate-50/80 border-slate-200/70'

  const muted = isDark ? 'text-white/45' : 'text-slate-500'
  const primary = isDark ? 'text-white' : 'text-slate-900'
  const secondary = isDark ? 'text-white/70' : 'text-slate-600'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-md"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="pointer-events-auto w-full max-w-3xl max-h-[88vh]"
              style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
            >
              <div className={`relative overflow-hidden rounded-[32px] border backdrop-blur-2xl ${shell}`}>
                {/* Soft blue stage light — no harsh orange/red pulse */}
                <div
                  className="pointer-events-none absolute -top-28 left-1/2 h-56 w-[70%] -translate-x-1/2 rounded-full blur-3xl"
                  style={{
                    background: isDark
                      ? 'radial-gradient(ellipse, rgba(59,130,246,0.28), transparent 70%)'
                      : 'radial-gradient(ellipse, rgba(59,130,246,0.18), transparent 70%)',
                  }}
                />
                <div
                  className="pointer-events-none absolute -bottom-24 -right-16 h-48 w-48 rounded-full blur-3xl"
                  style={{
                    background: isDark
                      ? 'radial-gradient(circle, rgba(6,182,212,0.16), transparent 70%)'
                      : 'radial-gradient(circle, rgba(6,182,212,0.12), transparent 70%)',
                  }}
                />

                {/* Top accent hairline */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

                <div className="relative z-10 flex max-h-[88vh] flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6 sm:px-8 sm:pt-7">
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
                          isDark
                            ? 'border-blue-400/25 bg-blue-500/15 text-blue-300'
                            : 'border-blue-200 bg-blue-50 text-blue-600'
                        }`}
                      >
                        <Mail className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${muted}`}>
                          Hero insight
                        </p>
                        <h2 className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${primary}`}>
                          Support Emails
                        </h2>
                        <p className={`mt-1 truncate text-sm ${secondary}`}>
                          {projectName}
                          <span className={`mx-2 ${muted}`}>·</span>
                          {weekLabel}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={onClose}
                      aria-label="Close"
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isDark
                          ? 'border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                      }`}
                    >
                      <X className="h-4 w-4" />
                    </motion.button>
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto px-6 pb-7 sm:px-8">
                    {/* Metric strip */}
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 }}
                        className={`relative overflow-hidden rounded-2xl border p-4 ${
                          isDark
                            ? 'border-blue-400/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/5'
                            : 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-cyan-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Inbox className={`h-3.5 w-3.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                          <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${muted}`}>
                            This week
                          </span>
                        </div>
                        <div className={`mt-2 text-3xl font-black tracking-tight ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>
                          {supportEmails}
                        </div>
                        <p className={`mt-1 text-xs ${muted}`}>Support emails handled</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 }}
                        className={`rounded-2xl border p-4 ${panel}`}
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${muted}`}>
                          Last week volume
                        </span>
                        <div className={`mt-2 text-3xl font-black tracking-tight ${primary}`}>
                          {totalLastWeek}
                        </div>
                        <p className={`mt-1 text-xs ${muted}`}>Across categories</p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 }}
                        className={`rounded-2xl border p-4 ${panel}`}
                      >
                        <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${muted}`}>
                          Month to date
                        </span>
                        <div className={`mt-2 text-3xl font-black tracking-tight ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                          {totalMtd}
                        </div>
                        <p className={`mt-1 text-xs ${muted}`}>Cumulative intake</p>
                      </motion.div>
                    </div>

                    {/* Chart */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className={`mb-6 rounded-2xl border p-4 sm:p-5 ${panel}`}
                    >
                      <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                          <h3 className={`text-sm font-semibold ${primary}`}>Category comparison</h3>
                          <p className={`mt-0.5 text-xs ${muted}`}>Last week vs month-to-date</p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#60a5fa]" />
                            <span className={muted}>Last week</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#22d3ee]" />
                            <span className={muted}>MTD</span>
                          </span>
                        </div>
                      </div>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={prodIssuesData} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
                            <defs>
                              <BarFillGradient id="supportEmailsLastWeekGrad" color="#60a5fa" theme={chartTheme} />
                              <BarFillGradient id="supportEmailsMtdGrad" color="#22d3ee" theme={chartTheme} />
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 6"
                              vertical={false}
                              stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}
                            />
                            <XAxis
                              dataKey="category"
                              stroke={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(100,116,139,0.9)'}
                              fontSize={11}
                              axisLine={false}
                              tickLine={false}
                              interval={0}
                              angle={-12}
                              textAnchor="end"
                              height={52}
                            />
                            <YAxis
                              stroke={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(100,116,139,0.9)'}
                              fontSize={11}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip content={<PremiumTooltip theme={chartTheme} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.03)' }} />
                            <Bar
                              dataKey="lastWeek"
                              name="Last Week"
                              fill="url(#supportEmailsLastWeekGrad)"
                              radius={BAR_RADIUS}
                              animationBegin={80}
                              animationDuration={700}
                            />
                            <Bar
                              dataKey="mtd"
                              name="MTD"
                              fill="url(#supportEmailsMtdGrad)"
                              radius={BAR_RADIUS}
                              animationBegin={120}
                              animationDuration={700}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </motion.div>

                    {/* Category list */}
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.28 }}
                      className="space-y-2.5"
                    >
                      <h3 className={`mb-3 text-sm font-semibold ${primary}`}>Breakdown</h3>
                      {prodIssuesData.map((item, idx) => {
                        const delta = trendPct(item.lastWeek, item.mtd)
                        const share = Math.round(((item.mtd || 0) / maxMtd) * 100)
                        return (
                          <motion.div
                            key={item.category}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.32 + idx * 0.04 }}
                            className={`rounded-2xl border px-4 py-3.5 transition-colors ${panel} ${
                              isDark ? 'hover:border-blue-400/25' : 'hover:border-blue-300/70'
                            }`}
                          >
                            <div className="mb-2.5 flex items-center justify-between gap-3">
                              <span className={`text-sm font-medium ${primary}`}>{item.category}</span>
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                  delta > 0
                                    ? 'text-rose-400'
                                    : delta < 0
                                      ? 'text-emerald-400'
                                      : muted
                                }`}
                              >
                                {delta > 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5" />
                                ) : delta < 0 ? (
                                  <TrendingDown className="h-3.5 w-3.5" />
                                ) : (
                                  <Minus className="h-3.5 w-3.5" />
                                )}
                                {delta === 0 ? 'Flat' : `${Math.abs(delta)}%`}
                              </span>
                            </div>

                            <div className="mb-2.5 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-400"
                                style={{ width: `${share}%` }}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
                                  Last week
                                </div>
                                <div className={`mt-0.5 text-lg font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                  {item.lastWeek}
                                </div>
                              </div>
                              <div>
                                <div className={`text-[10px] font-semibold uppercase tracking-wider ${muted}`}>
                                  Month to date
                                </div>
                                <div className={`mt-0.5 text-lg font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>
                                  {item.mtd}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                    </motion.div>

                    {/* Footer note */}
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.45 }}
                      className={`mt-6 text-center text-[11px] leading-relaxed ${muted}`}
                    >
                      Support email volume with production category mix — use trends to spot recurring intake patterns.
                    </motion.p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
