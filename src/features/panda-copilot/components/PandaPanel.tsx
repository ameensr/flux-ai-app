// src/features/panda-copilot/components/PandaPanel.tsx
// Main Hybrid Panda Copilot panel — orchestrates all three processing layers.

import React, { useState, useRef, useEffect, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLocation } from 'react-router-dom'
import { buildParsedQuery } from '../engine/queryRouter'
import { getPandaAccessContext } from '../permissions/pandaAccessControl'
import { getSupportIssues, getReleaseTasks, getQAReports, getProjects, getTodaysSummary, getMyTasks, searchAcrossModules, getIssueById } from '../services/pandaDataService'
import { invokeAIAnalysis } from '../services/pandaAIService'
import { PandaResponseView } from './PandaResponse'
import { PandaQuickActions } from './PandaQuickActions'
import type { CopilotMessage, PandaResponse, ParsedQuery, IntentId } from '../types/pandaTypes'
import { useAppStore } from '@/store/useAppStore'
import { fetchProjects } from '@/modules/ProjectHub/projectService'

// ── Message ID generator ──────────────────────────────────────────────────────

let msgCounter = 0
function nextMsgId() { return `msg-${++msgCounter}-${Date.now()}` }

// ── Context-aware placeholder ─────────────────────────────────────────────────

function getPlaceholder(route: string): string {
  if (route.includes('support-tracker')) return 'Ask about support issues, search by ID...'
  if (route.includes('release-tracker')) return 'Ask about release tasks, pending testing...'
  if (route.includes('qa-report')) return 'Ask about QA reports, weekly summaries...'
  if (route.includes('project-hub')) return 'Ask about projects, team members...'
  return 'Ask Panda or search your project data...'
}

// ── Main Panel ────────────────────────────────────────────────────────────────

interface PandaPanelProps {
  onClose: () => void
}

