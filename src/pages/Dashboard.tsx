import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import {
  Bug, FileText, PenTool, ArrowRight, Zap, Lock,
  Newspaper, RefreshCw, ExternalLink, Clock, ChevronRight, Calendar, Sparkles,
} from 'lucide-react'

// ── Brand ────────────────────────────────────────────────────────────────────
import { BRAND } from '@/lib/brand'
import { AnnouncementsWidget } from '@/modules/Announcements/AnnouncementsWidget'

// ── Types ────────────────────────────────────────────────────────────────────
interface NewsArticle {
  id: string
  title: string
  summary: string
  source: string
  sourceLogo: string
  image: string
  category: string
  publishedAt: string
  readingTime: string
  url: string
  featured?: boolean
}

// ── Category badge colors ────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'OpenAI': { bg: 'rgba(16,163,127,0.12)', text: '#10a37f', border: 'rgba(16,163,127,0.25)' },
  'Google AI': { bg: 'rgba(66,133,244,0.12)', text: '#4285f4', border: 'rgba(66,133,244,0.25)' },
  'Anthropic': { bg: 'rgba(210,105,30,0.12)', text: '#d2691e', border: 'rgba(210,105,30,0.25)' },
  'Microsoft AI': { bg: 'rgba(0,120,212,0.12)', text: '#0078d4', border: 'rgba(0,120,212,0.25)' },
  'Meta AI': { bg: 'rgba(24,119,242,0.12)', text: '#1877f2', border: 'rgba(24,119,242,0.25)' },
  'Gemini': { bg: 'rgba(124,92,255,0.12)', text: '#7c5cff', border: 'rgba(124,92,255,0.25)' },
  'Claude': { bg: 'rgba(210,105,30,0.12)', text: '#d2691e', border: 'rgba(210,105,30,0.25)' },
  'DeepSeek': { bg: 'rgba(0,188,212,0.12)', text: '#00bcd4', border: 'rgba(0,188,212,0.25)' },
  'Grok': { bg: 'rgba(30,30,30,0.18)', text: '#aaaaaa', border: 'rgba(170,170,170,0.2)' },
  'Research': { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  'AI Tools': { bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
}

const defaultBadge = { bg: 'rgba(124,92,255,0.12)', text: '#7c5cff', border: 'rgba(124,92,255,0.25)' }

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_NEWS: NewsArticle[] = [
  {
    id: '1',
    featured: true,
    title: 'OpenAI — research and product updates',
    summary: 'Official posts from OpenAI on models, safety, and product releases. Opens their blog — not a live headline feed.',
    source: 'OpenAI Blog',
    sourceLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1024px-OpenAI_Logo.svg.png',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
    category: 'OpenAI',
    publishedAt: 'Official source',
    readingTime: 'Blog',
    url: 'https://openai.com/news/',
  },
  {
    id: '2',
    title: 'Google DeepMind — AlphaFold and research',
    summary: 'DeepMind’s research blog covering AlphaFold and related scientific work.',
    source: 'Google DeepMind',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
    category: 'Google AI',
    publishedAt: 'Official source',
    readingTime: 'Blog',
    url: 'https://deepmind.google/discover/blog/alphafold-3-predicts-the-structure-and-interactions-of-all-of-lifes-molecules/',
  },
  {
    id: '3',
    title: 'Anthropic news and announcements',
    summary: 'Company news, model updates, and research notes published by Anthropic.',
    source: 'Anthropic',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80',
    category: 'Anthropic',
    publishedAt: 'Official source',
    readingTime: 'Blog',
    url: 'https://www.anthropic.com/news',
  },
  {
    id: '4',
    title: 'Microsoft AI — company blog',
    summary: 'Microsoft’s AI category on the company blog: Copilot, Azure, and research notes.',
    source: 'Microsoft AI',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80',
    category: 'Microsoft AI',
    publishedAt: 'Official source',
    readingTime: 'Blog',
    url: 'https://blogs.microsoft.com/blog/category/ai/',
  },
  {
    id: '5',
    title: 'Meta AI — research blog',
    summary: 'Meta’s AI research blog, including Llama and related open-source work.',
    source: 'Meta AI',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=600&q=80',
    category: 'Meta AI',
    publishedAt: 'Official source',
    readingTime: 'Blog',
    url: 'https://ai.meta.com/blog/',
  },
]

// ── Category Badge ────────────────────────────────────────────────────────────
const CategoryBadge = ({ category }: { category: string }) => {
  const c = CATEGORY_COLORS[category] ?? defaultBadge
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
    >
      {category}
    </span>
  )
}

