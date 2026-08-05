export type TestCaseCount = 20 | 50 | 100 | 150

export const TEST_CASE_COUNTS: TestCaseCount[] = [20, 50, 100, 150]

export const TEST_CASE_COUNT_LABELS: Record<TestCaseCount, string> = {
  20: '20+',
  50: '50+',
  100: '100+',
  150: '150+',
}

/** Smaller batches = faster completion when falling back to Kimi. */
export const TEST_CASE_BATCH_SIZE = 15

export type TestCaseCategory = 'Functional' | 'Negative' | 'Boundary' | 'Edge'

export interface TestCaseBatch {
  size: number
  index: number
  totalBatches: number
  focus: string
  tier: TestCaseCount
  /** Include summary / gaps / questions on this batch. */
  includeMeta: boolean
}

const TIER_FOCUS: Record<TestCaseCount, string> = {
  20: 'Critical/High smoke + core functional validations only.',
  50: 'Critical–Medium: positive, negative, validation, boundary.',
  100:
    'Full priority range with functional, negative, BVA, workflows, UI, errors, permissions, data & integration scenarios.',
  150:
    'Enterprise coverage: lower tiers + regression, E2E, edge, concurrency, RBAC, recovery, import/export, large-data.',
}

const MULTI_BATCH_FOCI = [
  'functional happy paths, smoke, critical validations',
  'negative paths, invalid input, error handling',
  'boundary / BVA / data validation',
  'edge cases, concurrency, recovery, integrations',
] as const

export function planTestCaseBatches(count: TestCaseCount): TestCaseBatch[] {
  const totalBatches = Math.max(1, Math.ceil(count / TEST_CASE_BATCH_SIZE))
  const batches: TestCaseBatch[] = []
  let remaining = count
  for (let i = 0; i < totalBatches; i++) {
    const size = Math.min(TEST_CASE_BATCH_SIZE, remaining)
    remaining -= size
    const focus =
      totalBatches === 1
        ? TIER_FOCUS[count]
        : `${MULTI_BATCH_FOCI[Math.min(i, MULTI_BATCH_FOCI.length - 1)]} (${TIER_FOCUS[count]})`
    batches.push({
      size,
      index: i,
      totalBatches,
      focus,
      tier: count,
      includeMeta: i === totalBatches - 1,
    })
  }
  return batches
}

const CASES_ONLY_SHAPE =
  'Return ONLY valid JSON (no markdown):\n' +
  '{"testCases":[{"title":"Verify that...","priority":"Critical|High|Medium|Low",' +
  '"status":"Draft","category":"Functional|Negative|Boundary|Edge","steps":["..."]}]}\n'

const CASES_WITH_META_SHAPE =
  'Return ONLY valid JSON (no markdown) with this shape:\n' +
  '{\n' +
  '  "requirementSummary": "2-4 sentences analyzing the requirements",\n' +
  '  "assumptions": ["..."],\n' +
  '  "requirementGaps": ["ALL missing business rules / validations / workflows / error handling / permissions / acceptance criteria — no length cap"],\n' +
  '  "clarificationQuestions": ["ALL ambiguous points to ask PO/Dev — no length cap"],\n' +
  '  "coverageSummary": "2-4 sentences on coverage and residual risk",\n' +
  '  "notes": {\n' +
  '    "gaps": ["same as requirementGaps — full list"],\n' +
  '    "clarificationQuestions": ["same as clarificationQuestions — full list"],\n' +
  '    "assumptions": ["same as assumptions — full list"],\n' +
  '    "risks": ["ALL testing risks — no length cap"]\n' +
  '  },\n' +
  '  "testCases":[{"title":"Verify that...","priority":"Critical|High|Medium|Low",' +
  '"status":"Draft","category":"Functional|Negative|Boundary|Edge","steps":["..."]}]\n' +
  '}\n' +
  'You MUST populate requirementGaps, clarificationQuestions, requirementSummary, coverageSummary, ' +
  'and mirror them into notes. List ALL gaps, clarification questions, and risks — do NOT cap list length.\n'

/** Build system prompt for a case batch. */
export function buildTestCaseBatchPrompt(batch: TestCaseBatch, existingTitles: string[] = []): string {
  const dedupe =
    existingTitles.length > 0
      ? `Do NOT repeat titles:\n- ${existingTitles.slice(-40).join('\n- ')}\n`
      : ''

  const shape = batch.includeMeta ? CASES_WITH_META_SHAPE : CASES_ONLY_SHAPE
  const metaHint = batch.includeMeta
    ? 'This is the FINAL batch — include full analysis sections (summary, gaps, questions, coverage, notes).\n'
    : 'Do NOT include analysis sections on this batch (empty notes only if present).\n'

  return (
    'Senior QA test architect. ' +
    shape +
    `Batch ${batch.index + 1}/${batch.totalBatches} for ${TEST_CASE_COUNT_LABELS[batch.tier]}.\n` +
    metaHint +
    `Generate EXACTLY ${batch.size} unique cases focused on: ${batch.focus}\n` +
    'Rules:\n' +
    '- Derive cases from the requirement text only (no generic filler).\n' +
    '- Priority by risk/business impact (not equal split).\n' +
    '- Mix categories as fits the focus.\n' +
    '- Steps: 2–4 short actions each. Keep titles concise.\n' +
    '- No duplicates. Raw JSON only.\n' +
    dedupe
  )
}

/** Standalone analysis pass if the final batch omitted meta. */
export function buildTestCaseMetaPrompt(caseTitles: string[]): string {
  const titles = caseTitles.slice(0, 60).join('\n- ')
  return (
    'Senior QA test architect. Analyze the requirement text and the generated cases.\n' +
    'Return ONLY valid JSON — do NOT include testCases.\n' +
    '{\n' +
    '  "requirementSummary": "2-4 sentences",\n' +
    '  "assumptions": ["all assumptions used — no length cap"],\n' +
    '  "requirementGaps": ["ALL Requirement Gaps — no length cap"],\n' +
    '  "clarificationQuestions": ["ALL clarification questions — no length cap"],\n' +
    '  "coverageSummary": "2-4 sentences",\n' +
    '  "notes": {\n' +
    '    "gaps": ["mirror requirementGaps — full list"],\n' +
    '    "clarificationQuestions": ["mirror clarificationQuestions — full list"],\n' +
    '    "assumptions": ["mirror assumptions — full list"],\n' +
    '    "risks": ["ALL testing risks — no length cap"]\n' +
    '  }\n' +
    '}\n' +
    'Gaps must cover missing rules, validations, workflows, error handling, permissions, or acceptance criteria where applicable.\n' +
    'Do NOT limit Requirement Gaps, Clarification Questions, or Risks to 3 (or any fixed count) — be exhaustive and specific.\n' +
    'Generated case titles for context:\n- ' +
    titles +
    '\nRaw JSON only. Prefer thorough lists over short ones.'
  )
}

/** @deprecated */
export function buildTestCasePrompt(count: TestCaseCount): string {
  const batches = planTestCaseBatches(count)
  return buildTestCaseBatchPrompt(batches[0]!, [])
}

/** @deprecated */
export const TEST_CASE_PROMPT = buildTestCasePrompt(20)

export function normalizeTestCaseCount(value: unknown): TestCaseCount {
  const n = Number(value)
  if (n <= 20) return 20
  if (n <= 50) return 50
  if (n <= 100) return 100
  return 150
}
