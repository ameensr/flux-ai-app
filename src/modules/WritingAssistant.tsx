import React, { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GlassCard } from '@/components/ui/GlassCard'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { AI_DISABLED_BY_ADMIN, AI_PERMISSION_DENIED, useAIAccess } from '@/hooks/useAIAccess'
import { AIService } from '@/services/ai/ai-service'
import {
  DEFAULT_TONE_ID,
  TONES,
  TONE_PROMPTS,
  getToneLabel,
  type ToneId,
} from '@/ai/prompts/writingPrompt'
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Lock,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const WritingAssistant = () => {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [selectedTone, setSelectedTone] = useState<ToneId>(DEFAULT_TONE_ID)
  const [resultTone, setResultTone] = useState<ToneId | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { aiEnabled, userAllowed, canGenerate, notifyIfRestricted } = useAIAccess()
  const canGenerateAI = canGenerate('writing-assistant')
  const generateDisabled = isGenerating || (!canGenerateAI && userAllowed)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [])

  useEffect(() => {
    autoResize()
  }, [input, autoResize])

  const refine = async (tone: ToneId = selectedTone) => {
    if (!aiEnabled) {
      toast({
        title: 'AI Disabled',
        description: AI_DISABLED_BY_ADMIN,
        variant: 'destructive',
      })
      return
    }
    if (notifyIfRestricted()) return
    if (!canGenerate('writing-assistant')) {
      toast({
        title: 'Permission Denied',
        description: AI_PERMISSION_DENIED,
        variant: 'destructive',
      })
      return
    }
    if (!input.trim()) {
      toast({
        title: 'Input Required',
        description: 'Type or paste some text first.',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    setError(null)
    setCopied(false)

    try {
      const text = await AIService.callAI({
        prompt: input,
        options: {
          systemPrompt: TONE_PROMPTS[tone],
          module: 'writing-assistant',
          timeout: 180_000,
        },
      })
      const cleaned = text.trim()
      if (!cleaned) throw new Error('AI returned empty text. Please try again.')
      setResult(cleaned)
      setResultTone(tone)
      setSelectedTone(tone)
      toast({
        title: 'Refined!',
        description: `${getToneLabel(tone)} version is ready.`,
      })
    } catch (err: any) {
      const message = err?.message ?? 'Something went wrong.'
      setError(message)
      toast({
        title: 'Refine Failed',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleToneSelect = (tone: ToneId) => {
    setSelectedTone(tone)
    // If we already have a result, regenerating with the new tone keeps the flow fluid
    if (result && tone !== resultTone && input.trim() && !isGenerating) {
      void refine(tone)
    }
  }

  const copyResult = async () => {
    if (!result.trim()) return
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
      toast({
        title: 'Copied!',
        description: 'Refined text copied to clipboard.',
      })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not access the clipboard.',
        variant: 'destructive',
      })
    }
  }

  const useAsInput = () => {
    if (!result.trim()) return
    setInput(result)
    setResult('')
    setResultTone(null)
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast({ title: 'Moved to editor', description: 'Refine again or pick another tone.' })
  }

  const resetAll = () => {
    setResult('')
    setResultTone(null)
    setInput('')
    setError(null)
    setSelectedTone(DEFAULT_TONE_ID)
    setCopied(false)
  }

  const charCount = input.length
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0
  const showEmpty = !isGenerating && !result && !error

  const ToneChips = ({
    active,
    onSelect,
    disabled,
  }: {
    active: ToneId
    onSelect: (tone: ToneId) => void
    disabled?: boolean
  }) => (
    <div className="flex flex-wrap gap-2">
      {TONES.map((tone) => {
        const isActive = active === tone.id
        return (
          <button
            key={tone.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(tone.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200',
              isActive
                ? 'bg-accent-gold/20 text-accent-gold border border-accent-gold/30'
                : 'bg-white/5 text-text-muted border border-transparent hover:bg-white/10 hover:text-white disabled:opacity-40',
            )}
          >
            {tone.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-6 sm:py-12">
      <CinematicHeading
        title="Writing Assistant"
        subtitle="Polish a rough sentence into clear writing. Pick a tone only if you need a different style."
        align="left"
      />

      <div className="flex flex-col gap-6 max-w-3xl">
        <GlassCard hoverEffect={false}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
              Your Text
            </span>
            <div className="flex items-center gap-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
              <span>{wordCount} words</span>
              <span className={cn(charCount > 1000 ? 'text-red-400' : '')}>
                {charCount} / 1000
              </span>
            </div>
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value.slice(0, 1000))
              autoResize()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void refine()
            }}
            placeholder="Type or paste your rough sentence here... e.g. 'send this tomorrow i didnt get time today'"
            rows={3}
            className="w-full bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed text-base sm:text-lg overflow-hidden transition-all duration-200"
            style={{ minHeight: '80px' }}
          />

          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                Tone
              </span>
              <span className="text-[9px] text-text-muted/70">
                Default is Corrected — choose another only if needed
              </span>
            </div>
            <ToneChips
              active={selectedTone}
              onSelect={handleToneSelect}
              disabled={generateDisabled}
            />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-[10px] text-text-muted hidden sm:block">⌘ + Enter to refine</p>
            <FloatingButton
              onClick={() => void refine()}
              disabled={generateDisabled || !input.trim()}
              className="ml-auto"
            >
              {!aiEnabled ? (
                <>
                  <Lock className="w-4 h-4 mr-2 opacity-60" />
                  AI Disabled by Admin
                </>
              ) : !userAllowed ? (
                <>
                  <Lock className="w-4 h-4 mr-2 opacity-60" />
                  AI Restricted
                </>
              ) : !canGenerateAI ? (
                <>
                  <Lock className="w-4 h-4 mr-2 opacity-60" />
                  AI Generation Locked
                </>
              ) : isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Refining…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Refine
                </>
              )}
            </FloatingButton>
          </div>
        </GlassCard>

        {error && (
          <div className="glass-panel p-6 border border-red-500/20 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-400 mb-1">Something went wrong</p>
              <p className="text-xs text-text-muted font-mono">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <GlassCard hoverEffect={false} className="bg-white/[0.02]">
                <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                      Refined
                    </div>
                    {resultTone && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                        {getToneLabel(resultTone)}
                      </span>
                    )}
                    {isGenerating && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-accent-gold uppercase tracking-widest">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Updating
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={useAsInput}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-white hover:bg-white/5 transition-all"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Use as input
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-white hover:bg-white/5 transition-all"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                <div className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                      Result
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyResult()}
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                        copied
                          ? 'bg-green-500/15 text-green-400'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/10 hover:text-white opacity-80 group-hover:opacity-100',
                      )}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-montreal text-text-primary whitespace-pre-wrap leading-relaxed text-[15px] sm:text-base">
                    {result}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-white/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-text-muted">
                      Try another tone
                    </span>
                  </div>
                  <ToneChips
                    active={selectedTone}
                    onSelect={handleToneSelect}
                    disabled={generateDisabled}
                  />
                </div>
              </GlassCard>
            </motion.div>
          ) : showEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel p-12 flex flex-col items-center justify-center text-center border-dashed"
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-5">
                <Sparkles className="w-7 h-7 text-text-muted" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">One clear rewrite</h3>
              <p className="text-text-secondary text-sm max-w-sm">
                Paste a rough sentence and hit{' '}
                <span className="text-accent-gold font-bold">Refine</span> for a corrected version.
                Switch tones only when you want a different style.
              </p>
            </motion.div>
          ) : isGenerating ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-panel p-12 flex flex-col items-center justify-center text-center border-dashed"
            >
              <RefreshCw className="w-8 h-8 text-accent-gold animate-spin mb-5" />
              <h3 className="text-lg font-bold text-foreground mb-2">Refining…</h3>
              <p className="text-text-secondary text-sm">
                Creating your {getToneLabel(selectedTone).toLowerCase()} version.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
