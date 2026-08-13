import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import DOMPurify from 'dompurify'
import {
  TrendingUp, TrendingDown, Mail, Zap, Wrench, Shield, Check,
  AlertTriangle, HelpCircle, Activity, Maximize2,
  Minimize2, RefreshCw, X, ChevronRight,
  BookOpen, Star, Sparkles, FileText, LayoutGrid, Users, History, CheckCheck,
  ArrowRightLeft, GitCompare, Palette, Lock, Unlock,
  Code2, ChevronDown, Info, CalendarDays, UserRound, Target
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { BRAND } from '@/lib/brand'
import { ROUTES } from '@/lib/routes'
import { calculateQAScore } from '../utils/qualityCalculator'
import { buildReportMarkdown, buildReportHTML, downloadTextFile, slugifyName } from '../utils/reportExport'
import { ExecutiveKPISection } from './ExecutiveKPISection'
import { ReportHero } from './report-preview/ReportHero'
import { ReportNavigator, type ReportNavItem } from './report-preview/ReportNavigator'
import { ReportActionBar } from './report-preview/ReportActionBar'
import { StatusBadge } from './report-preview/StatusBadge'
import { ReportTableShell, reportTableHeadClass, reportTableRowClass } from './report-preview/ReportTableShell'
import { ReportSkeleton } from './report-preview/ReportSkeleton'
import { ReportRail } from './report-preview/ReportRail'
import { RankedProgressList } from './report-preview/RankedProgressList'
import { ContinuousQATriage } from './ContinuousQATriage'
import { ImmersiveBackground } from './report-preview/ImmersiveBackground'
import { DashboardLaunchOverlay } from './DashboardLaunchOverlay'
import { hydrateSchemaFromLegacy, orderedVisibleColumns, type QAReportTableColumn } from '../qaReportColumnSchema'
import { useColumnConfigStore } from '@/modules/DailyUpdateReport/columnConfigStore'

// Display preferences (Dashboard Display Sections toggles, historical/timeline visibility,
// column visibility) are intentionally excluded from `createFormSnapshot()`'s content
// comparison — toggling them shouldn't force a re-save. But that also means a report
// launched via an existing saved `reportId` (matched purely on content) would otherwise load
// that report's *stale* saved preferences and silently discard whatever the user just toggled
// in the editor. Re-apply the live, browser-local preferences on top of any loaded report so
// toggles always take effect immediately in the preview, regardless of save state.
function withLiveDisplayPrefs<T extends Record<string, any>>(form: T): T {
  try {
    const raw = localStorage.getItem('current-qa-report-data')
    if (!raw) return form
    const live = JSON.parse(raw)
    return {
      ...form,
      dashboardSections: live.dashboardSections ?? form.dashboardSections,
      showHistoricalAnalytics: live.showHistoricalAnalytics ?? form.showHistoricalAnalytics,
      showTimeline: live.showTimeline ?? form.showTimeline,
      visibleSupportColumns: live.visibleSupportColumns ?? form.visibleSupportColumns,
      visibleReleaseColumns: live.visibleReleaseColumns ?? form.visibleReleaseColumns,
      supportColumnSchema: live.supportColumnSchema ?? form.supportColumnSchema,
      releaseColumnSchema: live.releaseColumnSchema ?? form.releaseColumnSchema,
    }
  } catch {
    return form
  }
}
// Free-form bug status strings (sourced from the uploaded Release Bug Status sheet) mapped to a
// small, consistent color palette for the ranked progress list — keyword heuristics first, then
// a deterministic fallback so unseen labels still get a stable (not gray) color.
const BUG_STATUS_PALETTE = ['bg-blue-400', 'bg-purple-400', 'bg-cyan-400', 'bg-pink-400', 'bg-indigo-400']
function bugStatusColorClass(status: string, index = 0): string {
  const s = (status || '').toLowerCase()
  if (['resolved', 'closed', 'completed', 'done', 'fixed'].some(v => s.includes(v))) return 'bg-green-400'
  if (['blocked', 'reopen', 'fail'].some(v => s.includes(v))) return 'bg-red-400'
  if (['pending', 'hold', 'deferred'].some(v => s.includes(v))) return 'bg-amber-400'
  if (['active', 'open', 'progress', 'new'].some(v => s.includes(v))) return 'bg-blue-400'
  return BUG_STATUS_PALETTE[index % BUG_STATUS_PALETTE.length]
}

const getCustomStyles = (theme: 'light' | 'dark') => `
  @keyframes float {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-12px) rotate(4deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  @keyframes float-reverse {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(12px) rotate(-4deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  @keyframes pulse-glow {
    0% { opacity: 0.12; transform: scale(1); }
    50% { opacity: 0.22; transform: scale(1.08); }
    100% { opacity: 0.12; transform: scale(1); }
  }
  @keyframes float-glow {
    0% { transform: translate(0px, 0px) scale(1); opacity: 0.35; }
    33% { transform: translate(30px, -50px) scale(1.1); opacity: 0.55; }
    66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.25; }
    100% { transform: translate(0px, 0px) scale(1); opacity: 0.35; }
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes border-glow {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  .animate-float-glow {
    animation: float-glow 20s ease-in-out infinite;
  }
  @keyframes scroll-dot {
    0% { opacity: 0; transform: translateY(0); }
    20% { opacity: 1; }
    80% { opacity: 1; }
    100% { opacity: 0; transform: translateY(10px); }
  }
  @keyframes shine {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  @keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  .animate-float {
    animation: float 6s ease-in-out infinite;
  }
  .animate-float-reverse {
    animation: float-reverse 7s ease-in-out infinite;
  }
  .animate-spin-slow {
    animation: spin-slow 35s linear infinite;
  }
  .animate-pulse-glow {
    animation: pulse-glow 8s ease-in-out infinite;
  }

  /* ── Team Resource Allocation — living gradient layers ─────────────────── */
  @keyframes team-aurora {
    0%   { transform: translate3d(-8%, -6%, 0) scale(1);   opacity: 0.45; }
    33%  { transform: translate3d(7%, 5%, 0) scale(1.18);  opacity: 0.85; }
    66%  { transform: translate3d(-5%, 8%, 0) scale(1.04); opacity: 0.6; }
    100% { transform: translate3d(-8%, -6%, 0) scale(1);   opacity: 0.45; }
  }
  @keyframes team-rail-pan {
    0%   { background-position: 50% 0%; }
    50%  { background-position: 50% 100%; }
    100% { background-position: 50% 0%; }
  }
  @keyframes team-sheen {
    0%       { transform: translateX(-150%) skewX(-16deg); opacity: 0; }
    6%       { opacity: 1; }
    38%      { opacity: 0.5; }
    45%,100% { transform: translateX(250%) skewX(-16deg); opacity: 0; }
  }
  .team-card-aurora {
    animation: team-aurora 17s ease-in-out infinite;
    will-change: transform, opacity;
  }
  .team-card-rail {
    background-size: 100% 250%;
    animation: team-rail-pan 9s ease-in-out infinite;
  }
  .team-card-sheen {
    animation: team-sheen 12s ease-in-out infinite;
    animation-delay: var(--sheen-delay, 0s);
    will-change: transform, opacity;
  }
  @media (prefers-reduced-motion: reduce) {
    .team-card-aurora,
    .team-card-rail,
    .team-card-sheen {
      animation: none !important;
    }
    .team-card-sheen { opacity: 0 !important; }
  }
  @media print {
    .team-card-aurora,
    .team-card-sheen {
      display: none !important;
    }
  }

  /* Premium Glassmorphic Card System */
  .glass-card {
    background: ${theme === 'dark' 
      ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)'};
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.6)'};
    box-shadow: ${theme === 'dark'
      ? '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)'};
  }

  .glass-card-elevated {
    background: ${theme === 'dark'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)'};
    backdrop-filter: blur(24px) saturate(200%);
    -webkit-backdrop-filter: blur(24px) saturate(200%);
    border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)'};
    box-shadow: ${theme === 'dark'
      ? '0 12px 48px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 12px 48px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'};
  }

  .glass-card-subtle {
    background: ${theme === 'dark'
      ? 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'
      : 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)'};
    backdrop-filter: blur(16px) saturate(150%);
    -webkit-backdrop-filter: blur(16px) saturate(150%);
    border: 1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.4)'};
    box-shadow: ${theme === 'dark'
      ? '0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.03)'
      : '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)'};
  }

  /* Glassmorphic hover effects */
  .glass-card:hover, .glass-card-elevated:hover, .glass-card-subtle:hover {
    border-color: ${theme === 'dark' ? 'rgba(212,175,55,0.2)' : 'rgba(212,175,55,0.3)'};
    box-shadow: ${theme === 'dark'
      ? '0 12px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(212,175,55,0.1), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 12px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(212,175,55,0.15), inset 0 1px 0 rgba(255,255,255,1)'};
  }

  /* Premium inner glow for interactive elements */
  .glass-glow {
    position: relative;
  }
  .glass-glow::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(135deg, rgba(212,175,55,0.3), transparent 50%, rgba(59,130,246,0.2));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }
  .glass-glow:hover::before {
    opacity: 1;
  }

  /* Noise texture overlay for premium feel */
  .glass-noise::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    opacity: ${theme === 'dark' ? '0.03' : '0.02'};
    pointer-events: none;
    mix-blend-mode: overlay;
  }

  /* Card language pass — matching the reference dashboard's "cards float on soft shadow rather than hard borders" pattern. */
  .qaly-report-root .rounded-2xl, 
  .qaly-report-root .rounded-3xl, 
  .qaly-report-root .rounded-\\[24px\\], 
  .qaly-report-root .rounded-\\[28px\\] {
    box-shadow: ${theme === 'light'
      ? '0 4px 20px rgba(15,23,42,0.04), 0 16px 40px rgba(15,23,42,0.04)'
      : '0 4px 20px rgba(0,0,0,0.2), 0 16px 40px rgba(0,0,0,0.15)'} !important;
  }

  .glassmorphic-card {
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
  }
  @media print {
    @page {
      size: landscape;
      margin: 12mm 10mm;
    }

    body, html, #root, .min-h-screen {
      overflow: visible !important;
      height: auto !important;
      /* WYSIWYG: "Print to PDF" reproduces the live dashboard. The global print
         reset in index.css stands down while .qaly-print-live is set on <html>
         (see runPrint), so the live palette survives into the PDF. */
      background: ${theme === 'dark' ? '#070a13' : '#f8fafc'} !important;
      color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'} !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      text-shadow: none !important;
    }

    /* Hide interactive-only chrome — the report content itself keeps its live
       styling (colors, gradients, layout) so the PDF matches what's on screen. */
    .print\:hidden, button, header, nav, select, .fixed.bottom-4 {
      display: none !important;
    }

    /* backdrop-filter renders inconsistently (or not at all) across print engines,
       so swap it off — the cards themselves already carry mostly-opaque gradient
       backgrounds, so they keep the same look without needing the blur. */
    .qaly-report-root [class*="backdrop-blur"],
    .qaly-report-root .glassmorphic-card {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }

    /* Anchor for the absolutely-positioned ambient backdrop below. */
    .qaly-report-root {
      position: relative !important;
    }

    /* The animated ImmersiveBackground canvas cannot rasterize, so paint a
       static replica of the same ambient gradient — otherwise the translucent
       cards would sit on blank paper instead of the live backdrop. Absolute,
       not fixed: a fixed backdrop is painted on the first sheet only, leaving
       every later page without one. */
    .qaly-report-root::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background: ${theme === 'dark'
        ? 'radial-gradient(circle at 30% 22%, rgba(212,175,55,0.16), transparent 42%), radial-gradient(circle at 88% 78%, rgba(59,130,246,0.13), transparent 48%), radial-gradient(circle at 8% 78%, rgba(168,85,247,0.10), transparent 42%), #070a13'
        : 'radial-gradient(circle at 30% 22%, rgba(250,204,21,0.12), transparent 42%), radial-gradient(circle at 88% 78%, rgba(96,165,250,0.10), transparent 48%), radial-gradient(circle at 8% 78%, rgba(196,181,253,0.08), transparent 42%), #f8fafc'
      } !important;
    }

    /* Team Capacity Overview is the only section built on GlassCard, whose
       surface is var(--card-bg) — 4% white in dark theme. It reads as a card
       only because of the backdrop behind it, and print engines paint a
       backdrop on the first sheet far more reliably than on later ones. Give
       these surfaces an opaque colour so the card never disappears and take
       its near-white text with it, leaving only the blue accents visible. */
    .qaly-report-root .glass-panel {
      background: ${theme === 'dark' ? '#151c2b' : '#ffffff'} !important;
      border-color: ${theme === 'dark' ? 'rgba(148,163,184,0.20)' : 'rgba(15,23,42,0.12)'} !important;
    }

    /* Prevent cards and charts from splitting across pages */
    section, .grid > div, .flex-col > div, table, tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    h1, h2, h3, h4, h5, h6 {
      page-break-after: avoid !important;
      break-after: avoid !important;
      color: ${theme === 'dark' ? '#ffffff' : '#0f172a'} !important;
    }
  }
`
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, LineChart, Line, AreaChart, Area,
  ComposedChart
} from 'recharts'
import { toast } from '@/hooks/use-toast'
import { AI_DISABLED_BY_ADMIN, AI_PERMISSION_DENIED, useAIAccess } from '@/hooks/useAIAccess'
import { AIService } from '@/services/ai/ai-service'
import { useQAReportStore } from '../store'
import { ensureFormData, isPassStatus, isFailStatus, isBlockedStatus, isResolvedSupportStatus, isInProgressStatus, isNotStartedStatus } from '../types'
import { getSectionVisibility } from './DashboardSectionToggles'
import type { QAReportForm, SupportTicket, ReleaseItem, HistoricalDefect } from '../types'
import { useTheme } from '@/context/ThemeContext'
import { TeamCapacityDisplay } from './TeamCapacity'
import { DefectStatusModal } from './DefectStatusModal'
import { WorkDistributionModal } from './WorkDistributionModal'
import { ProductionIssuesModal } from './ProductionIssuesModal'
import { ReleaseReadinessModal } from './ReleaseReadinessModal'
import { TeamCapacityModal } from './TeamCapacityModal'
import { ExecutiveQualityScoreModal } from './ExecutiveQualityScoreModal'
import { ReleaseScopeModal } from './ReleaseScopeModal'
import { ReleaseFeaturesModal } from './ReleaseFeaturesModal'
import { CodeFixesModal } from './CodeFixesModal'
import { resolveChartAnimation, glowStyle, GlowAreaGradient, StackedAreaGradient, BarFillGradient, axisPreset, legendPreset, PremiumTooltip, BAR_RADIUS } from './report-preview/chartTheme'

// Report preview has its own isolated theme system — independent of the global dark/light toggle.
type ReportThemeId = 'light' | 'dark'

// No mock/dummy data — historical analytics use only the user's real saved reports

