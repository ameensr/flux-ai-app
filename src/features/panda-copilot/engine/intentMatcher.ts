// src/features/panda-copilot/engine/intentMatcher.ts
// Matches a normalized query string against the intent registry.
// Uses keyword scoring — no AI required.

import { INTENT_REGISTRY } from './intentRegistry'
import type { IntentId, ProcessingLayer } from '../types/pandaTypes'

const SYNONYMS: Record<string, string[]> = {
  show: ['display', 'list', 'get', 'fetch', 'give', 'tell'],
  issue: ['bug', 'ticket', 'problem', 'defect', 'item'],
  support: ['sup', 'support-issue', 'support issue'],
  release: ['rel', 'release-task', 'release task', 'deployment'],
  report: ['qa-report', 'weekly report', 'status report'],
  project: ['product', 'workspace'],
  critical: ['urgent', 'blocker', 'p1', 'severity 1'],
  high: ['p2', 'severity 2'],
  open: ['active', 'pending', 'in-progress', 'ongoing'],
  find: ['search', 'look for', 'locate', 'where is'],
  count: ['how many', 'total', 'number of', 'tally'],
  my: ['mine', 'assigned to me', 'i am'],
  analyze: ['analyse', 'analysis', 'investigate', 'examine'],
  summarize: ['summarise', 'summary', 'overview', 'recap'],
}

function expandSynonyms(text: string): string {
  let expanded = text
  for (const [canonical, syns] of Object.entries(SYNONYMS)) {
    for (const syn of syns) {
      if (expanded.includes(syn)) {
        expanded = expanded.replace(new RegExp(syn, 'g'), canonical)
      }
    }
  }
  return expanded
}

function normalize(text: string): string {
  return expandSynonyms(
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

/** Check if all words in a keyword group appear in the normalized text */
function matchesGroup(text: string, group: string[]): boolean {
  return group.every(kw => text.includes(kw.toLowerCase()))
}

/** Score an intent against the normalized text */
function scoreIntent(text: string, keywords: string[][]): number {
  let score = 0
  for (const group of keywords) {
    if (matchesGroup(text, group)) {
      // Longer groups (more specific) score higher
      score = Math.max(score, group.length)
    }
  }
  return score
}

/** Detect if the query contains an issue ID pattern (SUP-xxx or REL-xxx) */
export function extractIssueId(text: string): string | null {
  const m = text.match(/\b(SUP-\d+|REL-\d+)\b/i)
  return m ? m[1].toUpperCase() : null
}

/** Extract a project name hint from the query */
export function extractProjectHint(text: string, knownProjects: string[]): string | null {
  const t = text.toLowerCase()
  for (const name of knownProjects) {
    if (t.includes(name.toLowerCase())) return name
  }
  return null
}

/** Extract status filter from query */
export function extractStatus(text: string): string[] {
  const t = text.toLowerCase()
  const statuses: string[] = []
  const statusMap: Record<string, string> = {
    'not started': 'Not Started',
    'assigned': 'Assigned',
    'in testing': 'In Testing',
    'in progress': 'In Progress',
    'blocked': 'Blocked',
    'retesting': 'Retesting',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'in review': 'In Review',
    'open': 'open',
  }
  for (const [key, val] of Object.entries(statusMap)) {
    if (t.includes(key)) statuses.push(val)
  }
  return statuses
}

/** Extract priority filter from query */
export function extractPriority(text: string): string[] {
  const t = text.toLowerCase()
  const priorities: string[] = []
  if (t.includes('critical')) priorities.push('Critical')
  if (t.includes('high')) priorities.push('High')
  if (t.includes('medium')) priorities.push('Medium')
  if (t.includes('low')) priorities.push('Low')
  return priorities
}

export interface MatchResult {
  intent: IntentId
  layer: ProcessingLayer
  score: number
  normalized: string
}

/**
 * Match a user query to the best intent.
 * Returns UNKNOWN if no intent scores above 0.
 */
export function matchIntent(rawQuery: string): MatchResult {
  const normalized = normalize(rawQuery)

  // Issue ID shortcut
  if (extractIssueId(rawQuery)) {
    return { intent: 'GET_ISSUE_BY_ID', layer: 'RULE_BASED', score: 10, normalized }
  }

  let bestScore = 0
  let bestIntent: IntentId = 'UNKNOWN'
  let bestLayer: ProcessingLayer = 'UNKNOWN'

  for (const def of INTENT_REGISTRY) {
    const score = scoreIntent(normalized, def.keywords)
    if (score > bestScore) {
      bestScore = score
      bestIntent = def.id
      bestLayer = def.layer
    }
  }

  return { intent: bestIntent, layer: bestLayer, score: bestScore, normalized }
}
