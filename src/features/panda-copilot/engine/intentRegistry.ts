// src/features/panda-copilot/engine/intentRegistry.ts
// Central registry of supported intents with keyword patterns and metadata.

import type { IntentId, ProcessingLayer } from '../types/pandaTypes'

export interface IntentDefinition {
  id: IntentId
  layer: ProcessingLayer
  keywords: string[][]   // Each inner array is an AND group; outer array is OR
  description: string
}

export const INTENT_REGISTRY: IntentDefinition[] = [
  // ── Summary ───────────────────────────────────────────────────────────────
  {
    id: 'GET_TODAYS_SUMMARY',
    layer: 'RULE_BASED',
    keywords: [
      ['today', 'summary'],
      ['daily', 'summary'],
      ['today', 'overview'],
      ['workspace', 'glance'],
      ['my', 'workspace'],
      ['dashboard', 'summary'],
    ],
    description: "Today's workspace summary",
  },

  // ── Support Issues ────────────────────────────────────────────────────────
  {
    id: 'GET_SUPPORT_ISSUES',
    layer: 'RULE_BASED',
    keywords: [
      ['support', 'issue'],
      ['support', 'ticket'],
      ['support', 'bug'],
      ['show', 'support'],
      ['list', 'support'],
      ['open', 'issue'],
      ['open', 'support'],
    ],
    description: 'Show support issues',
  },
  {
    id: 'GET_OPEN_ISSUES',
    layer: 'RULE_BASED',
    keywords: [
      ['open', 'issue'],
      ['active', 'issue'],
      ['pending', 'issue'],
      ['in testing'],
      ['not started'],
      ['assigned', 'issue'],
    ],
    description: 'Show open/active issues',
  },
  {
    id: 'GET_CRITICAL_ISSUES',
    layer: 'RULE_BASED',
    keywords: [
      ['critical', 'issue'],
      ['critical', 'bug'],
      ['high', 'priority'],
      ['critical', 'support'],
      ['urgent', 'issue'],
      ['blocked', 'issue'],
    ],
    description: 'Show critical or high-priority issues',
  },

  // ── Release Tracker ───────────────────────────────────────────────────────
  {
    id: 'GET_RELEASE_STATUS',
    layer: 'RULE_BASED',
    keywords: [
      ['release', 'status'],
      ['release', 'task'],
      ['show', 'release'],
      ['list', 'release'],
      ['release', 'testing'],
    ],
    description: 'Show release task status',
  },
  {
    id: 'GET_PENDING_RELEASES',
    layer: 'RULE_BASED',
    keywords: [
      ['pending', 'release'],
      ['release', 'pending'],
      ['awaiting', 'testing'],
      ['not started', 'release'],
      ['in progress', 'release'],
      ['release', 'in progress'],
    ],
    description: 'Show pending releases',
  },

  // ── QA Reports ────────────────────────────────────────────────────────────
  {
    id: 'GET_LATEST_QA_REPORT',
    layer: 'RULE_BASED',
    keywords: [
      ['latest', 'qa', 'report'],
      ['recent', 'qa', 'report'],
      ['last', 'qa', 'report'],
      ['qa', 'report'],
      ['weekly', 'report'],
      ['qa', 'weekly'],
    ],
    description: 'Show latest QA report',
  },
  {
    id: 'GET_QA_REPORTS_BY_DATE',
    layer: 'RULE_BASED',
    keywords: [
      ['qa', 'report', 'week'],
      ['qa', 'report', 'month'],
      ['report', 'this week'],
      ['report', 'last week'],
      ['report', 'this month'],
    ],
    description: 'Show QA reports by date range',
  },

  // ── Projects ──────────────────────────────────────────────────────────────
  {
    id: 'GET_PROJECT_OVERVIEW',
    layer: 'RULE_BASED',
    keywords: [
      ['project', 'overview'],
      ['project', 'detail'],
      ['show', 'project'],
      ['list', 'project'],
      ['my', 'project'],
      ['active', 'project'],
    ],
    description: 'Show project overview',
  },

  // ── My Tasks ──────────────────────────────────────────────────────────────
  {
    id: 'GET_MY_TASKS',
    layer: 'RULE_BASED',
    keywords: [
      ['my', 'task'],
      ['my', 'issue'],
      ['assigned', 'me'],
      ['my', 'assigned'],
      ['tasks', 'assigned'],
    ],
    description: 'Show tasks assigned to me',
  },

  // ── Recent Updates ────────────────────────────────────────────────────────
  {
    id: 'GET_RECENT_UPDATES',
    layer: 'RULE_BASED',
    keywords: [
      ['recent', 'update'],
      ['latest', 'update'],
      ['recently', 'updated'],
      ['updated', 'today'],
      ['updated', 'yesterday'],
    ],
    description: 'Show recently updated records',
  },

  // ── Issue by ID ───────────────────────────────────────────────────────────
  {
    id: 'GET_ISSUE_BY_ID',
    layer: 'RULE_BASED',
    keywords: [
      ['find', 'sup-'],
      ['search', 'sup-'],
      ['find', 'rel-'],
      ['search', 'rel-'],
      ['issue', 'id'],
      ['find', 'issue'],
    ],
    description: 'Find issue by ID',
  },

  // ── Count ─────────────────────────────────────────────────────────────────
  {
    id: 'COUNT_ISSUES',
    layer: 'RULE_BASED',
    keywords: [
      ['count', 'issue'],
      ['how many', 'issue'],
      ['how many', 'bug'],
      ['total', 'issue'],
      ['number of', 'issue'],
    ],
    description: 'Count issues',
  },

  // ── Cross-module Search ───────────────────────────────────────────────────
  {
    id: 'SEARCH_ACROSS_MODULES',
    layer: 'SEARCH',
    keywords: [
      ['search', 'all'],
      ['find', 'everything'],
      ['search', 'module'],
      ['find', 'related'],
      ['search', 'across'],
      ['find', 'release'],
    ],
    description: 'Search across all modules',
  },

  // ── AI Analysis ───────────────────────────────────────────────────────────
  {
    id: 'AI_ANALYSIS',
    layer: 'AI',
    keywords: [
      ['analyze', 'why'],
      ['explain', 'why'],
      ['why', 'defect'],
      ['pattern', 'defect'],
      ['summarize', 'report'],
      ['generate', 'recommendation'],
      ['executive', 'summary'],
      ['risk', 'analysis'],
      ['trend', 'analysis'],
      ['compare', 'performance'],
      ['interpret', 'data'],
    ],
    description: 'AI-powered analysis',
  },
]

/** Quick lookup by intent ID */
export const INTENT_MAP = new Map<IntentId, IntentDefinition>(
  INTENT_REGISTRY.map(d => [d.id, d])
)
