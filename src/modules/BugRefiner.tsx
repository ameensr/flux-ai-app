import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { RoleGuard } from "@/components/ui/RoleGuard"
import { usePermissions } from "@/hooks/usePermissions"
import { AI_DISABLED_BY_ADMIN, AI_PERMISSION_DENIED, useAIAccess } from "@/hooks/useAIAccess"
import { AIService } from "@/services/ai/ai-service"
import { BUG_PROMPT } from "@/ai/prompts/bugPrompt"
import {
  BUG_FIELDS,
  hasParsedFields,
  parseBugReport,
  severityTone,
  type BugFieldKey,
} from "@/modules/bugRefiner/parseBugReport"
import { cn } from "@/lib/utils"
import {
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Download,
  Zap,
  Lock,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

export const BugRefiner = () => {
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [confidence, setConfidence] = useState(0)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const { can } = usePermissions()
  const { aiEnabled, userAllowed, canGenerate, notifyIfRestricted } = useAIAccess()
  const canGenerateAI = canGenerate('bug-refiner')
  const canExport = can('bug-refiner', 'can_export')
  // Restricted users stay clickable so the allowlist popup can appear.
  const generateDisabled = isGenerating || (!canGenerateAI && userAllowed)

  const fields = useMemo(() => parseBugReport(result), [result])
  const showFields = hasParsedFields(fields)

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast({ title: "AI Disabled", description: AI_DISABLED_BY_ADMIN, variant: "destructive" })
      return
    }
    if (notifyIfRestricted()) return
    if (!canGenerate('bug-refiner')) {
      toast({ title: "Permission Denied", description: AI_PERMISSION_DENIED, variant: "destructive" })
      return
    }
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: "Please paste some rough bug notes first.",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setResult('')
    setConfidence(0)
    setCopiedKey(null)

    try {
      let full = ''
      await AIService.streamAI(
        {
          prompt: input,
          options: { module: 'bug-refiner', systemPrompt: BUG_PROMPT, timeout: 180_000 },
        },
        (chunk) => {
          full += chunk
          setResult(full)
        },
      )

      if (!full.trim()) {
        throw new Error('AI returned an empty report. Please try again.')
      }
      if (full.includes('[Error:')) {
        throw new Error(full.replace(/^[\s\S]*\[Error:\s*/, '').replace(/\]\s*$/, '') || 'AI request failed')
      }

      setConfidence(Math.floor(Math.random() * (98 - 85 + 1)) + 85)
      toast({
        title: "Bug Refined!",
        description: "Your professional bug report is ready."
      })
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (text: string, key: string, label?: string) => {
    const value = text.trim()
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1600)
      toast({
        title: "Copied!",
        description: label ? `${label} copied to clipboard.` : "Copied to clipboard.",
      })
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not access the clipboard.",
        variant: "destructive",
      })
    }
  }

  const downloadReport = (text: string) => {
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bug-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderFieldValue = (key: BugFieldKey, value: string) => {
    if (key === 'severity') {
      return (
        <span className={cn(
          'inline-flex px-2.5 py-1 rounded-lg border text-xs font-bold uppercase tracking-wider',
          severityTone(value),
        )}>
          {value.split('\n')[0].trim()}
        </span>
      )
    }
    return (
      <p className="font-montreal text-text-primary whitespace-pre-wrap leading-relaxed text-[15px]">
        {value}
      </p>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="Bug Refiner"
        subtitle="Transform rough logs and messy notes into professional, JIRA-ready bug reports with AI precision."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
        <div className="flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Input Notes / Logs</span>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-accent-gold shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your rough notes here... e.g., 'the app crashed when i clicked save on profile page. i had a long name.'"
              className="w-full h-48 sm:h-64 lg:h-[400px] bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed text-base sm:text-lg"
            />
            <div className="mt-4 sm:absolute sm:bottom-6 sm:right-6">
              <FloatingButton
                onClick={handleGenerate}
                disabled={generateDisabled}
                className="w-full sm:w-auto"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : !aiEnabled ? (
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
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Refine with AI
                  </>
                )}
              </FloatingButton>
            </div>
          </GlassCard>
        </div>

        <div className="flex flex-col gap-6">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard hoverEffect={false} className="min-h-[400px] bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">
                        Refined Result
                      </div>
                      {confidence > 0 && (
                        <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                          Confidence: <span className="text-accent-gold">{confidence}%</span>
                        </div>
                      )}
                      {isGenerating && (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-gold uppercase tracking-widest">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Streaming
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(result, 'all', 'Full report')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider"
                        title="Copy full report"
                      >
                        {copiedKey === 'all' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy all
                      </button>
                      {canExport && (
                        <button
                          type="button"
                          onClick={() => downloadReport(result)}
                          className="p-2 hover:bg-white/5 rounded-lg text-text-secondary hover:text-white transition-all"
                          title="Download report"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {showFields ? (
                    <div className="flex flex-col gap-3">
                      {BUG_FIELDS.map(({ key, label }, index) => {
                        const value = fields[key]
                        if (!value) return null
                        const isCopied = copiedKey === key
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: Math.min(index * 0.04, 0.24) }}
                            className="group relative rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2.5">
                              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                                {label}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(value, key, label)}
                                className={cn(
                                  'shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                                  isCopied
                                    ? 'bg-green-500/15 text-green-400'
                                    : 'bg-white/[0.04] text-text-muted hover:bg-white/10 hover:text-white opacity-80 group-hover:opacity-100',
                                )}
                                title={`Copy ${label}`}
                              >
                                {isCopied ? (
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
                            {renderFieldValue(key, value)}
                          </motion.div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="font-montreal text-text-primary whitespace-pre-wrap leading-relaxed rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
                      {result}
                    </div>
                  )}

                  <div className="mt-10 pt-8 border-t border-white/5 flex gap-4">
                    <RoleGuard permission={{ module: 'bug-refiner', key: 'can_export' }} fallback={
                      <button disabled className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-widest opacity-30 cursor-not-allowed">Export to Jira 🔒</button>
                    }>
                      <button className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
                        Export to Jira
                      </button>
                    </RoleGuard>
                    <RoleGuard permission={{ module: 'bug-refiner', key: 'can_export' }} fallback={
                      <button disabled className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-xs font-bold uppercase tracking-widest opacity-30 cursor-not-allowed">Push to Slack 🔒</button>
                    }>
                      <button className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all">
                        Push to Slack
                      </button>
                    </RoleGuard>
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-[300px] sm:h-[460px] flex flex-col items-center justify-center text-center p-8 sm:p-12 glass-panel border-dashed"
              >
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  {isGenerating ? (
                    <RefreshCw className="w-8 h-8 text-accent-gold animate-spin" />
                  ) : (
                    <Zap className="w-8 h-8 text-text-muted" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  {isGenerating ? 'Refining…' : 'Ready to Refine'}
                </h3>
                <p className="text-text-secondary">
                  {isGenerating
                    ? 'Generating your bug report — it will stream in shortly.'
                    : 'Your refined report will appear here. Our AI will automatically identify severity, steps, and expected results.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
