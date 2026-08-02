/** Canonical bug-report sections produced by BUG_PROMPT. */
export const BUG_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'severity', label: 'Severity' },
  { key: 'environment', label: 'Environment' },
  { key: 'steps', label: 'Steps to Reproduce' },
  { key: 'expected', label: 'Expected Result' },
  { key: 'actual', label: 'Actual Result' },
  { key: 'cause', label: 'Possible Cause' },
] as const

export type BugFieldKey = (typeof BUG_FIELDS)[number]['key']

export type BugReportFields = Partial<Record<BugFieldKey, string>>

const LABEL_TO_KEY: Record<string, BugFieldKey> = {
  title: 'title',
  severity: 'severity',
  environment: 'environment',
  'steps to reproduce': 'steps',
  steps: 'steps',
  'expected result': 'expected',
  expected: 'expected',
  'actual result': 'actual',
  actual: 'actual',
  'possible cause': 'cause',
  cause: 'cause',
}

const KNOWN_LABELS = Object.keys(LABEL_TO_KEY)
  .sort((a, b) => b.length - a.length)
  .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|')

/**
 * Parse markdown-ish bug reports into labeled fields.
 * Supports: **Title**: value | **Title**\nvalue | Title: value
 */
export function parseBugReport(raw: string): BugReportFields {
  const text = raw.replace(/\r\n/g, '\n').trim()
  if (!text) return {}

  const headingRe = new RegExp(
    `(?:^|\\n)\\s*(?:#{1,3}\\s*)?(?:\\*\\*)?(${KNOWN_LABELS})(?:\\*\\*)?\\s*:?\\s*`,
    'gi',
  )

  type Match = { key: BugFieldKey; valueStart: number; headingStart: number }
  const matches: Match[] = []
  let m: RegExpExecArray | null
  while ((m = headingRe.exec(text)) !== null) {
    const label = m[1].trim().toLowerCase().replace(/\s+/g, ' ')
    const key = LABEL_TO_KEY[label]
    if (!key) continue
    matches.push({
      key,
      headingStart: m.index,
      valueStart: m.index + m[0].length,
    })
  }

  if (matches.length === 0) return {}

  const fields: BugReportFields = {}
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]
    const end = i + 1 < matches.length ? matches[i + 1].headingStart : text.length
    const value = text.slice(cur.valueStart, end).trim()
    if (value) fields[cur.key] = value
  }
  return fields
}

export function hasParsedFields(fields: BugReportFields): boolean {
  return Object.values(fields).some((v) => !!v?.trim())
}

export function severityTone(severity: string): string {
  const s = severity.toLowerCase()
  if (s.includes('critical')) return 'bg-red-500/15 text-red-400 border-red-500/25'
  if (s.includes('high')) return 'bg-orange-500/15 text-orange-400 border-orange-500/25'
  if (s.includes('medium')) return 'bg-amber-500/15 text-amber-400 border-amber-500/25'
  if (s.includes('low')) return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
  return 'bg-white/10 text-text-secondary border-white/10'
}