export function PandaPanel({ onClose }: PandaPanelProps) {
  const location = useLocation()
  const { profile } = useAppStore()
  const [messages, setMessages] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [knownProjects, setKnownProjects] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Track last intent for follow-up context
  const lastIntentRef = useRef<IntentId | undefined>(undefined)
  const lastModuleRef = useRef<string | undefined>(undefined)

  // Load project names for context extraction
  useEffect(() => {
    fetchProjects({ status: ['active'] })
      .then(projects => setKnownProjects(projects.map(p => p.name)))
      .catch(() => {})
  }, [])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const addMessage = useCallback((msg: Omit<CopilotMessage, 'id' | 'timestamp'>) => {
    setMessages(prev => [...prev, { ...msg, id: nextMsgId(), timestamp: Date.now() }])
  }, [])

  const processQuery = useCallback(async (rawQuery: string, isRetry = false) => {
    if (!rawQuery.trim() || loading) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    if (!isRetry) {
      addMessage({ role: 'user', text: rawQuery })
    }

    setLoading(true)

    try {
      const ctx = getPandaAccessContext()
      const parsedQuery = buildParsedQuery(rawQuery, {
        currentRoute: location.pathname,
        knownProjectNames: knownProjects,
        previousIntentId: lastIntentRef.current,
        previousResultModule: lastModuleRef.current,
      })

      let response: PandaResponse

      switch (parsedQuery.intent) {
        case 'GET_TODAYS_SUMMARY':
          response = await getTodaysSummary(ctx)
          lastModuleRef.current = 'summary'
          break

        case 'GET_SUPPORT_ISSUES':
        case 'GET_OPEN_ISSUES':
          response = await getSupportIssues(parsedQuery, ctx)
          lastModuleRef.current = 'support-tracker'
          break

        case 'GET_CRITICAL_ISSUES':
          response = await getSupportIssues({ ...parsedQuery, intent: 'GET_CRITICAL_ISSUES' }, ctx)
          lastModuleRef.current = 'support-tracker'
          break

        case 'GET_RELEASE_STATUS':
        case 'GET_PENDING_RELEASES':
          response = await getReleaseTasks(parsedQuery, ctx)
          lastModuleRef.current = 'release-tracker'
          break

        case 'GET_LATEST_QA_REPORT':
        case 'GET_QA_REPORTS_BY_DATE':
          response = await getQAReports(parsedQuery, ctx)
          lastModuleRef.current = 'qa-report'
          break

        case 'GET_PROJECT_OVERVIEW':
          response = await getProjects(parsedQuery, ctx)
          lastModuleRef.current = 'project-hub'
          break

        case 'GET_MY_TASKS':
          response = await getMyTasks(ctx)
          lastModuleRef.current = 'my-tasks'
          break

        case 'GET_ISSUE_BY_ID':
          response = await getIssueById(parsedQuery, ctx)
          break

        case 'COUNT_ISSUES':
        case 'FILTER_RECORDS':
          // Route to the most relevant module based on context
          if (lastModuleRef.current === 'release-tracker') {
            response = await getReleaseTasks(parsedQuery, ctx)
          } else {
            response = await getSupportIssues(parsedQuery, ctx)
          }
          break

        case 'SEARCH_ACROSS_MODULES':
          response = await searchAcrossModules(parsedQuery, ctx)
          lastModuleRef.current = 'search'
          break

        case 'GET_RECENT_UPDATES':
          // Show recently updated support issues
          response = await getSupportIssues({
            ...parsedQuery,
            filters: {
              ...parsedQuery.filters,
              dateField: 'updated',
              dateRange: parsedQuery.filters.dateRange ?? {
                start: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
                end: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                label: 'last 7 days',
              },
            },
          }, ctx)
          lastModuleRef.current = 'support-tracker'
          break

        case 'AI_ANALYSIS':
          response = await invokeAIAnalysis(parsedQuery, ctx)
          lastModuleRef.current = 'ai'
          break

        default: {
          // UNKNOWN intent — try context-aware fallback
          const route = location.pathname
          if (route.includes('support-tracker')) {
            response = await getSupportIssues(parsedQuery, ctx)
          } else if (route.includes('release-tracker')) {
            response = await getReleaseTasks(parsedQuery, ctx)
          } else if (route.includes('qa-report')) {
            response = await getQAReports(parsedQuery, ctx)
          } else {
            response = {
              type: 'TEXT',
              aiText: `I'm not sure how to help with that. Try asking about:\n• Support issues ("show open support issues")\n• Release tasks ("show pending releases")\n• QA reports ("show latest QA report")\n• Projects ("show active projects")\n• Or search by ID (e.g. "find SUP-1024")`,
            }
          }
        }
      }

      lastIntentRef.current = parsedQuery.intent

      addMessage({
        role: 'panda',
        response,
        parsedQuery,
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      addMessage({
        role: 'panda',
        response: {
          type: 'ERROR_STATE',
          errorMessage: err?.message || 'Something went wrong. Please try again.',
          canRetry: true,
          originalQuery: rawQuery,
        },
      })
    } finally {
      setLoading(false)
      setRetrying(false)
    }
  }, [loading, location.pathname, knownProjects, addMessage])

  const handleSend = useCallback(() => {
    const q = input.trim()
    if (!q) return
    setInput('')
    processQuery(q)
  }, [input, processQuery])

  const handleRetry = useCallback((originalQuery: string) => {
    setRetrying(true)
    processQuery(originalQuery, true)
  }, [processQuery])

  const handleShowData = useCallback((originalQuery: string) => {
    // Re-run as a data query (not AI)
    const dataQuery = originalQuery.replace(/analyze|explain|why|summarize|generate/gi, 'show')
    processQuery(dataQuery, true)
  }, [processQuery])

  const handleQuickAction = useCallback((query: string) => {
    setInput('')
    processQuery(query)
  }, [processQuery])

  const showHome = messages.length === 0 && !loading

  return (
    <div
      className="h-full flex flex-col font-mono text-xs md:text-sm rounded-2xl overflow-hidden border"
      style={{
        background: 'var(--modal-bg)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-3 shrink-0 border-b"
        style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px]" style={{ color: 'var(--accent)' }}>QA Pilot</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Your project data, one conversation away.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border transition-all cursor-pointer"
            style={{ color: 'var(--text-muted)', borderColor: 'transparent', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent' }}
            aria-label="Close QA Pilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages / Home */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0" style={{ background: 'var(--bg)' }}>
        {showHome ? (
          <div className="space-y-4">
            {/* Welcome */}
            <div className="text-center py-2">
              <p className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Hi{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! What can I help you with?
              </p>
            </div>
            {/* Quick Actions */}
            <PandaQuickActions onSelect={handleQuickAction} />
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className="space-y-1">
                {msg.role === 'user' ? (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                      &gt; you
                    </p>
                    <div
                      className="rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed border"
                      style={{
                        background: 'color-mix(in srgb, var(--accent) 10%, var(--surface))',
                        borderColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {msg.text}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                      🐼 panda
                    </p>
                    {msg.response ? (
                      <PandaResponseView
                        response={msg.response}
                        onRetry={msg.response.originalQuery ? () => handleRetry(msg.response!.originalQuery!) : undefined}
                        onShowData={msg.response.originalQuery ? () => handleShowData(msg.response!.originalQuery!) : undefined}
                        onNavigate={onClose}
                        retrying={retrying}
                      />
                    ) : msg.text ? (
                      <div
                        className="rounded-xl px-3.5 py-2.5 text-[12px] leading-relaxed border whitespace-pre-wrap"
                        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                      >
                        {msg.text}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ))}

            {loading && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  🐼 panda
                </p>
                <div
                  className="flex items-center gap-2 rounded-xl px-3.5 py-3 border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
                  <span className="text-[12px]">Fetching your data…</span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                    className="inline-block w-1.5 h-3"
                    style={{ background: 'var(--text-secondary)' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 shrink-0 border-t"
        style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all"
          style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
        >
          <span className="select-none shrink-0 text-[13px]" style={{ color: 'var(--accent)' }}>🐼</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder={getPlaceholder(location.pathname)}
            disabled={loading}
            className="flex-1 min-w-0 bg-transparent outline-none text-[12px] disabled:opacity-50 placeholder:opacity-50"
            style={{ color: 'var(--text-primary)' }}
            aria-label="Ask Panda"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-1.5 rounded-lg border transition-all disabled:opacity-40"
            style={{
              background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
              color: 'var(--accent)',
              borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
            }}
            aria-label="Send"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); lastIntentRef.current = undefined; lastModuleRef.current = undefined }}
            className="mt-2 w-full text-[10px] text-center transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Clear conversation
          </button>
        )}
      </div>
    </div>
  )
}
