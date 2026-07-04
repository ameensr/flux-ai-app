import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { AIService } from '@/services/ai/ai-service'
import { QUICK_ACTION_PROMPTS, TONES, type ToneResults } from '@/ai/prompts/writingPrompt'
import {
  Sparkles, Copy, RefreshCw, Zap, CheckCheck,
  Scissors, Expand, SpellCheck, Briefcase, Smile,
  AlignLeft, Wand2, AlertCircle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const TONE_PROMPTS: Record<string, string> = {
  professional: 'Rewrite the following text in a polished, professional tone. Return only the rewritten text.',
  casual: 'Rewrite the following text in a casual, conversational tone. Return only the rewritten text.',
  polite: 'Rewrite the following text in a polite, courteous tone. Return only the rewritten text.',
  friendly: 'Rewrite the following text in a warm, friendly tone. Return only the rewritten text.',
  confident: 'Rewrite the following text in a confident, assertive tone. Return only the rewritten text.',
  formal: 'Rewrite the following text in a formal tone. Return only the rewritten text.',
  concise: 'Rewrite the following text as concisely as possible. Return only the rewritten text.',
  corporate: 'Rewrite the following text in a corporate business tone. Return only the rewritten text.',
  genz: 'Rewrite the following text in a Gen Z internet tone. Return only the rewritten text.',
  email: 'Rewrite the following text as a ready-to-send email. Return only the rewritten text.',
}

const QUICK_ACTIONS = [
  { id: 'shorten', label: 'Shorten', icon: Scissors },
  { id: 'expand', label: 'Expand', icon: Expand },
  { id: 'grammar', label: 'Fix Grammar', icon: SpellCheck },
  { id: 'professional', label: 'Professional', icon: Briefcase },
  { id: 'friendly', label: 'Friendly', icon: Smile },
  { id: 'simplify', label: 'Simplify', icon: AlignLeft },
  { id: 'clarity', label: 'Clarity', icon: Wand2 },
] as const

const ToneCard = ({ tone, text, index }: {
  tone: typeof TONES[number]
  text: string
  index: number
}) => {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({ title: 'Copied!', description: `${tone.label} version copied.` })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="group relative glass-panel p-5 hover:border-white/20 transition-all duration-300 hover:bg-white/[0.06]"
    >
      <div className="absolute inset-0 rounded-3xl group-hover:bg-accent-gold/[0.03] transition-all duration-500 pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">{tone.emoji}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold">
              {tone.label}
            </span>
          </div>
          <button
            onClick={copy}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200',
              copied ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white'
            )}
          >
            {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-sm sm:text-base leading-relaxed text-text-primary font-montreal">{text}</p>
      </div>
    </motion.div>
  )
}

