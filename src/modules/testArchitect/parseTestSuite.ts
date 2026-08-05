export type TestCasePriority = 'Critical' | 'High' | 'Medium' | 'Low'
export type TestCaseStatus = 'Draft' | 'Ready' | 'Automated'
export type TestCaseCategory = 'Functional' | 'Negative' | 'Boundary' | 'Edge'

export interface TestCase {
  title: string
  priority: TestCasePriority
  status: TestCaseStatus
  steps: string[]
  /** Defaults to Functional for legacy suites. */
  category: TestCaseCategory
}

export interface SuiteNotes {
  gaps: string[]
  clarificationQuestions: string[]
  assumptions: string[]
  risks: string[]
}

export interface TestSuiteResult {
  testCases: TestCase[]
  notes: SuiteNotes
  requirementSummary: string
  coverageSummary: string
}

export const EMPTY_NOTES: SuiteNotes = {
  gaps: [],
  clarificationQuestions: [],
  assumptions: [],
  risks: [],
}

export const EMPTY_SUITE_META = {
  requirementSummary: '',
  coverageSummary: '',
}

function asStringArray(value: unknown): string[] {
  if (typeof value === 'string' && value.trim()) return [value.trim()]
  if (!Array.isArray(value)) return []
  return value
    .filter((s): s is string => typeof s === 'string' && !!s.trim())
    .map((s) => s.trim())
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parsePriority(raw: unknown): TestCasePriority {
  const v = String(raw ?? 'Medium')
  if (v === 'Critical' || v === 'High' || v === 'Medium' || v === 'Low') return v
  // Legacy / fuzzy
  const lower = v.toLowerCase()
  if (lower.includes('critic')) return 'Critical'
  if (lower.includes('high')) return 'High'
  if (lower.includes('low')) return 'Low'
  return 'Medium'
}

function parseCategory(raw: unknown, title: string): TestCaseCategory {
  const v = String(raw ?? '').trim()
  if (v === 'Functional' || v === 'Negative' || v === 'Boundary' || v === 'Edge') return v
  const lower = `${v} ${title}`.toLowerCase()
  if (lower.includes('edge')) return 'Edge'
  if (lower.includes('boundar') || lower.includes('bva') || lower.includes('equivalence')) return 'Boundary'
  if (lower.includes('negative') || lower.includes('invalid') || lower.includes('error')) return 'Negative'
  return 'Functional'
}

function parseOneCase(item: unknown, _index: number): TestCase | null {
  if (!item || typeof item !== 'object') return null
  const row = item as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  if (!title) return null

  const statusRaw = String(row.status ?? 'Draft')
  const status = (['Draft', 'Ready', 'Automated'].includes(statusRaw)
    ? statusRaw
    : 'Draft') as TestCaseStatus

  return {
    title,
    priority: parsePriority(row.priority),
    status,
    category: parseCategory(row.category ?? row.type ?? row.kind, title),
    steps: asStringArray(row.steps),
  }
}

function parseNotes(raw: unknown): SuiteNotes {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_NOTES }
  const n = raw as Record<string, unknown>
  return {
    gaps: asStringArray(n.gaps ?? n.requirementGaps ?? n.requirement_gaps),
    clarificationQuestions: asStringArray(
      n.clarificationQuestions ?? n.clarification_questions ?? n.questions,
    ),
    assumptions: asStringArray(n.assumptions),
    risks: asStringArray(n.risks),
  }
}

/** Strip ```json … ``` fences anywhere in the payload. */
function stripMarkdownFences(raw: string): string {
  const fenced = raw.match(/```(?:json|JSON)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) return fenced[1].trim()
  return raw.replace(/^```(?:json|JSON)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

/** Extract the first balanced `{…}` or `[…]` substring. */
function extractBalancedJson(text: string): string | null {
  const startObj = text.indexOf('{')
  const startArr = text.indexOf('[')
  let start = -1
  let open = ''
  let close = ''
  if (startObj === -1 && startArr === -1) return null
  if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
    start = startObj
    open = '{'
    close = '}'
  } else {
    start = startArr
    open = '['
    close = ']'
  }

  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]!
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === open) depth++
    else if (ch === close) {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return text.slice(start)
}