// ── Featured Card ─────────────────────────────────────────────────────────────
const FeaturedCard = ({ article }: { article: NewsArticle }) => (
  <motion.a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={{ y: -3 }}
    className="block rounded-2xl overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]"
    style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--shadow)' }}
    aria-label={`Read: ${article.title}`}
  >
    {/* Thumbnail */}
    <div className="relative w-full h-52 overflow-hidden">
      <img
        src={article.image}
        alt={article.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      {/* Category badge on image */}
      <div className="absolute top-4 left-4">
        <CategoryBadge category={article.category} />
      </div>
      {/* Featured label */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
        style={{ background: 'rgba(124,92,255,0.85)', color: '#fff', backdropFilter: 'blur(8px)' }}>
        <Zap className="w-2.5 h-2.5" /> Featured
      </div>
    </div>

    {/* Content */}
    <div className="p-5 sm:p-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{article.source}</span>
        <span style={{ color: 'var(--divider)' }}>·</span>
        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Clock className="w-3 h-3" />{article.publishedAt}
        </span>
        <span style={{ color: 'var(--divider)' }}>·</span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{article.readingTime}</span>
      </div>

      <h3 className="text-lg sm:text-xl font-bold mb-2 leading-snug transition-colors group-hover:text-[#7C5CFF]"
        style={{ color: 'var(--text-primary)' }}>
        {article.title}
      </h3>
      <p className="text-sm leading-relaxed mb-5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
        {article.summary}
      </p>

      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7C5CFF]">
        Read More <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </motion.a>
)

// ── Small News Card ───────────────────────────────────────────────────────────
const NewsCard = ({ article, index }: { article: NewsArticle; index: number }) => (
  <motion.a
    href={article.url}
    target="_blank"
    rel="noopener noreferrer"
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.08 }}
    whileHover={{ y: -2 }}
    className="flex flex-col rounded-2xl overflow-hidden group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]"
    style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
    aria-label={`Read: ${article.title}`}
  >
    {/* Thumbnail */}
    <div className="relative w-full h-32 overflow-hidden shrink-0">
      <img
        src={article.image}
        alt={article.title}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-2 left-2">
        <CategoryBadge category={article.category} />
      </div>
    </div>

    {/* Content */}
    <div className="p-4 flex flex-col flex-1">
      <h4 className="text-sm font-bold leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[#7C5CFF]"
        style={{ color: 'var(--text-primary)' }}>
        {article.title}
      </h4>
      <p className="text-xs leading-relaxed line-clamp-2 mb-3 flex-1" style={{ color: 'var(--text-secondary)' }}>
        {article.summary}
      </p>
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{article.source}</span>
          <span style={{ color: 'var(--divider)' }}>·</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-2.5 h-2.5" />{article.publishedAt}
          </span>
        </div>
        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#7C5CFF]" />
      </div>
    </div>
  </motion.a>
)

// ── Empty State ───────────────────────────────────────────────────────────────
const EmptyState = ({ onRefresh }: { onRefresh: () => void }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex flex-col items-center justify-center py-20 text-center"
  >
    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
      style={{ background: 'rgba(124,92,255,0.1)', border: '1px solid rgba(124,92,255,0.2)' }}>
      <Newspaper className="w-7 h-7 text-[#7C5CFF]" />
    </div>
    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No news available</h3>
    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Check back later for the latest AI updates.</p>
    <button
      onClick={onRefresh}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
      style={{ background: 'rgba(124,92,255,0.15)', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.3)' }}
    >
      <RefreshCw className="w-4 h-4" /> Refresh
    </button>
  </motion.div>
)

// ── Motivational lines (rotates daily) ────────────────────────────────────────
const MOTIV_LINES = [
  'Build quality. Ship confidence.',
  'Every bug found is a user saved.',
  'Precision today, excellence tomorrow.',
  'Let AI handle the grind. You focus on craft.',
  'Test smarter. Release bolder.',
  'Quality is not an act — it\'s a habit.',
  'One test case closer to perfection.',
]

// ── Date & Time Widget ────────────────────────────────────────────────────────
const DateTimeWidget = () => {
  const [now, setNow] = useState(new Date())
  const [motivIndex] = useState(() => Math.floor(Date.now() / 86400000) % MOTIV_LINES.length)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000) // update every 30s
    return () => clearInterval(timer)
  }, [])

  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  const date = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
      className="glass-panel px-5 sm:px-6 py-4 flex flex-col items-end gap-2 min-w-[180px]"
    >
      {/* Time */}
      <div className="flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-accent-gold" />
        <span className="text-xl sm:text-2xl font-bold text-foreground tabular-nums tracking-tight">
          {time}
        </span>
      </div>
      {/* Date */}
      <div className="flex items-center gap-2">
        <Calendar className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
        <span className="text-[11px] sm:text-xs text-text-muted whitespace-nowrap">
          {date}
        </span>
      </div>
      {/* Motivational line */}
      <div className="flex items-center gap-1.5 mt-1 pt-2" style={{ borderTop: '1px solid var(--divider)' }}>
        <Sparkles className="w-3 h-3 text-accent-gold shrink-0" />
        <span className="text-[10px] sm:text-[11px] italic text-text-secondary leading-tight">
          {MOTIV_LINES[motivIndex]}
        </span>
      </div>
    </motion.div>
  )
}

