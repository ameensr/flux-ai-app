import type { SuiteNotes, TestCase } from '@/modules/testArchitect/parseTestSuite'
import {
  normalizeTestCaseCount,
  type TestCaseCount,
} from '@/ai/prompts/testCasePrompt'

export const HISTORY_STORAGE_KEY = 'qaly-test-architect-history'
export const HISTORY_MAX = 3

export interface TestSuiteHistoryEntry {
  id: string
  savedAt: string
  title: string
  targetCount: TestCaseCount
  caseCount: number
  input: string
  testCases: TestCase[]
  notes: SuiteNotes
  requirementSummary?: string
  coverageSummary?: string
}

function normalizeEntry(raw: unknown): TestSuiteHistoryEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>
  if (typeof e.id !== 'string' || !Array.isArray(e.testCases)) return null
  return {
    id: e.id,
    savedAt: typeof e.savedAt === 'string' ? e.savedAt : new Date().toISOString(),
    title: typeof e.title === 'string' ? e.title : 'Untitled suite',
    targetCount: normalizeTestCaseCount(e.targetCount),
    caseCount: Number(e.caseCount) || (e.testCases as unknown[]).length,
    input: typeof e.input === 'string' ? e.input : '',
    testCases: (e.testCases as TestCase[]).map((tc) => ({
      ...tc,
      category: tc.category ?? 'Functional',
      priority: tc.priority === 'Critical' || tc.priority === 'High' || tc.priority === 'Medium' || tc.priority === 'Low'
        ? tc.priority
        : 'Medium',
    })),
    notes: (e.notes as SuiteNotes) ?? {
      gaps: [],
      clarificationQuestions: [],
      assumptions: [],
      risks: [],
    },
    requirementSummary: typeof e.requirementSummary === 'string' ? e.requirementSummary : '',
    coverageSummary: typeof e.coverageSummary === 'string' ? e.coverageSummary : '',
  }
}

export function loadHistory(): TestSuiteHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeEntry).filter((e): e is TestSuiteHistoryEntry => !!e)
  } catch {
    return []
  }
}

export function saveHistory(entries: TestSuiteHistoryEntry[]): void {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_MAX)))
}

/** Returns error message if over capacity; otherwise null and persists the new entry. */
export function tryAddHistory(entry: Omit<TestSuiteHistoryEntry, 'id' | 'savedAt'>): string | null {
  const current = loadHistory()
  if (current.length >= HISTORY_MAX) {
    return `You can save only ${HISTORY_MAX} suites. Delete one from History before saving another.`
  }
  const next: TestSuiteHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
  }
  saveHistory([next, ...current])
  return null
}

export function deleteHistory(id: string): TestSuiteHistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id)
  saveHistory(next)
  return next
}

export function historyTitleFromInput(input: string): string {
  const t = input.trim().replace(/\s+/g, ' ')
  if (!t) return 'Untitled suite'
  return t.length > 72 ? `${t.slice(0, 72)}…` : t
}

/** Per-batch max_tokens — last/meta batch needs more headroom. */
export function maxTokensForCount(count: TestCaseCount = 20): number {
  switch (count) {
    case 20:
      return 4096
    case 50:
      return 4096
    case 100:
    case 150:
      return 4096
  }
}

/** Tokens for the lightweight meta/analysis pass (uncapped gap/question lists). */
export function maxTokensForMeta(): number {
  return 3072
}

/** Extra tokens when the final batch also includes analysis sections. */
export function maxTokensForMetaBatch(count: TestCaseCount = 20): number {
  return Math.min(8192, maxTokensForCount(count) + 2560)
}
