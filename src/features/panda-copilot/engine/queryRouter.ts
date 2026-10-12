// src/features/panda-copilot/engine/queryRouter.ts
// Builds a ParsedQuery from raw user input and conversation context.

import { matchIntent, extractIssueId, extractStatus, extractPriority, extractProjectHint } from './intentMatcher'
import { parseDateExpression, parseDateField } from './dateParser'
import type { ParsedQuery, IntentId } from '../types/pandaTypes'

export interface RouterContext {
  currentRoute?: string
  currentProjectId?: string
  previousIntentId?: IntentId
  previousResultModule?: string
  knownProjectNames?: string[]
}

/**
 * Build a fully-parsed query from raw user input and conversation context.
 * This is the single entry point for all user messages.
 */
export function buildParsedQuery(rawQuery: string, ctx: RouterContext = {}): ParsedQuery {
  const { intent, layer, normalized } = matchIntent(rawQuery)

  const issueId = extractIssueId(rawQuery)
  const statuses = extractStatus(rawQuery)
  const priorities = extractPriority(rawQuery)
  const dateRange = parseDateExpression(rawQuery) ?? undefined
  const dateField = dateRange ? parseDateField(rawQuery) : undefined
  const projectName = extractProjectHint(rawQuery, ctx.knownProjectNames ?? []) ?? undefined

  // Keyword extraction for search
  const keyword = extractKeyword(rawQuery)

  return {
    raw: rawQuery,
    normalized,
    intent,
    layer,
    filters: {
      status: statuses.length > 0 ? statuses : undefined,
      priority: priorities.length > 0 ? priorities : undefined,
      projectId: ctx.currentProjectId,
      projectName,
      issueId: issueId ?? undefined,
      keyword,
      dateRange,
      dateField,
    },
    context: {
      currentRoute: ctx.currentRoute,
      currentProjectId: ctx.currentProjectId,
      previousIntentId: ctx.previousIntentId,
      previousResultModule: ctx.previousResultModule,
    },
  }
}

/** Extract a meaningful search keyword from the query, stripping common stop words */
function extractKeyword(text: string): string | undefined {
  const stopWords = new Set([
    'show', 'find', 'get', 'list', 'display', 'search', 'fetch',
    'me', 'my', 'the', 'a', 'an', 'all', 'some', 'any',
    'issue', 'issues', 'bug', 'bugs', 'task', 'tasks',
    'support', 'release', 'project', 'report',
    'today', 'yesterday', 'week', 'month',
    'open', 'closed', 'active', 'pending',
    'critical', 'high', 'medium', 'low',
    'and', 'or', 'for', 'in', 'on', 'at', 'by', 'with',
  ])

  const words = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))

  // Return the first meaningful word that isn't a common filter term
  return words[0] || undefined
}
