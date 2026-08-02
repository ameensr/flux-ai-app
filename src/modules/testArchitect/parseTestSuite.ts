export interface TestCase {
  title: string
  priority: 'High' | 'Medium' | 'Low'
  status: 'Draft' | 'Ready' | 'Automated'
  steps: string[]
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
}

const EMPTY_NOTES: SuiteNotes = {
  gaps: [],
  clarificationQuestions: [],
  assumptions: [],
  risks: [],
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((s): s is string => typeof s === 'string' && !!s.trim())
    .map((s) => s.trim())
}

function parseOneCase(item: unknown, index: number): TestCase {
  if (!item || typeof item !== 'object') {
    throw new Error(`Test case #${index + 1} is invalid.`)
  }
  const row = item as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title.trim() : ''
  if (!title) throw new Error(`Test case #${index + 1} is missing a title.`)

  const priorityRaw = String(row.priority ?? 'Medium')
  const priority = (['High', 'Medium', 'Low'].includes(priorityRaw)
    ? priorityRaw
    : 'Medium') as TestCase['priority']

  const statusRaw = String(row.status ?? 'Draft')
  const status = (['Draft', 'Ready', 'Automated'].includes(statusRaw)
    ? statusRaw
    : 'Draft') as TestCase['status']

  return {
    title,
    priority,
    status,
    steps: asStringArray(row.steps),
  }
}

function parseNotes(raw: unknown): SuiteNotes {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_NOTES }
  const n = raw as Record<string, unknown>
  return {
    gaps: asStringArray(n.gaps),
    clarificationQuestions: asStringArray(
      n.clarificationQuestions ?? n.clarification_questions ?? n.questions,
    ),
    assumptions: asStringArray(n.assumptions),
    risks: asStringArray(n.risks),
  }
}

/** Parse AI JSON: new `{ testCases, notes }` object or legacy bare array. */
export function parseTestSuite(raw: string): TestSuiteResult {
  const jsonStr = raw.replace(/^```[\w]*\n?|\n?```$/g, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    const objMatch = jsonStr.match(/\{\s*"testCases"[\s\S]*\}\s*$/)
    const arrMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/)
    if (objMatch) parsed = JSON.parse(objMatch[0])
    else if (arrMatch) parsed = JSON.parse(arrMatch[0])
    else throw new Error('AI returned an unexpected format. Please try again.')
  }

  if (Array.isArray(parsed)) {
    return {
      testCases: parsed.map(parseOneCase),
      notes: { ...EMPTY_NOTES },
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Expected a test suite object or array.')
  }

  const root = parsed as Record<string, unknown>
  const list = root.testCases ?? root.test_cases ?? root.cases
  if (!Array.isArray(list)) {
    throw new Error('Expected an array of test cases.')
  }

  return {
    testCases: list.map(parseOneCase),
    notes: parseNotes(root.notes),
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