export const WritingAssistant = () => {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<ToneResults | null>(null)
  const [loadedCount, setLoadedCount] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [quickLoading, setQuickLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [])

  useEffect(() => { autoResize() }, [input, autoResize])

  const handleGenerate = async () => {
    if (!input.trim()) {
      toast({ title: 'Input Required', description: 'Type or paste some text first.', variant: 'destructive' })
      return
    }

    setIsGenerating(true)
    setResults(null)
    setLoadedCount(0)
    setError(null)

    const built: ToneResults = {}
    let successCount = 0
    let firstError = ''

    // Process tones with concurrency limit of 3 to avoid rate-limiting
    const CONCURRENCY = 3
    const queue = [...TONES]

    const worker = async () => {
      while (queue.length > 0) {
        const tone = queue.shift()
        if (!tone) break
        try {
          const text = await AIService.callAI({
            prompt: input,
            options: { systemPrompt: TONE_PROMPTS[tone.id], module: 'writing-assistant' },
          })
            ; (built as any)[tone.id] = text.trim()
          successCount++
          setLoadedCount(successCount)
          setResults({ ...built })
        } catch (err: any) {
          if (!firstError) firstError = err?.message ?? 'Unknown error'
          console.error(`[WA] ${tone.id}:`, err?.message)
        }
      }
    }

    // Launch workers
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))

    if (successCount === 0) {
      setError(firstError || 'All tone requests failed. Please check your AI provider settings.')
    }

    setIsGenerating(false)
  }

  const handleQuickAction = async (actionId: string) => {
    if (!input.trim()) {
      toast({ title: 'Input Required', description: 'Type or paste some text first.', variant: 'destructive' })
      return
    }
    setQuickLoading(actionId)
    try {
      const refined = await AIService.callAI({
        prompt: input,
        options: { systemPrompt: QUICK_ACTION_PROMPTS[actionId], module: 'writing-assistant' },
      })
      setInput(refined.trim())
      toast({ title: 'Done!', description: 'Text updated in editor.' })
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err?.message ?? 'Try again.', variant: 'destructive' })
    } finally {
      setQuickLoading(null)
    }
  }

  const charCount = input.length
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const showSkeleton = isGenerating && !results
  const showResults = !!results
  const showEmpty = !isGenerating && !results && !error

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 sm:py-12">
      <CinematicHeading
        title="Writing Assistant"
        subtitle="Transform rough ideas into polished communication. Generate 10 professional tones instantly."
        align="left"
      />

      <div className="flex flex-col gap-6">

        {/* ── Input Panel ───────────────────────────────────────────────── */}
        <GlassCard hoverEffect={false}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Your Text</span>
            <div className="flex items-center gap-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              <span>{wordCount} words</span>
              <span className={cn(charCount > 1000 ? 'text-red-400' : '')}>{charCount} / 1000</span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value.slice(0, 1000)); autoResize() }}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
            placeholder="Type or paste your rough sentence here... e.g. 'send this tomorrow i didnt get time today'"
            rows={3}
            className="w-full bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed text-base sm:text-lg overflow-hidden transition-all duration-200"
            style={{ minHeight: '80px' }}
          />

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-3 h-3 text-text-muted" />
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleQuickAction(id)}
                  disabled={!!quickLoading || isGenerating}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200',
                    quickLoading === id
                      ? 'bg-accent-gold/20 text-accent-gold'
                      : 'bg-white/5 text-text-muted hover:bg-white/10 hover:text-white disabled:opacity-40'
                  )}
                >
                  {quickLoading === id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-[10px] text-text-muted hidden sm:block">⌘ + Enter to generate</p>
            <FloatingButton
              onClick={handleGenerate}
              disabled={isGenerating || !input.trim()}
              className="ml-auto"
            >
              {isGenerating
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Refining {loadedCount}/{TONES.length}...</>
                : <><Sparkles className="w-4 h-4 mr-2" /> Refine in All Tones</>}
            </FloatingButton>
          </div>
        </GlassCard>

        {/* ── Error state ───────────────────────────────────────────────── */}
        {error && (
          <div className="glass-panel p-6 border border-red-500/20 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-400 mb-1">Something went wrong</p>
              <p className="text-xs text-text-muted font-mono">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Skeleton ──────────────────────────────────────────────────── */}
        {showSkeleton && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {TONES.map((t) => (
              <div key={t.id} className="glass-panel p-5 animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-4 h-4 rounded bg-white/10" />
                  <div className="w-20 h-3 rounded bg-white/10" />
                </div>
                <div className="space-y-2">
                  <div className="w-full h-3 rounded bg-white/5" />
                  <div className="w-4/5 h-3 rounded bg-white/5" />
                  <div className="w-3/5 h-3 rounded bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {showResults && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-gold" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-gold">
                  {TONES.filter(t => results![t.id]).length} Tones Generated
                  {isGenerating && ` — loading more...`}
                </span>
              </div>
              <button
                onClick={() => { setResults(null); setInput(''); setError(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-muted hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {TONES.filter(t => results![t.id]).map((tone, i) => (
                <ToneCard key={tone.id} tone={tone} text={results![tone.id]!} index={i} />
              ))}
            </div>

            {!isGenerating && (
              <div className="mt-6 glass-panel p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-xs text-text-muted">
                  Like a version? Click Copy, or use it as new input to refine further.
                </p>
                <button
                  onClick={() => { setResults(null); setError(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                  className="shrink-0 px-4 py-2 rounded-xl bg-accent-gold/10 text-accent-gold hover:bg-accent-gold/20 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Refine Again ↑
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {showEmpty && (
          <div className="glass-panel p-12 flex flex-col items-center justify-center text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5">
              <Sparkles className="w-7 h-7 text-text-muted" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">10 Tones, One Click</h3>
            <p className="text-text-secondary text-sm max-w-sm">
              Type your rough message above and hit{' '}
              <span className="text-accent-gold font-bold">Refine in All Tones</span>{' '}
              — get Professional, Casual, Gen Z, Email-Ready and 6 more instantly.
            </p>
          </div>
        )}

      </div>
    </motion.div>
  )
}
