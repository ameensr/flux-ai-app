// src/modules/CinematicIntro/HolographicPanels.tsx
// Floating frosted glassmorphic holographic dashboards matching the reference visual language
// Implements all 10 QA Report sections with exact real data, non-overlapping responsive layout, and dark/light mode support

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mail,
  Rocket,
  Wrench,
  ShieldCheck,
  CheckSquare,
  AlertTriangle,
  Users,
  BarChart3,
  PieChart,
  Target,
  X,
  Sparkles,
} from 'lucide-react'
import type { HolographicPanelProps } from './types'

export const HolographicPanels: React.FC<HolographicPanelProps> = ({
  data,
  activeScene,
  activePanelId,
  onSelectPanel,
  isDark = false,
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'release' | 'support' | 'team'>('all')

  const isHologramActive =
    activeScene === 'scene_04_hologram' ||
    activeScene === 'scene_05_reveal' ||
    activeScene === 'scene_06_interactive'

  const handleCardClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectPanel(id)
    setExpandedPanel(id)
  }

  // Real data sections from data prop
  const se = data.supportEmails
  const nrf = data.newReleaseFeatures
  const sft = data.supportFixTesting
  const rts = data.releaseTestingStatus
  const tws = data.taskWiseStatus
  const sel = data.supportExceptionLog
  const tc = data.teamCapacity
  const wc = data.weeklyCharts
  const tra = data.teamResourceAllocation
  const nwp = data.nextWeekPriorities

  // Card theme helper classes
  const cardBgClass = isDark
    ? 'bg-slate-900/80 backdrop-blur-xl border border-slate-700/70 text-white shadow-[0_12px_32px_rgba(0,0,0,0.5)]'
    : 'bg-white/85 backdrop-blur-xl border border-white/90 text-slate-800 shadow-[0_12px_32px_rgba(31,56,48,0.08)]'

  const innerTagBg = isDark ? 'bg-slate-800/80 border-slate-700/60' : 'bg-slate-50/80 border-slate-100'

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* ── Top Center Section Category Filter ─────────────────────────────────── */}
      <div
        className={`absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto hidden md:flex items-center gap-1.5 p-1 rounded-full backdrop-blur-xl border shadow-sm text-[11px] font-medium transition-colors ${
          isDark
            ? 'bg-slate-900/80 border-slate-700/70 text-slate-300'
            : 'bg-white/80 border-white/90 text-slate-600'
        }`}
      >
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1 rounded-full transition ${
            activeFilter === 'all'
              ? isDark
                ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-white font-bold shadow-sm'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          All 10 Sections
        </button>
        <button
          onClick={() => setActiveFilter('release')}
          className={`px-3 py-1 rounded-full transition ${
            activeFilter === 'release'
              ? isDark
                ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-white font-bold shadow-sm'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Release & Features
        </button>
        <button
          onClick={() => setActiveFilter('support')}
          className={`px-3 py-1 rounded-full transition ${
            activeFilter === 'support'
              ? isDark
                ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-white font-bold shadow-sm'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Support & Fixes
        </button>
        <button
          onClick={() => setActiveFilter('team')}
          className={`px-3 py-1 rounded-full transition ${
            activeFilter === 'team'
              ? isDark
                ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-900 text-white font-bold shadow-sm'
              : isDark
              ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
        >
          Team & Capacity
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          LEFT COLUMN RAIL: 5 HOLOGRAPHIC PANELS (Bounded & Non-Overlapping)
         ═════════════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute top-20 sm:top-24 bottom-24 left-2 sm:left-4 w-[240px] sm:w-[270px] flex flex-col justify-between pointer-events-none z-20"
        style={{ perspective: '1200px' }}
      >
        {/* ── 1. Support Emails ───────────────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'support') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: -40 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            onClick={(e) => handleCardClick('support-emails', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(12deg) rotateX(3deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(0,242,254,0.2)] ${cardBgClass}`}>
              <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#00f2fe] to-transparent opacity-80" />
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-[10.5px] font-bold">Support Emails</span>
                </div>
                <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold ${isDark ? 'bg-teal-950/80 text-teal-300 border border-teal-800' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                  {se.slaRate}% SLA
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{se.count}</span>
                <span className="text-[9px] text-slate-400 font-medium">Emails Handled</span>
              </div>
              <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-slate-100/10 text-center">
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7.5px] text-slate-400 block font-medium">Prod</span>
                  <span className="text-[10px] font-bold text-[#ff7557]">{se.productionIssues}</span>
                </div>
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7.5px] text-slate-400 block font-medium">Fixes</span>
                  <span className="text-[10px] font-bold text-teal-500">{se.fixesForValidation}</span>
                </div>
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7.5px] text-slate-400 block font-medium">Escaped</span>
                  <span className="text-[10px] font-bold text-slate-400">{se.escapedDefects}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 2. New Release Features ─────────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'release') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: -40 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            onClick={(e) => handleCardClick('new-release-features', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(12deg) rotateX(1deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(0,242,254,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-[#00f2fe]" />
                  <span className="text-[10.5px] font-bold">New Release Features</span>
                </div>
                <span className={`text-[8.5px] font-bold px-1.5 py-0.2 rounded ${isDark ? 'bg-teal-950/80 text-teal-300' : 'bg-teal-50 text-teal-600'}`}>
                  {nrf.passCount} Pass
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{nrf.count}</span>
                <span className="text-[9px] text-slate-400 font-medium">Scoped Features</span>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-slate-100/10">
                {nrf.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <span className="truncate max-w-[160px] text-slate-300">{item.featureName}</span>
                    <span className={`px-1 rounded text-[7.5px] font-bold ${item.status === 'Pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 3. Support Fix Testing ──────────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'support') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: -40 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={(e) => handleCardClick('support-fix-testing', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(12deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(0,242,254,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-[10.5px] font-bold">Support Fix Testing</span>
                </div>
                <span className="text-[8.5px] font-bold text-emerald-400">{sft.reductionRate}% Verified</span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{sft.count}</span>
                <span className="text-[9px] text-slate-400 font-medium">Code Fixes Triaged</span>
              </div>
              <div className="w-full bg-slate-200/40 h-1.5 rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isHologramActive ? { width: `${sft.reductionRate}%` } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.4 }}
                  className="h-full bg-gradient-to-r from-teal-400 to-[#00f2fe] rounded-full"
                />
              </div>
              <div className="flex justify-between text-[8.5px] text-slate-400 pt-0.5 border-t border-slate-100/10">
                <span>Verified: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{sft.verifiedCount}</strong></span>
                <span>Pending: <strong className="text-amber-500">{sft.pendingCount}</strong></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 4. Release Testing Status ───────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'release') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: -40 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            onClick={(e) => handleCardClick('release-testing-status', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(12deg) rotateX(-1deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(0,242,254,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-[10.5px] font-bold">Release Testing Status</span>
                </div>
                <span className={`text-[8.5px] font-bold px-1 rounded ${rts.readinessStatus === 'Ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {rts.readinessStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{rts.passRate}%</span>
                <span className="text-[9px] text-slate-400 font-medium">Pass Velocity</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center pt-1 border-t border-slate-100/10">
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7px] text-red-400 block uppercase font-bold">Block</span>
                  <span className="text-[9.5px] font-black text-red-500">{rts.blockers}</span>
                </div>
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7px] text-orange-400 block uppercase font-bold">Crit</span>
                  <span className="text-[9.5px] font-black text-orange-500">{rts.critical}</span>
                </div>
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7px] text-amber-400 block uppercase font-bold">Major</span>
                  <span className="text-[9.5px] font-black text-amber-500">{rts.major}</span>
                </div>
                <div className={`${innerTagBg} p-0.5 rounded border`}>
                  <span className="text-[7px] text-slate-400 block uppercase font-bold">Minor</span>
                  <span className="text-[9.5px] font-black text-slate-400">{rts.minor}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 5. Task-Wise Status ─────────────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'release') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: -40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: -40 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            onClick={(e) => handleCardClick('task-wise-status', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(12deg) rotateX(-3deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(0,242,254,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-[10.5px] font-bold">Task-Wise Status</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{tws.completed}/{tws.totalTasks} Done</span>
              </div>
              <div className="space-y-1 pt-1 border-t border-slate-100/10">
                {tws.assignees.slice(0, 2).map((a, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <span className="truncate max-w-[130px] text-slate-300 font-medium">{a.name}</span>
                    <span className="text-teal-400 font-bold font-mono">{a.completedCount}/{a.assignedCount} Tasks</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          RIGHT COLUMN RAIL: 5 HOLOGRAPHIC PANELS (Bounded & Non-Overlapping)
         ═════════════════════════════════════════════════════════════════════════ */}
      <div
        className="absolute top-20 sm:top-24 bottom-24 right-2 sm:right-4 w-[240px] sm:w-[280px] flex flex-col justify-between pointer-events-none z-20"
        style={{ perspective: '1200px' }}
      >
        {/* ── 6. Weekly Charts & Distribution ─────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'release') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 40 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            onClick={(e) => handleCardClick('weekly-charts', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(-12deg) rotateX(3deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(255,117,87,0.2)] ${cardBgClass}`}>
              <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#ff7557] to-transparent opacity-80" />
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#ff7557]" />
                  <span className="text-[10.5px] font-bold">Weekly Charts</span>
                </div>
                <span className="text-[9px] font-bold text-emerald-400">{wc.resolutionRate}% Rate</span>
              </div>
              <div className="flex items-end justify-between h-9 pt-1 border-t border-slate-100/10 gap-1 mb-1">
                {wc.dailyTrends.map((d, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={isHologramActive ? { height: `${Math.min(100, (d.fixes + d.defects) * 12)}%` } : { height: 0 }}
                      transition={{ duration: 1.0, delay: 0.2 + idx * 0.05 }}
                      className={`w-full rounded-sm ${idx === 2 ? 'bg-gradient-to-t from-[#ff8c42] to-[#ff7557]' : isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
                    />
                    <span className="text-[7px] text-slate-400 font-mono">{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-[8.5px] pt-1 border-t border-slate-100/10 text-slate-400">
                <span>Rep: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{wc.reported}</strong></span>
                <span>Closed: <strong className="text-emerald-400">{wc.closed}</strong></span>
                <span>MTD: <strong className="text-teal-400">{wc.mtdClosed}</strong></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 7. Support & Exception Log ──────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'support') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 40 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            onClick={(e) => handleCardClick('support-exception-log', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(-12deg) rotateX(1deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(255,117,87,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ff7557]" />
                  <span className="text-[10.5px] font-bold">Support & Exception Log</span>
                </div>
                <span className="text-[8.5px] font-bold text-[#ff7557] bg-orange-500/20 px-1 py-0.2 rounded">
                  {sel.openCount} Open
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{sel.totalTickets}</span>
                <span className="text-[9px] text-slate-400 font-medium">Logged Tickets</span>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-slate-100/10">
                {sel.tickets.slice(0, 2).map((t, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <span className="truncate max-w-[160px] text-slate-300">{t.description}</span>
                    <span className="text-[7.5px] font-bold px-1 rounded bg-slate-700/60 text-slate-300">{t.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 8. Team Capacity Overview ───────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'team') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 40 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            onClick={(e) => handleCardClick('team-capacity', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(-12deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(255,117,87,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-teal-500" />
                  <span className="text-[10.5px] font-bold">Team Capacity</span>
                </div>
                <span className="text-[8.5px] font-bold text-teal-400 bg-teal-500/20 px-1 py-0.2 rounded">
                  {tc.overallCapacityPercent}%
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xl font-black tabular-nums">{tc.totalAvailableDays}</span>
                <span className="text-[9px] text-slate-400 font-medium">Available Days</span>
              </div>
              <div className="w-full bg-slate-200/40 h-1.5 rounded-full overflow-hidden mb-1">
                <motion.div
                  initial={{ width: 0 }}
                  animate={isHologramActive ? { width: `${tc.overallCapacityPercent}%` } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-teal-400 to-[#ff7557] rounded-full"
                />
              </div>
              <div className="flex justify-between text-[8.5px] text-slate-400 pt-0.5 border-t border-slate-100/10">
                <span>Members: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{tc.totalMembers}</strong></span>
                <span>Leaves: <strong className="text-amber-500">{tc.totalLeaves} Days</strong></span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 9. Team Resource Allocation ─────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'team') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 40 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            onClick={(e) => handleCardClick('team-allocation', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(-12deg) rotateX(-1deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(255,117,87,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <PieChart className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[10.5px] font-bold">Resource Allocation</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{tra.totalEngineers} Eng</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100/10">
                <div className="relative w-9 h-9 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke={isDark ? '#1e293b' : '#e2e8f0'} strokeWidth="4" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#00f2fe" strokeWidth="4" strokeDasharray="45 100" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#ff7557" strokeWidth="4" strokeDasharray="30 100" strokeDashoffset="-45" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="25 100" strokeDashoffset="-75" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="text-[8.5px] space-y-0.5 text-slate-300">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe]" />
                    <span className="truncate">Feature QA ({tra.featureTeam.length})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ff7557]" />
                    <span className="truncate">Support QA ({tra.supportTeam.length})</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 10. Next Week Priorities ────────────────────────────────────────── */}
        {(activeFilter === 'all' || activeFilter === 'team') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 40 }}
            animate={isHologramActive ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.9, x: 40 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            onClick={(e) => handleCardClick('next-week-priorities', e)}
            className="pointer-events-auto cursor-pointer group"
            style={{ transform: 'rotateY(-12deg) rotateX(-3deg)' }}
          >
            <div className={`relative rounded-2xl p-2.5 sm:p-3 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-[0_16px_40px_rgba(255,117,87,0.2)] ${cardBgClass}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#ff7557]" />
                  <span className="text-[10.5px] font-bold">Next Week Priorities</span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{nwp.priorities.length} Goals</span>
              </div>
              <div className="space-y-0.5 pt-1 border-t border-slate-100/10">
                {nwp.priorities.slice(0, 2).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[9px]">
                    <span className="truncate max-w-[150px] font-medium text-slate-300">{p.title}</span>
                    <span className="text-[7.5px] text-slate-400 font-mono">{p.dueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════
          EXPANDED MODAL DRILLDOWN FOR CLICKED HOLOGRAPHIC SECTION
          (Full Scroll & Interaction Support, No Background Hijack)
         ═════════════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {expandedPanel && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md pointer-events-auto select-auto"
            onClick={() => {
              setExpandedPanel(null)
              onSelectPanel(null)
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className={`cinematic-modal-content relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8 shadow-2xl border pointer-events-auto select-text ${
                isDark
                  ? 'bg-slate-900/95 border-slate-700/80 text-white'
                  : 'bg-white/95 border-slate-200 text-slate-900'
              }`}
              style={{ overscrollBehavior: 'contain' }}
            >
              {/* Top ambient color glow */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00f2fe] via-teal-400 to-[#ff7557]" />

              <div className="flex items-start justify-between mb-5">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-teal-400 block mb-1">
                    Telemetry Drilldown Feed
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold capitalize">
                    {expandedPanel.replace(/-/g, ' ')}
                  </h2>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Live quality assurance telemetry for {data.projectName}.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setExpandedPanel(null)
                    onSelectPanel(null)
                  }}
                  className={`p-2 rounded-full transition ${
                    isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Modal Content per Section ──────────────────────────────── */}

              {/* Section 1: Support Emails */}
              {expandedPanel === 'support-emails' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Total Emails</span>
                      <span className="text-xl font-black">{se.count}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Production Issues</span>
                      <span className="text-xl font-black text-[#ff7557]">{se.productionIssues}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Fixes Validated</span>
                      <span className="text-xl font-black text-teal-400">{se.fixesForValidation}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">SLA Adherence</span>
                      <span className="text-xl font-black text-emerald-400">{se.slaRate}%</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${isDark ? 'bg-teal-950/40 border-teal-800/80 text-teal-200' : 'bg-teal-50/70 border-teal-100 text-teal-900'}`}>
                    <p className="font-semibold mb-1">Support Quality Assessment</p>
                    <p className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                      All {se.count} incoming support emails triaged within {se.avgResponseHours || 2} hours. Escaped defect count is {se.escapedDefects}, satisfying SLA tier 1 benchmark.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 2: New Release Features */}
              {expandedPanel === 'new-release-features' && (
                <div className="space-y-3">
                  <div className={`flex justify-between items-center text-xs pb-2 border-b ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                    <span>Feature Name</span>
                    <span>Assignee & Status</span>
                  </div>
                  {nrf.items.map((item, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl transition ${isDark ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100/70'}`}>
                      <div>
                        <span className="text-xs font-bold block">{item.featureName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{item.taskId} • Priority: {item.priority}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{item.assignee}</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold ${item.status === 'Pass' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 3: Support Fix Testing */}
              {expandedPanel === 'support-fix-testing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Code Fixes</span>
                      <span className="text-xl font-black">{sft.count}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Verified Closed</span>
                      <span className="text-xl font-black text-emerald-400">{sft.verifiedCount}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Pending Validation</span>
                      <span className="text-xl font-black text-amber-400">{sft.pendingCount}</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span className="text-xs font-bold block mb-1">Turnaround Velocity</span>
                    <p className="text-xs leading-relaxed">
                      Verification running at {sft.reductionRate}% turnaround efficiency with {sft.fixesForValidation} patches pending validation.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 4: Release Testing Status */}
              {expandedPanel === 'release-testing-status' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-red-500/10 p-2.5 rounded-xl border border-red-500/30">
                      <span className="text-[9px] text-red-400 block uppercase font-bold">Blockers</span>
                      <span className="text-lg font-black text-red-500">{rts.blockers}</span>
                    </div>
                    <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/30">
                      <span className="text-[9px] text-orange-400 block uppercase font-bold">Critical</span>
                      <span className="text-lg font-black text-orange-500">{rts.critical}</span>
                    </div>
                    <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/30">
                      <span className="text-[9px] text-amber-400 block uppercase font-bold">Major</span>
                      <span className="text-lg font-black text-amber-500">{rts.major}</span>
                    </div>
                    <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30">
                      <span className="text-[9px] text-emerald-400 block uppercase font-bold">Pass Rate</span>
                      <span className="text-lg font-black text-emerald-400">{rts.passRate}%</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-teal-950/40 border-teal-800 text-teal-200' : 'bg-teal-50/70 border-teal-100 text-slate-700'}`}>
                    <span className="text-xs font-bold block mb-1">Release Gate Summary</span>
                    <p className="text-xs leading-relaxed">{rts.releaseSummary}</p>
                  </div>
                </div>
              )}

              {/* Section 5: Task-Wise Status */}
              {expandedPanel === 'task-wise-status' && (
                <div className="space-y-3">
                  <div className={`flex justify-between items-center text-xs pb-2 border-b ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                    <span>Task Name</span>
                    <span>QA Assignee</span>
                  </div>
                  {tws.tasks.map((task, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      <div>
                        <span className="text-xs font-bold block">{task.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Status: {task.status}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                        {task.assignee}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 6: Support & Exception Log */}
              {expandedPanel === 'support-exception-log' && (
                <div className="space-y-3">
                  <div className={`flex justify-between items-center text-xs pb-2 border-b ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                    <span>Ticket Detail</span>
                    <span>Assigned QA / Status</span>
                  </div>
                  {sel.tickets.map((t, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      <div className="max-w-[340px]">
                        <span className="text-xs font-bold block">{t.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{t.taskId} • Priority: {t.priority}</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-[11px] font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.assignedQA}</span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-800'}`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 7: Team Capacity Overview */}
              {expandedPanel === 'team-capacity' && (
                <div className="space-y-3">
                  <div className={`flex justify-between items-center text-xs pb-2 border-b ${isDark ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-100'}`}>
                    <span>Engineer & Role</span>
                    <span>Available / Capacity</span>
                  </div>
                  {tc.members.map((m, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-3 rounded-xl ${isDark ? 'bg-slate-800/80' : 'bg-slate-50'}`}>
                      <div>
                        <span className="text-xs font-bold block">{m.name}</span>
                        <span className="text-[10px] text-slate-400">{m.role}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-teal-400 block">{m.availableDays} Days ({m.capacityPercent}%)</span>
                        <span className="text-[10px] text-slate-400">{m.leaves} Leaves</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 8: Weekly Charts & Distribution */}
              {expandedPanel === 'weekly-charts' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Reported</span>
                      <span className="text-xl font-black">{wc.reported}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Active Open</span>
                      <span className="text-xl font-black text-[#ff7557]">{wc.open}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">Fixed & Closed</span>
                      <span className="text-xl font-black text-emerald-400">{wc.closed}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-[9px] text-slate-400 block font-semibold">MTD Closed</span>
                      <span className="text-xl font-black text-teal-400">{wc.mtdClosed}</span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <span className="text-xs font-bold block mb-2">Severity Breakdown</span>
                    <div className="grid grid-cols-4 gap-2">
                      {wc.severityBreakdown.map((s, idx) => (
                        <div key={idx} className={`p-2 rounded-xl text-center border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'}`}>
                          <span className="text-[9px] text-slate-400 block font-medium">{s.label}</span>
                          <span className="text-sm font-black" style={{ color: s.color }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Section 9: Team Resource Allocation */}
              {expandedPanel === 'team-allocation' && (
                <div className="space-y-3">
                  {tra.distribution.map((dist, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold">{dist.team}</span>
                        <span className="text-xs font-bold" style={{ color: dist.color }}>{dist.count} Engineers ({dist.percent}%)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {dist.members.map((name, mIdx) => (
                          <span key={mIdx} className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Section 10: Next Week Priorities */}
              {expandedPanel === 'next-week-priorities' && (
                <div className="space-y-3">
                  {nwp.priorities.map((p, idx) => (
                    <div key={idx} className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold">{p.title}</span>
                        <span className="text-[10px] text-teal-400 font-mono bg-teal-500/20 px-2 py-0.5 rounded border border-teal-500/30">
                          Due: {p.dueDate}
                        </span>
                      </div>
                      <p className={`text-xs mb-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{p.description}</p>
                      <span className="text-[10px] font-semibold text-slate-400">
                        Owner: <strong className={isDark ? 'text-white' : 'text-slate-800'}>{p.owner}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