function repairTruncatedJson(fragment: string): string {
  let s = fragment.trim().replace(/,\s*$/, '')

  let inString = false
  let escape = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
    } else if (ch === '"') {
      inString = true
    }
  }
  if (inString) s += '"'

  s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"{}[\]]*$/, '')
  s = s.replace(/,\s*\{[^}]*$/, '')
  s = s.replace(/,\s*$/, '')

  const stack: string[] = []
  inString = false
  escape = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if (ch === '}' || ch === ']') {
      if (stack.length && stack[stack.length - 1] === ch) stack.pop()
    }
  }
  while (stack.length) s += stack.pop()
  return s
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function salvageTestCasesFromText(raw: string): TestCase[] {
  const cases: TestCase[] = []
  const re = /\{\s*"title"\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]*?\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    const balanced = extractBalancedJson(raw.slice(m.index))
    const candidate = balanced && balanced.startsWith('{') ? balanced : m[0]
    const parsed = tryParseJson(candidate)
    const tc = parseOneCase(parsed, cases.length)
    if (tc) cases.push(tc)
    if (cases.length >= 250) break
  }
  return cases
}

function parseCaseList(value: unknown, categoryHint?: TestCaseCategory): TestCase[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, i) => {
      const tc = parseOneCase(item, i)
      if (!tc) return null
      if (categoryHint && (!item || typeof item !== 'object' || !(item as Record<string, unknown>).category)) {
        return { ...tc, category: categoryHint }
      }
      return tc
    })
    .filter((c): c is TestCase => !!c)
}

function coerceSuite(parsed: unknown): TestSuiteResult | null {
  if (Array.isArray(parsed)) {
    const testCases = parsed
      .map((item, i) => parseOneCase(item, i))
      .filter((c): c is TestCase => !!c)
    if (!testCases.length) return null
    return {
      testCases,
      notes: { ...EMPTY_NOTES },
      ...EMPTY_SUITE_META,
    }
  }
  if (!parsed || typeof parsed !== 'object') return null
  const root = parsed as Record<string, unknown>

  // Prefer unified testCases; also accept sectioned arrays
  let testCases = parseCaseList(root.testCases ?? root.test_cases ?? root.cases)
  if (!testCases.length) {
    testCases = [
      ...parseCaseList(root.functionalTestCases ?? root.functional_test_cases, 'Functional'),
      ...parseCaseList(root.negativeTestCases ?? root.negative_test_cases, 'Negative'),
      ...parseCaseList(root.boundaryTestCases ?? root.boundary_test_cases, 'Boundary'),
      ...parseCaseList(root.edgeCases ?? root.edge_cases, 'Edge'),
    ]
  }
  if (!testCases.length) return null

  const notesFromNotes = parseNotes(root.notes)
  const topGaps = asStringArray(root.requirementGaps ?? root.requirement_gaps)
  const topQuestions = asStringArray(
    root.clarificationQuestions ?? root.clarification_questions,
  )
  const topAssumptions = asStringArray(root.assumptions)

  const notes: SuiteNotes = {
    gaps: uniqStrings([...notesFromNotes.gaps, ...topGaps]),
    clarificationQuestions: uniqStrings([
      ...notesFromNotes.clarificationQuestions,
      ...topQuestions,
    ]),
    assumptions: uniqStrings([...notesFromNotes.assumptions, ...topAssumptions]),
    risks: notesFromNotes.risks,
  }

  return {
    testCases,
    notes,
    requirementSummary: asString(
      root.requirementSummary ?? root.requirement_summary ?? root.summary,
    ),
    coverageSummary: asString(
      root.coverageSummary ??
        root.coverage_summary ??
        (typeof root.notes === 'object' && root.notes
          ? (root.notes as Record<string, unknown>).coverageSummary
          : ''),
    ),
  }
}

