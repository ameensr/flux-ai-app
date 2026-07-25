// src/pages/AINews.tsx
// Dedicated AI News page — full listing with article detail view.

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { cn } from '@/lib/utils'
import {
  Newspaper, RefreshCw, ExternalLink, Clock, ArrowLeft, ArrowRight, Zap, X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/routes'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Category badge colors ─────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'OpenAI':       { bg: 'rgba(16,163,127,0.12)',  text: '#10a37f', border: 'rgba(16,163,127,0.25)' },
  'Google AI':    { bg: 'rgba(66,133,244,0.12)',   text: '#4285f4', border: 'rgba(66,133,244,0.25)' },
  'Anthropic':    { bg: 'rgba(210,105,30,0.12)',   text: '#d2691e', border: 'rgba(210,105,30,0.25)' },
  'Microsoft AI': { bg: 'rgba(0,120,212,0.12)',    text: '#0078d4', border: 'rgba(0,120,212,0.25)' },
  'Meta AI':      { bg: 'rgba(24,119,242,0.12)',   text: '#1877f2', border: 'rgba(24,119,242,0.25)' },
  'Gemini':       { bg: 'rgba(124,92,255,0.12)',   text: '#7c5cff', border: 'rgba(124,92,255,0.25)' },
  'Claude':       { bg: 'rgba(210,105,30,0.12)',   text: '#d2691e', border: 'rgba(210,105,30,0.25)' },
  'DeepSeek':     { bg: 'rgba(0,188,212,0.12)',    text: '#00bcd4', border: 'rgba(0,188,212,0.25)' },
  'Research':     { bg: 'rgba(139,92,246,0.12)',   text: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  'AI Tools':     { bg: 'rgba(245,158,11,0.12)',   text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
}

const defaultBadge = { bg: 'rgba(124,92,255,0.12)', text: '#7c5cff', border: 'rgba(124,92,255,0.25)' }

// ── Mock data (shared source of truth) ────────────────────────────────────────

const ALL_NEWS: NewsArticle[] = [
  {
    id: '1',
    featured: true,
    title: 'OpenAI Releases GPT-5 with Unprecedented Reasoning Capabilities',
    summary: 'OpenAI has unveiled GPT-5, featuring a new chain-of-thought architecture that dramatically improves multi-step reasoning, coding accuracy, and scientific problem-solving — setting a new benchmark across all major AI evaluations.',
    source: 'OpenAI Blog',
    sourceLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1024px-OpenAI_Logo.svg.png',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=900&q=80',
    category: 'OpenAI',
    publishedAt: '2 hours ago',
    readingTime: '5 min read',
    url: 'https://openai.com/index/introducing-gpt-5/',
  },
  {
    id: '2',
    title: 'Google DeepMind Achieves Breakthrough in Protein Structure Prediction',
    summary: 'AlphaFold 3 now predicts interactions between proteins, DNA, RNA, and small molecules with near-experimental accuracy, opening new frontiers in drug discovery.',
    source: 'Google DeepMind',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
    category: 'Google AI',
    publishedAt: '5 hours ago',
    readingTime: '4 min read',
    url: 'https://deepmind.google/discover/blog/alphafold-3-predicts-the-structure-and-interactions-of-all-of-lifes-molecules/',
  },
  {
    id: '3',
    title: 'Anthropic\'s Claude 4 Introduces Extended Context Window of 2M Tokens',
    summary: 'Claude 4 can now process entire codebases, legal documents, and research libraries in a single prompt, making it the most context-capable model available.',
    source: 'Anthropic',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&q=80',
    category: 'Anthropic',
    publishedAt: '8 hours ago',
    readingTime: '3 min read',
    url: 'https://www.anthropic.com/news',
  },
  {
    id: '4',
    title: 'Microsoft Copilot Now Embedded Across All Azure DevOps Pipelines',
    summary: 'Microsoft expands its AI Copilot integration to cover CI/CD pipelines, automated test generation, and intelligent code review directly within Azure DevOps.',
    source: 'Microsoft AI',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&q=80',
    category: 'Microsoft AI',
    publishedAt: '12 hours ago',
    readingTime: '3 min read',
    url: 'https://blogs.microsoft.com/blog/category/ai/',
  },
  {
    id: '5',
    title: 'Meta Releases Llama 4 as Fully Open-Source Multimodal Model',
    summary: 'Meta\'s Llama 4 supports text, image, audio, and video inputs, and is released under a permissive open-source license — challenging proprietary AI providers.',
    source: 'Meta AI',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1655720828018-edd2daec9349?w=600&q=80',
    category: 'Meta AI',
    publishedAt: '1 day ago',
    readingTime: '4 min read',
    url: 'https://ai.meta.com/blog/',
  },
  {
    id: '6',
    title: 'DeepSeek-V3 Achieves State-of-the-Art Performance with Open Weights',
    summary: 'DeepSeek releases V3, a mixture-of-experts model that matches GPT-4 class performance while being fully open-weight, disrupting the closed-model ecosystem.',
    source: 'DeepSeek',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&q=80',
    category: 'DeepSeek',
    publishedAt: '1 day ago',
    readingTime: '4 min read',
    url: 'https://www.deepseek.com/',
  },
  {
    id: '7',
    title: 'Google Gemini 2.0 Flash Brings Real-Time Multimodal Reasoning',
    summary: 'Gemini 2.0 Flash processes video, audio, and code simultaneously with sub-second latency — enabling real-time AI assistants for developers and creators.',
    source: 'Google AI',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?w=600&q=80',
    category: 'Gemini',
    publishedAt: '2 days ago',
    readingTime: '3 min read',
    url: 'https://deepmind.google/technologies/gemini/',
  },
  {
    id: '8',
    title: 'New Research Shows AI Can Predict Material Properties Before Synthesis',
    summary: 'A team of researchers demonstrates that transformer-based models can accurately predict physical and chemical properties of novel materials, accelerating discovery by 100x.',
    source: 'Nature',
    sourceLogo: '',
    image: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&q=80',
    category: 'Research',
    publishedAt: '3 days ago',
    readingTime: '6 min read',
    url: 'https://www.nature.com/natmachintell/',
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

// ── Go to News helper ─────────────────────────────────────────────────────────

function openNewsSource(url: string, toast: (msg: string) => void) {
  if (!url || url === '#') {
    toast('Source URL is not available for this article.')
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ── Article Detail Modal ──────────────────────────────────────────────────────

function ArticleDetail({ article, onClose }: { article: NewsArticle; onClose: () => void }) {
  useBodyScrollLock(true)
  const handleGoToNews = () => {
    openNewsSource(article.url, (msg) => alert(msg))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Image */}
        <div className="relative w-full h-56 sm:h-64 overflow-hidden rounded-t-2xl">
          <img
            src={article.image}
            alt={article.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-4">
            <CategoryBadge category={article.category} />
          </div>
          {article.featured && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
              style={{ background: 'rgba(124,92,255,0.85)', color: '#fff' }}>
              <Zap className="w-2.5 h-2.5" /> Featured
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{article.source}</span>
            <span style={{ color: 'var(--divider)' }}>·</span>
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" />{article.publishedAt}
            </span>
            <span style={{ color: 'var(--divider)' }}>·</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{article.readingTime}</span>
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold mb-4 leading-snug" style={{ color: 'var(--text-primary)' }}>
            {article.title}
          </h2>

          {/* Summary */}
          <p className="text-sm sm:text-base leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
            {article.summary}
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleGoToNews}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <ExternalLink className="w-4 h-4" />
              Go to News
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-80"
              style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── News Card (full page version) ─────────────────────────────────────────────

function FullNewsCard({ article, onReadMore }: { article: NewsArticle; onReadMore: (a: NewsArticle) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="flex flex-col rounded-2xl overflow-hidden group cursor-pointer"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)' }}
      onClick={() => onReadMore(article)}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-40 overflow-hidden shrink-0">
        <img
          src={article.image}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <CategoryBadge category={article.category} />
        </div>
        {article.featured && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
            style={{ background: 'rgba(124,92,255,0.85)', color: '#fff' }}>
            <Zap className="w-2 h-2" /> Featured
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <h3 className="text-sm sm:text-base font-bold leading-snug mb-2 line-clamp-2 transition-colors group-hover:text-[#7C5CFF]"
          style={{ color: 'var(--text-primary)' }}>
          {article.title}
        </h3>
        <p className="text-xs leading-relaxed line-clamp-2 mb-4 flex-1" style={{ color: 'var(--text-secondary)' }}>
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#7C5CFF] opacity-0 group-hover:opacity-100 transition-opacity">
            Read More <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export const AINews = () => {
  const navigate = useNavigate()
  const [news, setNews] = useState<NewsArticle[]>(ALL_NEWS)
  const [loading, setLoading] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null)
  const [filterCategory, setFilterCategory] = useState('')

  const categories = [...new Set(ALL_NEWS.map(n => n.category))]

  const handleRefresh = useCallback(() => {
    setLoading(true)
    setTimeout(() => {
      setNews([...ALL_NEWS].sort(() => Math.random() - 0.5))
      setLoading(false)
    }, 1000)
  }, [])

  const filtered = filterCategory
    ? news.filter(n => n.category === filterCategory)
    : news

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(ROUTES.dashboard)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-3 transition-colors hover:opacity-80"
            style={{ color: 'var(--text-muted)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(124,92,255,0.12)', border: '1px solid rgba(124,92,255,0.2)' }}>
              <Newspaper className="w-5 h-5 text-[#7C5CFF]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI News</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest updates from the world of Artificial Intelligence</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-80 disabled:opacity-40 self-start sm:self-auto"
          style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterCategory('')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
            !filterCategory ? 'text-[#7C5CFF]' : ''
          )}
          style={{
            background: !filterCategory ? 'rgba(124,92,255,0.12)' : 'var(--hover)',
            color: !filterCategory ? '#7C5CFF' : 'var(--text-muted)',
            border: `1px solid ${!filterCategory ? 'rgba(124,92,255,0.3)' : 'var(--border)'}`,
          }}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: filterCategory === cat ? (CATEGORY_COLORS[cat]?.bg ?? defaultBadge.bg) : 'var(--hover)',
              color: filterCategory === cat ? (CATEGORY_COLORS[cat]?.text ?? defaultBadge.text) : 'var(--text-muted)',
              border: `1px solid ${filterCategory === cat ? (CATEGORY_COLORS[cat]?.border ?? defaultBadge.border) : 'var(--border)'}`,
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-[#7C5CFF]/30 border-t-[#7C5CFF] rounded-full animate-spin" />
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center py-20">
            <Newspaper className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No articles found for this category.</p>
          </motion.div>
        ) : (
          <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(article => (
              <FullNewsCard
                key={article.id}
                article={article}
                onReadMore={setSelectedArticle}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Article detail modal */}
      <AnimatePresence>
        {selectedArticle && (
          <ArticleDetail
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
