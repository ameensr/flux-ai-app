import React, { useEffect, useMemo, useState } from 'react'
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { GlassCard } from "@/components/ui/GlassCard"
import { FloatingButton } from "@/components/ui/FloatingButton"
import { CinematicHeading } from "@/components/ui/CinematicHeading"
import { usePermissions } from "@/hooks/usePermissions"
import { AI_DISABLED_BY_ADMIN, AI_PERMISSION_DENIED, useAIAccess } from "@/hooks/useAIAccess"

import { AIService } from "@/services/ai/ai-service"
import type { AIProviderInfo } from "@/services/ai/types"
import { AiProviderBadge } from "@/components/ui/AiProviderBadge"
import {
  buildTestCaseBatchPrompt,
  buildTestCaseMetaPrompt,
  planTestCaseBatches,
  TEST_CASE_COUNT_LABELS,
  TEST_CASE_COUNTS,
  type TestCaseCount,
} from "@/ai/prompts/testCasePrompt"
import {
  EMPTY_NOTES,
  hasNotes,
  hasSuiteExtras,
  mergeNotes,
  mergeTestCases,
  parseSuiteMeta,
  parseTestSuite,
  type SuiteNotes,
  type TestCase,
  type TestCaseCategory,
} from "@/modules/testArchitect/parseTestSuite"
import {
  HISTORY_MAX,
  deleteHistory,
  historyTitleFromInput,
  loadHistory,
  maxTokensForCount,
  maxTokensForMeta,
  maxTokensForMetaBatch,
  tryAddHistory,
  type TestSuiteHistoryEntry,
} from "@/modules/testArchitect/history"
import { downloadTestSuiteExcel } from "@/modules/testArchitect/exportExcel"
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
  History,
  Save,
  Trash2,
  X,
  ListChecks,
  Target,
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
    label: 'Requirement Gaps',
    hint: 'Missing rules, validations, workflows, permissions, or acceptance criteria',
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

const CATEGORY_SECTIONS: {
  category: TestCaseCategory
  label: string
  hint: string
}[] = [
  { category: 'Functional', label: 'Functional Test Cases', hint: 'Core happy paths and workflows' },
  { category: 'Negative', label: 'Negative Test Cases', hint: 'Invalid input and error handling' },
  { category: 'Boundary', label: 'Boundary Test Cases', hint: 'BVA / equivalence partitions' },
  { category: 'Edge', label: 'Edge Cases', hint: 'Extremes, concurrency, recovery, limits' },
]