// ── AI News Section ───────────────────────────────────────────────────────────
const AINewsSection = () => {
  const navigate = useNavigate()
  const [news] = useState<NewsArticle[]>(MOCK_NEWS)

  const featured = news.find(n => n.featured)
  const rest = news.filter(n => !n.featured)

  return (
    <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4"
        style={{ borderBottom: '1px solid var(--divider)' }}>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Newspaper className="w-4 h-4 text-[#7C5CFF]" />
            <h2 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              AI sources
            </h2>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Curated official blogs — not a live news feed
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate(ROUTES.aiNews)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold pressable"
            style={{ background: 'rgba(124,92,255,0.12)', color: '#7C5CFF', border: '1px solid rgba(124,92,255,0.2)' }}
            aria-label="View all sources"
          >
            View All <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {news.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState onRefresh={() => { /* curated list is static */ }} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Featured */}
              {featured && <div className="mb-5"><FeaturedCard article={featured} /></div>}
              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {rest.map((article, i) => (
                  <NewsCard key={article.id} article={article} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  )
}

// ── Module cards ──────────────────────────────────────────────────────────────
const modules = [
  {
    id: 'bug-refiner',
    title: 'AI Bug Refiner',
    description: 'Transform messy QA notes into professional, JIRA-ready bug reports in seconds.',
    icon: Bug,
    color: 'from-amber-500/20 to-transparent',
  },
  {
    id: 'test-generator',
    title: 'Test Cases',
    description: 'Generate comprehensive test suites with edge cases, risks, and automation scripts.',
    icon: FileText,
    color: 'from-blue-500/20 to-transparent',
  },
  {
    id: 'writing-assistant',
    title: 'Writing Assistant',
    description: 'Elevate your QA communication. Professional rewrites, summaries, and meeting notes.',
    icon: PenTool,
    color: 'from-purple-500/20 to-transparent',
  },
]

const MODULE_ROUTES: Record<string, string> = {
  'bug-refiner': ROUTES.bugRefiner,
  'test-generator': ROUTES.testGenerator,
  'writing-assistant': ROUTES.writingAssistant,
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const Dashboard = () => {
  const navigate = useNavigate()
  const { profile, user } = useAppStore()
  const { canView } = usePermissions()
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'there'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-10"
    >
      {/* Header */}
      <header className="mb-10 sm:mb-16">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
            <Zap className="w-3 h-3 text-accent-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-accent-gold">System Operational</span>
          </div>
        </motion.div>

        <div className="flex flex-col gap-6 sm:gap-8 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-[clamp(1.75rem,6vw,3.5rem)] font-clash font-bold text-foreground mb-3 leading-tight break-words">
              Welcome back, <span className="text-accent-gold">{displayName}</span>
            </h1>
            <p className="text-base sm:text-xl text-text-secondary font-montreal max-w-xl leading-relaxed">
              Your {BRAND.name} command center is ready. What would you like to build today?
            </p>
          </div>

          <div className="flex gap-3 sm:gap-4 shrink-0">
            <DateTimeWidget />
          </div>
        </div>
      </header>

      {/* Module Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
        {modules.map((module, index) => {
          const accessible = canView(module.id)
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard
                onClick={() => accessible && navigate(MODULE_ROUTES[module.id])}
                className={cn('h-full group', accessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
              >
                <div className={cn(
                  'absolute top-0 right-0 w-32 h-32 bg-gradient-to-br blur-3xl opacity-0 transition-opacity duration-700',
                  accessible && 'group-hover:opacity-100',
                  module.color,
                )} />
                <div className="relative z-10">
                  <div className={cn(
                    'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-5 sm:mb-6 transition-colors duration-500',
                    accessible && 'group-hover:bg-accent-gold group-hover:text-background',
                  )}>
                    {accessible
                      ? <module.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      : <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-text-muted" />}
                  </div>
                  <h3 className={cn(
                    'text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 transition-colors',
                    accessible && 'group-hover:text-accent-gold',
                  )}>
                    {module.title}
                  </h3>
                  <p className="text-text-secondary mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
                    {module.description}
                  </p>
                  <div className={cn(
                    'flex items-center gap-2 font-bold text-xs sm:text-sm',
                    accessible ? 'text-accent-gold' : 'text-text-muted',
                  )}>
                    <span>{accessible ? 'LAUNCH MODULE' : 'UPGRADE TO UNLOCK'}</span>
                    {accessible
                      ? <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      : <Lock className="w-3 h-3" />}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        })}
      </div>

      {/* Announcements + AI News */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 mb-10 sm:mb-16">
        <AINewsSection />
        <AnnouncementsWidget />
      </div>
    </motion.div>
  )
}