// ── KPI Sparkline Helpers ────────────────────────────────────────────────────
interface SparklineProps {
  data: number[]
  color: string
  className?: string
}
const MiniSparkline: React.FC<SparklineProps> = ({ data, color, className }) => {
  const chartData = data.map((v, i) => ({ val: v, name: i.toString() }))
  return (
    <div className={className || "w-16 h-8 opacity-80 group-hover:opacity-100 transition-opacity"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} dot={false} style={{ filter: `drop-shadow(0 0 3px ${color}99)` }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Interactive Count Up Numbers ─────────────────────────────────────────────
interface CountUpProps {
  end: number
  suffix?: string
  decimals?: number
}
const CountUpNumber: React.FC<CountUpProps> = ({ end, suffix = '', decimals = 0 }) => {
  const [isPrinting, setIsPrinting] = useState(false)
  const [count, setCount] = useState(() => {
    const hasPlayed = typeof window !== 'undefined' && sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'
    return hasPlayed ? end : 0
  })

  useEffect(() => {
    const mediaQueryList = window.matchMedia('print')
    const handlePrintChange = (mql: MediaQueryListEvent | MediaQueryList) => {
      setIsPrinting(mql.matches)
    }

    // Modern browsers
    mediaQueryList.addEventListener('change', handlePrintChange)
    if (mediaQueryList.matches) {
      setIsPrinting(true)
    }

    const handleBeforePrint = () => setIsPrinting(true)
    const handleAfterPrint = () => setIsPrinting(false)
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)

    return () => {
      mediaQueryList.removeEventListener('change', handlePrintChange)
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [])

  useEffect(() => {
    if (isPrinting) {
      setCount(end)
      return
    }
    const hasPlayed = typeof window !== 'undefined' && sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'
    if (hasPlayed) {
      setCount(end)
      return
    }
    let startTimestamp: number | null = null
    const duration = 1000 // ms
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(progress * end)
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    window.requestAnimationFrame(step)
  }, [end, isPrinting])

  return <span>{isPrinting ? end.toFixed(decimals) : count.toFixed(decimals)}{suffix}</span>
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
}

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut'
    }
  }
}

const ReportPreviewDashboardContent: React.FC = () => {
  const { savedReports, saveReport, fetchReports } = useQAReportStore()
  const { aiEnabled, canGenerate, notifyIfRestricted } = useAIAccess()
  const canGenerateAI = canGenerate('qa-report')
  const [searchParams] = useSearchParams()
  const reportIdFromUrl = searchParams.get('reportId')
  const launchedFromForm = searchParams.get('launch') === '1'

  // Subscribed (not `.getState()`) so this component re-renders once the
  // Daily Update column config finishes loading — needed to resolve
  // display names for "Create New" custom columns below.
  const dupSupportColumnsForLabels = useColumnConfigStore(s => s.supportColumns)
  const dupReleaseColumnsForLabels = useColumnConfigStore(s => s.releaseColumns)

  // Any dynamic columns created via "Create New" during Import from DUP —
  // without this, those columns' values (correctly saved in each ticket's/
  // item's `customFields`, and rendered in both the /qa-report table editor
  // and the markdown Preview) were silently absent from this dashboard,
  // which only ever rendered the fixed base columns below. Keyed by the
  // DUP column's stable internal_key so a later rename never breaks this.
  const buildCustomFieldEntries = (rows: Array<{ customFields?: Record<string, any> }>, dupColumns: typeof dupSupportColumnsForLabels) => {
    const keys: string[] = []
    const labels: Record<string, string> = {}
    rows.forEach(r => {
      if (!r.customFields) return
      Object.keys(r.customFields).forEach(k => {
        if (!keys.includes(k)) {
          keys.push(k)
          labels[k] = dupColumns.find(c => c.internal_key === k)?.display_name || k
        }
      })
    })
    return { keys, labels }
  }

  const resolvePreviewColumns = (
    tableKey: 'support' | 'release',
    schema: QAReportTableColumn[] | undefined,
    legacyVisibility: Record<string, boolean> | undefined,
    rows: Array<{ customFields?: Record<string, any> }>,
    dupColumns: typeof dupSupportColumnsForLabels,
  ) => {
    const { keys, labels } = buildCustomFieldEntries(rows, dupColumns)
    // Prefer labels already stored on the schema (Create New renamed labels)
    const customLabels = { ...labels }
    for (const col of schema || []) {
      if (col.kind === 'custom') customLabels[col.id] = col.label
    }
    const hydrated = hydrateSchemaFromLegacy(tableKey, schema, legacyVisibility, customLabels)
    return orderedVisibleColumns(hydrated)
  }

  // Fresh Launch from /qa-report → play RELEASE TRIAGE in this tab, then reveal dashboard
  const [showLaunchTriage, setShowLaunchTriage] = useState(() => {
    if (launchedFromForm && typeof window !== 'undefined') {
      sessionStorage.removeItem('qaly-dashboard-entrance-played')
    }
    return launchedFromForm
  })
  const [dashboardRevealed, setDashboardRevealed] = useState(!launchedFromForm)

  // Track if entrance animations have already been played (e.g. page refresh)
  // Skip when launching from form so the dashboard entrance plays after triage.
  const hasPlayed =
    typeof window !== 'undefined' &&
    !launchedFromForm &&
    sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'
  // Charts skip their draw-in animation once played this session, and always for reduced-motion users
  const chartAnimationEnabled = resolveChartAnimation(hasPlayed)

  useEffect(() => {
    if (!showLaunchTriage) {
      sessionStorage.setItem('qaly-dashboard-entrance-played', 'true')
    }
  }, [showLaunchTriage])

  const containerVariants: Variants = {
    hidden: { opacity: hasPlayed ? 1 : 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: hasPlayed ? 0 : 0.08,
        delayChildren: hasPlayed ? 0 : 0.1
      }
    }
  }

  const sectionVariants: Variants = {
    hidden: hasPlayed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 30, scale: 0.98 },
    show: hasPlayed ? { opacity: 1, y: 0, scale: 1 } : {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  }

  const activeHistory = savedReports.map(r => ({
    ...r,
    form: ensureFormData(r.form)
  }))

  // WoW comparison only uses Final reports (excludes drafts)
  const finalReportsOnly = activeHistory.filter(r => r.status === 'Final')
  const draftReportCount = activeHistory.length - finalReportsOnly.length

  const [data, setData] = useState<QAReportForm>(() => {
    const raw = localStorage.getItem('current-qa-report-data')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        // Validate that we have the minimum required data
        if (!parsed.projectId || !parsed.projectName) {
          console.warn('Dashboard loaded with incomplete data - missing project information')
        }
        return ensureFormData(parsed)
      } catch (error) {
        console.error('Failed to parse report data from localStorage:', error)
      }
    }
    return ensureFormData(null)
  })
  // isLoaded starts true only if we have localStorage data (no reportId) or will be set after fetch
  const [isLoaded, setIsLoaded] = useState(() => !reportIdFromUrl && !!localStorage.getItem('current-qa-report-data'))
  const isLoadedRef = useRef(isLoaded)
  isLoadedRef.current = isLoaded
  // Report metadata (generated timestamp / draft-final status) — sourced from the saved report record,
  // never fabricated. Absent for reports launched directly from the form before saving.
  const [reportMeta, setReportMeta] = useState<{ generatedDate?: string; status?: 'Draft' | 'Final'; createdBy?: string }>({})
  const vis = getSectionVisibility(data)
  // Helper: returns null if section is disabled
  const gated = (key: string, content: React.ReactNode) => vis[key] !== false ? content : null

  const stripLaunchParam = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      if (!params.has('launch')) return
      params.delete('launch')
      const qs = params.toString()
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    } catch {
      // ignore
    }
  }, [])

  const handleLaunchTriageComplete = useCallback(() => {
    const reveal = () => {
      if (!isLoadedRef.current) {
        window.setTimeout(reveal, 60)
        return
      }
      stripLaunchParam()
      setDashboardRevealed(true)
      // Let the dashboard breathe in under the overlay, then dismiss triage
      window.setTimeout(() => setShowLaunchTriage(false), 280)
    }
    reveal()
  }, [stripLaunchParam])

  // Nav items mirror the actual rendered section order — a section only appears here if
  // its corresponding vis flag (or underlying data) means it will actually be rendered.
  const reportNavItems: ReportNavItem[] = [
    { id: 'overview', label: 'Overview', show: vis.show_hero !== false },
    { id: 'kpis', label: 'KPIs', show: vis.show_kpiCards !== false },
    { id: 'releaseTesting', label: 'Release', show: vis.show_releaseTable !== false },
    { id: 'releaseBugStatus', label: 'Bug Status', show: !!data.releaseBugStatus && vis.show_releaseBugStatus !== false },
    { id: 'supportLog', label: 'Support', show: vis.show_supportLog !== false },
    { id: 'defects', label: 'Defects', show: vis.show_defectAnalysis !== false },
    { id: 'comparison', label: 'WoW', show: vis.show_wowComparison !== false }
  ]
  const { theme: globalTheme, toggleTheme } = useTheme()
  const theme = globalTheme === 'light' ? 'light' : 'dark'
  // No longer user-toggleable (the "Motion" control was removed from the top bar) — ambient
  // background motion just follows whatever preference was last saved, defaulting to on.
  const enableParticles = localStorage.getItem('qaly-enable-particles') !== 'false'
  const [isHealthBarFilled, setIsHealthBarFilled] = useState(false)
  const [clientMode, setClientMode] = useState<boolean>(localStorage.getItem('qaly-client-mode') === 'true')
  const [expandedTimelineWeeks, setExpandedTimelineWeeks] = useState<Record<string, boolean>>({})
  const [timelineFilter, setTimelineFilter] = useState<'weekly' | 'sprint' | 'monthly' | 'quarterly'>('weekly')
  const [compareMode, setCompareMode] = useState<boolean>(false)
  const [compareReportA, setCompareReportA] = useState<string>('')
  const [compareReportB, setCompareReportB] = useState<string>('')
  const [isPresentation, setIsPresentation] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showDefectModal, setShowDefectModal] = useState(false)
  const [showWorkDistributionModal, setShowWorkDistributionModal] = useState(false)
  const [showProductionIssuesModal, setShowProductionIssuesModal] = useState(false)
  const [showReleaseReadinessModal, setShowReleaseReadinessModal] = useState(false)
  const [showTeamCapacityModal, setShowTeamCapacityModal] = useState(false)
  const [showQualityScoreModal, setShowQualityScoreModal] = useState(false)
  const [showReleaseScopeModal, setShowReleaseScopeModal] = useState(false)
  const [showReleaseFeaturesModal, setShowReleaseFeaturesModal] = useState(false)
  const [showCodeFixesModal, setShowCodeFixesModal] = useState(false)

  // Pause expensive ambient canvas while any modal / launch overlay is open
  const particlesPaused =
    showLaunchTriage ||
    showDefectModal ||
    showWorkDistributionModal ||
    showProductionIssuesModal ||
    showReleaseReadinessModal ||
    showTeamCapacityModal ||
    showQualityScoreModal ||
    showReleaseScopeModal ||
    showReleaseFeaturesModal ||
    showCodeFixesModal

  const releasePreviewColumns = useMemo(
    () =>
      resolvePreviewColumns(
        'release',
        data.releaseColumnSchema,
        data.visibleReleaseColumns,
        data.releaseItems,
        dupReleaseColumnsForLabels,
      ),
    // resolvePreviewColumns closes over stable helpers in this render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.releaseColumnSchema, data.visibleReleaseColumns, data.releaseItems, dupReleaseColumnsForLabels],
  )

  const supportPreviewColumns = useMemo(
    () =>
      resolvePreviewColumns(
        'support',
        data.supportColumnSchema,
        data.visibleSupportColumns,
        data.supportTickets,
        dupSupportColumnsForLabels,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.supportColumnSchema, data.visibleSupportColumns, data.supportTickets, dupSupportColumnsForLabels],
  )

  const releaseScopeVisibleColumns = useMemo(() => {
    if (data.releaseColumnSchema?.length) {
      return Object.fromEntries(data.releaseColumnSchema.map(c => [c.id, c.visible !== false]))
    }
    if (data.visibleReleaseColumns) return data.visibleReleaseColumns
    const map: Record<string, boolean> = {}
    for (const c of releasePreviewColumns) map[c.id] = true
    return map
  }, [data.releaseColumnSchema, data.visibleReleaseColumns, releasePreviewColumns])
  const [hoveredKPI, setHoveredKPI] = useState<string | null>(null)
  const [expandedKPICategories, setExpandedKPICategories] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('qaly-expanded-kpi-categories')
    return saved ? JSON.parse(saved) : {}
  })
  const [aiSummary, setAiSummary] = useState({
    achievements: [
      'Successfully validated the core checkout flows, bringing mobile friction down by 14% month-over-month.',
      'Passed release criteria for 3 out of 4 major items, keeping automation tests at 76%.',
      'Resolved checkout failure exception logs with zero SLAs breached.'
    ],
    risks: [
      'User Profile redesign failed testing due to API schema mismatches, pushing target release by one week.',
      'Staff bottlenecks: Elena is over-allocated on both Safari check-out issues and password support.',
      'MTD analysis shows a slight rise in database schema exceptions.'
    ],
    trends: [
      'Open defects decreased from 15 to 9 (-40%), continuing a downward trend for three consecutive weeks.',
      'Automation coverage increased +4% since last week, heading towards the Q2 goal of 80%.',
      'Average ticket resolution time dropped from 24 hours to 18 hours.'
    ],
    recommendations: [
      'Isolate checkout staging environments to prevent configuration drifts.',
      'Delegate standard ticket reviews to Marcus/Elena to offload critical regression flows.',
      'Enforce API integration test validation checks prior to merging backend sprint patches.'
    ]
  })
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [activeSection, setActiveSection] = useState('overview')

  const sectionsRef = {
    overview: useRef<HTMLDivElement>(null),
    kpis: useRef<HTMLDivElement>(null),
    sprintHealth: useRef<HTMLDivElement>(null),
    releaseTesting: useRef<HTMLDivElement>(null),
    releaseBugStatus: useRef<HTMLDivElement>(null),
    supportLog: useRef<HTMLDivElement>(null),
    defects: useRef<HTMLDivElement>(null),
    charts: useRef<HTMLDivElement>(null),
    aiSummary: useRef<HTMLDivElement>(null),
    comparison: useRef<HTMLDivElement>(null),
    historyDashboard: useRef<HTMLDivElement>(null),
    details: useRef<HTMLDivElement>(null),
    team: useRef<HTMLDivElement>(null),
    roadmap: useRef<HTMLDivElement>(null)
  }

  // Load report data: prefer URL reportId → Supabase fetch, fallback to localStorage
  useEffect(() => {
    if (reportIdFromUrl) {
      // Try to find in already-loaded savedReports first
      const found = savedReports.find(r => r.id === reportIdFromUrl)
      if (found) {
        setData(ensureFormData(withLiveDisplayPrefs(found.form)))
        setReportMeta({ generatedDate: found.generatedDate, status: found.status, createdBy: found.createdBy })
        setIsLoaded(true)
        return
      }
      // Not in cache yet — fetch from Supabase directly
      import('@/lib/supabase').then(({ supabase }) => {
        supabase
          .from('weekly_reports')
          .select('*')
          .eq('id', reportIdFromUrl)
          .single()
          .then(({ data: row, error }) => {
            if (!error && row) {
              setData(ensureFormData(withLiveDisplayPrefs({ ...row.form_data, projectId: row.project_id, projectName: row.project })))
              setReportMeta({ generatedDate: row.generated_date, status: row.status, createdBy: row.created_by })
            } else {
              // Fallback to localStorage if Supabase fetch fails
              const raw = localStorage.getItem('current-qa-report-data')
              if (raw) { try { setData(ensureFormData(JSON.parse(raw))) } catch { } }
            }
            setIsLoaded(true)
          })
      })
    } else if (!isLoaded) {
      // No reportId in URL — use savedReports or localStorage
      if (activeHistory.length > 0) {
        setData(ensureFormData(activeHistory[0].form))
        setReportMeta({ generatedDate: activeHistory[0].generatedDate, status: activeHistory[0].status, createdBy: activeHistory[0].createdBy })
      }
      setIsLoaded(true)
    }
  }, [reportIdFromUrl, savedReports, isLoaded])




  // ── Calculation Utilities ──────────────────────────────────────────────────
  // Release Pass Rate — same pass matcher as /qa-report Release table & quality score
  // (Pass / Passed / Completed / Success, case-insensitive). Exact `=== 'Pass'`
  // missed live DUP statuses and showed 0% incorrectly.
  const releaseCount = data.releaseItems.length
  const releasePassed = data.releaseItems.filter(i => isPassStatus(i?.status)).length
  const releaseFailed = data.releaseItems.filter(i => isFailStatus(i?.status)).length
  const releaseBlocked = data.releaseItems.filter(i => isBlockedStatus(i?.status)).length
  const passRate = releaseCount ? Math.round((releasePassed / releaseCount) * 100) : 0

  // Defect Closure — prefer uploaded Release Bug Status (live sheet metrics);
  // fall back to manual Defects — Last Week fields from the form.
  const bugMetrics = data.releaseBugStatus?.metrics
  const activeDefectsTotal = bugMetrics?.totalBugs || data.defectsLastWeek.reported
  const defectClosureRate = bugMetrics && bugMetrics.totalBugs > 0
    ? Math.round(bugMetrics.closurePercentage)
    : (data.defectsLastWeek.reported
      ? Math.round((data.defectsLastWeek.closed / data.defectsLastWeek.reported) * 100)
      : 0)

  // ── Executive Quality Score Calculation ──
  const qualityStats = calculateQAScore(data)

  // ── Theme Gallery configurations ──
  const getThemeStyles = () => {
    if (theme === 'light') {
      return {
        bg: 'bg-[#f8fafc] text-slate-900',
        card: 'glass-card glass-glow rounded-2xl transition-all duration-300',
        accent: 'text-[#b5942b]',
        accentBg: 'bg-accent-gold text-black hover:bg-[#b5942b] font-bold rounded-xl transition-all',
        border: 'border-white/40',
        glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.02)]',
        font: 'font-inter',
        chartColors: ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c'],
        softCard: 'glass-card-elevated glass-glow glass-noise rounded-[32px] transition-all duration-300',
        gradientWarm: 'bg-gradient-to-br from-[#FB7185] to-[#FB923C]',
        gradientCool: 'bg-gradient-to-br from-[#22D3EE] to-[#3B82F6]'
      }
    } else {
      return {
        bg: 'bg-[#070a13] text-[#f8fafc]',
        card: 'glass-card glass-glow rounded-2xl transition-all duration-300',
        accent: 'text-accent-gold',
        accentBg: 'bg-accent-gold text-black hover:bg-[#b5942b] font-bold rounded-xl transition-all',
        border: 'border-white/[0.08]',
        glow: 'shadow-[0_0_50px_rgba(212,175,55,0.02)]',
        font: 'font-inter',
        chartColors: ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c'],
        softCard: 'glass-card-elevated glass-glow glass-noise rounded-[32px] transition-all duration-300',
        gradientWarm: 'bg-gradient-to-br from-[#BE123C] to-[#C2410C]',
        gradientCool: 'bg-gradient-to-br from-[#0E7490] to-[#1D4ED8]'
      }
    }
  }

  const tS = getThemeStyles()

  // ── Sprint Health calculations ──
  const totalCases = data.releaseItems.length
  const passedCases = releasePassed
  const failedCases = releaseFailed
  const blockedCases = releaseBlocked
  const inProgressCases = data.releaseItems.filter(i => isInProgressStatus(i?.status)).length
  const notExecutedCases = data.releaseItems.filter(i => isNotStartedStatus(i?.status)).length
  const pendingCases = inProgressCases + blockedCases

  const sprintHealthScore = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 100

  // ── Release Readiness Meter calculations ──
  // Use Release Bug Status data if available, otherwise fall back to manual defects
  const releaseBugData = data.releaseBugStatus?.metrics
  /**
   * Open bugs = every bug that is not Closed (total - completed), i.e. the
   * `openBugs` the parser already derives, and the same number shown by the
   * "Open" KPI card and the Defect Status modal.
   *
   * Deferred and invalid bugs are included: this is deliberately the strict
   * "anything not closed" reading, so a large rejected/duplicate pile will
   * lower readiness. Subtract `invalidBugs` here if that is ever unwanted.
   *
   * Previously this used `activeBugs`, which silently excluded "resolved /
   * ready for QA" work that is fixed but not yet verified, flattering the
   * readiness score.
   */
  const openBugsCount = releaseBugData
    ? (releaseBugData.openBugs ?? Math.max(0, (releaseBugData.totalBugs ?? 0) - (releaseBugData.completedBugs ?? 0)))
    : data.defectsLastWeek.open

  /** Same rule applied to a historical report, for sparklines. */
  const openBugsOf = (f: QAReportForm): number => {
    const m = f.releaseBugStatus?.metrics
    return m
      ? (m.openBugs ?? Math.max(0, (m.totalBugs ?? 0) - (m.completedBugs ?? 0)))
      : f.defectsLastWeek?.open ?? 0
  }
  const closureRate = releaseBugData?.closurePercentage ??
    (data.defectsLastWeek.reported > 0 ? (data.defectsLastWeek.closed / data.defectsLastWeek.reported) * 100 : 100)

  const passPctFactor = totalCases > 0 ? passedCases / totalCases : 1.0
  // Open Bugs Factor: logarithmic scale for better distribution
  const openBugsFactor = openBugsCount === 0 ? 1.0 : Math.max(0, (100 - (Math.log10(openBugsCount + 1) * 40)) / 100)

  // Simplified formula: Pass Rate (60%) + Open Bugs Factor (40%)
  const releaseReadinessScore = Math.max(0, Math.min(100, Math.round(
    (passPctFactor * 60) + (openBugsFactor * 40)
  )))

  // ── WoW Comparison Calculations ──
  // Only compare against Final reports (excludes drafts)
  const getPreviousReport = (): QAReportForm | null => {
    const curIndex = finalReportsOnly.findIndex(r => r.form.weekStart === data.weekStart)
    if (curIndex !== -1 && curIndex + 1 < finalReportsOnly.length) {
      return finalReportsOnly[curIndex + 1].form
    }
    if (curIndex === -1 && finalReportsOnly.length > 0) {
      return finalReportsOnly[0].form
    }
    return null
  }

  const prevReport = getPreviousReport()

  const getMetricComparison = (
    name: string,
    thisVal: number,
    lastVal: number | undefined,
    type: 'lower-better' | 'higher-better' | 'neutral'
  ) => {
    const hasLast = lastVal !== undefined
    const diff = hasLast ? thisVal - (lastVal || 0) : 0

    let percentStr = 'New'
    let percentNum = 0
    let trend: 'improved' | 'regression' | 'neutral' | 'no-change' = 'no-change'
    let trendSymbol = '▬'
    let badgeText = 'No Change'

    if (hasLast) {
      if (lastVal === 0 && thisVal === 0) {
        percentStr = 'No Change'
        trend = 'no-change'
        badgeText = '▬ No Change'
      } else if (lastVal === 0) {
        percentStr = 'New'
        trend = type === 'lower-better' ? 'regression' : type === 'higher-better' ? 'improved' : 'neutral'
        trendSymbol = '▲'
        badgeText = `▲ New`
      } else {
        const pct = Math.round((diff / lastVal) * 100)
        percentNum = Math.abs(pct)

        if (pct === 0) {
          trend = 'no-change'
          badgeText = '▬ No Change'
        } else {
          trendSymbol = pct > 0 ? '▲' : '▼'
          percentStr = `${Math.abs(pct)}%`

          if (type === 'lower-better') {
            trend = pct < 0 ? 'improved' : 'regression'
            badgeText = `${trendSymbol} ${percentStr} ${pct < 0 ? 'Improved' : 'Increased'}`
          } else if (type === 'higher-better') {
            trend = pct > 0 ? 'improved' : 'regression'
            badgeText = `${trendSymbol} ${percentStr} ${pct > 0 ? 'Improved' : 'Reduced'}`
          } else {
            trend = 'neutral'
            badgeText = `${trendSymbol} ${percentStr} ${pct > 0 ? 'Increased' : 'Reduced'}`
          }
        }
      }
    }

    return {
      name,
      thisVal,
      lastVal: hasLast ? lastVal : '—',
      percentStr,
      percentNum,
      trend,
      trendSymbol,
      badgeText,
      hasLast
    }
  }

  const comparisons = [
    getMetricComparison('Support Tickets', data.supportTickets?.length || 0, prevReport?.supportTickets?.length || 0, 'lower-better'),
    getMetricComparison('Defects', data.defectsLastWeek.reported, prevReport?.defectsLastWeek.reported, 'lower-better'),
    getMetricComparison('Change Requests', data.lastWeek.changeRequest, prevReport?.lastWeek.changeRequest, 'neutral'),
    getMetricComparison('Backend Issues', data.lastWeek.backendUpdation, prevReport?.lastWeek.backendUpdation, 'lower-better'),
    getMetricComparison('Features Completed', data.newFeatures, prevReport?.newFeatures, 'higher-better'),
    getMetricComparison('Testing Completed', data.releaseItems.length, prevReport?.releaseItems.length, 'higher-better')
  ]

  const generateWowSummary = (comps: any[]): string => {
    const improvements = comps.filter(c => c.trend === 'improved' && c.trendSymbol === '▼').map(c => `${c.name.toLowerCase()} decreased by ${c.percentStr}`)
    const featureImps = comps.filter(c => c.trend === 'improved' && c.trendSymbol === '▲').map(c => `${c.name.toLowerCase()} increased by ${c.percentStr}`)
    const regressions = comps.filter(c => c.trend === 'regression' && c.trendSymbol === '▲').map(c => `${c.name.toLowerCase()} increased by ${c.percentStr}`)
    const featureRegs = comps.filter(c => c.trend === 'regression' && c.trendSymbol === '▼').map(c => `${c.name.toLowerCase()} reduced by ${c.percentStr}`)

    const impParts = [...improvements, ...featureImps]
    const regParts = [...regressions, ...featureRegs]

    let text = ''
    if (impParts.length > 0) {
      text += `Support tickets and defect validation showed improvement: ${impParts.join(', ')}. `
    }
    if (regParts.length > 0) {
      text += `${impParts.length > 0 ? 'However, there ' : 'There '} are indicators requiring focus: ${regParts.join(', ')}. `
    }
    const stable = comps.filter(c => c.trend === 'no-change')
    if (stable.length > 0) {
      text += `Metrics for ${stable.map(s => s.name.toLowerCase()).join(' and ')} remained stable compared to the previous week.`
    }
    return text || 'All core weekly QA metrics remained stable and unchanged from the previous cycle.'
  }

  // ── Snapshot Comparison calculations ──
  const getComparisonWinner = (reportA: QAReportForm, reportB: QAReportForm) => {
    const passRateA = reportA.releaseItems.length ? reportA.releaseItems.filter(i => isPassStatus(i?.status)).length / reportA.releaseItems.length : 1.0
    const passRateB = reportB.releaseItems.length ? reportB.releaseItems.filter(i => isPassStatus(i?.status)).length / reportB.releaseItems.length : 1.0

    if (passRateB > passRateA) return `${reportB.reportTitle || 'Report B'} (Higher Release Pass Rate)`
    if (passRateA > passRateB) return `${reportA.reportTitle || 'Report A'} (Higher Release Pass Rate)`
    return 'Tie'
  }

  const getBiggestImprovement = (reportA: QAReportForm, reportB: QAReportForm) => {
    const changes = [
      { name: 'Support Tickets', change: ((reportB.supportEmails - reportA.supportEmails) / (reportA.supportEmails || 1)) * 100, type: 'lower' },
      { name: 'Defects Reported', change: ((reportB.defectsLastWeek.reported - reportA.defectsLastWeek.reported) / (reportA.defectsLastWeek.reported || 1)) * 100, type: 'lower' },
      { name: 'Features Completed', change: ((reportB.newFeatures - reportA.newFeatures) / (reportA.newFeatures || 1)) * 100, type: 'higher' }
    ]

    const sorted = changes.map(c => {
      const positiveValue = c.type === 'lower' ? -c.change : c.change
      return { ...c, positiveValue }
    }).sort((a, b) => b.positiveValue - a.positiveValue)

    if (sorted[0] && sorted[0].positiveValue > 0) {
      return `${sorted[0].name} (${Math.round(sorted[0].positiveValue)}% Improved)`
    }
    return 'None'
  }

  // ── Confetti "Popper" Particle system on health score > 90% ──
  // Simulates two physical party-popper cannons firing from the bottom corners:
  // a fast upward burst that arcs under gravity, with air-drag deceleration,
  // per-axis 3D tumble (rotateX/Y/Z) so strips catch the "light" as they flip,
  // and a gentle side-to-side flutter as pieces settle — plus a soft fade-out
  // near the floor instead of an abrupt pop-out-of-existence.
  interface ConfettiPiece {
    x: number
    y: number
    vx: number
    vy: number
    gravity: number
    drag: number
    rotX: number
    rotY: number
    rotZ: number
    rotXSpeed: number
    rotYSpeed: number
    rotZSpeed: number
    wobblePhase: number
    wobbleSpeed: number
    wobbleAmp: number
    color: string
    width: number
    height: number
    shape: 'strip' | 'square' | 'circle'
    delay: number
    age: number
    opacity: number
  }

  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])

  const spawnConfettiBurst = () => {
    const colors = ['#d4af37', '#facc15', '#fef08a', '#f5f5f5', '#eab308']
    const shapes: ConfettiPiece['shape'][] = ['strip', 'strip', 'square', 'circle']
    const w = window.innerWidth
    const h = window.innerHeight

    const makeCannon = (originX: number, baseAngleDeg: number, count: number): ConfettiPiece[] =>
      Array.from({ length: count }, () => {
        const spreadDeg = (Math.random() - 0.5) * 55
        const angle = ((baseAngleDeg + spreadDeg) * Math.PI) / 180
        const speed = 9 + Math.random() * 10
        const shape = shapes[Math.floor(Math.random() * shapes.length)]
        const isStrip = shape === 'strip'
        return {
          x: originX,
          y: h + 10,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          gravity: 0.32 + Math.random() * 0.1,
          drag: 0.986 + Math.random() * 0.008,
          rotX: Math.random() * 360,
          rotY: Math.random() * 360,
          rotZ: Math.random() * 360,
          rotXSpeed: (Math.random() - 0.5) * 22,
          rotYSpeed: (Math.random() - 0.5) * 22,
          rotZSpeed: (Math.random() - 0.5) * 14,
          wobblePhase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.08 + Math.random() * 0.1,
          wobbleAmp: 0.6 + Math.random() * 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
          width: isStrip ? 4 + Math.random() * 3 : 6 + Math.random() * 4,
          height: isStrip ? 10 + Math.random() * 8 : shape === 'circle' ? 6 + Math.random() * 4 : 6 + Math.random() * 4,
          shape,
          delay: Math.floor(Math.random() * 10),
          age: 0,
          opacity: 1
        }
      })

    // Two cannons fire from the bottom corners, arcing up and inward across the screen.
    const leftCannon = makeCannon(w * 0.08, -62, 90)
    const rightCannon = makeCannon(w * 0.92, -118, 90)
    setConfetti([...leftCannon, ...rightCannon])
  }

  useEffect(() => {
    if (qualityStats.score >= 90) {
      spawnConfettiBurst()
      toast({ title: 'Quality Goal Achieved! 🏆', description: 'QA Health score has exceeded 90% this week.' })
    }
  }, [qualityStats.score])

  useEffect(() => {
    if (confetti.length === 0) return
    let animationFrameId: number
    const floor = window.innerHeight
    const fadeZone = 140

    const updateConfetti = () => {
      setConfetti(prev => {
        const next = prev
          .map(p => {
            if (p.delay > 0) return { ...p, delay: p.delay - 1 }
            const vy = (p.vy + p.gravity)
            const vx = p.vx * p.drag
            const wobblePhase = p.wobblePhase + p.wobbleSpeed
            const x = p.x + vx + Math.sin(wobblePhase) * p.wobbleAmp
            const y = p.y + vy
            const distanceToFloor = floor - y
            const opacity = distanceToFloor < fadeZone ? Math.max(0, distanceToFloor / fadeZone) : 1
            return {
              ...p,
              x,
              y,
              vx,
              vy,
              wobblePhase,
              rotX: p.rotX + p.rotXSpeed,
              rotY: p.rotY + p.rotYSpeed,
              rotZ: p.rotZ + p.rotZSpeed,
              age: p.age + 1,
              opacity
            }
          })
          .filter(p => p.y < floor + 20 && p.opacity > 0.01)
        if (next.length > 0) {
          animationFrameId = requestAnimationFrame(updateConfetti)
        }
        return next
      })
    }
    animationFrameId = requestAnimationFrame(updateConfetti)
    return () => cancelAnimationFrame(animationFrameId)
  }, [confetti.length])

  // ── Mount: fetch remote reports ──
  useEffect(() => {
    if (data?.projectId) {
      fetchReports(data.projectId)
    } else {
      fetchReports()
    }
  }, [data?.projectId])

  // Resolves display names for any "Create New" custom columns (added during
  // Import from DUP) so this dashboard can label them correctly instead of
  // falling back to their raw internal_key — scoped to this report's own
  // project so a differently-scoped column config left over in the shared
  // store from another project/page doesn't produce a wrong label.
  useEffect(() => {
    const columnConfigStore = useColumnConfigStore.getState()
    columnConfigStore.fetchColumnConfigs('support', data?.projectId || null)
    columnConfigStore.fetchColumnConfigs('release', data?.projectId || null)
  }, [data?.projectId])

  // Write theme classes
  useEffect(() => {
    localStorage.setItem('qaly-report-theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  // Scroll spy — rAF-throttled to avoid setState storms while scrolling
  useEffect(() => {
    let raf = 0
    const handleScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const scrollPos = window.scrollY + 200
        for (const [key, ref] of Object.entries(sectionsRef)) {
          if (ref.current) {
            const offsetTop = ref.current.offsetTop
            const offsetHeight = ref.current.offsetHeight
            if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
              setActiveSection(prev => (prev === key ? prev : key))
              break
            }
          }
        }
      })
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Keyboard navigation for Presentation
  useEffect(() => {
    if (!isPresentation) return
    const keys = Object.keys(sectionsRef)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreen()
        setIsPresentation(false)
        return
      }

      let currentIndex = keys.indexOf(activeSection)
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = Math.min(currentIndex + 1, keys.length - 1)
        scrollToSection(keys[nextIndex])
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = Math.max(currentIndex - 1, 0)
        scrollToSection(keys[prevIndex])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresentation, activeSection])

  const requestFullscreen = () => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen()
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) document.exitFullscreen().catch(() => { })
  }

  const togglePresentation = () => {
    if (!isPresentation) {
      requestFullscreen()
      setIsPresentation(true)
      scrollToSection('overview')
    } else {
      exitFullscreen()
      setIsPresentation(false)
    }
  }

  const toggleKPICategory = (categoryId: string) => {
    const newState = {
      ...expandedKPICategories,
      [categoryId]: !expandedKPICategories[categoryId]
    }
    setExpandedKPICategories(newState)
    localStorage.setItem('qaly-expanded-kpi-categories', JSON.stringify(newState))
  }

  const scrollToSection = (section: string) => {
    const targetRef = (sectionsRef as any)[section]
    if (targetRef && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setActiveSection(section)
    }
  }

  // ── Generates dynamically refined summaries (Comparing history) ───────────
  const handleAIGenerate = async () => {
    if (!aiEnabled) {
      toast({ title: 'AI Disabled', description: AI_DISABLED_BY_ADMIN, variant: 'destructive' })
      return
    }
    if (notifyIfRestricted()) return
    if (!canGenerateAI) {
      toast({ title: 'Permission Denied', description: AI_PERMISSION_DENIED, variant: 'destructive' })
      return
    }
    setIsGeneratingAI(true)
    try {
      const prevSummaries = activeHistory.slice(-5).map(r => ({
        week: r.week,
        emails: r.form.supportEmails,
        features: r.form.newFeatures,
        fixes: r.form.codeFixes,
        defects: r.form.defectsLastWeek
      }))

      const statsPrompt = `
Generate a professional weekly QA executive summary for project "${data.projectName}".
Compare current week's performance against the last 5 saved reports in our database.
Historical summary records: ${JSON.stringify(prevSummaries)}
Current week metrics:
- Week Start: ${data.weekStart}, End: ${data.weekEnd}
- Support Emails: ${data.supportEmails}
- New Features: ${data.newFeatures}
- Code Fixes: ${data.codeFixes}
- Defects Raised: ${JSON.stringify(data.defectsLastWeek)}
- Release Testing Items pass rate: ${data.releaseItems.filter(r => r?.status === 'Pass').length}/${data.releaseItems.length} passed.

Write a custom dynamic executive review indicating actual trends (e.g. increase or decrease of defect rates or ticket backlogs).
Return ONLY a valid JSON object matching this structure:
{
  "achievements": ["achievement 1 comparing previous weeks", "achievement 2", "achievement 3"],
  "risks": ["risk 1 based on backlog trends", "risk 2", "risk 3"],
  "trends": ["trend 1 with trend percentages", "trend 2", "trend 3"],
  "recommendations": ["recommendation 1 based on historical metrics", "recommendation 2", "recommendation 3"]
}
Do not return markdown wraps, only raw JSON text.
`
      const rawResponse = await AIService.callAI({
        prompt: statsPrompt,
        options: {
          module: 'qa-report',
          systemPrompt: 'You are an elite QA Director. Review the historical data and format a structured response as JSON.'
        }
      })
      const cleaned = rawResponse.replace(/^```[\w]*\n?|\n?```$/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (parsed.achievements && parsed.risks && parsed.trends) {
        setAiSummary(parsed)
        toast({ title: 'AI Refined!', description: 'Executive summary customized based on historical analysis.' })
      } else {
        throw new Error('Incomplete JSON schema returned')
      }
    } catch (e: any) {
      console.warn('AI summary generation failed. Using default.', String(e?.message ?? '').replace(/[\r\n]/g, ' '))
      toast({
        title: 'Refinement Offline',
        description: 'Using pre-calculated QA analytics summary.',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // ── Historical Progress Metrics (Sparkline arrays) ──
  const getHistoricalValues = (extractor: (f: QAReportForm) => number): number[] => {
    return activeHistory.slice(-5).map(h => extractor(h.form))
  }

  // ── Weekly Progress Timeline calculations ──
  const timelineData = data.customTimeline && data.customTimeline.length > 0
    ? data.customTimeline
    : activeHistory.slice(-5).map((h, i, arr) => {
      let emailChange = '➜'
      if (i > 0) {
        const prev = arr[i - 1].form.supportEmails
        const diff = h.form.supportEmails - prev
        if (diff > 0) emailChange = `▲ +${Math.round((diff / (prev || 1)) * 100)}%`
        else if (diff < 0) emailChange = `▼ ${Math.round((diff / (prev || 1)) * 100)}%`
      }

      return {
        id: h.id,
        week: h.week || `${h.form.weekStart} – ${h.form.weekEnd}`,
        emails: h.form.supportEmails,
        features: h.form.newFeatures,
        fixes: h.form.codeFixes,
        openDefects: h.form.defectsLastWeek.open,
        closedDefects: h.form.defectsLastWeek.closed,
        healthScore: calculateQAScore(h.form).score,
        emailChange,
        rawForm: h.form
      }
    })

  // ── Historical Analytics Charts Data ──
  // Mirrors Week-over-Week: Final reports only, so unsaved drafts never distort
  // the trend lines. A draft therefore does not appear in its own charts.
  const historicalChartsData = finalReportsOnly.map(h => {
    const passCount = h.form.releaseItems.filter((i: any) => isPassStatus(i?.status)).length
    const failCount = h.form.releaseItems.filter((i: any) => isFailStatus(i?.status)).length
    const blockedCount = h.form.releaseItems.filter((i: any) => isBlockedStatus(i?.status)).length

    return {
      name: h.week?.split('–')[0]?.trim() || h.form.weekStart,
      emails: h.form.supportEmails,
      features: h.form.newFeatures,
      fixes: h.form.codeFixes,
      reportedDefects: h.form.defectsLastWeek.reported,
      closedDefects: h.form.defectsLastWeek.closed,
      healthScore: calculateQAScore(h.form).score,
      escapedIssueProd: h.form.lastWeek.escapedIssue ?? (h.form.lastWeek as any).codeFix,
      supportFixProd: h.form.lastWeek.supportFix || 0,
      supportProd: h.form.lastWeek.support,
      changeRequestProd: h.form.lastWeek.changeRequest,
      dataIssueProd: h.form.lastWeek.dataIssue,
      backendUpdationProd: h.form.lastWeek.backendUpdation,
      teamSize: h.form.newFeatureTeam.length + h.form.supportTeam.length + h.form.automationTeam.length,
      passFeatures: passCount,
      failFeatures: failCount,
      blockedFeatures: blockedCount
    }
  })


  // ── Table Adapters ──
  const prodIssuesData = [
    { category: 'Escaped Issue', lastWeek: data.lastWeek.escapedIssue ?? (data.lastWeek as any).codeFix, mtd: data.monthToDate.escapedIssue ?? (data.monthToDate as any).codeFix },
    { category: 'Support', lastWeek: data.lastWeek.supportFix || 0, mtd: data.monthToDate.supportFix || 0 },
    { category: 'Change Request', lastWeek: data.lastWeek.changeRequest, mtd: data.monthToDate.changeRequest },
    { category: 'Data Issue', lastWeek: data.lastWeek.dataIssue, mtd: data.monthToDate.dataIssue },
    { category: 'Backend Update', lastWeek: data.lastWeek.backendUpdation, mtd: data.monthToDate.backendUpdation }
  ]

  // Work Distribution - using actual data from tables
  const supportTicketsCount = data.supportTickets?.length || 0
  const newFeaturesCount = data.releaseItems?.length || 0

  const workDistributionData = [
    { name: 'Support Tickets Fix', value: supportTicketsCount, hex: '#60a5fa' },
    { name: 'New Features', value: newFeaturesCount, hex: '#facc15' }
  ]

  // Use Release Bug Status data if available, otherwise fall back to manual entry
  const releaseBugMetrics = data.releaseBugStatus?.metrics
  const defectStatusData = releaseBugMetrics ? [
    { name: 'Active Defects', value: releaseBugMetrics.activeBugs, hex: '#f87171' },
    { name: 'Resolved (Ready for QA)', value: releaseBugMetrics.resolvedBugs, hex: '#fb923c' },
    { name: 'Closed', value: releaseBugMetrics.completedBugs, hex: '#10b981' },
    ...(releaseBugMetrics.deferredBugs > 0 ? [{ name: 'Deferred', value: releaseBugMetrics.deferredBugs, hex: '#eab308' }] : []),
    ...(releaseBugMetrics.invalidBugs > 0 ? [{ name: 'Invalid/Won\'t Fix', value: releaseBugMetrics.invalidBugs, hex: '#64748b' }] : [])
  ] : [
    { name: 'Open Defects', value: data.defectsLastWeek.open, hex: '#f87171' },
    { name: 'Fixed Defects', value: data.defectsLastWeek.fixed, hex: '#fb923c' },
    { name: 'Closed Defects', value: data.defectsLastWeek.closed, hex: '#10b981' }
  ]

  // ── Exports ──
  const exportFileBase = `${slugifyName(data.projectName || 'qa-report')}-${data.weekStart || 'report'}`

  const downloadMarkdown = () => {
    try {
      const md = buildReportMarkdown(data, reportMeta)
      downloadTextFile(`${exportFileBase}.md`, 'text/markdown', md)
      toast({ title: 'Markdown Exported', description: 'Full report downloaded as a Markdown file.' })
    } catch (err) {
      console.error('Markdown export failed:', err)
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not build the Markdown file. Please try again.',
      })
    }
  }

  const downloadHTML = () => {
    try {
      const html = buildReportHTML(data, reportMeta)
      downloadTextFile(`${exportFileBase}.html`, 'text/html', html)
      toast({ title: 'HTML Exported', description: 'Standalone report page downloaded — open it in any browser.' })
    } catch (err) {
      console.error('HTML export failed:', err)
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Could not build the HTML page. Please try again.',
      })
    }
  }

  /**
   * "Print to PDF" — a WYSIWYG print of the live dashboard.
   *
   * `qaly-print-live` on <html> switches off the global print reset in
   * index.css (which flattens the app to white paper with dark ink for ordinary
   * pages), so this dashboard's own print stylesheet governs and the PDF matches
   * what is on screen. The low-ink alternative is "Print Friendly Report".
   *
   * Also closes the export menu and any open modal first, since a modal overlay
   * would otherwise be captured in the output.
   */
  const runPrint = () => {
    setShowExportMenu(false)
    setShowDefectModal(false)
    setShowWorkDistributionModal(false)
    setShowProductionIssuesModal(false)
    setShowReleaseReadinessModal(false)
    setShowTeamCapacityModal(false)
    setShowQualityScoreModal(false)
    setShowReleaseScopeModal(false)
    setShowReleaseFeaturesModal(false)
    setShowCodeFixesModal(false)

    const PRINT_LIVE_CLASS = 'qaly-print-live'
    document.documentElement.classList.add(PRINT_LIVE_CLASS)

    let cleaned = false
    const cleanup = () => {
      if (cleaned) return
      cleaned = true
      document.documentElement.classList.remove(PRINT_LIVE_CLASS)
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    // Safety net for engines that never fire `afterprint`. Generous, because the
    // user may sit in the print dialog picking a destination for a while.
    window.setTimeout(cleanup, 120000)

    // Let React commit the closed menu/modals and the class land before printing.
    window.setTimeout(() => {
      try {
        window.print()
      } catch (err) {
        console.error('Print failed:', err)
        cleanup()
        toast({
          variant: 'destructive',
          title: 'Print Unavailable',
          description: 'Your browser blocked printing. Use the browser menu → Print instead.',
        })
      }
    }, 350)
  }

  // Keeps the on-screen colour treatment, on a white page with dark ink.
  const handlePrint = () => runPrint()

  /**
   * "Print Friendly Report" — opens the report as a clean, self-contained
   * light-ink document in a new tab, matching the "Print-Friendly View" pattern
   * used by /daily-report. The user can read it, print it, or save it as PDF
   * from there; nothing about the live dashboard is altered.
   */
  const handlePrintFriendly = () => {
    setShowExportMenu(false)

    let printWindow: Window | null = null
    try {
      printWindow = window.open('', '_blank')
    } catch (err) {
      console.error('Print-friendly window blocked:', err)
    }

    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Popup Blocked',
        description: 'Allow popups for this site to open the print-friendly report, or use Export → HTML Page.',
      })
      return
    }

    try {
      printWindow.document.write(buildReportHTML(data, reportMeta))
      printWindow.document.close()
      printWindow.focus()
      toast({
        title: 'Print-Friendly Report Ready',
        description: 'Opened in a new tab — use the Print button there to print or save as PDF.',
      })
    } catch (err) {
      console.error('Print-friendly render failed:', err)
      try { printWindow.close() } catch { /* already gone */ }
      toast({
        variant: 'destructive',
        title: 'Could Not Open Report',
        description: 'Building the print-friendly view failed. Try Export → HTML Page instead.',
      })
    }
  }

  if (!isLoaded && !showLaunchTriage) {
    return <ReportSkeleton theme={theme} />
  }

  if (isLoaded && !data.weekStart) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 text-center font-montreal transition-colors duration-300 ${theme === 'dark' ? 'bg-[#070a13] text-white' : 'bg-[#f8fafc] text-slate-900'}`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-white/5' : 'bg-black/5'}`}>
          <FileText className="w-8 h-8 text-accent-gold" />
        </div>
        <h1 className="text-2xl font-bold font-clash mb-2">No Saved Report Found</h1>
        <p className={`text-sm max-w-sm mb-6 leading-relaxed ${theme === 'dark' ? 'text-white/45' : 'text-slate-500'}`}>
          Create or save a report to launch the Executive Dashboard.
        </p>
        <button onClick={() => window.close()} className="px-6 py-2.5 bg-accent-gold text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-colors">
          Go Back to Form
        </button>
      </div>
    )
  }

  return (
    <>
    {(!isLoaded || !data.weekStart) && showLaunchTriage && (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-[#070a13]' : 'bg-[#f8fafc]'}`} />
    )}
    {isLoaded && !!data.weekStart && (
    <>
    {/*
      Reveal uses opacity/translate only — avoid filter/scale on this root.
      Those create a containing block that breaks position:fixed modals
      (Release Scope, Defect Status, etc.) and their entrance animations.
    */}
    <motion.div
      className={`qaly-report-root min-h-screen ${tS.font} ${tS.bg} transition-colors duration-300 relative overflow-hidden pb-20 print:overflow-visible`}
      initial={launchedFromForm ? { opacity: 0, y: 12 } : false}
      animate={
        dashboardRevealed
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 8 }
      }
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* ── React Confetti "Popper" Layer ── */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden" style={{ perspective: 600 }}>
          {confetti.map((c, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: c.width,
                height: c.height,
                background: c.color,
                borderRadius: c.shape === 'circle' ? '50%' : 1,
                opacity: c.delay > 0 ? 0 : c.opacity,
                boxShadow: `0 0 3px ${c.color}55`,
                transformStyle: 'preserve-3d',
                transform: `translate3d(${c.x}px, ${c.y}px, 0) rotateX(${c.rotX}deg) rotateY(${c.rotY}deg) rotateZ(${c.rotZ}deg)`,
                willChange: 'transform, opacity'
              }}
            />
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCustomStyles(theme), { FORCE_BODY: true }) }} />

      {/* ── Immersive Background — breathing gradient aurora + mouse-parallax particle space ── */}
      <ImmersiveBackground theme={theme} enabled={enableParticles} paused={particlesPaused} />

      {/* ── Sticky Top Navigation — near-opaque to avoid blurring the animated backdrop while scrolling ── */}
      {!isPresentation && (
        <header className="sticky top-0 z-40 transition-colors duration-300 print:hidden">
          <div
            className="border-b py-3"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(9,9,11,0.94)' : 'rgba(255,255,255,0.96)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              boxShadow: theme === 'dark'
                ? '0 4px 20px rgba(0,0,0,0.35)'
                : '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* Same shell as page cards: max-w-[1600px] + px-4/sm:px-6 */}
            <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-4">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3 shrink-0">
                <Logo size="sm" animate={false} />
                <div className="hidden sm:block h-6 w-px" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <span className={`hidden sm:block text-[10px] uppercase font-bold tracking-[0.15em] ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                  Executive Report Hub
                </span>
              </div>

              {/* Section Navigator — flexible, scrolls horizontally so the whole bar stays on one line */}
              <div className="flex-1 min-w-0">
                <ReportNavigator theme={theme} items={reportNavItems} activeSection={activeSection} onNavigate={scrollToSection} />
              </div>

              <ReportActionBar
                theme={theme}
                onToggleTheme={toggleTheme}
                clientMode={clientMode}
                onToggleClientMode={() => {
                  const next = !clientMode
                  setClientMode(next)
                  localStorage.setItem('qaly-client-mode', String(next))
                  toast({
                    title: next ? 'Client Mode Active' : 'Client Mode Disabled',
                    description: next ? 'Confidential developer notes and internal bug metrics hidden.' : 'Restored full view.'
                  })
                }}
                onPresent={togglePresentation}
                showExportMenu={showExportMenu}
                onToggleExportMenu={() => setShowExportMenu(v => !v)}
                onPrint={() => { handlePrint(); setShowExportMenu(false) }}
                onPrintFriendly={handlePrintFriendly}
                onDownloadHTML={() => { downloadHTML(); setShowExportMenu(false) }}
                onDownloadMarkdown={() => { downloadMarkdown(); setShowExportMenu(false) }}
                onClose={() => window.close()}
              />
            </div>
          </div>
        </header>
      )}

      {/* ── Presentation Navigation Overlay ── */}
      {isPresentation && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-black/80 backdrop-blur border border-white/10 p-2 rounded-2xl shadow-2xl print:hidden">
          <button
            onClick={() => {
              const keys = Object.keys(sectionsRef)
              const currentIndex = keys.indexOf(activeSection)
              const prev = Math.max(currentIndex - 1, 0)
              scrollToSection(keys[prev])
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            ←
          </button>
          <span className="text-[10px] text-white/50 uppercase font-black px-1 font-mono">{activeSection}</span>
          <button
            onClick={() => {
              const keys = Object.keys(sectionsRef)
              const currentIndex = keys.indexOf(activeSection)
              const next = Math.min(currentIndex + 1, keys.length - 1)
              scrollToSection(keys[next])
            }}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            →
          </button>
          <button
            onClick={togglePresentation}
            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors ml-2"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 relative z-10 pt-6 sm:pt-8 flex flex-col gap-10 sm:gap-12"
      >

        {/* ══════════════════════════════════════════════════════════
            EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════ */}

        {/* ── SECTION 1: HERO & KPI CARDS ── */}
        <div className="w-full" style={{ display: vis.show_hero === false ? 'none' : undefined }}>
          <ReportHero
            sectionRef={sectionsRef.overview}
            visible={true}
            sectionVariants={sectionVariants}
            theme={theme}
            projectName={data.projectName}
            reportTitle={data.reportTitle}
            subtitle={data.subtitle}
            weekStart={data.weekStart}
            weekEnd={data.weekEnd}
            reportMeta={reportMeta}
            supportEmails={data.supportEmails}
            newFeatures={data.newFeatures}
            codeFixes={data.codeFixes}
            qualityStats={qualityStats}
            CountUpNumber={CountUpNumber}
            onOpenQualityModal={() => setShowQualityScoreModal(true)}
            onScrollNext={() => scrollToSection('kpis')}
            onNavigateToSection={scrollToSection}
            onOpenProductionIssuesModal={() => setShowProductionIssuesModal(true)}
            onOpenReleaseFeaturesModal={() => setShowReleaseFeaturesModal(true)}
            onOpenCodeFixesModal={() => setShowCodeFixesModal(true)}
            showQualityScore={vis.show_qualityScore !== false}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            KPI OVERVIEW
        ══════════════════════════════════════════════════════════ */}

        {/* ── SECTION 2: KPI SCORECARDS ── */}
        <motion.section
          variants={sectionVariants}
          ref={sectionsRef.kpis}
          className="flex flex-col gap-5"
          style={{ display: vis.show_kpiCards === false ? 'none' : undefined }}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Key Performance Indicators</h2>
          </div>

          {(() => {
            // Calculate KPIs from Release Bug Status, Release Testing Status, and Support & Exception Log
            // Use the same status matchers as hero Release Pass Rate / Release table (Pass/Passed/Completed/Success).
            const releaseBugMetrics = data.releaseBugStatus?.metrics
            const releaseTestingPassed = data.releaseItems?.filter(i => isPassStatus(i?.status)).length || 0
            const releaseTestingFailed = data.releaseItems?.filter(i => isFailStatus(i?.status)).length || 0
            const releaseTestingBlocked = data.releaseItems?.filter(i => isBlockedStatus(i?.status)).length || 0
            const releaseTestingInProgress = data.releaseItems?.filter(i => isInProgressStatus(i?.status)).length || 0
            const releaseTestingTotal = data.releaseItems?.length || 0
            const supportTicketsTotal = data.supportTickets?.length || 0
            const supportHigh = data.supportTickets?.filter(t => {
              const p = String(t?.priority || '').toLowerCase()
              return p === 'high' || p === 'critical'
            }).length || 0
            const supportResolved = data.supportTickets?.filter(t => isResolvedSupportStatus(t?.status)).length || 0

            // Prepare KPI metrics with categories for Executive KPI Section
            const kpiMetrics = [
              // PRIMARY METRICS (Always Visible - Top Priority)
              {
                label: 'Release Testing Progress',
                val: releaseTestingTotal > 0 ? Math.round((releaseTestingPassed / releaseTestingTotal) * 100) : 0,
                suffix: '%',
                icon: Star,
                color: 'text-accent-gold',
                desc: `${releaseTestingPassed}/${releaseTestingTotal} features validated`,
                sparklineData: getHistoricalValues(f => {
                  const total = f.releaseItems?.length || 0
                  const passed = f.releaseItems?.filter((i: any) => isPassStatus(i?.status)).length || 0
                  return total > 0 ? Math.round((passed / total) * 100) : 0
                }),
                tooltip: 'Are we ready to release? • Target: 90%+',
                category: 'primary' as const
              },
              {
                label: 'Open Bugs',
                val: openBugsCount,
                icon: AlertTriangle,
                color: 'text-red-400',
                desc: releaseBugMetrics ? `${releaseBugMetrics.totalBugs} total bugs` : 'Unresolved defects',
                sparklineData: getHistoricalValues(openBugsOf),
                pulse: openBugsCount > 5,
                tooltip: 'What unresolved product risk exists?',
                category: 'primary' as const
              },
              {
                label: 'Support Tickets',
                val: supportTicketsTotal,
                icon: Mail,
                color: 'text-blue-400',
                desc: `${supportResolved} resolved`,
                sparklineData: getHistoricalValues(f => f.supportTickets?.length || 0),
                tooltip: 'Is production/customer support under control?',
                category: 'primary' as const
              },

              // RELEASE HEALTH CATEGORY
              ...(releaseBugMetrics ? [
                {
                  label: 'Total Bugs',
                  val: releaseBugMetrics.totalBugs,
                  icon: AlertTriangle,
                  color: 'text-blue-400',
                  desc: 'Release bug count',
                  sparklineData: getHistoricalValues(f => f.releaseBugStatus?.metrics?.totalBugs || 0),
                  tooltip: 'All tracked bugs for this release',
                  category: 'releaseHealth' as const
                },
                {
                  label: 'Closed Bugs',
                  val: releaseBugMetrics.completedBugs,
                  icon: CheckCheck,
                  color: 'text-green-400',
                  desc: 'Bugs verified and closed',
                  sparklineData: getHistoricalValues(f => f.releaseBugStatus?.metrics?.completedBugs || 0),
                  tooltip: 'Completed bugs means the bugs are tested and closed',
                  category: 'releaseHealth' as const
                },
                {
                  label: 'Bug Closure Rate',
                  val: Math.round(releaseBugMetrics.closurePercentage * 100) / 100,
                  suffix: '%',
                  icon: TrendingUp,
                  color: 'text-accent-gold',
                  desc: 'Bug resolution efficiency',
                  sparklineData: getHistoricalValues(f => Math.round((f.releaseBugStatus?.metrics?.closurePercentage || 0) * 100) / 100),
                  tooltip: 'Resolution efficiency • Higher is better',
                  category: 'releaseHealth' as const
                }
              ] : []),

              // TESTING QUALITY CATEGORY
              {
                label: 'Tests Passed',
                val: releaseTestingPassed,
                icon: Check,
                color: 'text-green-400',
                desc: 'Release tests passed',
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => isPassStatus(i?.status)).length || 0),
                tooltip: 'Successfully validated test cases',
                category: 'testingQuality' as const
              },
              {
                label: 'Testing In Progress',
                val: releaseTestingInProgress,
                icon: RefreshCw,
                color: 'text-blue-400',
                desc: 'From Release Testing Status · In Progress',
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => isInProgressStatus(i?.status)).length || 0),
                tooltip: 'Release items currently being tested',
                category: 'testingQuality' as const
              },
              {
                label: 'Tests Failed',
                val: releaseTestingFailed,
                icon: X,
                color: 'text-red-400',
                desc: 'Release tests failed',
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => isFailStatus(i?.status)).length || 0),
                pulse: releaseTestingFailed > 3,
                tooltip: 'Tests requiring fixes before release',
                category: 'testingQuality' as const
              },
              {
                label: 'Tests Blocked',
                val: releaseTestingBlocked,
                icon: Shield,
                color: 'text-orange-400',
                desc: 'Release tests blocked',
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => isBlockedStatus(i?.status)).length || 0),
                tooltip: 'Blocked by dependencies or environment',
                category: 'testingQuality' as const
              },

              // SUPPORT OPERATIONS CATEGORY
              {
                label: 'Total Support Tickets',
                val: supportTicketsTotal,
                icon: Mail,
                color: 'text-blue-400',
                desc: 'All tickets from Support Log',
                sparklineData: getHistoricalValues(f => f.supportTickets?.length || 0),
                tooltip: 'Total support tickets logged',
                category: 'supportOps' as const
              },
              {
                label: 'Resolved Tickets',
                val: supportResolved,
                icon: CheckCheck,
                color: 'text-green-400',
                desc: 'From Support & Exception Log · Status',
                sparklineData: getHistoricalValues(f => f.supportTickets?.filter((t: any) => isResolvedSupportStatus(t?.status)).length || 0),
                tooltip: 'Tickets whose Status is Resolved, Closed, or an equivalent done/pass state',
                category: 'supportOps' as const
              },

              // TEAM & RESOURCES CATEGORY
              {
                label: 'Team Size',
                val: data.newFeatureTeam.length + data.supportTeam.length + data.automationTeam.length,
                icon: Users,
                color: 'text-teal-400',
                desc: 'Active QA team members',
                sparklineData: getHistoricalValues(f => f.newFeatureTeam.length + f.supportTeam.length + f.automationTeam.length),
                isInternal: true,
                tooltip: 'Active QA engineers across all teams',
                category: 'teamResources' as const
              }
            ]

            // Render using new Executive KPI Section component
            return (
              <ExecutiveKPISection
                kpiMetrics={kpiMetrics.filter(kpi => !clientMode || !kpi.isInternal)}
                expandedCategories={expandedKPICategories}
                onToggleCategory={toggleKPICategory}
                hoveredKPI={hoveredKPI}
                onHoverKPI={setHoveredKPI}
                theme={theme}
                CountUpNumber={CountUpNumber}
                MiniSparkline={MiniSparkline}
              />
            )
          })()}
        </motion.section>

        {/* ══════════════════════════════════════════════════════════
            SPRINT HEALTH
        ══════════════════════════════════════════════════════════ */}

        {/* ── SECTION 3: SPRINT HEALTH & RELEASE READINESS ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          style={{ display: vis.show_sprintHealth === false && vis.show_releaseReadiness === false ? 'none' : undefined }}
        >
          {/* ── Sprint Health Dashboard ── */}
          <div ref={sectionsRef.sprintHealth} style={{ display: vis.show_sprintHealth === false ? 'none' : undefined }} className={`p-6 rounded-[28px] border flex flex-col gap-4 relative overflow-hidden transition-all duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)]' : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/60 shadow-md'} ${vis.show_releaseReadiness === false ? 'lg:col-span-2' : ''}`}>
            <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-black tracking-widest block">Sprint Validation Status</span>
                <h3 className="text-xl font-extrabold font-clash mt-1">Sprint Status Overview</h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${sprintHealthScore >= 90 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                sprintHealthScore >= 70 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                {sprintHealthScore}% Healthy
              </span>
            </div>

            {/* Health Progress Bar */}
            <div className="flex flex-col gap-1.5 mt-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-text-muted">Sprint Progress</span>
                <span className={sprintHealthScore >= 90 ? 'text-green-400' : sprintHealthScore >= 70 ? 'text-amber-500' : 'text-red-400'}>
                  {sprintHealthScore}% Passed
                </span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden border relative ${theme === 'dark' ? 'bg-white/5 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                <motion.div
                  initial={{ width: hasPlayed ? `${sprintHealthScore}%` : 0 }}
                  animate={{ width: `${sprintHealthScore}%` }}
                  transition={{ duration: hasPlayed ? 0 : 1.2, ease: 'easeOut' }}
                  onAnimationComplete={() => setIsHealthBarFilled(true)}
                  className={`h-full rounded-full relative overflow-hidden ${sprintHealthScore >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    sprintHealthScore >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                      'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
                  style={{
                    boxShadow: `0 0 ${theme === 'dark' ? 10 : 5}px ${sprintHealthScore >= 90 ? 'rgba(16,185,129,' : sprintHealthScore >= 70 ? 'rgba(245,158,11,' : 'rgba(239,68,68,'}${theme === 'dark' ? 0.45 : 0.2})`
                  }}
                >
                  {!isHealthBarFilled && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.0, ease: 'linear' }}
                    />
                  )}
                </motion.div>
              </div>
            </div>

            {/* Sprint Status Cards Grid */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: 'Passed', val: passedCases, color: theme === 'dark' ? 'text-green-400 bg-green-500/5' : 'text-green-600 bg-green-50' },
                { label: 'Failed', val: failedCases, color: theme === 'dark' ? 'text-red-400 bg-red-500/5' : 'text-red-600 bg-red-50' },
                { label: 'Blocked', val: blockedCases, color: theme === 'dark' ? 'text-orange-400 bg-orange-500/5' : 'text-orange-600 bg-orange-50' },
                { label: 'Pending', val: pendingCases, color: theme === 'dark' ? 'text-yellow-400 bg-yellow-500/5' : 'text-amber-600 bg-amber-50' },
                { label: 'Not Executed', val: notExecutedCases, color: theme === 'dark' ? 'text-white/45 bg-white/5' : 'text-slate-500 bg-slate-100' },
                { label: 'In Progress', val: inProgressCases, color: theme === 'dark' ? 'text-blue-400 bg-blue-500/5' : 'text-blue-600 bg-blue-50' }
              ].map(item => (
                <div key={item.label} className={`p-3 rounded-2xl border ${tS.border} ${item.color} flex flex-col justify-between`}>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
                  <span className="text-lg font-black mt-1">
                    <CountUpNumber end={item.val} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Release Readiness Meter (Radial Gauge) - Interactive Modal */}
          <div
            onClick={() => setShowReleaseReadinessModal(true)}
            style={{ display: vis.show_releaseReadiness === false ? 'none' : undefined }}
            className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 cursor-pointer group relative overflow-hidden ${tS.card} ${tS.border} ${tS.glow} transition-all duration-300 hover:border-green-500/30 ${vis.show_sprintHealth === false ? 'lg:col-span-2' : ''}`}>
            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Click Indicator */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
                <span className="text-[9px] font-bold text-accent-gold uppercase tracking-wider">Click to Expand</span>
                <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
            </div>

            <div className="flex flex-col gap-1 relative z-10">
              <span className="text-[10px] text-text-muted uppercase font-black tracking-widest block">Deployment Approval Index</span>
              <h3 className="text-xl font-extrabold font-clash">Release Readiness Meter</h3>
            </div>

            <div className="flex items-center justify-center gap-8 py-3 flex-wrap">
              {/* Radial Meter Gauge SVG */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="72"
                    cy="72"
                    r="60"
                    stroke={
                      releaseReadinessScore >= 85 ? '#10b981' :
                        releaseReadinessScore >= 70 ? '#f59e0b' :
                          '#ef4444'
                    }
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 60}
                    initial={{ strokeDashoffset: 2 * Math.PI * 60 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - releaseReadinessScore / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 ${theme === 'dark' ? 5 : 3}px ${releaseReadinessScore >= 85 ? 'rgba(16,185,129,' : releaseReadinessScore >= 70 ? 'rgba(245,158,11,' : 'rgba(239,68,68,'}${theme === 'dark' ? 0.5 : 0.25})`
                    }}
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {releaseReadinessScore}%
                  </span>
                  <span className="text-[9px] uppercase font-bold text-text-muted tracking-wider">Ready</span>
                </div>
              </div>

              {/* Score breakdown metrics list */}
              <div className="flex-1 flex flex-col gap-2.5 min-w-[150px]">
                <div className="flex items-center justify-between text-xs border-b border-divider pb-1">
                  <span className="text-text-muted">Release Pass Rate</span>
                  <span className="font-bold">{totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 100}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Open Bugs</span>
                  <span className={`font-bold ${openBugsCount > 0 ? 'text-red-400' : ''}`}>{openBugsCount}</span>
                </div>

                <div className={`mt-3 p-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${releaseReadinessScore >= 85 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  releaseReadinessScore >= 70 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  {releaseReadinessScore >= 85 ? '🟢 Ready for Production' : releaseReadinessScore >= 70 ? '🟡 Needs Attention' : '🔴 Not Ready'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════════════════
            RELEASE TESTING STATUS
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 4: RELEASE TESTING TABLE ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.releaseTesting}
          className="flex flex-col gap-5"
          style={{ display: vis.show_releaseTable === false ? 'none' : undefined }}
        >
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Release Testing Status</h2>
          </div>
          <ReportTableShell theme={theme}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={reportTableHeadClass(theme)}>
                  {releasePreviewColumns.map(col => (
                    <th key={col.id} className={`py-3.5 px-5 ${col.id === 'status' || col.id === 'priority' ? 'text-center' : ''}`}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.releaseItems.map((item, idx) => {
                  const visibleColumnsList = releasePreviewColumns
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={reportTableRowClass(theme, idx)}
                    >
                      {visibleColumnsList.map(col => {
                        if (col.kind === 'custom') {
                          return <td key={col.id} className={`py-3.5 px-5 text-text-secondary ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>{item.customFields?.[col.id] ?? ''}</td>
                        }
                        if (col.id === 'taskId') {
                          return <td key={col.id} className="py-3.5 px-5 font-mono font-bold text-accent-gold">{item.taskId}</td>
                        }
                        if (col.id === 'featureName') {
                          return <td key={col.id} className={`py-3.5 px-5 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{item.featureName}</td>
                        }
                        if (col.id === 'assignee') {
                          return <td key={col.id} className="py-3.5 px-5 text-text-secondary">{item.assignee}</td>
                        }
                        if (col.id === 'status') {
                          return (
                            <td key={col.id} className="py-3.5 px-5 text-center">
                              <StatusBadge status={item.status} theme={theme} />
                            </td>
                          )
                        }
                        if (col.id === 'priority') {
                          return (
                            <td key={col.id} className="py-3.5 px-5 text-center">
                              <span className={`text-[10px] font-bold ${item.priority === 'Critical' ? 'text-red-400' : item.priority === 'High' ? 'text-orange-400' : 'text-text-muted'}`}>{item.priority}</span>
                            </td>
                          )
                        }
                        if (col.id === 'remarks') {
                          return <td key={col.id} className={`py-3.5 px-5 text-text-secondary ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>{item.remarks}</td>
                        }
                        return null
                      })}
                    </motion.tr>
                  )
                })}
                {data.releaseItems.length === 0 && (
                  <tr><td colSpan={Math.max(1, releasePreviewColumns.length)} className="py-10 text-center text-xs text-text-muted">No release testing items configured yet.</td></tr>
                )}
              </tbody>
            </table>
          </ReportTableShell>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            RELEASE BUG STATUS (from uploaded Excel)
        ════════════════════════════════════════════════════════════ */}

        {data.releaseBugStatus && vis.show_releaseBugStatus !== false && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            ref={sectionsRef.releaseBugStatus}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Release Bug Status</h2>
            </div>

            {/* Release Health */}
            <div className={`flex items-center gap-4 p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-3xl">{data.releaseBugStatus.releaseHealth.emoji}</span>
              <div>
                <span className={`text-lg font-extrabold ${data.releaseBugStatus.releaseHealth.color}`}>{data.releaseBugStatus.releaseHealth.label}</span>
                <span className={`text-xs block ${theme === 'dark' ? 'text-white/50' : 'text-slate-500'}`}>Health Score: {data.releaseBugStatus.releaseHealth.score}% · {data.releaseBugStatus.metrics.totalBugs} Total Defects</span>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { label: 'Total Bugs', val: data.releaseBugStatus.metrics.totalBugs, color: 'text-blue-400' },
                { label: 'Closed', val: data.releaseBugStatus.metrics.completedBugs, color: 'text-green-400' },
                { label: 'Fixed', val: data.releaseBugStatus.metrics.resolvedBugs, color: 'text-emerald-400' },
                { label: 'Open', val: data.releaseBugStatus.metrics.totalBugs - data.releaseBugStatus.metrics.completedBugs, color: 'text-red-400' },
                { label: 'Closure %', val: `${data.releaseBugStatus.metrics.closurePercentage.toFixed(1)}%`, color: 'text-accent-gold' },
              ].map(kpi => (
                <div key={kpi.label} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted block">{kpi.label}</span>
                  <span className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</span>
                </div>
              ))}
            </div>

            {/* Status Distribution — ranked progress bars */}
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <RankedProgressList
                theme={theme}
                hasPlayed={hasPlayed}
                items={data.releaseBugStatus.statusDistribution.map((row: any, idx: number) => ({
                  label: row.status,
                  count: row.count,
                  percent: data.releaseBugStatus.metrics.totalBugs > 0 ? (row.count / data.releaseBugStatus.metrics.totalBugs) * 100 : 0,
                  colorClass: bugStatusColorClass(row.status, idx)
                }))}
              />
            </div>

            {/* AI Summary */}
            <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-accent-gold" />
                <span className="text-xs font-black uppercase tracking-widest text-accent-gold">Bug Analysis Summary</span>
              </div>
              <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                {data.releaseBugStatus.aiSummary}
              </p>
            </div>
          </motion.section>
        )}

        {/* ════════════════════════════════════════════════════════════
            SUPPORT & EXCEPTION LOG
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 5: SUPPORT LOG TABLE ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.supportLog}
          className="flex flex-col gap-5"
          style={{ display: vis.show_supportLog === false ? 'none' : undefined }}
        >
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Support & Exception Log</h2>
          </div>
          <ReportTableShell theme={theme}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={reportTableHeadClass(theme)}>
                  {supportPreviewColumns.map(col => (
                    <th key={col.id} className="py-3.5 px-5">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.supportTickets.map((ticket, idx) => {
                  const visibleColumnsList = supportPreviewColumns
                  return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={reportTableRowClass(theme, idx)}
                    >
                      {visibleColumnsList.map(col => {
                        if (col.kind === 'custom') {
                          return <td key={col.id} className={`py-3.5 px-5 text-text-secondary ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>{ticket.customFields?.[col.id] ?? ''}</td>
                        }
                        if (col.id === 'taskId') {
                          return <td key={col.id} className="py-3.5 px-5 font-mono font-bold text-blue-400">{ticket.taskId}</td>
                        }
                        if (col.id === 'description') {
                          return <td key={col.id} className={`py-3.5 px-5 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{ticket.description}</td>
                        }
                        if (col.id === 'assignedQA') {
                          return <td key={col.id} className="py-3.5 px-5 text-text-secondary">{ticket.assignedQA}</td>
                        }
                        if (col.id === 'status') {
                          return (
                            <td key={col.id} className="py-3.5 px-5 text-center">
                              <StatusBadge status={ticket.status} theme={theme} />
                            </td>
                          )
                        }
                        if (col.id === 'priority') {
                          return (
                            <td key={col.id} className="py-3.5 px-5 text-center">
                              <span className={`text-[10px] font-bold ${ticket.priority === 'Critical' ? 'text-red-400' : ticket.priority === 'High' ? 'text-orange-400' : 'text-text-muted'}`}>{ticket.priority}</span>
                            </td>
                          )
                        }
                        if (col.id === 'remarks') {
                          return <td key={col.id} className={`py-3.5 px-5 text-text-secondary ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>{ticket.remarks}</td>
                        }
                        return null
                      })}
                    </motion.tr>
                  )
                })}
                {data.supportTickets.length === 0 && (
                  <tr><td colSpan={Math.max(1, supportPreviewColumns.length)} className="py-10 text-center text-xs text-text-muted">No support tickets logged yet.</td></tr>
                )}
              </tbody>
            </table>
          </ReportTableShell>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            DEFECTS ANALYSIS (Manual Entry Only)
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 6: DEFECTS ANALYSIS (Only shown if manual defect data entered) ── */}
        {vis.show_defectAnalysis !== false && (() => {
          // Check if any manual defect data has been entered
          const hasLastWeekData = data.defectsLastWeek.reported > 0 || data.defectsLastWeek.open > 0 || data.defectsLastWeek.fixed > 0 || data.defectsLastWeek.closed > 0
          const hasMTDData = data.defectsMTD.reported > 0 || data.defectsMTD.open > 0 || data.defectsMTD.fixed > 0 || data.defectsMTD.closed > 0

          return hasLastWeekData || hasMTDData
        })() && (
            <motion.section
              variants={sectionVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-80px" }}
              ref={sectionsRef.defects}
              className="flex flex-col gap-5"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-gold" />
                <h2 className="text-2xl font-extrabold font-clash">Defects Analysis</h2>
                <span className="px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Manual Entry
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'Last Week', d: data.defectsLastWeek },
                  { title: 'Month to Date', d: data.defectsMTD }
                ].map(({ title, d }) => (
                  <div key={title} className={`p-6 rounded-2xl border flex flex-col gap-4 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold">{title}</span>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Reported', val: d.reported, color: theme === 'dark' ? 'text-white' : 'text-slate-800' },
                        { label: 'Open', val: d.open, color: theme === 'dark' ? 'text-red-400' : 'text-red-600' },
                        { label: 'Fixed', val: d.fixed, color: theme === 'dark' ? 'text-yellow-400' : 'text-amber-600' },
                        { label: 'Closed', val: d.closed, color: theme === 'dark' ? 'text-green-400' : 'text-green-600' }
                      ].map(item => (
                        <div key={item.label} className={`p-3 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'} flex flex-col gap-1`}>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-text-muted">{item.label}</span>
                          <span className={`text-2xl font-black ${item.color}`}><CountUpNumber end={item.val} /></span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-divider">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">Closure Rate</span>
                        <span className="font-bold text-green-400">{d.reported ? Math.round((d.closed / d.reported) * 100) : 0}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-100'}`}>
                        <motion.div
                          initial={{ width: hasPlayed ? `${d.reported ? Math.round((d.closed / d.reported) * 100) : 0}%` : 0 }}
                          animate={{ width: `${d.reported ? Math.round((d.closed / d.reported) * 100) : 0}%` }}
                          transition={{ duration: hasPlayed ? 0 : 0.8, ease: 'easeOut' }}
                          className="h-full bg-green-400 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Note about manual entry */}
              <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-400 mb-1">Manual Defect Entry</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                      This section displays manually entered defect data. For automated bug tracking from uploaded files, use the Release Bug Status feature.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}


        {/* ── HISTORICAL DEFECT OPTIMIZATION ── */}
        {vis.show_historicalDefectOptimization !== false && data.historicalDefectOptimization?.executiveSummary && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Historical Defect Optimization</h2>
            </div>

            <div className={`p-6 rounded-2xl border flex flex-col gap-6 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              {/* Input Values */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-red-400 block mb-2">Previous Count</span>
                  <span className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    <CountUpNumber end={data.historicalDefectOptimization.previousFixedBugCount} />
                  </span>
                </div>
                <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-green-400 block mb-2">Latest Count</span>
                  <span className={`text-3xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    <CountUpNumber end={data.historicalDefectOptimization.latestFixedBugCount} />
                  </span>
                </div>
                {data.historicalDefectOptimization.trackingSince && (
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-slate-100 bg-slate-50'}`}>
                    <span className="text-[9px] uppercase font-bold tracking-wider text-blue-400 block mb-2">Tracking Since</span>
                    <span className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {new Date(data.historicalDefectOptimization.trackingSince).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                )}
              </div>

              {/* Calculated Results */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-gradient-to-br from-green-500/5 to-emerald-500/5' : 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">Reduced Bugs</span>
                    {data.historicalDefectOptimization.reducedBugs! >= 0 ? (
                      <TrendingDown className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingUp className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <span className={`text-4xl font-black ${data.historicalDefectOptimization.reducedBugs! >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.historicalDefectOptimization.reducedBugs! >= 0 ? '' : '+'}
                    <CountUpNumber end={Math.abs(data.historicalDefectOptimization.reducedBugs!)} />
                  </span>
                </div>

                <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'border-white/5 bg-gradient-to-br from-green-500/5 to-emerald-500/5' : 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-green-400">Improvement</span>
                    {data.historicalDefectOptimization.improvementPercentage! >= 0 ? (
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    ) : (
                      <TrendingDown className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  <span className={`text-4xl font-black ${data.historicalDefectOptimization.improvementPercentage! >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <CountUpNumber end={Math.abs(data.historicalDefectOptimization.improvementPercentage!)} decimals={1} />%
                  </span>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Progress</span>
                  <span className="font-bold text-accent-gold">
                    <CountUpNumber end={Math.abs(data.historicalDefectOptimization.improvementPercentage!)} decimals={1} />%
                  </span>
                </div>
                <div className={`h-4 rounded-full overflow-hidden border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  <motion.div
                    initial={{ width: hasPlayed ? `${Math.min(Math.abs(data.historicalDefectOptimization.improvementPercentage!), 100)}%` : 0 }}
                    animate={{ width: `${Math.min(Math.abs(data.historicalDefectOptimization.improvementPercentage!), 100)}%` }}
                    transition={{ duration: hasPlayed ? 0 : 1.2, ease: 'easeOut' }}
                    className={`h-full rounded-full ${data.historicalDefectOptimization.improvementPercentage! >= 0 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                    style={{
                      boxShadow: data.historicalDefectOptimization.improvementPercentage! >= 0
                        ? '0 0 10px rgba(34, 197, 94, 0.5)'
                        : '0 0 10px rgba(239, 68, 68, 0.5)'
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Executive Summary */}
              <div className={`p-5 rounded-xl border ${theme === 'dark' ? 'bg-accent-gold/5 border-accent-gold/20' : 'bg-amber-50 border-amber-200'}`}>
                <h4 className={`text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${theme === 'dark' ? 'text-accent-gold' : 'text-amber-600'}`}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Executive Summary
                </h4>
                <p className={`text-base leading-relaxed font-medium ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  {data.historicalDefectOptimization.executiveSummary}
                </p>
              </div>
            </div>
          </motion.section>
        )}


        {/* ════════════════════════════════════════════════════════════
            HISTORICAL COMPARISON
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 9: WoW COMPARISON ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.comparison}
          className="flex flex-col gap-5"
          style={{ display: vis.show_wowComparison === false ? 'none' : undefined }}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Week-over-Week KPI Comparison</h2>
            </div>
            {activeHistory.length >= 2 && (
              <button
                onClick={() => setCompareMode(v => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${compareMode ? 'bg-accent-gold text-black border-accent-gold' : theme === 'dark' ? 'bg-white/5 border-white/10 text-text-secondary hover:text-white' : 'bg-black/[0.03] border-slate-200 text-text-secondary hover:text-slate-900'}`}
                disabled={finalReportsOnly.length < 2}
                title={finalReportsOnly.length < 2 ? 'Need at least 2 Final reports to compare' : undefined}
              >
                <GitCompare className="w-4 h-4" />
                {compareMode ? 'Show WoW Cards' : 'Compare Final Reports'}
              </button>
            )}
          </div>

          {compareMode ? (
            <div className={`p-6 rounded-3xl border flex flex-col gap-6 ${tS.card} ${tS.border} ${tS.glow}`}>
              <div className={`flex items-center justify-between flex-wrap gap-4 border-b pb-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
                <div>
                  <h3 className="text-lg font-bold font-clash">Snapshot Comparison Mode</h3>
                  <p className="text-xs text-text-muted">Select any two saved reports to see differences side-by-side.</p>
                </div>

                  <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-text-muted">Report A (Baseline)</span>
                    <select
                      value={compareReportA}
                      onChange={e => setCompareReportA(e.target.value)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none border ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                    >
                      <option value="">Choose Report A...</option>
                      {finalReportsOnly.map(r => (
                        <option key={r.id} value={r.id}>{(r.name || r.week || r.form.weekStart)} - {r.form.projectName}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-text-muted mt-4">vs</span>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-text-muted">Report B (Comparison)</span>
                    <select
                      value={compareReportB}
                      onChange={e => setCompareReportB(e.target.value)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none border ${theme === 'dark' ? 'bg-[#1a1a1a] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                    >
                      <option value="">Choose Report B...</option>
                      {finalReportsOnly.map(r => (
                        <option key={r.id} value={r.id}>{(r.name || r.week || r.form.weekStart)} - {r.form.projectName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Compare Results Display */}
              {(() => {
                const repA = finalReportsOnly.find(r => r.id === compareReportA)?.form
                const repB = finalReportsOnly.find(r => r.id === compareReportB)?.form

                if (!repA || !repB) {
                  return (
                    <div className={`p-8 text-center text-xs text-text-muted border border-dashed rounded-2xl ${theme === 'dark' ? 'border-white/10' : 'border-slate-300'}`}>
                      Select two reports from the dropdowns above to calculate snapshots.
                    </div>
                  )
                }

                const winner = getComparisonWinner(repA, repB)
                const biggestImp = getBiggestImprovement(repA, repB)

                const metricsCompare = [
                  { name: 'Support Tickets', valA: repA.supportEmails, valB: repB.supportEmails, type: 'lower' },
                  { name: 'Defects Reported', valA: repA.defectsLastWeek.reported, valB: repB.defectsLastWeek.reported, type: 'lower' },
                  { name: 'Open Defects', valA: repA.defectsLastWeek.open, valB: repB.defectsLastWeek.open, type: 'lower' },
                  { name: 'Features Completed', valA: repA.newFeatures, valB: repB.newFeatures, type: 'higher' },
                  { name: 'Testing Completed', valA: repA.releaseItems.length, valB: repB.releaseItems.length, type: 'higher' }
                ]

                return (
                  <div className="flex flex-col gap-6">
                    {/* Insights Summary Widgets */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/10 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-bold text-green-400 tracking-wider">Overall Winner</span>
                        <span className="text-sm font-extrabold mt-1 text-text-primary">{winner}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Biggest Improvement</span>
                        <span className="text-sm font-extrabold mt-1 text-text-primary">{biggestImp}</span>
                      </div>
                    </div>

                    {/* Comparison table grid */}
                    <ReportTableShell theme={theme}>
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className={reportTableHeadClass(theme)}>
                            <th className="p-4">Metric</th>
                            <th className="p-4">Report A (Baseline)</th>
                            <th className="p-4">Report B (Comparison)</th>
                            <th className="p-4">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricsCompare.map((m, idx) => {
                            const diff = m.valB - m.valA
                            const pct = m.valA !== 0 ? Math.round((diff / m.valA) * 100) : 0
                            const isLowerBetter = m.type === 'lower'

                            let isImproved = false
                            if (diff !== 0) {
                              isImproved = isLowerBetter ? diff < 0 : diff > 0
                            }

                            return (
                              <motion.tr
                                key={m.name}
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.04, duration: 0.3 }}
                                className={reportTableRowClass(theme, idx)}
                              >
                                <td className="p-4 font-bold text-text-primary">{m.name}</td>
                                <td className="p-4 text-text-secondary">{m.valA}</td>
                                <td className="p-4 text-text-primary font-extrabold">{m.valB}</td>
                                <td className="p-4">
                                  {diff === 0 ? (
                                    <span className="text-text-muted">▬ No Change</span>
                                  ) : (
                                    <span className={`font-bold px-2 py-0.5 rounded ${isImproved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {diff > 0 ? '▲' : '▼'} {Math.abs(pct)}% {isImproved ? 'Improved' : 'Worse'}
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </ReportTableShell>
                  </div>
                )
              })()}
            </div>
          ) : !prevReport ? (
            <div className={`p-8 rounded-2xl border text-center text-sm ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 text-white/50' : 'bg-white border-slate-200 text-slate-500'}`}>
              <p className="font-semibold text-accent-gold mb-1">No previous Final report available for comparison</p>
              <p className="text-xs">Save and finalize your reports to start tracking week-over-week performance changes. Draft reports are excluded from WoW comparisons.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparisons.map((card, idx) => {
                  const isImproved = card.trend === 'improved'
                  const isRegression = card.trend === 'regression'
                  const isNeutral = card.trend === 'neutral'

                  const badgeColor = isImproved
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : isRegression
                      ? 'bg-red-500/10 text-red-400 border-red-500/20'
                      : 'bg-amber-500/10 text-accent-gold border-accent-gold/20'

                  const glowColor = isImproved
                    ? 'shadow-[0_0_20px_rgba(74,222,128,0.05)] border-green-500/10'
                    : isRegression
                      ? 'shadow-[0_0_20px_rgba(248,113,113,0.05)] border-red-500/10'
                      : 'shadow-none border-white/5'

                  return (
                    <motion.div
                      key={card.name}
                      initial={{ opacity: 0, y: 15 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-6 rounded-2xl border flex flex-col justify-between gap-4 group transition-all duration-300 ${glowColor} ${theme === 'dark' ? 'bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:shadow-lg hover:border-slate-300'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-extrabold ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>{card.name}</span>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${badgeColor}`}>
                          {card.badgeText}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Last Week</span>
                          <span className={`text-xl font-bold ${theme === 'dark' ? 'text-white/60' : 'text-slate-500'}`}>
                            {card.lastVal}
                          </span>
                        </div>

                        <div className="flex flex-col items-center justify-center text-text-muted">
                          <span className="text-xs">↓</span>
                        </div>

                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">This Week</span>
                          <span className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                            <CountUpNumber end={card.thisVal} />
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>

              {/* WoW AI Insights Summary box */}
              <div className={`p-5 rounded-2xl border flex items-start gap-4 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="p-2 rounded-xl bg-accent-gold/10 text-accent-gold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold">WoW AI Summary</span>
                  <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>
                    {generateWowSummary(comparisons)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* ── SECTION 4: TEAM CAPACITY OVERVIEW ── */}
        {data.teamCapacity && vis.show_teamCapacity !== false && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Team Capacity Overview</h2>
            </div>

            <TeamCapacityDisplay data={data.teamCapacity} onOpenModal={() => setShowTeamCapacityModal(true)} />
          </motion.section>
        )}

        {/* ── SECTION 5: HISTORICAL ANALYTICS DASHBOARD ── */}
        {data.showHistoricalAnalytics !== false && vis.showHistoricalAnalytics !== false && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            ref={sectionsRef.historyDashboard}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-accent-gold" />
                <h2 className="text-2xl font-extrabold font-clash">Historical Analytics</h2>
              </div>
              <span
                title="Draft reports are excluded, so trends reflect finalised weeks only."
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-black/[0.03] border-slate-200 text-slate-500'}`}
              >
                Final reports only
                {draftReportCount > 0 && ` · ${draftReportCount} draft${draftReportCount === 1 ? '' : 's'} excluded`}
              </span>
            </div>

            {historicalChartsData.length < 2 ? (
              <div className={`p-8 rounded-2xl border text-center text-sm ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 text-white/50' : 'bg-white border-slate-200 text-slate-500'}`}>
                <p className="font-semibold text-accent-gold mb-1">Insufficient Historical Data</p>
                <p className="text-xs">At least 2 Final reports are required to calculate trend performance charts. Draft reports are excluded.</p>
                {draftReportCount > 0 && (
                  <p className="text-xs mt-1 text-accent-gold/70">
                    {draftReportCount} draft report{draftReportCount === 1 ? '' : 's'} not counted — mark them Final to include them.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Monthly KPI Trend (Line) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Monthly KPI Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" {...axisPreset()} />
                        <YAxis {...axisPreset()} />
                        <Tooltip content={<PremiumTooltip theme={theme} />} />
                        <Legend {...legendPreset} />
                        <Line type="monotone" dataKey="emails" name="Support Emails" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-elevated)' }} style={glowStyle('#3b82f6', theme)} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="features" name="Features Tested" stroke="#facc15" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-elevated)' }} style={glowStyle('#facc15', theme)} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="fixes" name="Code Fixes" stroke="#a855f7" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-elevated)' }} style={glowStyle('#a855f7', theme)} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 3. Production Issue Trend (Stacked Area) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Production Issue Categories Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <StackedAreaGradient id="prodTrendEscapedGrad" color="#d4af37" theme={theme} />
                          <StackedAreaGradient id="prodTrendSupportGrad" color="#eab308" theme={theme} />
                          <StackedAreaGradient id="prodTrendChangeGrad" color="#a855f7" theme={theme} />
                          <StackedAreaGradient id="prodTrendDataGrad" color="#f87171" theme={theme} />
                          <StackedAreaGradient id="prodTrendBackendGrad" color="#10b981" theme={theme} />
                        </defs>
                        <XAxis dataKey="name" {...axisPreset()} />
                        <YAxis {...axisPreset()} />
                        <Tooltip content={<PremiumTooltip theme={theme} />} />
                        <Legend {...legendPreset} />
                        <Area type="monotone" dataKey="escapedIssueProd" stackId="1" name="Escaped Issue" stroke="#d4af37" fill="url(#prodTrendEscapedGrad)" strokeWidth={2} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="supportFixProd" stackId="1" name="Support Fix" stroke="#eab308" fill="url(#prodTrendSupportGrad)" strokeWidth={2} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="changeRequestProd" stackId="1" name="Change Req" stroke="#a855f7" fill="url(#prodTrendChangeGrad)" strokeWidth={2} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="dataIssueProd" stackId="1" name="Data Issue" stroke="#f87171" fill="url(#prodTrendDataGrad)" strokeWidth={2} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="backendUpdationProd" stackId="1" name="Backend Update" stroke="#10b981" fill="url(#prodTrendBackendGrad)" strokeWidth={2} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 4. Support Ticket Volume (Line) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Weekly Support Ticket Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <GlowAreaGradient id="supportTicketGrad" color="#06b6d4" theme={theme} />
                        </defs>
                        <XAxis dataKey="name" {...axisPreset()} />
                        <YAxis {...axisPreset()} />
                        <Tooltip content={<PremiumTooltip theme={theme} />} />
                        <Legend {...legendPreset} />
                        <Area type="monotone" dataKey="emails" name="Support tickets" stroke="#06b6d4" fill="url(#supportTicketGrad)" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-elevated)' }} style={glowStyle('#06b6d4', theme)} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 5. QA Health Score & Team Size (Composed) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">QA Health vs Team Size Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <BarFillGradient id="teamSizeBarGrad" color="#d4af37" theme={theme} />
                        </defs>
                        <XAxis dataKey="name" {...axisPreset()} />
                        <YAxis {...axisPreset()} />
                        <Tooltip content={<PremiumTooltip theme={theme} />} />
                        <Legend {...legendPreset} />
                        <Bar dataKey="teamSize" name="Allocated Engineers" fill="url(#teamSizeBarGrad)" fillOpacity={0.25} radius={BAR_RADIUS} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="healthScore" name="QA Health Score %" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-elevated)' }} style={glowStyle('#10b981', theme)} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 6. Feature Completion Status (Stacked Bar) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Feature Completion Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <BarFillGradient id="featurePassGrad" color="#10b981" theme={theme} />
                          <BarFillGradient id="featureFailGrad" color="#f87171" theme={theme} />
                          <BarFillGradient id="featureBlockedGrad" color="#fb923c" theme={theme} />
                        </defs>
                        <XAxis dataKey="name" {...axisPreset()} />
                        <YAxis {...axisPreset()} />
                        <Tooltip content={<PremiumTooltip theme={theme} />} />
                        <Legend {...legendPreset} />
                        <Bar dataKey="passFeatures" name="Passed" stackId="a" fill="url(#featurePassGrad)" isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Bar dataKey="failFeatures" name="Failed" stackId="a" fill="url(#featureFailGrad)" isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                        <Bar dataKey="blockedFeatures" name="Blocked" stackId="a" fill="url(#featureBlockedGrad)" radius={BAR_RADIUS} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

              </div>
            )}
          </motion.section>
        )}

        {/* ── SECTION 6: WEEKLY ANCHORED CHARTS ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.charts}
          className="flex flex-col gap-6"
          style={{ display: vis.show_weeklyCharts === false ? 'none' : undefined }}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Weekly Charts & Distribution</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* 1. Work Distribution (Pie) - Interactive Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5 }}
              onClick={() => setShowWorkDistributionModal(true)}
              className={`p-5 rounded-2xl border cursor-pointer group relative overflow-hidden ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 hover:border-accent-gold/30 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:border-accent-gold/40 hover:shadow-2xl'} transition-all duration-300`}
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Click Indicator */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
                  <span className="text-[9px] font-bold text-accent-gold uppercase tracking-wider">Click to Expand</span>
                  <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block relative z-10">Work Distribution</span>
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={workDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3} cornerRadius={6} stroke="none" dataKey="value" isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out">
                      {workDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} style={glowStyle(entry.hex, theme)} />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumTooltip theme={theme} />} />
                    <Legend {...legendPreset} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 2. Production Issues Comparison (Bar) - Interactive Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              onClick={() => setShowProductionIssuesModal(true)}
              className={`p-5 rounded-2xl border cursor-pointer group relative overflow-hidden ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 hover:border-accent-gold/30 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:border-accent-gold/40 hover:shadow-2xl'} transition-all duration-300`}
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Click Indicator */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
                  <span className="text-[9px] font-bold text-accent-gold uppercase tracking-wider">Click to Expand</span>
                  <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block relative z-10">Production Issue Categories</span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodIssuesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <BarFillGradient id="prodIssuesLastWeekGrad" color="#d4af37" theme={theme} />
                      <BarFillGradient id="prodIssuesMtdGrad" color="#3b82f6" theme={theme} />
                    </defs>
                    <XAxis dataKey="category" {...axisPreset()} />
                    <YAxis {...axisPreset()} />
                    <Tooltip content={<PremiumTooltip theme={theme} />} />
                    <Legend {...legendPreset} />
                    <Bar dataKey="lastWeek" name="Last Week" fill="url(#prodIssuesLastWeekGrad)" radius={BAR_RADIUS} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="mtd" name="MTD" fill="url(#prodIssuesMtdGrad)" radius={BAR_RADIUS} isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 3. Defect Status (Doughnut) - Interactive Modal */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => setShowDefectModal(true)}
              className={`p-5 rounded-2xl border cursor-pointer group relative overflow-hidden ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 hover:border-accent-gold/30 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:border-accent-gold/40 hover:shadow-2xl'} transition-all duration-300`}
            >
              {/* Hover Glow Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              {/* Click Indicator */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
                  <span className="text-[9px] font-bold text-accent-gold uppercase tracking-wider">Click to Expand</span>
                  <svg className="w-3 h-3 text-accent-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block relative z-10">Defect Status Breakdown</span>
              <div className="h-64 relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={defectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} cornerRadius={6} stroke="none" dataKey="value" isAnimationActive={chartAnimationEnabled} animationDuration={1500} animationEasing="ease-out">
                      {defectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} style={glowStyle(entry.hex, theme)} />
                      ))}
                    </Pie>
                    <Tooltip content={<PremiumTooltip theme={theme} />} />
                    <Legend {...legendPreset} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>
        </motion.section>

        {/* ── SECTION 8: TEAM RESOURCE ALLOCATION ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.team}
          className="flex flex-col gap-6"
          style={{ display: vis.show_teamAllocation === false ? 'none' : undefined }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Team Resource Allocation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(() => {
              const releaseCount = data.releaseItems?.length || 0
              const resolvedCount =
                data.supportTickets?.filter(t => isResolvedSupportStatus(t?.status)).length || 0

              const palette = theme === 'dark'
                ? {
                    sky: { railGrad: 'bg-gradient-to-b from-sky-300/60 via-sky-400 to-sky-300/60', text: 'text-sky-300', soft: 'bg-sky-400/10', ring: 'border-sky-400/30', aurora: 'from-sky-400/30', sheen: 'via-white/10' },
                    emerald: { railGrad: 'bg-gradient-to-b from-emerald-300/60 via-emerald-400 to-emerald-300/60', text: 'text-emerald-300', soft: 'bg-emerald-400/10', ring: 'border-emerald-400/30', aurora: 'from-emerald-400/30', sheen: 'via-white/10' },
                    violet: { railGrad: 'bg-gradient-to-b from-violet-300/60 via-violet-400 to-violet-300/60', text: 'text-violet-300', soft: 'bg-violet-400/10', ring: 'border-violet-400/30', aurora: 'from-violet-400/30', sheen: 'via-white/10' },
                  }
                : {
                    sky: { railGrad: 'bg-gradient-to-b from-sky-400 via-sky-600 to-sky-400', text: 'text-sky-700', soft: 'bg-sky-50', ring: 'border-sky-200', aurora: 'from-sky-400/25', sheen: 'via-slate-900/[0.05]' },
                    emerald: { railGrad: 'bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-400', text: 'text-emerald-700', soft: 'bg-emerald-50', ring: 'border-emerald-200', aurora: 'from-emerald-400/25', sheen: 'via-slate-900/[0.05]' },
                    violet: { railGrad: 'bg-gradient-to-b from-violet-400 via-violet-600 to-violet-400', text: 'text-violet-700', soft: 'bg-violet-50', ring: 'border-violet-200', aurora: 'from-violet-400/25', sheen: 'via-slate-900/[0.05]' },
                  }

              const groups = [
                {
                  role: 'Feature Testing Team',
                  icon: Zap,
                  members: data.newFeatureTeam || [],
                  accent: palette.sky,
                },
                {
                  role: 'Production Support Team',
                  icon: Wrench,
                  members: data.supportTeam || [],
                  accent: palette.emerald,
                },
                {
                  role: 'Automation Testing Team',
                  icon: Code2,
                  members: data.automationTeam || [],
                  accent: palette.violet,
                },
              ]

              return groups.map((group, idx) => {
                const Icon = group.icon
                const count = group.members.length

                return (
                  <motion.div
                    key={group.role}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: Math.min(idx * 0.08, 0.24) }}
                    className={`group relative overflow-hidden rounded-[26px] border p-5 flex flex-col min-h-[210px] transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:border-white/[0.14] hover:shadow-[0_10px_36px_rgba(0,0,0,0.35)]'
                        : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/70 shadow-md hover:shadow-xl hover:border-slate-300/80'
                    }`}
                  >
                    {/* Accent rail — gradient pans vertically */}
                    <div className={`team-card-rail absolute left-0 top-0 bottom-0 w-1 ${group.accent.railGrad} opacity-80 group-hover:opacity-100 transition-opacity`} />

                    {/* Drifting aurora gradients (two desynchronised phases) */}
                    <div className={`team-card-aurora absolute -top-16 -right-12 w-44 h-44 rounded-full blur-3xl pointer-events-none bg-gradient-to-br ${group.accent.aurora} to-transparent`} />
                    <div
                      className={`team-card-aurora absolute -bottom-20 -left-14 w-44 h-44 rounded-full blur-3xl pointer-events-none bg-gradient-to-tr ${group.accent.aurora} to-transparent`}
                      style={{ animationDelay: '-8.5s', animationDuration: '21s' }}
                    />

                    {/* Slow gradient sheen sweep */}
                    <div
                      className={`team-card-sheen absolute top-0 left-0 h-full w-1/2 pointer-events-none bg-gradient-to-r from-transparent ${group.accent.sheen} to-transparent`}
                      style={{ ['--sheen-delay' as string]: `${idx * 2.4}s` } as React.CSSProperties}
                    />

                    {/* Headcount watermark */}
                    {count > 0 && (
                      <span
                        aria-hidden
                        className={`absolute -right-1 -bottom-3 text-[88px] leading-none font-clash font-black select-none pointer-events-none transition-transform duration-500 group-hover:scale-105 ${
                          theme === 'dark' ? 'text-white/[0.04]' : 'text-slate-900/[0.04]'
                        }`}
                      >
                        {String(count).padStart(2, '0')}
                      </span>
                    )}

                    <div className="relative z-10 flex flex-col gap-4">
                      {/* Role header - Premium layout with icon and title inline */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${group.accent.soft} ${group.accent.ring}`}>
                          <Icon className={`w-5 h-5 ${group.accent.text}`} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className={`text-[15px] font-extrabold leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                            {group.role}
                          </h3>
                          <span className={`text-[10px] font-semibold uppercase tracking-wider ${group.accent.text}`}>
                            {count} {count === 1 ? 'Member' : 'Members'}
                          </span>
                        </div>
                      </div>

                      {/* Members */}
                      {count > 0 ? (
                        <ul className="flex flex-col gap-1.5 list-none m-0 p-0">
                          {group.members.map(member => (
                            <li
                              key={member}
                              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl border transition-colors ${
                                theme === 'dark'
                                  ? 'bg-white/[0.03] border-white/[0.05] hover:bg-white/[0.07]'
                                  : 'bg-slate-50 border-slate-200/70 hover:bg-slate-100'
                              }`}
                            >
                              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border shrink-0 ${group.accent.soft} ${group.accent.ring} ${group.accent.text}`}>
                                {String(member || '?').trim().charAt(0).toUpperCase() || '?'}
                              </span>
                              <span className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white/85' : 'text-slate-700'}`}>
                                {member}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className={`rounded-xl border border-dashed px-3 py-5 text-center ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                          <span className={`text-[11px] font-semibold ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                            No resources assigned
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })
            })()}
          </div>
        </motion.section>

        {/* ── SECTION 9: NEXT PRIORITIES ── */}
        {vis.show_nextPriorities !== false && (
          <motion.section
            variants={sectionVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            ref={sectionsRef.roadmap}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Next Week Priorities</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data.nextPriorities.map((priority, idx) => {
                const accents = theme === 'dark'
                  ? [
                      { bar: 'bg-amber-400', glow: 'from-amber-400/25', chip: 'text-amber-300', ring: 'border-amber-400/30', soft: 'bg-amber-400/10' },
                      { bar: 'bg-sky-400', glow: 'from-sky-400/25', chip: 'text-sky-300', ring: 'border-sky-400/30', soft: 'bg-sky-400/10' },
                      { bar: 'bg-emerald-400', glow: 'from-emerald-400/25', chip: 'text-emerald-300', ring: 'border-emerald-400/30', soft: 'bg-emerald-400/10' },
                      { bar: 'bg-rose-400', glow: 'from-rose-400/25', chip: 'text-rose-300', ring: 'border-rose-400/30', soft: 'bg-rose-400/10' },
                      { bar: 'bg-indigo-400', glow: 'from-indigo-400/25', chip: 'text-indigo-300', ring: 'border-indigo-400/30', soft: 'bg-indigo-400/10' },
                    ]
                  : [
                      { bar: 'bg-amber-500', glow: 'from-amber-400/20', chip: 'text-amber-700', ring: 'border-amber-300', soft: 'bg-amber-50' },
                      { bar: 'bg-sky-500', glow: 'from-sky-400/20', chip: 'text-sky-700', ring: 'border-sky-300', soft: 'bg-sky-50' },
                      { bar: 'bg-emerald-500', glow: 'from-emerald-400/20', chip: 'text-emerald-700', ring: 'border-emerald-300', soft: 'bg-emerald-50' },
                      { bar: 'bg-rose-500', glow: 'from-rose-400/20', chip: 'text-rose-700', ring: 'border-rose-300', soft: 'bg-rose-50' },
                      { bar: 'bg-indigo-500', glow: 'from-indigo-400/20', chip: 'text-indigo-700', ring: 'border-indigo-300', soft: 'bg-indigo-50' },
                    ]
                const accent = accents[idx % accents.length]
                const n = String(idx + 1).padStart(2, '0')
                const ownerInitial = (priority.owner || '?').trim().charAt(0).toUpperCase()

                return (
                  <motion.div
                    key={priority.id}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: Math.min(idx * 0.06, 0.3) }}
                    className={`group relative overflow-hidden rounded-[26px] border p-5 flex flex-col min-h-[180px] transition-all duration-300 ${
                      theme === 'dark'
                        ? 'bg-gradient-to-br from-[#1a2133]/90 to-[#0b0f1a]/90 border-white/[0.06] backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:border-white/[0.14] hover:shadow-[0_10px_36px_rgba(0,0,0,0.35)]'
                        : 'bg-gradient-to-br from-white via-white to-slate-50 border-slate-200/70 shadow-md hover:shadow-xl hover:border-slate-300/80'
                    }`}
                  >
                    {/* Left rank rail */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent.bar} opacity-80 group-hover:opacity-100 transition-opacity`} />

                    {/* Soft corner glow */}
                    <div className={`absolute -top-16 -right-10 w-36 h-36 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br ${accent.glow} to-transparent pointer-events-none`} />

                    {/* Giant watermark index */}
                    <span
                      aria-hidden
                      className={`absolute -right-1 -bottom-3 text-[88px] leading-none font-clash font-black select-none pointer-events-none transition-transform duration-500 group-hover:scale-105 ${
                        theme === 'dark' ? 'text-white/[0.04]' : 'text-slate-900/[0.04]'
                      }`}
                    >
                      {n}
                    </span>

                    <div className="relative z-10 flex flex-col gap-3 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black tracking-[0.14em] uppercase ${accent.soft} ${accent.ring} ${accent.chip}`}>
                          <Star className="w-3 h-3" />
                          P{n}
                        </div>
                        {priority.dueDate ? (
                          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide ${
                            theme === 'dark' ? 'bg-white/5 text-white/55 border border-white/10' : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            <CalendarDays className="w-3 h-3" />
                            {priority.dueDate}
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold tracking-wide ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
                            No due date
                          </span>
                        )}
                      </div>

                      <h3 className={`text-[15px] font-extrabold leading-snug pr-6 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                        {priority.title || 'Untitled priority'}
                      </h3>

                      {priority.description ? (
                        <p className={`text-xs leading-relaxed flex-1 ${theme === 'dark' ? 'text-white/55' : 'text-slate-500'}`}>
                          {priority.description}
                        </p>
                      ) : (
                        <p className={`text-xs italic flex-1 ${theme === 'dark' ? 'text-white/25' : 'text-slate-400'}`}>
                          No description provided
                        </p>
                      )}

                      <div className={`mt-auto pt-3 flex items-center gap-2.5 border-t ${theme === 'dark' ? 'border-white/[0.06]' : 'border-slate-100'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border ${accent.soft} ${accent.ring} ${accent.chip}`}>
                          {priority.owner ? ownerInitial : <UserRound className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-[9px] font-bold uppercase tracking-[0.12em] ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`}>
                            Owner
                          </p>
                          <p className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>
                            {priority.owner || 'Unassigned'}
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0 transition-all ${theme === 'dark' ? 'text-white' : 'text-slate-500'}`} />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
              {data.nextPriorities.length === 0 && (
                <div className={`col-span-full p-10 text-center rounded-[26px] border border-dashed ${
                  theme === 'dark' ? 'border-white/10 text-white/35' : 'border-slate-200 text-slate-400'
                }`}>
                  <Target className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-medium">No priorities set for next week.</p>
                </div>
              )}
            </div>
          </motion.section>
        )}

      </motion.div>

      {/* ── Footer — Consistent with main app ── */}
      <footer
        className="mt-16 py-4"
        style={{ borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}
      >
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-center gap-3">
          <Logo size="sm" animate={false} />
          <span className={`text-xs tracking-wide ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`}>
            &copy; {new Date().getFullYear()} {BRAND.name}
          </span>
          <span className={`text-xs ${theme === 'dark' ? 'text-white/15' : 'text-slate-300'}`}>|</span>
          <span className={`text-xs italic tracking-wide ${theme === 'dark' ? 'text-white/30' : 'text-slate-400'}`}>
            Powered by Intelligence. Built for Quality.
          </span>
        </div>
      </footer>

    </motion.div>

      {/* Modals must stay outside the reveal motion root so fixed positioning works */}
      <DefectStatusModal
        isOpen={showDefectModal}
        onClose={() => setShowDefectModal(false)}
        releaseBugStatus={data.releaseBugStatus}
        fallbackData={data.defectsLastWeek}
        projectName={data.projectName}
      />

      <WorkDistributionModal
        isOpen={showWorkDistributionModal}
        onClose={() => setShowWorkDistributionModal(false)}
        workDistributionData={workDistributionData}
        projectName={data.projectName}
      />

      <ProductionIssuesModal
        isOpen={showProductionIssuesModal}
        onClose={() => setShowProductionIssuesModal(false)}
        prodIssuesData={prodIssuesData}
        projectName={data.projectName}
      />

      <ReleaseReadinessModal
        isOpen={showReleaseReadinessModal}
        onClose={() => setShowReleaseReadinessModal(false)}
        releaseReadinessScore={releaseReadinessScore}
        passedCases={passedCases}
        totalCases={totalCases}
        openBugsCount={openBugsCount}
        blockedCases={blockedCases}
        closureRate={closureRate}
        projectName={data.projectName}
      />

      {data.teamCapacity && (
        <TeamCapacityModal
          isOpen={showTeamCapacityModal}
          onClose={() => setShowTeamCapacityModal(false)}
          data={data.teamCapacity}
          projectName={data.projectName}
        />
      )}

      <ExecutiveQualityScoreModal
        isOpen={showQualityScoreModal}
        onClose={() => setShowQualityScoreModal(false)}
        data={data}
        score={qualityStats.score}
        label={qualityStats.label}
        color={qualityStats.color}
      />

      <ReleaseScopeModal
        isOpen={showReleaseScopeModal}
        onClose={() => setShowReleaseScopeModal(false)}
        releaseData={data.releaseItems || []}
        visibleColumns={releaseScopeVisibleColumns}
        projectId={data.projectId}
        projectName={data.projectName}
      />

      <ReleaseFeaturesModal
        isOpen={showReleaseFeaturesModal}
        onClose={() => setShowReleaseFeaturesModal(false)}
        releaseItems={data.releaseItems || []}
        projectName={data.projectName}
      />

      <CodeFixesModal
        isOpen={showCodeFixesModal}
        onClose={() => setShowCodeFixesModal(false)}
        supportTickets={data.supportTickets || []}
        projectName={data.projectName}
      />
    </>
    )}

    <DashboardLaunchOverlay
      open={showLaunchTriage}
      projectName={data.projectName}
      onComplete={handleLaunchTriageComplete}
    />
    </>
  )
}

class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const safeMsg = String(error?.message ?? '').replace(/[\r\n]/g, ' ')
    const safeStack = String(errorInfo.componentStack ?? '').replace(/[\r\n]/g, ' ')
    console.error('[DashboardErrorBoundary] caught crash:', safeMsg, safeStack)
  }
  render() {
    if (this.state.hasError) {
      // Uses the app's global CSS theme variables (not this page's isolated gold theme) so the
      // fallback still respects light/dark correctly even if the crash happened before the
      // dashboard's own theme resolution ran.
      return (
        <div className="min-h-screen flex items-center justify-center p-6 font-montreal" style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
          <div className="rounded-3xl p-10 max-w-md w-full text-center backdrop-blur-xl shadow-2xl border" style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}>
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-red-500">⚠️</span>
            </div>
            <h2 className="text-xl font-bold font-clash mb-2">Dashboard Error</h2>
            <p className="text-xs mb-6 text-left p-3 rounded-xl overflow-y-auto max-h-32 font-mono break-all leading-normal" style={{ color: 'var(--text-muted)', background: 'var(--surface-secondary)' }}>
              {this.state.error?.stack || this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="px-6 py-2.5 bg-accent-gold text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-colors w-full"
              >
                Retry Rendering
              </button>
              <button
                onClick={() => {
                  window.close()
                }}
                className="px-6 py-2.5 border font-bold text-xs uppercase tracking-widest rounded-xl transition-colors w-full hover:opacity-80"
                style={{ background: 'var(--hover)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                Return to Reports
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export const ReportPreviewDashboard: React.FC = () => {
  return (
    <DashboardErrorBoundary>
      <ReportPreviewDashboardContent />
    </DashboardErrorBoundary>
  )
}
