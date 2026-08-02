import React, { useMemo, useState } from 'react'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { usePermissions } from "@/hooks/usePermissions"
import { AI_DISABLED_BY_ADMIN, AI_PERMISSION_DENIED, useAIAccess } from "@/hooks/useAIAccess"

import { AIService } from "@/services/ai/ai-service"
import { TEST_CASE_PROMPT } from "@/ai/prompts/testCasePrompt"
import {
  hasNotes,
  parseTestSuite,
  type SuiteNotes,
  type TestCase,
} from "@/modules/testArchitect/parseTestSuite"
import {
  FileText,
  Sparkles,
  Download,
  Search,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  ShieldAlert,
  StickyNote,
  Copy,
  Check,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

const NOTE_SECTIONS: {
  key: keyof SuiteNotes
  label: string
  hint: string
  icon: React.ElementType
  tone: string
}[] = [
  {
    key: 'gaps',
    label: 'Gaps',
    hint: 'Missing coverage or unspecified requirements',
    icon: AlertTriangle,
    tone: 'text-amber-400 border-amber-500/25 bg-amber-500/10',
  },
  {
    key: 'clarificationQuestions',
    label: 'Clarification Questions',
    hint: 'Ask PO / Dev before finalizing tests',
    icon: HelpCircle,
    tone: 'text-sky-400 border-sky-500/25 bg-sky-500/10',
  },
  {
    key: 'assumptions',
    label: 'Assumptions',
    hint: 'Defaults used to generate this suite',
    icon: Lightbulb,
    tone: 'text-accent-gold border-accent-gold/25 bg-accent-gold/10',
  },
  {
    key: 'risks',
    label: 'Risks',
    hint: 'Testing risks and fragile areas',
    icon: ShieldAlert,
    tone: 'text-red-400 border-red-500/25 bg-red-500/10',
  },
]

const priorityClass = (p: TestCase['priority']) =>
  p === 'High' ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : p === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-blue-400 bg-blue-500/10 border-blue-500/20'

export const TestCaseGenerator = () => {
  const [input, setInput] = useState('')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [notes, setNotes] = useState<SuiteNotes>({
    gaps: [],
    clarificationQuestions: [],
    assumptions: [],
    risks: [],
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingOutput, setStreamingOutput] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { can } = usePermissions()
  const { aiEnabled, userAllowed, canGenerate, notifyIfRestricted } = useAIAccess()
  const canGenerateAI = canGenerate('test-generator')
  const canExport = can('test-generator', 'can_export')
  const generateDisabled = isGenerating || (!canGenerateAI && userAllowed)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return testCases.map((tc, idx) => ({ tc, idx }))
    return testCases
      .map((tc, idx) => ({ tc, idx }))
      .filter(({ tc }) =>
        tc.title.toLowerCase().includes(q) ||
        tc.priority.toLowerCase().includes(q) ||
        tc.status.toLowerCase().includes(q) ||
        tc.steps.some((s) => s.toLowerCase().includes(q)),
      )
  }, [testCases, search])

  const copyText = async (text: string, id: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400)
      toast({ title: 'Copied!', description: `${label} copied.` })
    } catch {
      toast({ title: 'Copy failed', description: 'Could not access clipboard.', variant: 'destructive' })
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const ext = file.name.split('.').pop()?.toLowerCase()
      let text = ''

      if (ext === 'pdf') {
        const pdfjsLib = await import('pdfjs-dist')
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const pages = await Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf.getPage(i + 1).then(p => p.getTextContent()).then(tc => tc.items.map((it: any) => it.str).join(' '))
          )
        )
        text = pages.join('\n')
      } else if (ext === 'docx') {
        const { default: mammoth } = await import('mammoth')
        const arrayBuffer = await file.arrayBuffer()
        const { value } = await mammoth.extractRawText({ arrayBuffer })
        text = value
      } else {
        text = await file.text()
      }

      setInput(text)
      toast({ title: 'Document Imported', description: file.name })
    } catch {
      toast({ title: 'Import Failed', description: 'Could not read file.', variant: 'destructive' })
    }
  }

  const handleGenerate = async () => {
    if (!aiEnabled) {
      toast({ title: "AI Disabled", description: AI_DISABLED_BY_ADMIN, variant: "destructive" })
      return
    }
    if (notifyIfRestricted()) return
    if (!canGenerate('test-generator')) {
      toast({ title: "Permission Denied", description: AI_PERMISSION_DENIED, variant: "destructive" })
      return
    }
    if (!input.trim()) {
      toast({ title: "Input Required", description: "Please enter a requirement or feature description.", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    setStreamingOutput('')
    setTestCases([])
    setNotes({ gaps: [], clarificationQuestions: [], assumptions: [], risks: [] })
    setExpanded({})

    let fullText = ''
    try {
      await AIService.streamAI(
        {
          prompt: input,
          options: {
            module: 'test-case-generator',
            systemPrompt: TEST_CASE_PROMPT,
            timeout: 300_000,
          }
        },
        (chunk) => {
          fullText += chunk
          setStreamingOutput(fullText)
        }
      )

      if (!fullText.trim()) {
        throw new Error('AI returned an empty response. Please try again.')
      }
      if (fullText.includes('[Error:')) {
        throw new Error(
          fullText.replace(/^[\s\S]*\[Error:\s*/, '').replace(/\]\s*$/, '') || 'AI request failed',
        )
      }

      const suite = parseTestSuite(fullText)
      setTestCases(suite.testCases)
      setNotes(suite.notes)
      setStreamingOutput('')
      toast({
        title: "Test Suite Ready",
        description: `${suite.testCases.length} cases` + (hasNotes(suite.notes) ? ' + architect notes' : ''),
      })
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const exportSuite = () => {
    if (!testCases.length) return
    const payload = { testCases, notes }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'test-suite.json'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'test-suite.json downloaded.' })
  }

  const showNotes = hasNotes(notes)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="Test Architect"
        subtitle="Generate comprehensive test suites with intelligent edge cases, risk analysis, and automation scripts."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="lg:sticky lg:top-28">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent-gold" />
              Requirements
            </h3>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter feature description or requirement document..."
              className="w-full h-48 sm:h-64 bg-transparent border-none focus:ring-0 text-text-primary placeholder:text-text-muted resize-none font-montreal leading-relaxed"
            />
            <div className="mt-6 flex flex-col gap-3">
              <FloatingButton
                onClick={handleGenerate}
                disabled={generateDisabled}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing…
                  </>
                ) : !aiEnabled ? (
                  <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Disabled by Admin</>
                ) : !userAllowed ? (
                  <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Restricted</>
                ) : !canGenerateAI ? (
                  <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Generation Locked</>
                ) : (
                  "Generate Test Suite"
                )}
              </FloatingButton>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                className="hidden"
                onChange={handleImport}
              />
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-40"
                >
                  <Download className="w-4 h-4" /> Import Document
                </button>
                <p className="text-center text-[10px] text-text-muted tracking-wider">
                  PDF, DOCX, TXT, MD, CSV, JSON
                </p>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2 sm:gap-4">
              <div className="glass-panel px-3 sm:px-4 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tests..."
                  className="bg-transparent border-none focus:ring-0 text-xs w-28 sm:w-40 min-w-0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white/5 border-white/10 text-text-muted">
                {filtered.length} / {testCases.length} cases
              </Badge>
              {canExport && (
                <button
                  type="button"
                  onClick={exportSuite}
                  disabled={!testCases.length}
                  className="p-2 glass-panel hover:bg-white/10 transition-all disabled:opacity-40"
                  title="Export JSON"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <AnimatePresence mode="popLayout">
            {testCases.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-6"
              >
                {/* Aligned suite table */}
                <GlassCard hoverEffect={false} className="overflow-hidden p-0 sm:p-0">
                  <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                      Test Cases
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-gold">
                      Expand a row for steps
                    </span>
                  </div>

                  {/* Header — desktop alignment */}
                  <div className="hidden sm:grid grid-cols-[88px_minmax(0,1fr)_96px_96px_44px] gap-3 px-5 py-2.5 border-b border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    <span>ID</span>
                    <span>Title</span>
                    <span>Priority</span>
                    <span>Status</span>
                    <span />
                  </div>

                  <div className="divide-y divide-white/5">
                    {filtered.map(({ tc, idx }, listIdx) => {
                      const open = !!expanded[idx]
                      const id = `TC-${1000 + idx}`
                      return (
                        <motion.div
                          key={`${tc.title}-${idx}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(listIdx * 0.03, 0.24) }}
                          className="px-4 sm:px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-[88px_minmax(0,1fr)_96px_96px_44px] gap-2 sm:gap-3 sm:items-center">
                            <div className="flex items-center justify-between sm:block">
                              <span className="text-[11px] font-mono font-bold text-accent-gold tracking-wide">
                                {id}
                              </span>
                              <button
                                type="button"
                                className="sm:hidden p-1.5 rounded-lg text-text-muted"
                                onClick={() => setExpanded((p) => ({ ...p, [idx]: !p[idx] }))}
                              >
                                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug">
                                {tc.title}
                              </p>
                              <p className="sm:hidden mt-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                {tc.priority} · {tc.status}
                                {tc.steps.length ? ` · ${tc.steps.length} steps` : ''}
                              </p>
                            </div>

                            <div className="hidden sm:block">
                              <span className={cn(
                                'inline-flex px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider',
                                priorityClass(tc.priority),
                              )}>
                                {tc.priority}
                              </span>
                            </div>

                            <div className="hidden sm:block">
                              <span className="inline-flex px-2 py-1 rounded-md border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                                {tc.status}
                              </span>
                            </div>

                            <div className="hidden sm:flex justify-end">
                              <button
                                type="button"
                                onClick={() => setExpanded((p) => ({ ...p, [idx]: !p[idx] }))}
                                className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-accent-gold transition-all"
                                title={open ? 'Hide steps' : 'Show steps'}
                                disabled={!tc.steps.length}
                              >
                                {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <AnimatePresence initial={false}>
                            {open && tc.steps.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-3 sm:ml-[88px] sm:mr-[44px] rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                                      Steps to execute
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copyText(
                                        tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
                                        `steps-${idx}`,
                                        'Steps',
                                      )}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-white"
                                    >
                                      {copiedId === `steps-${idx}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                      Copy
                                    </button>
                                  </div>
                                  <ol className="space-y-2.5">
                                    {tc.steps.map((step, stepIdx) => (
                                      <li key={stepIdx} className="flex gap-3 text-sm text-text-secondary font-montreal leading-relaxed">
                                        <span className="shrink-0 w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-accent-gold">
                                          {stepIdx + 1}
                                        </span>
                                        <span className="pt-0.5">{step}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )
                    })}
                  </div>

                  {!filtered.length && (
                    <div className="p-8 text-center text-sm text-text-muted">
                      No test cases match “{search}”.
                    </div>
                  )}
                </GlassCard>

                {/* Architect notes */}
                {showNotes && (
                  <GlassCard hoverEffect={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className="w-4 h-4 text-accent-gold" />
                      <h3 className="text-sm font-bold text-foreground">Architect Notes</h3>
                    </div>
                    <p className="text-xs text-text-muted mb-5">
                      Review gaps and clarification questions before signing off this suite.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {NOTE_SECTIONS.map(({ key, label, hint, icon: Icon, tone }) => {
                        const items = notes[key]
                        if (!items.length) return null
                        return (
                          <div
                            key={key}
                            className="rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-4"
                          >
                            <div className="flex items-start justify-between gap-2 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider', tone)}>
                                    <Icon className="w-3 h-3" />
                                    Note · {label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-text-muted">{hint}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => copyText(items.map((n, i) => `${i + 1}. ${n}`).join('\n'), key, label)}
                                className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5"
                                title={`Copy ${label}`}
                              >
                                {copiedId === key ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <ul className="space-y-2.5">
                              {items.map((item, i) => (
                                <li key={i} className="flex gap-2.5 text-sm text-text-secondary font-montreal leading-relaxed">
                                  <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-gold/70" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  </GlassCard>
                )}
              </motion.div>
            ) : isGenerating ? (
              <motion.div
                key="generating"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-panel p-6 sm:p-8 rounded-xl min-h-[300px]"
              >
                <p className="text-xs font-bold uppercase tracking-widest text-accent-gold mb-3 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {streamingOutput ? 'Streaming suite…' : 'Reasoning…'}
                </p>
                {!streamingOutput ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <Sparkles className="w-8 h-8 text-accent-gold mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Designing your suite</h3>
                    <p className="text-text-secondary text-sm max-w-md">
                      Building test cases plus notes for gaps and clarification questions. Usually quick on Groq; complex prompts may fall back to Gemini or Kimi.
                    </p>
                  </div>
                ) : (
                  <pre className="text-sm text-text-secondary whitespace-pre-wrap font-montreal leading-relaxed max-h-[480px] overflow-auto">
                    {streamingOutput}
                  </pre>
                )}
              </motion.div>
            ) : (
              <div className="h-[300px] sm:h-[500px] flex flex-col items-center justify-center text-center p-8 sm:p-12 glass-panel border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 relative">
                  <FileText className="w-10 h-10 text-text-muted" />
                  <div className="absolute inset-0 bg-accent-gold/5 blur-2xl rounded-full" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Architect Your Suite</h3>
                <p className="text-text-secondary max-w-md">
                  Enter requirements on the left to generate aligned test cases plus notes for gaps, clarifications, assumptions, and risks.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