const priorityClass = (p: TestCase['priority']) =>
  p === 'Critical' ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20'
    : p === 'High' ? 'text-red-400 bg-red-500/10 border-red-500/20'
      : p === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        : 'text-blue-400 bg-blue-500/10 border-blue-500/20'

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function TestCaseRow({
  tc,
  idx,
  listIdx,
  open,
  onToggle,
  copiedId,
  onCopySteps,
}: {
  tc: TestCase
  idx: number
  listIdx: number
  open: boolean
  onToggle: () => void
  copiedId: string | null
  onCopySteps: () => void
}) {
  const id = `TC-${1000 + idx}`
  return (
    <motion.div
      key={`${tc.title}-${idx}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: Math.min(listIdx * 0.02, 0.2) }}
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
            onClick={onToggle}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="min-w-0">
          <p className="text-sm sm:text-[15px] font-semibold text-foreground leading-snug">
            {tc.title}
          </p>
          <p className="sm:hidden mt-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
            {tc.priority} · {tc.status} · {tc.category}
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
            onClick={onToggle}
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
                  onClick={onCopySteps}
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
}

export const TestCaseGenerator = () => {
  const [input, setInput] = useState('')
  const [caseCount, setCaseCount] = useState<TestCaseCount>(20)
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [notes, setNotes] = useState<SuiteNotes>({ ...EMPTY_NOTES })
  const [requirementSummary, setRequirementSummary] = useState('')
  const [coverageSummary, setCoverageSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingOutput, setStreamingOutput] = useState('')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [history, setHistory] = useState<TestSuiteHistoryEntry[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [aiProvider, setAiProvider] = useState<AIProviderInfo | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const { can } = usePermissions()
  const { aiEnabled, userAllowed, canGenerate, notifyIfRestricted } = useAIAccess()
  const canGenerateAI = canGenerate('test-generator')
  const canExport = can('test-generator', 'can_export')
  const generateDisabled = isGenerating || (!canGenerateAI && userAllowed)
  const countLabel = TEST_CASE_COUNT_LABELS[caseCount]

  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const priorityBreakdown = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 }
    for (const tc of testCases) counts[tc.priority]++
    return counts
  }, [testCases])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return testCases.map((tc, idx) => ({ tc, idx }))
    return testCases
      .map((tc, idx) => ({ tc, idx }))
      .filter(({ tc }) =>
        tc.title.toLowerCase().includes(q) ||
        tc.priority.toLowerCase().includes(q) ||
        tc.status.toLowerCase().includes(q) ||
        tc.category.toLowerCase().includes(q) ||
        tc.steps.some((s) => s.toLowerCase().includes(q)),
      )
  }, [testCases, search])

  const filteredByCategory = useMemo(() => {
    const map: Record<TestCaseCategory, { tc: TestCase; idx: number }[]> = {
      Functional: [],
      Negative: [],
      Boundary: [],
      Edge: [],
    }
    for (const row of filtered) {
      map[row.tc.category].push(row)
    }
    return map
  }, [filtered])

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
    setNotes({ ...EMPTY_NOTES })
    setRequirementSummary('')
    setCoverageSummary('')
    setExpanded({})
    setAiProvider(null)

    const batches = planTestCaseBatches(caseCount)
    let allCases: TestCase[] = []
    let allNotes: SuiteNotes = { ...EMPTY_NOTES }
    let summary = ''
    let coverage = ''

    try {
      // Pass 1: case batches — final batch also requests analysis sections
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]!
        const from = allCases.length + 1
        const to = allCases.length + batch.size
        setStreamingOutput(
          batches.length > 1
            ? `Batch ${batch.index + 1}/${batch.totalBatches} — cases ${from}–${to} (~${countLabel})` +
              (batch.includeMeta ? ' + analysis…' : '…')
            : `Generating ~${countLabel} suite with analysis…`,
        )

        let fullText = ''
        await AIService.streamAI(
          {
            prompt: input,
            options: {
              module: 'test-case-generator',
              systemPrompt: buildTestCaseBatchPrompt(
                batch,
                allCases.map((c) => c.title),
              ),
              timeout: 600_000,
              maxTokens: batch.includeMeta
                ? maxTokensForMetaBatch(caseCount)
                : maxTokensForCount(caseCount),
            },
          },
          (chunk) => {
            fullText += chunk
            const preview =
              batches.length > 1
                ? `Batch ${batch.index + 1}/${batch.totalBatches} (${from}–${to} of ~${caseCount})\n\n`
                : ''
            setStreamingOutput(preview + fullText)
          },
          (info) => setAiProvider(info),
        )

        if (!fullText.trim()) {
          throw new Error(
            batches.length > 1
              ? `AI returned an empty response on batch ${batch.index + 1}. Please try again.`
              : 'AI returned an empty response. Please try again.',
          )
        }
        if (fullText.includes('[Error:')) {
          throw new Error(
            fullText.replace(/^[\s\S]*\[Error:\s*/, '').replace(/\]\s*$/, '') || 'AI request failed',
          )
        }

        const suite = parseTestSuite(fullText)
        allCases = mergeTestCases(allCases, suite.testCases)
        allNotes = mergeNotes(allNotes, suite.notes)
        // Also pull top-level meta if the model put gaps outside notes
        const metaExtra = parseSuiteMeta(fullText)
        allNotes = mergeNotes(allNotes, metaExtra.notes)
        if (suite.requirementSummary || metaExtra.requirementSummary) {
          summary = suite.requirementSummary || metaExtra.requirementSummary
        }
        if (suite.coverageSummary || metaExtra.coverageSummary) {
          coverage = suite.coverageSummary || metaExtra.coverageSummary
        }
        setTestCases(allCases)
        setNotes(allNotes)
        setRequirementSummary(summary)
        setCoverageSummary(coverage)
      }

      if (!allCases.length) {
        throw new Error('No test cases were generated. Please try again.')
      }

      // Pass 2: if analysis is still empty, run a dedicated meta request
      if (!hasSuiteExtras({ requirementSummary: summary, coverageSummary: coverage, notes: allNotes })) {
        setStreamingOutput('Adding requirement gaps, clarifications & coverage summary…')
        try {
          let metaText = ''
          await AIService.streamAI(
            {
              prompt: input,
              options: {
                module: 'test-case-generator',
                systemPrompt: buildTestCaseMetaPrompt(allCases.map((c) => c.title)),
                timeout: 300_000,
                maxTokens: maxTokensForMeta(),
              },
            },
            (chunk) => {
              metaText += chunk
              setStreamingOutput('Adding requirement gaps, clarifications & coverage summary…\n\n' + metaText)
            },
            (info) => setAiProvider(info),
          )
          if (!metaText.trim()) {
            toast({
              title: 'Analysis incomplete',
              description: 'Test cases are ready, but gaps/questions could not be generated. Try again.',
              variant: 'destructive',
            })
          } else if (metaText.includes('[Error:')) {
            toast({
              title: 'Analysis incomplete',
              description: metaText.replace(/^[\s\S]*\[Error:\s*/, '').replace(/\]\s*$/, '') || 'Meta pass failed',
              variant: 'destructive',
            })
          } else {
            const meta = parseSuiteMeta(metaText)
            allNotes = mergeNotes(allNotes, meta.notes)
            if (meta.requirementSummary) summary = meta.requirementSummary
            if (meta.coverageSummary) coverage = meta.coverageSummary
            setNotes(allNotes)
            setRequirementSummary(summary)
            setCoverageSummary(coverage)
          }
        } catch (metaErr: any) {
          toast({
            title: 'Analysis incomplete',
            description: metaErr?.message || 'Could not generate gaps and clarification questions.',
            variant: 'destructive',
          })
        }
      }

      setStreamingOutput('')
      toast({
        title: "Test Suite Ready",
        description: `${allCases.length} cases` +
          (hasSuiteExtras({ requirementSummary: summary, coverageSummary: coverage, notes: allNotes })
            ? ' + gaps & clarifications'
            : '') +
          (allCases.length < caseCount ? ` (requested ${countLabel})` : ''),
      })
    } catch (error: any) {
      setAiProvider(null)
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveHistory = () => {
    if (!testCases.length) {
      toast({ title: 'Nothing to save', description: 'Generate a suite first.', variant: 'destructive' })
      return
    }
    const err = tryAddHistory({
      title: historyTitleFromInput(input),
      targetCount: caseCount,
      caseCount: testCases.length,
      input,
      testCases,
      notes,
      requirementSummary,
      coverageSummary,
    })
    if (err) {
      toast({ title: 'History full', description: err, variant: 'destructive' })
      setHistoryOpen(true)
      return
    }
    setHistory(loadHistory())
    toast({
      title: 'Saved to History',
      description: `Suite saved (${loadHistory().length}/${HISTORY_MAX} slots used).`,
    })
  }

  const handleLoadHistory = (entry: TestSuiteHistoryEntry) => {
    setInput(entry.input)
    setCaseCount(entry.targetCount)
    setTestCases(entry.testCases)
    setNotes(entry.notes)
    setRequirementSummary(entry.requirementSummary ?? '')
    setCoverageSummary(entry.coverageSummary ?? '')
    setExpanded({})
    setSearch('')
    setAiProvider(null)
    setHistoryOpen(false)
    toast({ title: 'History loaded', description: entry.title })
  }

  const handleDeleteHistory = (id: string) => {
    setHistory(deleteHistory(id))
    toast({ title: 'Removed', description: 'History entry deleted.' })
  }

  const exportSuite = async () => {
    if (!testCases.length) return
    try {
      await downloadTestSuiteExcel({
        testCases,
        notes,
        requirementSummary,
        coverageSummary,
        targetCount: caseCount,
      })
      toast({
        title: 'Excel downloaded',
        description: 'Open the .xlsx file — sheets for Test Cases, Gaps, Questions, Risks, and more.',
      })
    } catch (e: any) {
      toast({
        title: 'Export failed',
        description: e?.message || 'Could not create Excel file.',
        variant: 'destructive',
      })
    }
  }

  const showNotes = hasNotes(notes)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="py-6 sm:py-12"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-2">
        <CinematicHeading
          title="Test Architect"
          subtitle="Generate comprehensive test suites with intelligent edge cases, risk analysis, and automation scripts."
          align="left"
        />
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-full glass-panel hover:bg-white/10 text-xs font-bold uppercase tracking-widest transition-all"
        >
          <History className="w-4 h-4 text-accent-gold" />
          History
          <span className="text-text-muted normal-case tracking-normal font-medium">
            {history.length}/{HISTORY_MAX}
          </span>
        </button>
      </div>

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

            <div className="mt-5 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted mb-2">
                Test Case Count
              </p>
              <div className="grid grid-cols-4 gap-2">
                {TEST_CASE_COUNTS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setCaseCount(n)}
                    className={cn(
                      'py-2.5 rounded-xl text-sm font-bold transition-all border',
                      caseCount === n
                        ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold'
                        : 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10',
                      isGenerating && 'opacity-40',
                    )}
                  >
                    {TEST_CASE_COUNT_LABELS[n]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-text-muted leading-relaxed">
                AI analyzes requirements, then builds prioritized cases in fast 25-case batches. Analysis sections load after cases.
              </p>
            </div>

            <div className="mt-6 flex w-full flex-col gap-3">
              <div className="w-full [&>div]:w-full">
                <FloatingButton
                  onClick={handleGenerate}
                  disabled={generateDisabled}
                  className="w-full justify-center"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {caseCount > 20 ? `Generating in batches…` : `Generating ${countLabel}…`}
                    </>
                  ) : !aiEnabled ? (
                    <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Disabled by Admin</>
                  ) : !userAllowed ? (
                    <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Restricted</>
                  ) : !canGenerateAI ? (
                    <><Lock className="w-4 h-4 mr-2 opacity-60" />AI Generation Locked</>
                  ) : (
                    `Generate ${countLabel} Test Cases`
                  )}
                </FloatingButton>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                className="hidden"
                onChange={handleImport}
              />
              <div className="flex w-full flex-col gap-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isGenerating}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white/5 px-8 text-sm font-bold uppercase tracking-wider transition-all hover:bg-white/10 disabled:opacity-40"
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

            <div className="flex flex-wrap items-center gap-2">
              {testCases.length > 0 && (
                <>
                  <Badge variant="outline" className="bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400">
                    C {priorityBreakdown.Critical}
                  </Badge>
                  <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400">
                    H {priorityBreakdown.High}
                  </Badge>
                  <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400">
                    M {priorityBreakdown.Medium}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-400">
                    L {priorityBreakdown.Low}
                  </Badge>
                </>
              )}
              <Badge variant="outline" className="bg-white/5 border-white/10 text-text-muted">
                {filtered.length} / {testCases.length} cases
              </Badge>
              {testCases.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveHistory}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl glass-panel hover:bg-white/10 text-[10px] font-bold uppercase tracking-wider transition-all"
                  title={`Save to history (${history.length}/${HISTORY_MAX})`}
                >
                  <Save className="w-3.5 h-3.5 text-accent-gold" />
                  Save
                </button>
              )}
              {canExport && (
                <button
                  type="button"
                  onClick={exportSuite}
                  disabled={!testCases.length}
                  className="p-2 glass-panel hover:bg-white/10 transition-all disabled:opacity-40"
                  title="Download Excel (.xlsx)"
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
                {requirementSummary && (
                  <GlassCard hoverEffect={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <ListChecks className="w-4 h-4 text-accent-gold" />
                      <h3 className="text-sm font-bold text-foreground">Requirement Summary</h3>
                    </div>
                    <p className="text-sm text-text-secondary font-montreal leading-relaxed whitespace-pre-wrap">
                      {requirementSummary}
                    </p>
                  </GlassCard>
                )}

                {notes.assumptions.length > 0 && (
                  <GlassCard hoverEffect={false}>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-accent-gold" />
                        <h3 className="text-sm font-bold text-foreground">Assumptions</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyText(
                          notes.assumptions.map((n, i) => `${i + 1}. ${n}`).join('\n'),
                          'assumptions-top',
                          'Assumptions',
                        )}
                        className="p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5"
                      >
                        {copiedId === 'assumptions-top' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <ul className="space-y-2">
                      {notes.assumptions.map((item, i) => (
                        <li key={i} className="flex gap-2.5 text-sm text-text-secondary font-montreal leading-relaxed">
                          <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-gold/70" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                )}

                {CATEGORY_SECTIONS.map(({ category, label, hint }) => {
                  const rows = filteredByCategory[category]
                  if (!rows.length) return null
                  return (
                    <GlassCard key={category} hoverEffect={false} className="overflow-hidden p-0 sm:p-0">
                      <div className="px-4 sm:px-5 py-3 border-b border-white/5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                            {label}
                          </span>
                          <p className="text-[11px] text-text-muted mt-0.5">{hint} · {rows.length}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {category === 'Functional' && <AiProviderBadge info={aiProvider} />}
                        </div>
                      </div>

                      <div className="hidden sm:grid grid-cols-[88px_minmax(0,1fr)_96px_96px_44px] gap-3 px-5 py-2.5 border-b border-white/5 bg-white/[0.02] text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        <span>ID</span>
                        <span>Title</span>
                        <span>Priority</span>
                        <span>Status</span>
                        <span />
                      </div>

                      <div className="divide-y divide-white/5">
                        {rows.map(({ tc, idx }, listIdx) => (
                          <TestCaseRow
                            key={`${category}-${idx}`}
                            tc={tc}
                            idx={idx}
                            listIdx={listIdx}
                            open={!!expanded[idx]}
                            onToggle={() => setExpanded((p) => ({ ...p, [idx]: !p[idx] }))}
                            copiedId={copiedId}
                            onCopySteps={() => copyText(
                              tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
                              `steps-${idx}`,
                              'Steps',
                            )}
                          />
                        ))}
                      </div>
                    </GlassCard>
                  )
                })}

                {!filtered.length && (
                  <div className="p-8 text-center text-sm text-text-muted glass-panel rounded-xl">
                    No test cases match “{search}”.
                  </div>
                )}

                {showNotes && (
                  <GlassCard hoverEffect={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <StickyNote className="w-4 h-4 text-accent-gold" />
                      <h3 className="text-sm font-bold text-foreground">Architect Notes</h3>
                    </div>
                    <p className="text-xs text-text-muted mb-5">
                      Requirement Gaps, Clarification Questions, and Risks — full lists, no artificial caps.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {NOTE_SECTIONS.map(({ key, label, hint, icon: Icon, tone }) => {
                          // Assumptions already rendered as their own top section
                          if (key === 'assumptions') return null
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
                                      {label}
                                      <span className="opacity-70">({items.length})</span>
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
                              <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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

                {coverageSummary && (
                  <GlassCard hoverEffect={false}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-accent-gold" />
                      <h3 className="text-sm font-bold text-foreground">Test Coverage Summary</h3>
                    </div>
                    <p className="text-sm text-text-secondary font-montreal leading-relaxed whitespace-pre-wrap">
                      {coverageSummary}
                    </p>
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
                  {streamingOutput ? `Streaming ${countLabel} suite…` : 'Analyzing requirements…'}
                </p>
                {!streamingOutput ? (
                  <div className="flex flex-col items-center justify-center text-center py-16">
                    <Sparkles className="w-8 h-8 text-accent-gold mb-4 animate-pulse" />
                    <h3 className="text-lg font-bold text-foreground mb-2">Designing your suite</h3>
                    <p className="text-text-secondary text-sm max-w-md">
                      Analyzing requirements, then generating ~{countLabel} prioritized cases with gaps, edge cases, and clarifications.
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
                  Pick a count (20+–150+), enter or import requirements, then generate a structured suite with Functional, Negative, Boundary, and Edge cases plus gaps and clarifications.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {historyOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-label="Close history"
              onClick={() => setHistoryOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="relative w-full max-w-md h-full border-l border-white/10 flex flex-col"
              style={{ background: 'var(--surface)', boxShadow: 'var(--shadow)' }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <div>
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <History className="w-4 h-4 text-accent-gold" />
                    Suite History
                  </h2>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Save up to {HISTORY_MAX} suites. {history.length}/{HISTORY_MAX} used.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="p-2 rounded-full hover:bg-white/5 text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {history.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <Save className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-sm text-text-secondary">
                      No saved suites yet. Generate a suite and click Save.
                    </p>
                  </div>
                ) : (
                  history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <p className="text-sm font-semibold text-foreground leading-snug mb-1">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-text-muted mb-3">
                        {formatSavedAt(entry.savedAt)} · {entry.caseCount} cases
                        (target {TEST_CASE_COUNT_LABELS[entry.targetCount]})
                        {hasNotes(entry.notes) ? ' · notes' : ''}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadHistory(entry)}
                          className="flex-1 py-2 rounded-xl bg-accent-gold/15 text-accent-gold text-[10px] font-bold uppercase tracking-wider hover:bg-accent-gold/25 transition-all"
                        >
                          View / Load
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(entry.id)}
                          className="px-3 py-2 rounded-xl bg-white/5 text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}