/** Parse AI JSON into a structured suite (backward compatible with legacy shapes). */
export function parseTestSuite(raw: string): TestSuiteResult {
  const cleaned = stripMarkdownFences(raw.replace(/^\uFEFF/, '')).trim()
  if (!cleaned) {
    throw new Error('AI returned an empty response. Please try again.')
  }
  if (cleaned.includes('[Error:')) {
    throw new Error(
      cleaned.replace(/^[\s\S]*\[Error:\s*/, '').replace(/\]\s*$/, '') || 'AI request failed',
    )
  }

  let parsed = tryParseJson(cleaned)

  if (parsed === undefined) {
    const extracted = extractBalancedJson(cleaned)
    if (extracted) {
      parsed = tryParseJson(extracted)
      if (parsed === undefined) {
        parsed = tryParseJson(repairTruncatedJson(extracted))
      }
    }
  }

  if (parsed === undefined) {
    const objMatch = cleaned.match(
      /\{\s*"(?:testCases|test_cases|cases|functionalTestCases|requirementSummary)"[\s\S]*/,
    )
    if (objMatch) {
      parsed = tryParseJson(repairTruncatedJson(objMatch[0]))
    }
  }

  const suite = coerceSuite(parsed)
  if (suite) return suite

  const salvaged = salvageTestCasesFromText(cleaned)
  if (salvaged.length) {
    return {
      testCases: salvaged,
      notes: { ...EMPTY_NOTES },
      ...EMPTY_SUITE_META,
    }
  }

  throw new Error('AI returned an unexpected format. Please try again.')
}

/** Parse analysis-only JSON (no testCases required). */
export function parseSuiteMeta(raw: string): Pick<
  TestSuiteResult,
  'notes' | 'requirementSummary' | 'coverageSummary'
> {
  const cleaned = stripMarkdownFences(raw.replace(/^\uFEFF/, '')).trim()
  let parsed = tryParseJson(cleaned)
  if (parsed === undefined) {
    const extracted = extractBalancedJson(cleaned)
    if (extracted) {
      parsed = tryParseJson(extracted) ?? tryParseJson(repairTruncatedJson(extracted))
    }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { notes: { ...EMPTY_NOTES }, ...EMPTY_SUITE_META }
  }
  const root = parsed as Record<string, unknown>
  const notesFromNotes = parseNotes(root.notes)
  const topGaps = asStringArray(root.requirementGaps ?? root.requirement_gaps)
  const topQuestions = asStringArray(
    root.clarificationQuestions ?? root.clarification_questions,
  )
  const topAssumptions = asStringArray(root.assumptions)
  return {
    notes: {
      gaps: uniqStrings([...notesFromNotes.gaps, ...topGaps]),
      clarificationQuestions: uniqStrings([
        ...notesFromNotes.clarificationQuestions,
        ...topQuestions,
      ]),
      assumptions: uniqStrings([...notesFromNotes.assumptions, ...topAssumptions]),
      risks: notesFromNotes.risks,
    },
    requirementSummary: asString(
      root.requirementSummary ?? root.requirement_summary ?? root.summary,
    ),
    coverageSummary: asString(root.coverageSummary ?? root.coverage_summary),
  }
}

export function hasNotes(notes: SuiteNotes): boolean {
  return (
    notes.gaps.length +
      notes.clarificationQuestions.length +
      notes.assumptions.length +
      notes.risks.length >
    0
  )
}

export function hasSuiteExtras(
  suite: Pick<TestSuiteResult, 'requirementSummary' | 'coverageSummary' | 'notes'>,
): boolean {
  return (
    !!suite.requirementSummary ||
    !!suite.coverageSummary ||
    hasNotes(suite.notes)
  )
}

function uniqStrings(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of items) {
    const key = raw.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(raw.trim())
  }
  return out
}

/** Merge note lists across batches (case-insensitive dedupe). */
export function mergeNotes(...parts: SuiteNotes[]): SuiteNotes {
  return {
    gaps: uniqStrings(parts.flatMap((p) => p.gaps)),
    clarificationQuestions: uniqStrings(parts.flatMap((p) => p.clarificationQuestions)),
    assumptions: uniqStrings(parts.flatMap((p) => p.assumptions)),
    risks: uniqStrings(parts.flatMap((p) => p.risks)),
  }
}

/** Append cases, skipping duplicate titles (case-insensitive). */
export function mergeTestCases(existing: TestCase[], incoming: TestCase[]): TestCase[] {
  const seen = new Set(existing.map((c) => c.title.trim().toLowerCase()))
  const out = [...existing]
  for (const tc of incoming) {
    const key = tc.title.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(tc)
  }
  return out
}

export function casesByCategory(
  cases: TestCase[],
  category: TestCaseCategory,
): TestCase[] {
  return cases.filter((c) => c.category === category)
}

/** Build export payload including all architect sections. */
export function buildExportPayload(suite: {
  testCases: TestCase[]
  notes: SuiteNotes
  requirementSummary: string
  coverageSummary: string
  targetCount: number
}) {
  const { testCases, notes, requirementSummary, coverageSummary, targetCount } = suite
  return {
    targetCount,
    requirementSummary,
    assumptions: notes.assumptions,
    functionalTestCases: casesByCategory(testCases, 'Functional'),
    negativeTestCases: casesByCategory(testCases, 'Negative'),
    boundaryTestCases: casesByCategory(testCases, 'Boundary'),
    edgeCases: casesByCategory(testCases, 'Edge'),
    requirementGaps: notes.gaps,
    clarificationQuestions: notes.clarificationQuestions,
    coverageSummary,
    risks: notes.risks,
    // Backward-compatible flat fields
    testCases,
    notes,
  }
}
