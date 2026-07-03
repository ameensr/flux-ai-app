import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import {
  TrendingUp, TrendingDown, Mail, Zap, Wrench, Shield, Check,
  AlertTriangle, Play, HelpCircle, Activity, Sun, Moon, Maximize2,
  Minimize2, Download, Printer, Copy, RefreshCw, X, ChevronRight,
  BookOpen, Star, Sparkles, FileText, LayoutGrid, Users, History, CheckCheck,
  ArrowRightLeft, GitCompare, Eye, EyeOff, Palette, Lock, Unlock,
  Cpu, GitBranch, Terminal, Code2, ChevronDown
} from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { BRAND } from '@/lib/brand'

const customStyles = `
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
import type { QAReportForm, SupportTicket, ReleaseItem, HistoricalDefect } from '../types'
import { useTheme } from '@/context/ThemeContext'

// Report preview has its own isolated theme system — independent of the global dark/light toggle.
type ReportThemeId = 'dark' | 'light' | 'fabric' | 'github' | 'apple' | 'material' | 'cred' | 'powerbi' | 'cyber' | 'glassmorphism' | 'nordic' | 'notion' | 'stripe' | 'bloomberg'
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
}
const CountUpNumber: React.FC<CountUpProps> = ({ end, suffix = '' }) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let startTimestamp: number | null = null
    const duration = 1000 // ms
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) {
        window.requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }
    window.requestAnimationFrame(step)
  }, [end])

  return <span>{count}{suffix}</span>
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

  const activeHistory = savedReports.map(r => ({
    ...r,
    form: ensureFormData(r.form)
  }))

  const [data, setData] = useState<QAReportForm>(() => {
    const raw = localStorage.getItem('current-qa-report-data')
    if (raw) { try { return ensureFormData(JSON.parse(raw)) } catch { } }
    return ensureFormData(null)
  })
  const [isLoaded, setIsLoaded] = useState(() => !!localStorage.getItem('current-qa-report-data'))
  const { theme: globalTheme } = useTheme()
  const theme = globalTheme === 'light' ? 'light' : 'dark'
  const [reportTheme, setReportTheme] = React.useState<ReportThemeId>(
    () => (localStorage.getItem('report-preview-theme') as ReportThemeId) || (globalTheme === 'light' ? 'light' : 'dark')
  )
  const themeGallery: ReportThemeId = reportTheme
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

  // Once reports are fetched from Supabase, hydrate data if not already loaded from localStorage
  useEffect(() => {
    if (!isLoaded) {
      if (activeHistory.length > 0) {
        setData(ensureFormData(activeHistory[0].form))
      }
      setIsLoaded(true)
    }
  }, [activeHistory, isLoaded])




  // ── Calculation Utilities ──────────────────────────────────────────────────
  const releaseCount = data.releaseItems.length
  const releasePassed = data.releaseItems.filter(i => i?.status === 'Pass').length
  const releaseFailed = data.releaseItems.filter(i => i?.status === 'Fail').length
  const releaseBlocked = data.releaseItems.filter(i => i?.status === 'Blocked').length
  const passRate = releaseCount ? Math.round((releasePassed / releaseCount) * 100) : 0

  const activeDefectsTotal = data.defectsLastWeek.reported
  const defectClosureRate = activeDefectsTotal ? Math.round((data.defectsLastWeek.closed / activeDefectsTotal) * 100) : 0

  // ── Executive Quality Score Calculation ──
  const calculateQualityScore = (): { score: number; label: string; color: string; desc: string } => {
    let score = 70 // Baseline score

    // 1. Defect Closure Rate contribution (+15 max)
    score += (defectClosureRate / 100) * 15
    // 2. Release pass rate contribution (+15 max)
    score += (passRate / 100) * 15
    // 3. Open Defects Penalty (-2 per open defect)
    score -= Math.min(data.defectsLastWeek.open * 2, 15)
    // 4. Production Issues Penalty (-3 per production issue last week)
    const prodIssues = Object.values(data.lastWeek).reduce((a, b) => a + b, 0)
    score -= Math.min(prodIssues * 3, 20)

    const finalScore = Math.max(Math.min(Math.round(score), 100), 0)

    if (finalScore >= 90) return { score: finalScore, label: 'Excellent', color: 'text-green-400 border-green-500/20 bg-green-500/5', desc: 'System quality is extremely high. All main releases pass regression guidelines.' }
    if (finalScore >= 70) return { score: finalScore, label: 'Good', color: 'text-accent-gold border-accent-gold/20 bg-accent-gold/5', desc: 'QA health checks out stable. Backlog contains minor non-blocking issues.' }
    if (finalScore >= 50) return { score: finalScore, label: 'Needs Attention', color: 'text-orange-400 border-orange-500/20 bg-orange-500/5', desc: 'Bugs open count is rising. Plan regression sprints to clear out backlog debt.' }
    return { score: finalScore, label: 'Critical', color: 'text-red-400 border-red-500/20 bg-red-500/5', desc: 'Critical support queues are overflowing. Major deployment items blocked.' }
  }

  const qualityStats = calculateQualityScore()

  // ── Theme Gallery configurations ──
  const getThemeStyles = () => {
    switch (themeGallery) {
      case 'light':
        return {
          bg: 'bg-[#f8f8f8] text-[#111111]',
          card: 'bg-white border-black/10 rounded-3xl shadow-sm',
          accent: 'text-[#b8960c]',
          accentBg: 'bg-[#b8960c] text-white hover:bg-yellow-600',
          border: 'border-black/10',
          glow: '',
          font: 'font-general',
          chartColors: ['#B8960C', '#2563eb', '#059669', '#7c3aed', '#ea580c']
        }
      case 'dark':
        return {
          bg: 'bg-[#0B0B0B] text-[#F5F5F5]',
          card: 'bg-[#111111] border-white/5 rounded-3xl',
          accent: 'text-[#d4af37]',
          accentBg: 'bg-[#d4af37] text-black hover:bg-yellow-500',
          border: 'border-white/5',
          glow: '',
          font: 'font-general',
          chartColors: ['#D4AF37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
        }
      case 'fabric':
        return {
          bg: 'bg-[#f3f2f1] text-[#323130]',
          card: 'bg-white border-[#edebe9] shadow-sm rounded-none',
          accent: 'text-[#0078d4]',
          accentBg: 'bg-[#0078d4] text-white hover:bg-[#106ebe]',
          border: 'border-[#edebe9]',
          glow: '',
          font: 'font-inter',
          chartColors: ['#0078d4', '#107c41', '#a80038', '#d83b01', '#5c2d91']
        }
      case 'github':
        return {
          bg: 'bg-[#0d1117] text-[#c9d1d9]',
          card: 'bg-[#161b22] border-[#30363d] rounded-lg',
          accent: 'text-[#58a6ff]',
          accentBg: 'bg-[#238636] text-white hover:bg-[#2ea44f]',
          border: 'border-[#30363d]',
          glow: '',
          font: 'font-mono',
          chartColors: ['#58a6ff', '#3fb950', '#f85149', '#db6d28', '#ab7df8']
        }
      case 'apple':
        return {
          bg: 'bg-[#f5f5f7] text-[#1d1d1f]',
          card: 'bg-white/80 backdrop-blur-md border-[#d2d2d7] rounded-3xl shadow-[0_4px_30px_rgba(0,0,0,0.02)]',
          accent: 'text-[#0071e3]',
          accentBg: 'bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-full',
          border: 'border-[#d2d2d7]',
          glow: '',
          font: 'font-satoshi',
          chartColors: ['#0071e3', '#34c759', '#ff3b30', '#ff9500', '#af52de']
        }
      case 'material':
        return {
          bg: 'bg-[#f7f9fc] text-[#1f1f1f]',
          card: 'bg-[#eff4f9] border-none rounded-[28px] shadow-sm',
          accent: 'text-[#0b57d0]',
          accentBg: 'bg-[#0b57d0] text-white hover:bg-[#0842a0] rounded-full',
          border: 'border-[#c4c7c5]',
          glow: '',
          font: 'font-general',
          chartColors: ['#0b57d0', '#b31412', '#137333', '#e37400', '#7a28cb']
        }
      case 'cred':
        return {
          bg: 'bg-[#090909] text-[#e5e5e5]',
          card: 'bg-[#121212] border-white/5 rounded-2xl shadow-xl',
          accent: 'text-[#d4af37]',
          accentBg: 'bg-[#d4af37] text-black hover:bg-yellow-500 font-extrabold',
          border: 'border-white/5',
          glow: 'shadow-[0_0_30px_rgba(212,175,55,0.05)] border-accent-gold/20',
          font: 'font-clash',
          chartColors: ['#d4af37', '#ffffff', '#888888', '#444444', '#111111']
        }
      case 'powerbi':
        return {
          bg: 'bg-[#eaeaea] text-[#333333]',
          card: 'bg-white border-[#b8babd] rounded-md shadow-sm',
          accent: 'text-[#f2c811]',
          accentBg: 'bg-[#118d95] text-white hover:bg-[#0f7c83]',
          border: 'border-[#b8babd]',
          glow: '',
          font: 'font-inter',
          chartColors: ['#118d95', '#f2c811', '#e15241', '#3599b8', '#dfbf00']
        }
      case 'cyber':
        return {
          bg: 'bg-[#030303] text-[#00f0ff]',
          card: 'bg-[#0a0a0f] border-[#ff0055]/30 rounded-xl shadow-[0_0_15px_rgba(255,0,85,0.15)]',
          accent: 'text-[#00f0ff]',
          accentBg: 'bg-gradient-to-tr from-[#ff0055] to-[#00f0ff] text-black font-black uppercase',
          border: 'border-[#ff0055]/20',
          glow: 'shadow-[0_0_20px_rgba(0,240,255,0.1)] border-[#00f0ff]/30',
          font: 'font-mono',
          chartColors: ['#00f0ff', '#ff0055', '#b500ff', '#ffb700', '#00ff66']
        }
      case 'glassmorphism':
        return {
          bg: 'bg-[#09090b] text-white',
          card: 'bg-white/[0.01] border-white/5 rounded-3xl backdrop-blur-xl',
          accent: 'text-[#d4af37]',
          accentBg: 'bg-gradient-to-tr from-[#d4af37] to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold',
          border: 'border-white/5',
          glow: 'shadow-[0_0_20px_rgba(255,255,255,0.02)]',
          font: 'font-montreal',
          chartColors: ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
        }
      case 'nordic':
        return {
          bg: 'bg-[#2e3440] text-[#eceff4]',
          card: 'bg-[#3b4252] border-[#4c566a] rounded-2xl',
          accent: 'text-[#88c0d0]',
          accentBg: 'bg-[#88c0d0] text-[#2e3440] hover:bg-[#81b8c8] font-bold',
          border: 'border-[#4c566a]',
          glow: '',
          font: 'font-satoshi',
          chartColors: ['#88c0d0', '#a3be8c', '#ebcb8b', '#bf616a', '#b48ead']
        }
      case 'notion':
        return {
          bg: 'bg-[#ffffff] text-[#37352f]',
          card: 'bg-[#ffffff] border-[#e3e3e0] rounded-lg shadow-none',
          accent: 'text-[#2eaadc]',
          accentBg: 'bg-[#37352f] text-white hover:bg-[#4a4a42] rounded-md font-bold',
          border: 'border-[#e3e3e0]',
          glow: '',
          font: 'font-inter',
          chartColors: ['#2eaadc', '#6940a5', '#d44c47', '#cb912f', '#448361']
        }
      case 'stripe':
        return {
          bg: 'bg-[#0a2540] text-[#f6f9fc]',
          card: 'bg-[#0f2d4a] border-[#1a3d5c] rounded-2xl shadow-lg',
          accent: 'text-[#635bff]',
          accentBg: 'bg-[#635bff] text-white hover:bg-[#5247e5] rounded-full font-bold',
          border: 'border-[#1a3d5c]',
          glow: 'shadow-[0_4px_30px_rgba(99,91,255,0.08)]',
          font: 'font-satoshi',
          chartColors: ['#635bff', '#00d4aa', '#ff6e4a', '#ffbb33', '#80e9ff']
        }
      case 'bloomberg':
        return {
          bg: 'bg-[#000000] text-[#ff9900]',
          card: 'bg-[#111111] border-[#333333] rounded-none',
          accent: 'text-[#ff9900]',
          accentBg: 'bg-[#ff9900] text-black hover:bg-[#ffaa22] font-black uppercase',
          border: 'border-[#333333]',
          glow: '',
          font: 'font-mono',
          chartColors: ['#ff9900', '#00cc66', '#ff3333', '#3399ff', '#cc66ff']
        }
      default:
        return {
          bg: 'bg-[#09090b] text-white',
          card: 'bg-white/[0.01] border-white/5 rounded-3xl backdrop-blur-xl',
          accent: 'text-[#d4af37]',
          accentBg: 'bg-gradient-to-tr from-[#d4af37] to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold',
          border: 'border-white/5',
          glow: 'shadow-[0_0_20px_rgba(255,255,255,0.02)]',
          font: 'font-montreal',
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
  const openBugsCount = data.defectsLastWeek.open
  const passPctFactor = totalCases > 0 ? passedCases / totalCases : 1.0
  const openBugsFactor = 1 - openBugsCount / (openBugsCount + 5)
  const blockersFactor = 1 - blockedCases / (blockedCases + 3)
  const releaseReadinessScore = Math.max(0, Math.min(100, Math.round(
    (passPctFactor * 60) + (openBugsFactor * 25) + (blockersFactor * 15)
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
    if (passRate >= 90 || qualityStats.score >= 90) {
      const colors = ['#d4af37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
      const particles = Array.from({ length: 120 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * -100 - 20,
        vx: Math.random() * 4 - 2,
        vy: Math.random() * 5 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 5,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2
      }))
      setConfetti(particles)
      toast({ title: 'Quality Goal Achieved! 🏆', description: 'QA Health score has exceeded 90% this week.' })
    }
  }, [passRate, qualityStats.score])

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
    fetchReports()
  }, [])

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
  const timelineData = activeHistory.slice(-5).map((h, i, arr) => {
    const currPassCount = h.form.releaseItems.filter((item: any) => item?.status === 'Pass').length
    const currPassRate = h.form.releaseItems.length ? Math.round((currPassCount / h.form.releaseItems.length) * 100) : 0

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
      healthScore: currPassRate,
      emailChange,
      rawForm: h.form
    }
  })

  // ── Historical Analytics Charts Data ──
  const historicalChartsData = activeHistory.map(h => {
    const passCount = h.form.releaseItems.filter((i: any) => i?.status === 'Pass').length
    const failCount = h.form.releaseItems.filter((i: any) => i?.status === 'Fail').length
    const blockedCount = h.form.releaseItems.filter((i: any) => i?.status === 'Blocked').length
    const passRate = h.form.releaseItems.length ? Math.round((passCount / h.form.releaseItems.length) * 100) : 0

    return {
      name: h.week?.split('–')[0]?.trim() || h.form.weekStart,
      emails: h.form.supportEmails,
      features: h.form.newFeatures,
      fixes: h.form.codeFixes,
      reportedDefects: h.form.defectsLastWeek.reported,
      closedDefects: h.form.defectsLastWeek.closed,
      healthScore: passRate,
      codeFixProd: h.form.lastWeek.codeFix,
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
    { category: 'Code Fix', lastWeek: data.lastWeek.codeFix, mtd: data.monthToDate.codeFix },
    { category: 'Support Exception', lastWeek: data.lastWeek.support, mtd: data.monthToDate.support },
    { category: 'Change Request', lastWeek: data.lastWeek.changeRequest, mtd: data.monthToDate.changeRequest },
    { category: 'Data Issue', lastWeek: data.lastWeek.dataIssue, mtd: data.monthToDate.dataIssue },
    { category: 'Backend Update', lastWeek: data.lastWeek.backendUpdation, mtd: data.monthToDate.backendUpdation }
  ]

  const workDistributionData = [
    { name: 'Support Tickets', value: data.supportEmails, hex: '#60a5fa' },
    { name: 'New Features', value: data.newFeatures * 2, hex: '#facc15' },
    { name: 'Code Fixes', value: data.codeFixes * 1.5, hex: '#a855f7' }
  ]

  const defectStatusData = [
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

      <style dangerouslySetInnerHTML={{ __html: customStyles }} />

      {/* ── Canvas Animated Particles ── */}
      <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none print:hidden" />

      {/* ── Background Glow Blobs ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden print:hidden">
        <motion.div
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -40, 20, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[160px] opacity-[0.15] ${theme === 'dark' ? 'bg-accent-gold' : 'bg-yellow-400'}`}
        />
        <motion.div
          animate={{
            x: [0, -30, 25, -15, 0],
            y: [0, 35, -15, 20, 0],
            scale: [1, 1.05, 0.98, 1.1, 1]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[150px] opacity-[0.12] ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-400'}`}
        />
      </div>

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
                  { id: 'aiSummary', label: 'AI Insights' },
                  { id: 'comparison', label: 'WoW' },
                  { id: 'historyDashboard', label: 'History' },
                  { id: 'roadmap', label: 'Priorities' }
                ].map(item => (
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

                {/* Theme Gallery Selection Dropdown */}
                <div
                  className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  }}
                >
                  <Palette className="w-3 h-3 text-accent-gold" />
                  <select
                    value={themeGallery}
                    onChange={e => {
                      const t = e.target.value as ReportThemeId
                      setReportTheme(t)
                      localStorage.setItem('report-preview-theme', t)
                    }}
                    className={`bg-transparent text-[11px] border-none focus:outline-none font-bold cursor-pointer max-w-[100px] ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}
                  >
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="dark">Dark</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="light">Light</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="glassmorphism">Glassmorphism</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="fabric">Fabric</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="github">GitHub</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="apple">Apple</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="material">Material 3</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="cred">CRED Black</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="powerbi">Power BI</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="cyber">Cyberpunk</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="nordic">Nordic</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="notion">Notion</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="stripe">Stripe</option>
                    <option className={theme === 'dark' ? 'bg-[#111111] text-white' : 'bg-white text-slate-800'} value="bloomberg">Bloomberg</option>
                  </select>
                </div>

                <button
                  onClick={() => setReportTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-2 rounded-xl border transition-all ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-yellow-400 hover:bg-white/[0.08]' : 'bg-white border-black/[0.06] text-purple-600 hover:bg-slate-50 shadow-sm'}`}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
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
                <span className={`text-[10px] uppercase font-bold tracking-widest ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Items Tested</span>
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

          {/* Executive Quality Score Gauge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className={`p-6 rounded-3xl border flex flex-col items-center justify-between text-center relative overflow-hidden shadow-2xl ${theme === 'dark' ? 'bg-white/[0.02] border-white/10' : 'bg-white border-slate-200'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-gold/5 to-blue-500/5 pointer-events-none" />
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">Executive Quality Score</span>
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
              className={`p-3 rounded-xl border text-xs leading-normal w-full ${qualityStats.color}`}
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
        >
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Key Performance Indicators</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
            {[
              { label: 'Support Emails', val: data.supportEmails, icon: Mail, color: 'text-blue-400', desc: 'Active support exceptions', sparklineData: getHistoricalValues(f => f.supportEmails) },
              { label: 'New Features', val: data.newFeatures, icon: Zap, color: 'text-accent-gold', desc: 'Sprint modules tested', sparklineData: getHistoricalValues(f => f.newFeatures) },
              { label: 'Code Fixes', val: data.codeFixes, icon: Wrench, color: 'text-purple-400', desc: 'Regression patches verified', sparklineData: getHistoricalValues(f => f.codeFixes) },
              { label: 'Defects Reported', val: data.defectsLastWeek.reported, icon: AlertTriangle, color: 'text-red-400', desc: 'Bugs raised last week', sparklineData: getHistoricalValues(f => f.defectsLastWeek.reported) },
              { label: 'Defects Closed', val: data.defectsLastWeek.closed, icon: Check, color: 'text-green-400', desc: 'Bugs resolved/closed', sparklineData: getHistoricalValues(f => f.defectsLastWeek.closed) },
              { label: 'Open Defects', val: data.defectsLastWeek.open, icon: Shield, color: 'text-orange-400', desc: 'Backlog open defect count', sparklineData: getHistoricalValues(f => f.defectsLastWeek.open), pulse: data.defectsLastWeek.open > 5, isInternal: true },
              { label: 'Team Size', val: data.newFeatureTeam.length + data.supportTeam.length + data.automationTeam.length, icon: Users, color: 'text-teal-400', desc: 'Active verification specialists', sparklineData: getHistoricalValues(f => f.newFeatureTeam.length + f.supportTeam.length + f.automationTeam.length), isInternal: true },
              { label: 'Backend Updates', val: data.lastWeek.backendUpdation, icon: History, color: 'text-pink-400', desc: 'Hotfixes & schema mods', sparklineData: getHistoricalValues(f => f.lastWeek.backendUpdation), isInternal: true },
              { label: 'Change Requests', val: data.lastWeek.changeRequest, icon: LayoutGrid, color: 'text-indigo-400', desc: 'Scope amendments verified', sparklineData: getHistoricalValues(f => f.lastWeek.changeRequest) },
              { label: 'QA Health Score', val: passRate, suffix: '%', icon: Star, color: 'text-amber-400', desc: 'Release verification score', sparklineData: getHistoricalValues(f => { const p = f.releaseItems.filter((i: any) => i?.status === 'Pass').length; return f.releaseItems.length ? Math.round((p / f.releaseItems.length) * 100) : 0 }) }
            ].filter(kpi => !clientMode || !kpi.isInternal).map((kpi, idx) => (
              <motion.div
                key={kpi.label}
                initial="initial"
                whileInView="show"
                whileHover="hover"
                variants={{
                  initial: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0 },
                  hover: { y: -6, scale: 1.02, boxShadow: theme === 'dark' ? '0 10px 30px -10px rgba(255,255,255,0.08)' : '0 10px 30px -10px rgba(0,0,0,0.12)' }
                }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.04 }}
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 group relative overflow-hidden transition-all duration-300 min-h-[140px] ${kpi.pulse ? 'ring-2 ring-red-500/30' : ''} ${theme === 'dark' ? 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]' : 'bg-white border-slate-200 hover:border-slate-300'}`}
              >
                {/* Gradient Border Glow */}
                <div className="absolute inset-0 border border-transparent bg-gradient-to-tr from-accent-gold/25 via-blue-500/25 to-transparent rounded-[inherit] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor', padding: '1px' }} />

                <div className="flex items-center justify-between">
                  <motion.div variants={{ hover: { rotate: [0, -8, 8, 0], scale: 1.15 } }} transition={{ duration: 0.4 }}>
                    <kpi.icon className={`w-5 h-5 ${kpi.color} ${kpi.pulse ? 'animate-pulse' : ''}`} />
                  </motion.div>
                  {kpi.sparklineData.length > 1 && (
                    <MiniSparkline data={kpi.sparklineData} color={kpi.color.includes('gold') ? '#d4af37' : kpi.color.includes('blue') ? '#60a5fa' : kpi.color.includes('green') ? '#4ade80' : '#a855f7'} />
                  )}
                  {kpi.pulse && (
                    <span className="absolute top-3 right-3 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                  )}
                </div>
                <div>
                  <span className={`text-3xl font-black block tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    <CountUpNumber end={kpi.val} suffix={kpi.suffix} />
                  </span>
                  <span className={`text-xs font-extrabold ${theme === 'dark' ? 'text-white/80' : 'text-slate-700'}`}>{kpi.label}</span>
                </div>
                <p className="text-[10px] text-text-muted leading-normal">{kpi.desc}</p>
              </motion.div>
            ))}
          </div>
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
                  initial={{ width: 0 }}
                  animate={{ width: `${sprintHealthScore}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
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

          {/* Release Readiness Meter (Radial Gauge) */}
          <div className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 ${tS.card} ${tS.border} ${tS.glow}`}>
            <div className="flex flex-col gap-1">
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
        >
          <div className="flex items-center gap-2">
            <CheckCheck className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Release Testing Status</h2>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={`border-b ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12] text-white/55' : 'border-slate-200 bg-slate-50 text-slate-500'} text-[10px] font-black uppercase tracking-wider`}>
                  <th className="py-3.5 px-5">Task ID</th>
                  <th className="py-3.5 px-5">Feature</th>
                  <th className="py-3.5 px-5">Assignee</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.releaseItems.map((item, idx) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    className={`border-b text-xs transition-colors hover:bg-white/[0.02] ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-accent-gold">{item.taskId}</td>
                    <td className={`py-3.5 px-5 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{item.featureName}</td>
                    <td className="py-3.5 px-5 text-text-secondary">{item.assignee}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.status === 'Pass' ? 'bg-green-500/10 text-green-400' : item.status === 'Fail' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-accent-gold'}`}>{item.status}</span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`text-[10px] font-bold ${item.priority === 'Critical' ? 'text-red-400' : item.priority === 'High' ? 'text-orange-400' : 'text-text-muted'}`}>{item.priority}</span>
                    </td>
                  </motion.tr>
                ))}
                {data.releaseItems.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-text-muted">No items configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

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
        >
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Support & Exception Log</h2>
          </div>
          <div className={`overflow-x-auto rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className={`border-b ${theme === 'dark' ? 'border-white/5 bg-[#0f0f12] text-white/55' : 'border-slate-200 bg-slate-50 text-slate-500'} text-[10px] font-black uppercase tracking-wider`}>
                  <th className="py-3.5 px-5">Ticket</th>
                  <th className="py-3.5 px-5">Description</th>
                  <th className="py-3.5 px-5">QA</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-center">Priority</th>
                </tr>
              </thead>
              <tbody>
                {data.supportTickets.map((ticket, idx) => (
                  <motion.tr
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    className={`border-b text-xs transition-colors hover:bg-white/[0.02] ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}`}
                  >
                    <td className="py-3.5 px-5 font-mono font-bold text-blue-400">{ticket.taskId}</td>
                    <td className={`py-3.5 px-5 font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{ticket.description}</td>
                    <td className="py-3.5 px-5 text-text-secondary">{ticket.assignedQA}</td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${ticket.status === 'Resolved' ? 'bg-green-500/10 text-green-400' : ticket.status === 'Closed' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>{ticket.status}</span>
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      <span className={`text-[10px] font-bold ${ticket.priority === 'Critical' ? 'text-red-400' : ticket.priority === 'High' ? 'text-orange-400' : 'text-text-muted'}`}>{ticket.priority}</span>
                    </td>
                  </motion.tr>
                ))}
                {data.supportTickets.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-xs text-text-muted">No tickets logged.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            DEFECTS ANALYSIS
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 6: DEFECTS ANALYSIS ── */}
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
                    <div className="h-full bg-green-400 rounded-full" style={{ width: `${d.reported ? Math.round((d.closed / d.reported) * 100) : 0}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            WEEKLY CHARTS & DISTRIBUTION
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 7: WEEKLY CHARTS ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.charts}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Weekly Charts & Distribution</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold">Work Distribution</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={workDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                      {workDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.hex} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold">Production Issue Categories</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodIssuesData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }}>
                    <XAxis dataKey="category" stroke={chartText} fontSize={9} />
                    <YAxis stroke={chartText} fontSize={9} />
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="lastWeek" name="Last Week" fill="#d4af37" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mtd" name="MTD" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={`p-5 rounded-2xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}>
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold">Defect Status Breakdown</span>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={defectStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                      {defectStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.hex} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ════════════════════════════════════════════════════════════
            AI INSIGHTS
        ════════════════════════════════════════════════════════════ */}

        {/* ── SECTION 8: AI EXECUTIVE SUMMARY ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.aiSummary}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">AI Insights</h2>
            </div>
            <button
              onClick={handleAIGenerate}
              disabled={isGeneratingAI}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-tr from-accent-gold to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
            >
              {isGeneratingAI ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Synthesizing...</> : <><Sparkles className="w-3.5 h-3.5" /> Regenerate</>}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: '🏆 Major Achievements', list: aiSummary.achievements, color: 'border-green-500/20 text-green-400', bg: 'bg-green-500/[0.03]' },
              { title: '⚠ Risks & Impediments', list: aiSummary.risks, color: 'border-red-500/20 text-red-400', bg: 'bg-red-500/[0.03]', isInternal: true },
              { title: '📈 Identified Trends', list: aiSummary.trends, color: 'border-blue-500/20 text-blue-400', bg: 'bg-blue-500/[0.03]' },
              { title: '💡 Recommendations', list: aiSummary.recommendations, color: 'border-purple-500/20 text-purple-400', bg: 'bg-purple-500/[0.03]' }
            ].filter(card => !clientMode || !card.isInternal).map(card => (
              <div key={card.title} className={`p-5 rounded-2xl border flex flex-col gap-3 ${card.bg} ${theme === 'dark' ? `border-white/5 ${card.color.split(' ')[0]}` : `border-slate-200`}`}>
                <span className={`text-xs font-black tracking-wide ${card.color.split(' ')[1]}`}>{card.title}</span>
                <ul className="flex flex-col gap-2">
                  {card.list.map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.08, ease: 'easeOut' }}
                      className="flex gap-2 items-start text-xs leading-relaxed"
                    >
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-gold" />
                      <span className={theme === 'dark' ? 'text-white/80' : 'text-slate-700'}>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

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

        {/* ── SECTION 3: AI EXECUTIVE SUMMARY ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.aiSummary}
          className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">AI Summary</h2>
            </div>
            <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-white/60' : 'text-slate-600'}`}>
              Synthesizing current weekly data against the last 5 saved history reports to map trends, regression vectors, and resource workloads.
            </p>
            <button
              onClick={handleAIGenerate}
              disabled={isGeneratingAI}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-tr from-accent-gold to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-extrabold text-xs uppercase tracking-widest transition-all mt-2 disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing data...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Regenerate summary
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: '🏆 Major Achievements', list: aiSummary.achievements, color: 'border-green-500/20 text-green-400' },
              { title: '⚠ Risks & Impediments', list: aiSummary.risks, color: 'border-red-500/20 text-red-400', isInternal: true },
              { title: '📈 Identified Trends', list: aiSummary.trends, color: 'border-blue-500/20 text-blue-400' },
              { title: '💡 Recommendations', list: aiSummary.recommendations, color: 'border-purple-500/20 text-purple-400' }
            ].filter(card => !clientMode || !card.isInternal).map(card => (
              <div
                key={card.title}
                className={`p-5 rounded-2xl border flex flex-col gap-3 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200'}`}
              >
                <span className={`text-sm font-black tracking-wide ${card.color}`}>{card.title}</span>
                <ul className="flex flex-col gap-2">
                  {card.list.map((item, idx) => (
                    <li key={idx} className="flex gap-2 items-start text-xs leading-normal">
                      <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent-gold" />
                      <span className={theme === 'dark' ? 'text-white/80' : 'text-slate-700'}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── SECTION 4: HISTORICAL PROGRESS TIMELINE ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex flex-col gap-6"
        >
          {(() => {
            const getTimelineFilteredData = () => {
              switch (timelineFilter) {
                case 'sprint':
                  return timelineData.filter((_, idx) => idx % 2 === 0).map(t => ({ ...t, week: `Sprint ${t.week.replace(/\D/g, '') || 'Cycle'}` }))
                case 'monthly':
                  return timelineData.filter((_, idx) => idx % 4 === 0).map(t => ({ ...t, week: `Month: ${new Date(t.rawForm.weekStart).toLocaleString('default', { month: 'long' })}` }))
                case 'quarterly':
                  return timelineData.filter((_, idx) => idx % 8 === 0).map(t => ({ ...t, week: `Quarterly Review Q${Math.floor(new Date(t.rawForm.weekStart).getMonth() / 3) + 1}` }))
                case 'weekly':
                default:
                  return timelineData
              }
            }

            const filteredTimeline = getTimelineFilteredData()

            return (
              <>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-accent-gold" />
                    <h2 className="text-2xl font-extrabold font-clash">Weekly QA Progress Timeline</h2>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl text-[10px]">
                    {(['weekly', 'sprint', 'monthly', 'quarterly'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setTimelineFilter(tab)}
                        className={`px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider transition-all ${timelineFilter === tab ? 'bg-[#d4af37] text-black shadow-lg' : 'text-text-muted hover:text-white'}`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative pl-6 flex flex-col gap-8 ml-2 pt-2">
                  {/* Dynamic drawing connecting line */}
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className={`absolute left-0 top-4 w-[1px] ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'} origin-top`}
                  />
                  {filteredTimeline.map((week, idx) => {
                    const isExpanded = !!expandedTimelineWeeks[week.id]
                    return (
                      <div key={week.id} className="flex flex-col gap-3">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: idx * 0.08, duration: 0.5, ease: 'easeOut' }}
                          onClick={() => {
                            setExpandedTimelineWeeks(prev => ({ ...prev, [week.id]: !prev[week.id] }))
                          }}
                          className={`relative group p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${theme === 'dark' ? 'bg-white/[0.01] border-white/5 hover:border-white/20 hover:bg-white/[0.03]' : 'bg-white border-slate-200 hover:shadow-md'}`}
                        >
                          {/* Timeline node marker */}
                          <motion.div
                            whileHover={{ scale: 1.3 }}
                            className={`absolute left-[-31px] top-6 z-10 w-3.5 h-3.5 rounded-full border-2 transition-transform duration-300 group-hover:scale-125 ${week.healthScore >= 90 ? 'bg-green-400 border-green-500/20' : week.healthScore >= 70 ? 'bg-yellow-400 border-yellow-500/20' : 'bg-red-400 border-red-500/20'}`}
                          />

                          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black uppercase tracking-widest text-accent-gold">{week.week}</span>
                              <span className="text-[10px] text-text-muted">({isExpanded ? 'Collapse' : 'Expand Details'})</span>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${week.healthScore >= 90 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                              Health Index: {week.healthScore}%
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2 border-t border-white/5">
                            <div>
                              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Emails</span>
                              <span className="text-sm font-bold">{week.emails} <span className="text-[10px] text-green-400">{week.emailChange}</span></span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Features</span>
                              <span className="text-sm font-bold">{week.features}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Fixes</span>
                              <span className="text-sm font-bold">{week.fixes}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Open Bugs</span>
                              <span className="text-sm font-bold text-red-400">{week.openDefects}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-text-muted block uppercase font-bold tracking-wider">Closed Bugs</span>
                              <span className="text-sm font-bold text-green-400">{week.closedDefects}</span>
                            </div>
                          </div>
                        </motion.div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden pl-4 border-l border-white/5 flex flex-col gap-3 mb-4"
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => {
                                    setData(ensureFormData(week.rawForm))
                                    toast({ title: 'Report Loaded', description: `Swapped active dashboard to ${week.week}` })
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-accent-gold text-xs font-bold hover:bg-[#d4af37]/20 transition-all"
                                >
                                  Load Active Workspace
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
                  {timelineData.length === 0 && (
                    <p className="text-xs text-text-muted">No historical reports saved yet. Save reports to construct timeline.</p>
                  )}
                </div>
              </>
            )
          })()}
        </motion.section>

        {/* ── SECTION 5: HISTORICAL ANALYTICS DASHBOARD ── */}
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
                      <Line type="monotone" dataKey="emails" name="Support Emails" stroke="#3b82f6" strokeWidth={2} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="features" name="Features Tested" stroke="#facc15" strokeWidth={2} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="fixes" name="Code Fixes" stroke="#a855f7" strokeWidth={2} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
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
                      <Area type="monotone" dataKey="reportedDefects" name="Reported Defects" stroke="#f87171" fill="url(#reportedGrad)" strokeWidth={2} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="closedDefects" name="Closed Defects" stroke="#10b981" fill="url(#closedGrad)" strokeWidth={2} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
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
                      <Area type="monotone" dataKey="codeFixProd" stackId="1" name="Code Fix" stroke="#d4af37" fill="#d4af37" fillOpacity={0.4} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="supportProd" stackId="1" name="Support" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="changeRequestProd" stackId="1" name="Change Req" stroke="#a855f7" fill="#a855f7" fillOpacity={0.4} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="dataIssueProd" stackId="1" name="Data Issue" stroke="#f87171" fill="#f87171" fillOpacity={0.4} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Area type="monotone" dataKey="backendUpdationProd" stackId="1" name="Backend Update" stroke="#10b981" fill="#10b981" fillOpacity={0.4} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
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
                      <Line type="monotone" dataKey="emails" name="Support tickets" stroke="#06b6d4" strokeWidth={2.5} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
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
                      <Bar dataKey="teamSize" name="Allocated Engineers" fill="rgba(212,175,55,0.2)" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Line type="monotone" dataKey="healthScore" name="QA Health Score %" stroke="#10b981" strokeWidth={2.5} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
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
                      <Bar dataKey="passFeatures" name="Passed" stackId="a" fill="#10b981" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Bar dataKey="failFeatures" name="Failed" stackId="a" fill="#f87171" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                      <Bar dataKey="blockedFeatures" name="Blocked" stackId="a" fill="#fb923c" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

            </div>
          )}
        </motion.section>

        {/* ── SECTION 6: WEEKLY ANCHORED CHARTS ── */}
        <section ref={sectionsRef.charts} className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Weekly Charts & Distribution</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* 1. Work Distribution (Pie) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5 }}
              className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
            >
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Work Distribution</span>
              <div className="h-64 flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={workDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
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

            {/* 2. Production Issues Comparison (Bar) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
            >
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Production Issue Categories</span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prodIssuesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="category" stroke={chartText} fontSize={9} />
                    <YAxis stroke={chartText} fontSize={9} />
                    <Tooltip contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="lastWeek" name="Last Week" fill="#d4af37" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    <Bar dataKey="mtd" name="MTD" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* 3. Defect Status (Doughnut) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-45px" }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200 hover:shadow-lg transition-shadow duration-300'}`}
            >
              <span className="text-xs font-black uppercase tracking-widest text-accent-gold mb-4 block">Defect Status Breakdown</span>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={defectStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out">
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
        <section ref={sectionsRef.team} className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-gold" />
            <h2 className="text-2xl font-extrabold font-clash">Team Resource Allocation</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { role: 'New Feature Testing', members: data.newFeatureTeam, barColor: 'bg-blue-500', metrics: '8 items tested' },
              { role: 'Production Support', members: data.supportTeam, barColor: 'bg-green-500', metrics: '3 log exceptions resolved' },
              { role: 'Automation Engineering', members: data.automationTeam, barColor: 'bg-purple-500', metrics: 'Avg regression coverage: 76%' }
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

        {/* ── SECTION 9: TIMELINE ROADMAP & NEXT PRIORITIES ── */}
        <motion.section
          variants={sectionVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          ref={sectionsRef.roadmap}
          className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8"
        >

          {/* Daily Milestone Logs */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-accent-gold" />
              <h2 className="text-2xl font-extrabold font-clash">Weekly QA Progress Timeline</h2>
            </div>

            <div className="relative pl-6 flex flex-col gap-8 ml-2 pt-2">
              <motion.div
                initial={{ scaleY: 0 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute left-0 top-2 bottom-2 w-px bg-white/10 origin-top"
              />
              {[
                { day: 'Monday', title: 'Support & Exception Triage', desc: 'Analyzed Safari mobile checkout logs and established debug tickets.' },
                { day: 'Tuesday', title: 'Automation Test coverage review', desc: 'Executed baseline pipeline regression checks and identified missing webhooks.' },
                { day: 'Wednesday', title: 'Profile Redesign Verification failure', desc: 'Flagged REL-103 build issues and initiated feedback cycles.' },
                { day: 'Thursday', title: 'Stress test run & latency logs', desc: 'Validated EUR/GBP multi-currency cache queries, reporting 40% drops.' },
                { day: 'Friday', title: 'Sprint release candidate lock', desc: 'Closed Safari regression exceptions, signing off 3 critical integrations.' }
              ].map((event, idx) => (
                <motion.div
                  key={event.day}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="relative group pl-2"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15 + 0.1, type: "spring", stiffness: 350, damping: 15 }}
                    className="absolute left-[-31px] top-1.5 w-2.5 h-2.5 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(212,175,55,0.8)] transition-transform duration-300 group-hover:scale-125"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold block">{event.day}</span>
                  <h3 className={`text-sm font-extrabold mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{event.title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{event.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Next Priorities List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-accent-gold" />
              <h2 className="text-xl font-extrabold font-clash">Next Week Priorities</h2>
            </div>

            <div className="flex flex-col gap-3">
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
                <div className="p-8 text-center text-xs text-text-muted">No priorities set for next week.</div>
              )}
            </div>
          </div>
        </motion.section>

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
    </div>
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
