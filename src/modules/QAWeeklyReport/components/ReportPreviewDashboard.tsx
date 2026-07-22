import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import DOMPurify from 'dompurify'
import {
  TrendingUp, TrendingDown, Mail, Zap, Wrench, Shield, Check,
  AlertTriangle, Play, HelpCircle, Activity, Sun, Moon, Maximize2,
  Minimize2, Download, Printer, Copy, RefreshCw, X, ChevronRight,
  BookOpen, Star, Sparkles, FileText, LayoutGrid, Users, History, CheckCheck,
  ArrowRightLeft, GitCompare, Eye, EyeOff, Palette, Lock, Unlock,
  Cpu, GitBranch, Terminal, Code2, ChevronDown, Info
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { BRAND } from '@/lib/brand'
import { calculateQAScore } from '../utils/qualityCalculator'
import { ExecutiveKPISection } from './ExecutiveKPISection'

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

  @media print {
    @page {
      size: landscape;
      margin: 12mm 10mm;
    }
    
    body, html, #root, .min-h-screen {
      overflow: visible !important;
      height: auto !important;
      background: ${theme === 'dark' ? '#070a13' : '#f8fafc'} !important;
      color: ${theme === 'dark' ? '#f8fafc' : '#0f172a'} !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }

    /* Hide interactive elements, controls, sidebar buttons */
    .print\:hidden, button, header, nav, select, .fixed.bottom-4 {
      display: none !important;
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

    /* Align columns nicely for standard paper width */
    .max-w-7xl {
      max-width: 100% !important;
      width: 100% !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    /* Correct chart dimensions on print page */
    .h-56, .h-60, .h-64, .h-72, .h-80 {
      height: 240px !important;
      page-break-inside: avoid !important;
    }

    .recharts-responsive-container {
      width: 100% !important;
      height: 220px !important;
      min-height: 220px !important;
    }
  }
`
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, LineChart, Line, AreaChart, Area,
  ComposedChart
} from 'recharts'
import { toast } from '@/hooks/use-toast'
import { AIService } from '@/services/ai/ai-service'
import { useQAReportStore } from '../store'
import { ensureFormData } from '../types'
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

// Report preview has its own isolated theme system — independent of the global dark/light toggle.
type ReportThemeId = 'light' | 'dark'
import pptxgen from 'pptxgenjs'

// No mock/dummy data — historical analytics use only the user's real saved reports

// ── KPI Sparkline Helpers ────────────────────────────────────────────────────
interface SparklineProps {
  data: number[]
  color: string
}
const MiniSparkline: React.FC<SparklineProps> = ({ data, color }) => {
  const chartData = data.map((v, i) => ({ val: v, name: i.toString() }))
  return (
    <div className="w-16 h-8 opacity-80 group-hover:opacity-100 transition-opacity">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="val" stroke={color} strokeWidth={1.5} dot={false} />
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
  const [searchParams] = useSearchParams()
  const reportIdFromUrl = searchParams.get('reportId')

  // Track if entrance animations have already been played (e.g. page refresh)
  const hasPlayed = typeof window !== 'undefined' && sessionStorage.getItem('qaly-dashboard-entrance-played') === 'true'

  useEffect(() => {
    sessionStorage.setItem('qaly-dashboard-entrance-played', 'true')
  }, [])

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

  const [data, setData] = useState<QAReportForm>(() => {
    const raw = localStorage.getItem('current-qa-report-data')
    if (raw) { try { return ensureFormData(JSON.parse(raw)) } catch { } }
    return ensureFormData(null)
  })
  // isLoaded starts true only if we have localStorage data (no reportId) or will be set after fetch
  const [isLoaded, setIsLoaded] = useState(() => !reportIdFromUrl && !!localStorage.getItem('current-qa-report-data'))
  const vis = getSectionVisibility(data)
  // Helper: returns null if section is disabled
  const gated = (key: string, content: React.ReactNode) => vis[key] !== false ? content : null
  const { theme: globalTheme } = useTheme()
  const theme = globalTheme === 'light' ? 'light' : 'dark'
  const [enableParticles, setEnableParticles] = useState<boolean>(localStorage.getItem('qaly-enable-particles') !== 'false')
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

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const sectionsRef = {
    overview: useRef<HTMLDivElement>(null),
    kpis: useRef<HTMLDivElement>(null),
    sprintHealth: useRef<HTMLDivElement>(null),
    releaseTesting: useRef<HTMLDivElement>(null),
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
        setData(ensureFormData(found.form))
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
              setData(ensureFormData({ ...row.form_data, projectId: row.project_id, projectName: row.project }))
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
      }
      setIsLoaded(true)
    }
  }, [reportIdFromUrl, savedReports, isLoaded])




  // ── Calculation Utilities ──────────────────────────────────────────────────
  const releaseCount = data.releaseItems.length
  const releasePassed = data.releaseItems.filter(i => i?.status === 'Pass').length
  const releaseFailed = data.releaseItems.filter(i => i?.status === 'Fail').length
  const releaseBlocked = data.releaseItems.filter(i => i?.status === 'Blocked').length
  const passRate = releaseCount ? Math.round((releasePassed / releaseCount) * 100) : 0

  const activeDefectsTotal = data.defectsLastWeek.reported
  const defectClosureRate = activeDefectsTotal ? Math.round((data.defectsLastWeek.closed / activeDefectsTotal) * 100) : 0

  // ── Executive Quality Score Calculation ──
  const qualityStats = calculateQAScore(data)

  // ── Theme Gallery configurations ──
  const getThemeStyles = () => {
    if (theme === 'light') {
      return {
        bg: 'bg-[#f8fafc] text-slate-900',
        card: 'bg-white border-slate-200/80 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)] hover:border-slate-300/80 transition-all duration-300',
        accent: 'text-[#b5942b]',
        accentBg: 'bg-accent-gold text-black hover:bg-[#b5942b] font-bold rounded-xl transition-all',
        border: 'border-slate-200/80',
        glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.02)]',
        font: 'font-inter',
        chartColors: ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
      }
    } else {
      return {
        bg: 'bg-[#070a13] text-[#f8fafc]',
        card: 'bg-[#0e1322]/60 border-white/[0.04] backdrop-blur-md rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.2)] hover:border-white/[0.08] hover:shadow-[0_8px_40px_rgba(212,175,55,0.02)] transition-all duration-300',
        accent: 'text-accent-gold',
        accentBg: 'bg-accent-gold text-black hover:bg-[#b5942b] font-bold rounded-xl transition-all',
        border: 'border-white/[0.04]',
        glow: 'shadow-[0_0_50px_rgba(212,175,55,0.02)]',
        font: 'font-inter',
        chartColors: ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
      }
    }
  }

  const tS = getThemeStyles()

  // ── Sprint Health calculations ──
  const totalCases = data.releaseItems.length
  const passedCases = data.releaseItems.filter(i => i?.status === 'Pass').length
  const failedCases = data.releaseItems.filter(i => i?.status === 'Fail').length
  const blockedCases = data.releaseItems.filter(i => i?.status === 'Blocked').length
  const inProgressCases = data.releaseItems.filter(i => i?.status === 'In Progress').length
  const notExecutedCases = data.releaseItems.filter(i => i?.status === 'Not Started').length
  const pendingCases = inProgressCases + blockedCases

  const sprintHealthScore = totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 100

  // ── Release Readiness Meter calculations ──
  // Use Release Bug Status data if available, otherwise fall back to manual defects
  const releaseBugData = data.releaseBugStatus?.metrics
  const openBugsCount = releaseBugData?.activeBugs ?? data.defectsLastWeek.open
  const closureRate = releaseBugData?.closurePercentage ??
    (data.defectsLastWeek.reported > 0 ? (data.defectsLastWeek.closed / data.defectsLastWeek.reported) * 100 : 100)

  const passPctFactor = totalCases > 0 ? passedCases / totalCases : 1.0
  const openBugsFactor = 1 - openBugsCount / (openBugsCount + 5)
  const blockersFactor = 1 - blockedCases / (blockedCases + 3)
  const closureFactor = closureRate / 100  // 0-1 scale

  // Enhanced formula: Pass Rate (50%) + Bugs (20%) + Blockers (15%) + Closure (15%)
  const releaseReadinessScore = Math.max(0, Math.min(100, Math.round(
    (passPctFactor * 50) + (openBugsFactor * 20) + (blockersFactor * 15) + (closureFactor * 15)
  )))

  // ── WoW Comparison Calculations ──
  const getPreviousReport = (): QAReportForm | null => {
    const curIndex = activeHistory.findIndex(r => r.form.weekStart === data.weekStart)
    if (curIndex !== -1 && curIndex + 1 < activeHistory.length) {
      return activeHistory[curIndex + 1].form
    }
    if (curIndex === -1 && activeHistory.length > 0) {
      return activeHistory[0].form
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
    getMetricComparison('Support Tickets', data.supportEmails, prevReport?.supportEmails, 'lower-better'),
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
    const passRateA = reportA.releaseItems.length ? reportA.releaseItems.filter(i => i?.status === 'Pass').length / reportA.releaseItems.length : 1.0
    const passRateB = reportB.releaseItems.length ? reportB.releaseItems.filter(i => i?.status === 'Pass').length / reportB.releaseItems.length : 1.0

    if (passRateB > passRateA) return `${reportB.reportTitle || 'Report B'} (Higher Test Pass Rate)`
    if (passRateA > passRateB) return `${reportA.reportTitle || 'Report A'} (Higher Test Pass Rate)`
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

  // ── Confetti Particle system on health score > 90% ──
  const [confetti, setConfetti] = useState<any[]>([])
  useEffect(() => {
    if (qualityStats.score >= 90) {
      const colors = ['#d4af37', '#facc15', '#fef08a']
      const particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -100 - 20,
        vx: Math.random() * 3 - 1.5,
        vy: Math.random() * 4 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 2 - 1
      }))
      setConfetti(particles)
      toast({ title: 'Quality Goal Achieved! 🏆', description: 'QA Health score has exceeded 90% this week.' })
    }
  }, [qualityStats.score])

  useEffect(() => {
    if (confetti.length === 0) return
    let animationFrameId: number
    const updateConfetti = () => {
      setConfetti(prev => {
        const next = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          rotation: p.rotation + p.rotationSpeed
        })).filter(p => p.y < window.innerHeight)
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

  // ── Canvas Particle System ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!enableParticles) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    let animationFrameId: number
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const particleColors = theme === 'dark'
      ? ['rgba(212,175,55,0.22)', 'rgba(59,130,246,0.22)', 'rgba(168,85,247,0.22)', 'rgba(16,185,129,0.22)']
      : ['rgba(184,150,12,0.12)', 'rgba(37,99,235,0.12)', 'rgba(124,58,237,0.12)', 'rgba(5,150,105,0.12)']

    const particles: any[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.random() * 0.3 - 0.15,
      vy: Math.random() * 0.3 - 0.15,
      radius: Math.random() * 2.5 + 1.2,
      color: particleColors[Math.floor(Math.random() * particleColors.length)]
    }))

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const animate = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j]
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y)
          if (dist < 130) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255,255,255,${(1 - dist / 130) * 0.04})`
              : `rgba(0,0,0,${(1 - dist / 130) * 0.04})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      })
      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [theme, enableParticles])

  // Write theme classes
  useEffect(() => {
    localStorage.setItem('qaly-report-theme', theme)
    if (theme === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }, [theme])

  // Scroll spy observer
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 200
      for (const [key, ref] of Object.entries(sectionsRef)) {
        if (ref.current) {
          const offsetTop = ref.current.offsetTop
          const offsetHeight = ref.current.offsetHeight
          if (scrollPos >= offsetTop && scrollPos < offsetTop + offsetHeight) {
            setActiveSection(key)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
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
  const historicalChartsData = activeHistory.map(h => {
    const passCount = h.form.releaseItems.filter((i: any) => i?.status === 'Pass').length
    const failCount = h.form.releaseItems.filter((i: any) => i?.status === 'Fail').length
    const blockedCount = h.form.releaseItems.filter((i: any) => i?.status === 'Blocked').length

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
    { name: 'Completed', value: releaseBugMetrics.completedBugs, hex: '#10b981' },
    ...(releaseBugMetrics.deferredBugs > 0 ? [{ name: 'Deferred', value: releaseBugMetrics.deferredBugs, hex: '#eab308' }] : []),
    ...(releaseBugMetrics.invalidBugs > 0 ? [{ name: 'Invalid/Won\'t Fix', value: releaseBugMetrics.invalidBugs, hex: '#64748b' }] : [])
  ] : [
    { name: 'Open Defects', value: data.defectsLastWeek.open, hex: '#f87171' },
    { name: 'Fixed Defects', value: data.defectsLastWeek.fixed, hex: '#fb923c' },
    { name: 'Closed Defects', value: data.defectsLastWeek.closed, hex: '#10b981' }
  ]

  const gridColor = 'var(--chart-grid)'
  const chartText = 'var(--chart-text)'

  // ── Exports ──
  const downloadMarkdown = () => {
    let md = `# Weekly QA Dashboard Report - ${data.projectName}\n`
    md += `Report Week: ${data.weekStart} to ${data.weekEnd}\n\n`
    md += `## Metrics Summary\n`
    md += `- Support Emails: ${data.supportEmails}\n`
    md += `- New Features: ${data.newFeatures}\n`
    md += `- Code Fixes: ${data.codeFixes}\n\n`
    md += `## Next Week Priorities\n`
    data.nextPriorities.forEach(p => {
      md += `- **${p.title}** (Owner: ${p.owner}, Due: ${p.dueDate})\n  ${p.description}\n`
    })

    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.projectName.toLowerCase().replace(/\s+/g, '-')}-qa-report.md`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Markdown Exported!', description: 'Report downloaded as Markdown file.' })
  }

  const downloadHTML = () => {
    const safeProjectName = data.projectName.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] ?? c))
    const htmlString = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>QA Dashboard - ${safeProjectName}</title></head><body><h1>${safeProjectName}</h1></body></html>`
    const blob = new Blob([htmlString], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.projectName.toLowerCase().replace(/\s+/g, '-')}-qa-dashboard.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadPPTX = () => {
    const ppt = new pptxgen()

    // Set 16:9 widescreen layout
    ppt.layout = 'LAYOUT_16X9'

    const darkBg = '0F172A' // Slate-900 background style
    const goldText = 'D4AF37'
    const whiteText = 'FFFFFF'
    const grayText = '94A3B8'

    // Slide 1: Title Slide
    const s1 = ppt.addSlide()
    s1.background = { fill: darkBg }
    s1.addText('QALY AI ENGINE — EXECUTIVE WEEKLY STATUS REPORT', {
      x: 0.8,
      y: 1.8,
      w: 11.2,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })
    s1.addText(data.projectName.toUpperCase(), {
      x: 0.8,
      y: 2.3,
      w: 11.2,
      h: 1.2,
      fontSize: 38,
      bold: true,
      color: whiteText,
      fontFace: 'Segoe UI'
    })
    s1.addText(`Report Week: ${data.weekStart} to ${data.weekEnd}`, {
      x: 0.8,
      y: 3.6,
      w: 11.2,
      h: 0.5,
      fontSize: 14,
      color: grayText,
      fontFace: 'Segoe UI'
    })
    s1.addText('CONFIDENTIAL DEVELOPER & OPERATIONS OUTLINE', {
      x: 0.8,
      y: 6.0,
      w: 11.2,
      h: 0.4,
      fontSize: 10,
      bold: true,
      color: 'F43F5E',
      fontFace: 'Segoe UI'
    })

    // Slide 2: KPI Metrics Overview
    const s2 = ppt.addSlide()
    s2.background = { fill: darkBg }
    s2.addText('Key Performance Indicators', {
      x: 0.8,
      y: 0.5,
      w: 11.2,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })

    const kpiData = [
      { title: 'Support Emails', val: data.supportEmails, desc: 'Active support queue exceptions' },
      { title: 'New Features', val: data.newFeatures, desc: 'Sprint modules tested' },
      { title: 'Code Fixes', val: data.codeFixes, desc: 'Regression patches verified' },
      { title: 'Defects Open', val: data.defectsLastWeek.open, desc: 'Unresolved active bugs' },
      { title: 'Defects Closed', val: data.defectsLastWeek.closed, desc: 'Bugs verified and closed' }
    ]

    kpiData.forEach((kpi, idx) => {
      const xPos = 0.8 + idx * 2.3
      // Draw background shape for card
      s2.addShape('rect', {
        x: xPos,
        y: 1.8,
        w: 2.1,
        h: 3.5,
        fill: { color: '1E293B' },
        line: { color: '334155', width: 1 }
      })

      s2.addText(kpi.title, {
        x: xPos + 0.1,
        y: 2.1,
        w: 1.9,
        h: 0.4,
        fontSize: 11,
        bold: true,
        color: grayText,
        fontFace: 'Segoe UI',
        align: 'center'
      })

      s2.addText(String(kpi.val), {
        x: xPos + 0.1,
        y: 2.7,
        w: 1.9,
        h: 0.8,
        fontSize: 38,
        bold: true,
        color: goldText,
        fontFace: 'Segoe UI',
        align: 'center'
      })

      s2.addText(kpi.desc, {
        x: xPos + 0.1,
        y: 3.8,
        w: 1.9,
        h: 1.0,
        fontSize: 10,
        color: grayText,
        fontFace: 'Segoe UI',
        align: 'center'
      })
    })

    // Slide 3: Sprint Quality & Readiness Details
    const s3 = ppt.addSlide()
    s3.background = { fill: darkBg }
    s3.addText('Sprint Quality & Release Readiness', {
      x: 0.8,
      y: 0.5,
      w: 11.2,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })

    s3.addText('Executive Quality Score', {
      x: 0.8,
      y: 1.6,
      w: 3.5,
      h: 0.3,
      fontSize: 13,
      bold: true,
      color: grayText,
      fontFace: 'Segoe UI'
    })
    s3.addText(`${qualityStats.score}`, {
      x: 0.8,
      y: 1.9,
      w: 3.5,
      h: 0.9,
      fontSize: 58,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })
    s3.addText(`${qualityStats.label.toUpperCase()}\n\n${qualityStats.desc}`, {
      x: 0.8,
      y: 3.0,
      w: 3.5,
      h: 2.0,
      fontSize: 11,
      color: whiteText,
      fontFace: 'Segoe UI'
    })

    // Health metrics card block
    s3.addShape('rect', {
      x: 4.8,
      y: 1.6,
      w: 7.0,
      h: 3.8,
      fill: { color: '1E293B' },
      line: { color: '334155', width: 1 }
    })
    s3.addText('Regression & Sprint Health Analytics', {
      x: 5.1,
      y: 1.9,
      w: 6.4,
      h: 0.4,
      fontSize: 16,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })

    const bullets = [
      `QA Health Verification Score: ${sprintHealthScore}%`,
      `Estimated Release Readiness Level: ${releaseReadinessScore}%`,
      `Total Release Ticket Volume: ${totalCases} test items`,
      `Passed Regression Checks: ${passedCases} items`,
      `Failed / Broken Regressions: ${failedCases} items`,
      `Blocked / Impeded Regressions: ${blockedCases} items`
    ]
    s3.addText(bullets.map(b => `• ${b}`).join('\n\n'), {
      x: 5.1,
      y: 2.5,
      w: 6.4,
      h: 2.6,
      fontSize: 12,
      color: whiteText,
      fontFace: 'Segoe UI'
    })

    // Slide 4: AI Insights & Summary Achievements
    const s4 = ppt.addSlide()
    s4.background = { fill: darkBg }
    s4.addText('AI Weekly Achievements Summary', {
      x: 0.8,
      y: 0.5,
      w: 11.2,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })

    const achs = aiSummary.achievements.map(a => `• ${a}`).join('\n\n')
    s4.addText(achs || '• No developer notes or achievements compiled.', {
      x: 0.8,
      y: 1.5,
      w: 11.2,
      h: 4.5,
      fontSize: 14,
      color: whiteText,
      fontFace: 'Segoe UI'
    })

    // Slide 5: Roadmap Priorities
    const s5 = ppt.addSlide()
    s5.background = { fill: darkBg }
    s5.addText('Roadmap & Next Week Priorities', {
      x: 0.8,
      y: 0.5,
      w: 11.2,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: goldText,
      fontFace: 'Segoe UI'
    })

    const prs = data.nextPriorities.map(p => `• ${p.title} (Owner: ${p.owner}, Due: ${p.dueDate})\n  ${p.description}`).join('\n\n')
    s5.addText(prs || '• No immediate priority queue changes configured.', {
      x: 0.8,
      y: 1.5,
      w: 11.2,
      h: 4.5,
      fontSize: 11.5,
      color: whiteText,
      fontFace: 'Segoe UI'
    })

    // Save output
    const outName = `${data.projectName.toLowerCase().replace(/\s+/g, '-')}-presentation`
    ppt.writeFile({ fileName: outName })
      .then(() => {
        toast({ title: 'PowerPoint Exported!', description: `Saved ${outName}.pptx successfully.` })
      })
      .catch((err) => {
        console.error(err)
        toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not create PowerPoint (.pptx) file.' })
      })
  }

  const handlePrint = () => {
    setShowExportMenu(false)
    // Allow React to close the export dropdown before triggering print
    setTimeout(() => window.print(), 300)
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-6 text-center">
        <div className="w-10 h-10 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin mb-4" />
        <p className="text-white/40 text-xs font-mono">Loading Executive Dashboard...</p>
      </div>
    )
  }

  if (!data.weekStart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] text-white p-6 text-center font-montreal">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-accent-gold" />
        </div>
        <h1 className="text-2xl font-bold font-clash mb-2">No Saved Report Found</h1>
        <p className="text-white/45 text-sm max-w-sm mb-6 leading-relaxed">
          Create or save a report to launch the Executive Dashboard.
        </p>
        <button onClick={() => window.close()} className="px-6 py-2.5 bg-accent-gold text-black font-extrabold text-xs uppercase tracking-widest rounded-xl hover:bg-yellow-500 transition-colors">
          Go Back to Form
        </button>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${tS.font} ${tS.bg} transition-colors duration-300 relative overflow-hidden pb-20 print:overflow-visible print:bg-white print:text-black`}>
      {/* ── React Confetti Layer ── */}
      {confetti.map((c, i) => (
        <div
          key={i}
          className="fixed pointer-events-none z-50 rounded-sm"
          style={{
            left: c.x,
            top: c.y,
            width: c.size,
            height: c.size,
            background: c.color,
            transform: `rotate(${c.rotation}deg)`,
            transition: 'top 0.1s linear, left 0.1s linear'
          }}
        />
      ))}

      <style dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getCustomStyles(theme), { FORCE_BODY: true }) }} />

      {/* ── Canvas Animated Particles ── */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none print:hidden" />

      {/* ── Background Glow Blobs ── */}
      {/* ── Background Glow Blobs ── */}
      {enableParticles && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden print:hidden">
          {/* Blob 1: Golden Aura Leakage (Top Center-Right) */}
          <motion.div
            animate={{
              x: [0, 50, -30, 20, 0],
              y: [0, -60, 40, -20, 0],
              scale: [1, 1.15, 0.9, 1.08, 1],
              rotate: [0, 45, 90, 45, 0]
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute top-[-20%] left-[25%] w-[650px] h-[650px] rounded-full blur-[140px] opacity-[0.24] ${theme === 'dark' ? 'bg-gradient-to-br from-[#d4af37]/35 to-[#facc15]/5' : 'bg-gradient-to-br from-yellow-400/30 to-amber-300/5'}`}
          />

          {/* Blob 2: Cobalt/Blue Aura Leakage (Bottom Right) */}
          <motion.div
            animate={{
              x: [0, -45, 30, -25, 0],
              y: [0, 50, -35, 30, 0],
              scale: [1, 1.08, 0.92, 1.12, 1],
              rotate: [0, -30, -60, -30, 0]
            }}
            transition={{
              duration: 26,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-[0.2] ${theme === 'dark' ? 'bg-gradient-to-tr from-blue-600/28 to-indigo-500/5' : 'bg-gradient-to-tr from-blue-400/25 to-sky-300/5'}`}
          />

          {/* Blob 3: Indigo/Purple Aura Leakage (Middle Left) */}
          <motion.div
            animate={{
              x: [0, 35, -25, 15, 0],
              y: [0, 35, -40, 20, 0],
              scale: [1, 1.12, 0.95, 1.06, 1],
              rotate: [0, 60, -30, 0]
            }}
            transition={{
              duration: 32,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className={`absolute top-[35%] left-[-15%] w-[500px] h-[500px] rounded-full blur-[130px] opacity-[0.18] ${theme === 'dark' ? 'bg-gradient-to-tr from-purple-600/25 to-pink-500/5' : 'bg-gradient-to-tr from-purple-400/20 to-fuchsia-300/5'}`}
          />
        </div>
      )}

      {/* ── Sticky Top Navigation — Premium Glassmorphic Bar ── */}
      {!isPresentation && (
        <header className="sticky top-0 z-40 transition-all duration-300 print:hidden" style={{ backdropFilter: 'blur(20px) saturate(1.8)' }}>
          <div
            className="border-b px-4 sm:px-6 py-3"
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(9,9,11,0.72)' : 'rgba(255,255,255,0.72)',
              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
              boxShadow: theme === 'dark'
                ? '0 4px 30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)'
                : '0 4px 30px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <Logo size="sm" animate={false} />
                <div className="hidden sm:block h-6 w-px" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
                <span className={`hidden sm:block text-[10px] uppercase font-bold tracking-[0.15em] ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                  Executive Report Hub
                </span>
              </div>

              {/* Jump Anchors */}
              <nav className={`hidden xl:flex items-center gap-0.5 p-1 rounded-2xl border transition-all ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06]' : 'bg-black/[0.03] border-black/[0.06]'}`}>
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'kpis', label: 'KPIs' },
                  { id: 'sprintHealth', label: 'Sprint' },
                  { id: 'releaseTesting', label: 'Release' },
                  { id: 'supportLog', label: 'Support' },
                  { id: 'defects', label: 'Defects' },
                  { id: 'charts', label: 'Charts' },
                  { id: 'comparison', label: 'WoW' },
                  { id: 'historyDashboard', label: 'History', show: data.showHistoricalAnalytics !== false },
                  { id: 'roadmap', label: 'Priorities' }
                ].filter(item => item.show !== false).map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all duration-200 ${activeSection === item.id ? 'bg-accent-gold text-black shadow-md shadow-accent-gold/20' : `${theme === 'dark' ? 'text-white/50 hover:text-white hover:bg-white/[0.06]' : 'text-slate-500 hover:text-slate-900 hover:bg-black/[0.04]'}`}`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* Toolbar Buttons */}
              <div className="flex items-center gap-2">
                {/* Client Mode Toggle */}
                <button
                  onClick={() => {
                    const next = !clientMode
                    setClientMode(next)
                    localStorage.setItem('qaly-client-mode', String(next))
                    toast({
                      title: next ? 'Client Mode Active' : 'Client Mode Disabled',
                      description: next ? 'Confidential developer notes and internal bug metrics hidden.' : 'Restored full view.'
                    })
                  }}
                  className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-[11px] font-bold ${clientMode ? 'bg-green-500/10 border-green-500/25 text-green-400' : theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]' : 'bg-black/[0.03] border-black/[0.06] text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]'}`}
                >
                  {clientMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span className="hidden 2xl:inline">Client</span>
                </button>

                {/* Particle Background Toggle */}
                <button
                  onClick={() => {
                    const next = !enableParticles
                    setEnableParticles(next)
                    localStorage.setItem('qaly-enable-particles', String(next))
                    toast({
                      title: next ? 'Ambient Motion Enabled' : 'Ambient Motion Disabled',
                      description: next ? 'Subtle particle background activated.' : 'Particle background disabled for reduced motion.'
                    })
                  }}
                  className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-[11px] font-bold ${enableParticles ? 'bg-accent-gold/10 border-accent-gold/25 text-accent-gold' : theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]' : 'bg-black/[0.03] border-black/[0.06] text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]'}`}
                >
                  <Activity className="w-3 h-3" />
                  <span className="hidden 2xl:inline">{enableParticles ? 'Motion' : 'Static'}</span>
                </button>


                <button
                  onClick={togglePresentation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-gold hover:bg-[#c3a030] text-black font-extrabold text-[11px] uppercase tracking-widest transition-all shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
                >
                  <Play className="w-3 h-3 fill-black" /> Present
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-[11px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]' : 'bg-white border-black/[0.06] text-slate-800 hover:bg-slate-50 shadow-sm'}`}
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute right-0 mt-3 w-48 border rounded-2xl overflow-hidden shadow-2xl z-50 ${theme === 'dark' ? 'bg-[#111114] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
                      >
                        <div className="p-1.5 flex flex-col gap-1">
                          <button onClick={() => { handlePrint(); setShowExportMenu(false) }} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                            <Printer className="w-4 h-4 text-accent-gold" /> Print to PDF
                          </button>
                          <button onClick={() => { downloadPPTX(); setShowExportMenu(false) }} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                            <FileText className="w-4 h-4 text-blue-400" /> PowerPoint Outline
                          </button>
                          <button onClick={() => { downloadHTML(); setShowExportMenu(false) }} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                            <LayoutGrid className="w-4 h-4 text-purple-400" /> Standalone HTML
                          </button>
                          <button onClick={() => { downloadMarkdown(); setShowExportMenu(false) }} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                            <Copy className="w-4 h-4 text-green-400" /> Markdown File
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => window.close()}
                  className={`p-2.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 shadow-sm'}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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
        className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 pt-8 sm:pt-12 flex flex-col gap-16"
      >

        {/* ══════════════════════════════════════════════════════════
            EXECUTIVE SUMMARY
        ══════════════════════════════════════════════════════════ */}

        {/* ── SECTION 1: HERO & QUALITY SCORE PANEL ── */}
        <motion.section
          variants={sectionVariants}
          ref={sectionsRef.overview}
          className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-center pt-2 relative"
          style={{ display: vis.show_hero === false ? 'none' : undefined }}
        >
          {/* Floating tech background elements */}
          <motion.div
            animate={{ y: [0, -15, 0], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-10 right-[40%] text-accent-gold/15 pointer-events-none hidden sm:block"
          >
            <Cpu className="w-12 h-12" />
          </motion.div>
          <motion.div
            animate={{ y: [0, 12, 0], rotate: [0, -8, 8, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-5 left-[20%] text-blue-500/10 pointer-events-none hidden sm:block"
          >
            <GitBranch className="w-10 h-10" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-[45%] text-purple-500/10 pointer-events-none hidden sm:block"
          >
            <Terminal className="w-8 h-8" />
          </motion.div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: [0.8, 1.05, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`px-3.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest shadow-md ${passRate >= 75 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-amber-500/10 text-accent-gold border-accent-gold/20'}`}
              >
                🟢 QA Status: {passRate >= 75 ? 'Stable' : 'Warning'}
              </motion.span>
              <span className={`px-3.5 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white/60' : 'bg-slate-200/50 border-slate-300 text-slate-600'}`}>
                WEEK: {data.weekStart} – {data.weekEnd}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-accent-gold font-clash font-extrabold uppercase text-sm tracking-widest">{data.projectName}</span>
              <h1 className={`font-clash font-black text-4xl sm:text-5xl tracking-tight leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {data.reportTitle || 'Weekly Status Report'}
              </h1>
            </div>
            <p className={`text-base sm:text-lg font-normal leading-relaxed max-w-2xl ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
              {data.subtitle || 'Executive-level verification metrics, team load, release health and issue analytics.'}
            </p>
            <div className="flex items-center gap-6 mt-2 flex-wrap">
              <div>
                <span className="text-3xl font-black text-accent-gold block"><CountUpNumber end={releaseCount} /></span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Release Scope</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <span className="text-3xl font-black text-[#10b981] block"><CountUpNumber end={passRate} suffix="%" /></span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Test Pass Rate</span>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div>
                <span className="text-3xl font-black text-blue-400 block"><CountUpNumber end={defectClosureRate} suffix="%" /></span>
                <span className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Defect Closure</span>
              </div>
            </div>
          </div>

          {/* Executive Quality Score Gauge - Interactive Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            onClick={() => setShowQualityScoreModal(true)}
            className={`p-6 rounded-3xl border flex flex-col items-center justify-between text-center relative overflow-hidden shadow-2xl cursor-pointer group ${theme === 'dark' ? 'bg-white/[0.02] border-white/10 hover:border-accent-gold/30 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:border-accent-gold/40 hover:shadow-3xl'} transition-all duration-300`}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-gold/5 to-blue-500/5 pointer-events-none" />

            {/* Hover Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent-gold/10 via-transparent to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

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

            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2 relative z-10">Executive Quality Score</span>
            <div className="relative w-36 h-36 flex items-center justify-center my-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke={theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth="8" strokeDasharray="188.4 251.2" strokeLinecap="round" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#d4af37"
                  strokeWidth="8"
                  initial={{ strokeDasharray: "0 251.2" }}
                  animate={{ strokeDasharray: `${(qualityStats.score / 100) * 188.4} 251.2` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <motion.span
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ delay: 1.2, duration: 0.4 }}
                  className={`text-4xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}
                >
                  <CountUpNumber end={qualityStats.score} />
                </motion.span>
                <span className={`text-[9px] font-bold uppercase tracking-widest ${qualityStats.color.split(' ')[0]}`}>{qualityStats.label}</span>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className={`p-3 rounded-xl border text-xs leading-normal w-full ${qualityStats.color} relative z-10`}
            >
              <p className="font-semibold">{qualityStats.desc}</p>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <div className="col-span-full flex justify-center pt-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0], y: [0, 8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center gap-1.5 cursor-pointer text-text-muted hover:text-accent-gold"
              onClick={() => scrollToSection('kpis')}
            >
              <span className="text-[9px] uppercase font-black tracking-widest">Scroll to Explore</span>
              <div className="w-5 h-8 rounded-full border-2 border-current flex justify-center p-1 relative">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-gold" style={{ animation: 'scroll-dot 1.8s ease-in-out infinite' }} />
              </div>
            </motion.div>
          </div>
        </motion.section>

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
            const releaseBugMetrics = data.releaseBugStatus?.metrics
            const releaseTestingPassed = data.releaseItems?.filter(i => i?.status === 'Pass').length || 0
            const releaseTestingFailed = data.releaseItems?.filter(i => i?.status === 'Fail').length || 0
            const releaseTestingBlocked = data.releaseItems?.filter(i => i?.status === 'Blocked').length || 0
            const releaseTestingTotal = data.releaseItems?.length || 0
            const supportTicketsTotal = data.supportTickets?.length || 0
            const supportCritical = data.supportTickets?.filter(t => t?.priority === 'Critical').length || 0
            const supportHigh = data.supportTickets?.filter(t => t?.priority === 'High').length || 0
            const supportResolved = data.supportTickets?.filter(t => t?.status === 'Resolved' || t?.status === 'Closed').length || 0

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
                  const passed = f.releaseItems?.filter((i: any) => i?.status === 'Pass').length || 0
                  return total > 0 ? Math.round((passed / total) * 100) : 0
                }),
                tooltip: 'Are we ready to release? • Target: 90%+',
                category: 'primary' as const
              },
              {
                label: 'Active Bugs',
                val: releaseBugMetrics?.activeBugs || data.defectsLastWeek.open,
                icon: AlertTriangle,
                color: 'text-red-400',
                desc: releaseBugMetrics ? `${releaseBugMetrics.totalBugs} total bugs` : 'Unresolved defects',
                sparklineData: getHistoricalValues(f => f.releaseBugStatus?.metrics?.activeBugs || f.defectsLastWeek.open || 0),
                pulse: (releaseBugMetrics?.activeBugs || data.defectsLastWeek.open) > 5,
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
              {
                label: 'QA Health Score',
                val: qualityStats.score,
                suffix: '%',
                icon: Star,
                color: 'text-purple-400',
                desc: qualityStats.label,
                sparklineData: getHistoricalValues(f => calculateQAScore(f).score),
                tooltip: 'Overall QA confidence',
                category: 'primary' as const
              },
              {
                label: 'Critical Tickets',
                val: supportCritical,
                icon: AlertTriangle,
                color: 'text-red-500',
                desc: 'Immediate action needed',
                sparklineData: getHistoricalValues(f => f.supportTickets?.filter((t: any) => t?.priority === 'Critical').length || 0),
                pulse: supportCritical > 3,
                tooltip: 'Production outages requiring immediate action',
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
                  label: 'Completed Bugs',
                  val: releaseBugMetrics.completedBugs,
                  icon: CheckCheck,
                  color: 'text-green-400',
                  desc: 'Bugs verified and closed',
                  sparklineData: getHistoricalValues(f => f.releaseBugStatus?.metrics?.completedBugs || 0),
                  tooltip: 'Fixed, tested & fully resolved',
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
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => i?.status === 'Pass').length || 0),
                tooltip: 'Successfully validated test cases',
                category: 'testingQuality' as const
              },
              {
                label: 'Tests Failed',
                val: releaseTestingFailed,
                icon: X,
                color: 'text-red-400',
                desc: 'Release tests failed',
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => i?.status === 'Fail').length || 0),
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
                sparklineData: getHistoricalValues(f => f.releaseItems?.filter((i: any) => i?.status === 'Blocked').length || 0),
                tooltip: 'Blocked by dependencies or environment',
                category: 'testingQuality' as const
              },

              // SUPPORT OPERATIONS CATEGORY
              {
                label: 'High Priority',
                val: supportHigh,
                icon: Zap,
                color: 'text-orange-400',
                desc: 'High priority tickets',
                sparklineData: getHistoricalValues(f => f.supportTickets?.filter((t: any) => t?.priority === 'High').length || 0),
                tooltip: 'Key issues impacting multiple users',
                category: 'supportOps' as const
              },
              {
                label: 'Resolved Tickets',
                val: supportResolved,
                icon: CheckCheck,
                color: 'text-green-400',
                desc: 'Resolved/closed tickets',
                sparklineData: getHistoricalValues(f => f.supportTickets?.filter((t: any) => t?.status === 'Resolved' || t?.status === 'Closed').length || 0),
                tooltip: 'Successfully resolved & closed',
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
          style={{ display: vis.show_sprintHealth === false ? 'none' : undefined }}
        >
          {/* ── Sprint Health Dashboard ── */}
          <div ref={sectionsRef.sprintHealth} className={`p-6 rounded-3xl border flex flex-col gap-4 ${tS.card} ${tS.border} ${tS.glow}`}>
            <div className="flex items-center justify-between">
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
              <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                <motion.div
                  initial={{ width: hasPlayed ? `${sprintHealthScore}%` : 0 }}
                  animate={{ width: `${sprintHealthScore}%` }}
                  transition={{ duration: hasPlayed ? 0 : 1.2, ease: 'easeOut' }}
                  onAnimationComplete={() => setIsHealthBarFilled(true)}
                  className={`h-full rounded-full relative overflow-hidden ${sprintHealthScore >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                    sprintHealthScore >= 70 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
                      'bg-gradient-to-r from-red-500 to-rose-400'
                    }`}
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
            className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 cursor-pointer group relative overflow-hidden ${tS.card} ${tS.border} ${tS.glow} transition-all duration-300 hover:border-green-500/30`}>
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
                      releaseReadinessScore >= 90 ? '#10b981' :
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
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                  <span className="text-text-muted">Regression Pass %</span>
                  <span className="font-bold">{totalCases > 0 ? Math.round((passedCases / totalCases) * 100) : 100}%</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-1">
                  <span className="text-text-muted">Open Critical Bugs</span>
                  <span className={`font-bold ${openBugsCount > 0 ? 'text-red-400' : ''}`}>{openBugsCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Blocked Test Cases</span>
                  <span className={`font-bold ${blockedCases > 0 ? 'text-orange-400' : ''}`}>{blockedCases}</span>
                </div>

                <div className={`mt-3 p-2.5 rounded-xl text-center text-[10px] font-black uppercase tracking-widest border ${releaseReadinessScore >= 90 ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                  releaseReadinessScore >= 70 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                  {releaseReadinessScore >= 90 ? '🟢 Ready for Production' : releaseReadinessScore >= 70 ? '🟡 Needs Attention' : '🔴 Not Ready'}
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
          <div className={`overflow-x-auto rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={`border-b ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12] text-white/55' : 'border-slate-200 bg-slate-50 text-slate-500'} text-[10px] font-black uppercase tracking-wider`}>
                  {(() => {
                    const releaseColumns = [
                      { id: 'taskId', label: 'Task ID', defaultVisible: true },
                      { id: 'featureName', label: 'Feature', defaultVisible: true },
                      { id: 'assignee', label: 'Assignee', defaultVisible: true },
                      { id: 'status', label: 'Status', defaultVisible: true },
                      { id: 'priority', label: 'Priority', defaultVisible: true },
                      { id: 'remarks', label: 'Remarks', defaultVisible: true },
                    ]
                    const visibleColumns = data.visibleReleaseColumns || releaseColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                    const visibleColumnsList = releaseColumns.filter(col => visibleColumns[col.id])
                    return visibleColumnsList.map(col => (
                      <th key={col.id} className={`py-3.5 px-5 ${col.id === 'status' || col.id === 'priority' ? 'text-center' : ''}`}>{col.label}</th>
                    ))
                  })()}
                </tr>
              </thead>
              <tbody>
                {data.releaseItems.map((item, idx) => {
                  const releaseColumns = [
                    { id: 'taskId', label: 'Task ID', defaultVisible: true },
                    { id: 'featureName', label: 'Feature', defaultVisible: true },
                    { id: 'assignee', label: 'Assignee', defaultVisible: true },
                    { id: 'status', label: 'Status', defaultVisible: true },
                    { id: 'priority', label: 'Priority', defaultVisible: true },
                    { id: 'remarks', label: 'Remarks', defaultVisible: true },
                  ]
                  const visibleColumns = data.visibleReleaseColumns || releaseColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                  const visibleColumnsList = releaseColumns.filter(col => visibleColumns[col.id])

                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={`border-b text-xs transition-colors hover:bg-white/[0.03] ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} ${idx % 2 === 0 ? '' : theme === 'dark' ? 'bg-white/[0.015]' : 'bg-slate-50/50'}`}
                    >
                      {visibleColumnsList.map(col => {
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
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${item.status === 'Pass' ? 'bg-green-500/10 text-green-400' : item.status === 'Fail' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-accent-gold'}`}>{item.status}</span>
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
                  <tr><td colSpan={(() => {
                    const releaseColumns = [
                      { id: 'taskId', label: 'Task ID', defaultVisible: true },
                      { id: 'featureName', label: 'Feature', defaultVisible: true },
                      { id: 'assignee', label: 'Assignee', defaultVisible: true },
                      { id: 'status', label: 'Status', defaultVisible: true },
                      { id: 'priority', label: 'Priority', defaultVisible: true },
                      { id: 'remarks', label: 'Remarks', defaultVisible: true },
                    ]
                    const visibleColumns = data.visibleReleaseColumns || releaseColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                    return releaseColumns.filter(col => visibleColumns[col.id]).length
                  })()} className="py-8 text-center text-xs text-text-muted">No items configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
                { label: 'Completed', val: data.releaseBugStatus.metrics.completedBugs, color: 'text-green-400' },
                { label: 'Resolved', val: data.releaseBugStatus.metrics.resolvedBugs, color: 'text-emerald-400' },
                { label: 'Active', val: data.releaseBugStatus.metrics.activeBugs, color: 'text-red-400' },
                { label: 'Closure %', val: `${data.releaseBugStatus.metrics.closurePercentage.toFixed(1)}%`, color: 'text-accent-gold' },
              ].map(kpi => (
                <div key={kpi.label} className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.02] border-white/5' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-text-muted block">{kpi.label}</span>
                  <span className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</span>
                </div>
              ))}
            </div>

            {/* Status Table */}
            <div className={`overflow-x-auto rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={`border-b ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12] text-white/55' : 'border-slate-200 bg-slate-50 text-slate-500'} text-[10px] font-black uppercase tracking-wider`}>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Count</th>
                    <th className="py-3.5 px-5 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.releaseBugStatus.statusDistribution.map((row: any) => (
                    <tr key={row.status} className={`border-b text-xs ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}>
                      <td className={`py-3 px-5 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{row.status}</td>
                      <td className="py-3 px-5 text-right font-bold text-text-secondary">{row.count}</td>
                      <td className="py-3 px-5 text-right text-text-muted">{((row.count / data.releaseBugStatus.metrics.totalBugs) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className={`overflow-x-auto rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={`border-b ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12] text-white/55' : 'border-slate-200 bg-slate-50 text-slate-500'} text-[10px] font-black uppercase tracking-wider`}>
                  {(() => {
                    const supportColumns = [
                      { id: 'taskId', label: 'Ticket', defaultVisible: true },
                      { id: 'description', label: 'Description', defaultVisible: true },
                      { id: 'assignedQA', label: 'QA', defaultVisible: true },
                      { id: 'status', label: 'Status', defaultVisible: true },
                      { id: 'priority', label: 'Priority', defaultVisible: true },
                      { id: 'remarks', label: 'Remarks', defaultVisible: true },
                    ]
                    const visibleColumns = data.visibleSupportColumns || supportColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                    const visibleColumnsList = supportColumns.filter(col => visibleColumns[col.id])
                    return visibleColumnsList.map(col => (
                      <th key={col.id} className="py-3.5 px-5">{col.label}</th>
                    ))
                  })()}
                </tr>
              </thead>
              <tbody>
                {data.supportTickets.map((ticket, idx) => {
                  const supportColumns = [
                    { id: 'taskId', label: 'Ticket', defaultVisible: true },
                    { id: 'description', label: 'Description', defaultVisible: true },
                    { id: 'assignedQA', label: 'QA', defaultVisible: true },
                    { id: 'status', label: 'Status', defaultVisible: true },
                    { id: 'priority', label: 'Priority', defaultVisible: true },
                    { id: 'remarks', label: 'Remarks', defaultVisible: true },
                  ]
                  const visibleColumns = data.visibleSupportColumns || supportColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                  const visibleColumnsList = supportColumns.filter(col => visibleColumns[col.id])

                  return (
                    <motion.tr
                      key={ticket.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      className={`border-b text-xs transition-colors hover:bg-white/[0.03] ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'} ${idx % 2 === 0 ? '' : theme === 'dark' ? 'bg-white/[0.015]' : 'bg-slate-50/50'}`}
                    >
                      {visibleColumnsList.map(col => {
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
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${ticket.status === 'Resolved' ? 'bg-green-500/10 text-green-400' : ticket.status === 'Closed' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{ticket.status}</span>
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
                  <tr><td colSpan={(() => {
                    const supportColumns = [
                      { id: 'taskId', label: 'Ticket', defaultVisible: true },
                      { id: 'description', label: 'Description', defaultVisible: true },
                      { id: 'assignedQA', label: 'QA', defaultVisible: true },
                      { id: 'status', label: 'Status', defaultVisible: true },
                      { id: 'priority', label: 'Priority', defaultVisible: true },
                      { id: 'remarks', label: 'Remarks', defaultVisible: true },
                    ]
                    const visibleColumns = data.visibleSupportColumns || supportColumns.reduce((acc, col) => ({ ...acc, [col.id]: col.defaultVisible }), {} as Record<string, boolean>)
                    return supportColumns.filter(col => visibleColumns[col.id]).length
                  })()} className="py-8 text-center text-xs text-text-muted">No tickets logged.</td></tr>
                )}
              </tbody>
            </table>
          </div>
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
                    <div className="pt-2 border-t border-white/5">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">Closure Rate</span>
                        <span className="font-bold text-green-400">{d.reported ? Math.round((d.closed / d.reported) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${compareMode ? 'bg-accent-gold text-black border-accent-gold' : 'bg-white/5 border-white/10 text-text-secondary hover:text-white'}`}
              >
                <GitCompare className="w-4 h-4" />
                {compareMode ? 'Show WoW Cards' : 'Compare Saved Reports'}
              </button>
            )}
          </div>

          {compareMode ? (
            <div className={`p-6 rounded-3xl border flex flex-col gap-6 ${tS.card} ${tS.border} ${tS.glow}`}>
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
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
                      className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                    >
                      <option value="">Choose Report A...</option>
                      {activeHistory.map(r => (
                        <option key={r.id} value={r.id}>{r.week || r.form.weekStart} - {r.form.projectName}</option>
                      ))}
                    </select>
                  </div>

                  <span className="text-text-muted mt-4">vs</span>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold text-text-muted">Report B (Comparison)</span>
                    <select
                      value={compareReportB}
                      onChange={e => setCompareReportB(e.target.value)}
                      className="bg-[#1a1a1a] border border-white/10 text-white rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none"
                    >
                      <option value="">Choose Report B...</option>
                      {activeHistory.map(r => (
                        <option key={r.id} value={r.id}>{r.week || r.form.weekStart} - {r.form.projectName}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Compare Results Display */}
              {(() => {
                const repA = activeHistory.find(r => r.id === compareReportA)?.form
                const repB = activeHistory.find(r => r.id === compareReportB)?.form

                if (!repA || !repB) {
                  return (
                    <div className="p-8 text-center text-xs text-text-muted border border-dashed border-white/5 rounded-2xl">
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
                        <span className="text-sm font-extrabold mt-1 text-white">{winner}</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-between">
                        <span className="text-[9px] uppercase font-bold text-blue-400 tracking-wider">Biggest Improvement</span>
                        <span className="text-sm font-extrabold mt-1 text-white">{biggestImp}</span>
                      </div>
                    </div>

                    {/* Comparison table grid */}
                    <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.01]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/5 text-[10px] font-black uppercase text-text-muted">
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
                                className="border-b border-white/5"
                              >
                                <td className="p-4 font-bold text-white">{m.name}</td>
                                <td className="p-4 text-text-secondary">{m.valA}</td>
                                <td className="p-4 text-white font-extrabold">{m.valB}</td>
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
                    </div>
                  </div>
                )
              })()}
            </div>
          ) : !prevReport ? (
            <div className={`p-8 rounded-2xl border text-center text-sm ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 text-white/50' : 'bg-white border-slate-200 text-slate-500'}`}>
              <p className="font-semibold text-accent-gold mb-1">No previous report available for comparison</p>
              <p className="text-xs">Save your first report to start tracking week-over-week performance changes.</p>
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
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Historical Analytics</h2>
            </div>

            {historicalChartsData.length < 2 ? (
              <div className={`p-8 rounded-2xl border text-center text-sm ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 text-white/50' : 'bg-white border-slate-200 text-slate-500'}`}>
                <p className="font-semibold text-accent-gold mb-1">Insufficient Historical Data</p>
                <p className="text-xs">At least 2 saved reports are required to calculate trend performance charts.</p>
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
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="emails" name="Support Emails" stroke="#3b82f6" strokeWidth={2} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="features" name="Features Tested" stroke="#facc15" strokeWidth={2} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="fixes" name="Code Fixes" stroke="#a855f7" strokeWidth={2} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                {/* 2. Defect Closure Trend (Area) */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: "-45px" }}
                  transition={{ duration: 0.5, delay: 0.05 }}
                  className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
                >
                  <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Defect Closure Trend</span>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="reportedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="closedGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="reportedDefects" name="Reported Defects" stroke="#f87171" fill="url(#reportedGrad)" strokeWidth={2} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="closedDefects" name="Closed Defects" stroke="#10b981" fill="url(#closedGrad)" strokeWidth={2} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                      </AreaChart>
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
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" dataKey="escapedIssueProd" stackId="1" name="Escaped Issue" stroke="#d4af37" fill="#d4af37" fillOpacity={0.4} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="supportFixProd" stackId="1" name="Support Fix" stroke="#eab308" fill="#eab308" fillOpacity={0.4} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="changeRequestProd" stackId="1" name="Change Req" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="dataIssueProd" stackId="1" name="Data Issue" stroke="#f87171" fill="#f87171" fillOpacity={0.4} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Area type="monotone" dataKey="backendUpdationProd" stackId="1" name="Backend Update" stroke="#10b981" fill="#10b981" fillOpacity={0.4} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
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
                      <LineChart data={historicalChartsData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="emails" name="Support tickets" stroke="#06b6d4" strokeWidth={2.5} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                      </LineChart>
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
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="teamSize" name="Allocated Engineers" fill="rgba(212,175,55,0.2)" radius={[4, 4, 0, 0]} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Line type="monotone" dataKey="healthScore" name="QA Health Score %" stroke="#10b981" strokeWidth={2.5} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
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
                        <XAxis dataKey="name" stroke={chartText} fontSize={9} />
                        <YAxis stroke={chartText} fontSize={9} />
                        <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="passFeatures" name="Passed" stackId="a" fill="#10b981" isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Bar dataKey="failFeatures" name="Failed" stackId="a" fill="#f87171" isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                        <Bar dataKey="blockedFeatures" name="Blocked" stackId="a" fill="#fb923c" isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

              </div>
            )}
          </motion.section>
        )}

        {/* ── SECTION 6: WEEKLY ANCHORED CHARTS ── */}
        <section ref={sectionsRef.charts} className="flex flex-col gap-6" style={{ display: vis.show_weeklyCharts === false ? 'none' : undefined }}>
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
                    <Pie data={workDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out">
                      {workDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
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
                    <XAxis dataKey="category" stroke={chartText} fontSize={9} />
                    <YAxis stroke={chartText} fontSize={9} />
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="lastWeek" name="Last Week" fill="#d4af37" radius={[4, 4, 0, 0]} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="mtd" name="MTD" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out" />
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
                    <Pie data={defectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" isAnimationActive={!hasPlayed} animationDuration={1500} animationEasing="ease-out">
                      {defectStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.hex} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </div>
        </section>

        {/* ── SECTION 8: TEAM RESOURCE ALLOCATION ── */}
        <section ref={sectionsRef.team} className="flex flex-col gap-6" style={{ display: vis.show_teamAllocation === false ? 'none' : undefined }}>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Team Resource Allocation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: 'New Feature Testing', members: data.newFeatureTeam, barColor: 'bg-blue-500', metrics: '8 items tested' },
              { role: 'Production Support', members: data.supportTeam, barColor: 'bg-green-500', metrics: '3 log exceptions resolved' },
              { role: 'Automation Engineering', members: data.automationTeam, barColor: 'bg-purple-500', metrics: '' }
            ].map(group => (
              <div
                key={group.role}
                className={`p-6 rounded-2xl border relative overflow-hidden ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}
              >
                <div className={`h-1.5 w-16 rounded-full mb-4 ${group.barColor}`} />
                <h3 className={`text-base font-extrabold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{group.role}</h3>
                <span className="text-[10px] uppercase font-bold text-accent-gold tracking-widest">{group.metrics}</span>

                <div className="flex flex-col gap-3 mt-6">
                  {group.members.map(member => (
                    <div key={member} className="flex items-center justify-between border-t border-white/5 pt-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs font-black text-text-muted">
                          {member.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold">{member}</span>
                      </div>
                      <span className="text-[10px] font-bold text-text-muted">QA Specialist</span>
                    </div>
                  ))}
                  {group.members.length === 0 && <span className="text-xs text-text-muted">No resources assigned.</span>}
                </div>
              </div>
            ))}
          </div>
        </section>

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
              <Star className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Next Week Priorities</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.nextPriorities.map((priority, idx) => (
                <div
                  key={priority.id}
                  className={`p-5 rounded-2xl border flex flex-col gap-2 relative ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 shadow-sm'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-accent-gold">0{idx + 1}.</span>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Due: {priority.dueDate}</span>
                  </div>
                  <h3 className={`text-sm font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{priority.title}</h3>
                  <p className="text-xs text-text-secondary leading-normal">{priority.description}</p>
                  <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-1">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Owner: {priority.owner}</span>
                  </div>
                </div>
              ))}
              {data.nextPriorities.length === 0 && (
                <div className="col-span-full p-8 text-center text-xs text-text-muted">No priorities set for next week.</div>
              )}
            </div>
          </motion.section>
        )}

      </motion.div>

      {/* ── Footer — Consistent with main app ── */}
      <footer
        className="mt-16 py-4 px-4"
        style={{ borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}` }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
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

      {/* ── Defect Status Modal ── */}
      <DefectStatusModal
        isOpen={showDefectModal}
        onClose={() => setShowDefectModal(false)}
        releaseBugStatus={data.releaseBugStatus}
        fallbackData={data.defectsLastWeek}
        projectName={data.projectName}
      />

      {/* ── Work Distribution Modal ── */}
      <WorkDistributionModal
        isOpen={showWorkDistributionModal}
        onClose={() => setShowWorkDistributionModal(false)}
        workDistributionData={workDistributionData}
        projectName={data.projectName}
      />

      {/* ── Production Issues Modal ── */}
      <ProductionIssuesModal
        isOpen={showProductionIssuesModal}
        onClose={() => setShowProductionIssuesModal(false)}
        prodIssuesData={prodIssuesData}
        projectName={data.projectName}
      />

      {/* ── Release Readiness Modal ── */}
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

      {/* ── Team Capacity Modal ── */}
      {
        data.teamCapacity && (
          <TeamCapacityModal
            isOpen={showTeamCapacityModal}
            onClose={() => setShowTeamCapacityModal(false)}
            data={data.teamCapacity}
            projectName={data.projectName}
          />
        )
      }

      {/* ── Executive Quality Score Modal ── */}
      <ExecutiveQualityScoreModal
        isOpen={showQualityScoreModal}
        onClose={() => setShowQualityScoreModal(false)}
        data={data}
        score={qualityStats.score}
        label={qualityStats.label}
        color={qualityStats.color}
      />
    </div >
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
      return (
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 text-white font-montreal">
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 max-w-md w-full text-center backdrop-blur-xl shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl text-red-500">⚠️</span>
            </div>
            <h2 className="text-xl font-bold font-clash mb-2">Dashboard Error</h2>
            <p className="text-white/45 text-xs mb-6 text-left p-3 bg-black/40 rounded-xl overflow-y-auto max-h-32 font-mono break-all leading-normal">
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
                className="px-6 py-2.5 bg-white/5 border border-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-colors w-full"
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
