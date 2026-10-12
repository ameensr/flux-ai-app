// src/features/panda-copilot/engine/dateParser.ts
// Deterministic date parsing for common natural-language date expressions.
// All calculations use local date boundaries (start-inclusive, end-exclusive).

export interface ParsedDateRange {
  start: string   // YYYY-MM-DD inclusive
  end: string     // YYYY-MM-DD exclusive (i.e. < end)
  label: string
}

function toISO(d: Date): string {
  return d.toISOString().split('T')[0]
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date): Date {
  // Monday-based week
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(d, diff))
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

/**
 * Parse a natural-language date expression from a query string.
 * Returns null if no recognizable date expression is found.
 */
export function parseDateExpression(text: string): ParsedDateRange | null {
  const t = text.toLowerCase().trim()
  const today = startOfDay(new Date())

  // ── Exact phrases ─────────────────────────────────────────────────────────

  if (/\btoday\b/.test(t)) {
    return { start: toISO(today), end: toISO(addDays(today, 1)), label: 'today' }
  }

  if (/\byesterday\b/.test(t)) {
    const y = addDays(today, -1)
    return { start: toISO(y), end: toISO(today), label: 'yesterday' }
  }

  if (/\bthis\s+week\b/.test(t)) {
    const sw = startOfWeek(today)
    return { start: toISO(sw), end: toISO(addDays(sw, 7)), label: 'this week' }
  }

  if (/\blast\s+week\b/.test(t)) {
    const sw = startOfWeek(today)
    const lw = addDays(sw, -7)
    return { start: toISO(lw), end: toISO(sw), label: 'last week' }
  }

  if (/\bthis\s+month\b/.test(t)) {
    const sm = startOfMonth(today)
    return { start: toISO(sm), end: toISO(endOfMonth(today)), label: 'this month' }
  }

  if (/\blast\s+month\b/.test(t)) {
    const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return { start: toISO(lm), end: toISO(startOfMonth(today)), label: 'last month' }
  }

  if (/\bsince\s+yesterday\b/.test(t)) {
    const y = addDays(today, -1)
    return { start: toISO(y), end: toISO(addDays(today, 1)), label: 'since yesterday' }
  }

  if (/\blast\s+(\d+)\s+days?\b/.test(t)) {
    const m = t.match(/last\s+(\d+)\s+days?/)
    if (m) {
      const n = parseInt(m[1], 10)
      return { start: toISO(addDays(today, -n)), end: toISO(addDays(today, 1)), label: `last ${n} days` }
    }
  }

  // ── Between date1 and date2 ───────────────────────────────────────────────
  const betweenMatch = t.match(
    /between\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)\s+and\s+(\w+\s+\d{1,2}(?:,?\s+\d{4})?)/
  )
  if (betweenMatch) {
    const d1 = parseLooseDate(betweenMatch[1], today.getFullYear())
    const d2 = parseLooseDate(betweenMatch[2], today.getFullYear())
    if (d1 && d2) {
      return { start: toISO(d1), end: toISO(addDays(d2, 1)), label: `${betweenMatch[1]} – ${betweenMatch[2]}` }
    }
  }

  return null
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
}

function parseLooseDate(s: string, defaultYear: number): Date | null {
  const parts = s.trim().split(/[\s,]+/)
  if (parts.length < 2) return null
  const monthIdx = MONTH_MAP[parts[0].toLowerCase()]
  if (monthIdx === undefined) return null
  const day = parseInt(parts[1], 10)
  const year = parts[2] ? parseInt(parts[2], 10) : defaultYear
  if (isNaN(day) || isNaN(year)) return null
  return new Date(year, monthIdx, day)
}

/**
 * Extract date field preference from query text.
 * Distinguishes "created", "updated", "received".
 */
export function parseDateField(text: string): 'created' | 'updated' | 'received' {
  const t = text.toLowerCase()
  if (/\bupdated\b/.test(t)) return 'updated'
  if (/\breceived\b/.test(t)) return 'received'
  return 'created'
}
