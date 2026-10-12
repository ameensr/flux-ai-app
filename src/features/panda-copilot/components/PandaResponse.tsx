// src/features/panda-copilot/components/PandaResponse.tsx
// Renders a structured PandaResponse — the main output component.

import React from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Database, AlertTriangle, Info, Coffee } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PandaResponse as PandaResponseType, SummaryCard } from '../types/pandaTypes'
import { SupportIssuesTable, ReleaseTasksTable, QAReportsTable, ProjectsTable } from './PandaResultTable'
import { PandaCrossModuleResults } from './PandaCrossModuleResults'

// ── Summary Cards ─────────────────────────────────────────────────────────────

const CARD_COLORS: Record<string, string> = {
  green: 'border-emerald-500/30 bg-emerald-500/8',
  red: 'border-red-500/30 bg-red-500/8',
  amber: 'border-amber-500/30 bg-amber-500/8',
  blue: 'border-blue-500/30 bg-blue-500/8',
  purple: 'border-purple-500/30 bg-purple-500/8',
  default: 'border-[var(--border)] bg-[var(--surface)]',
}

const CARD_TEXT: Record<string, string> = {
  green: 'text-emerald-400',
  red: 'text-red-400',
  amber: 'text-amber-400',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  default: 'text-[var(--text-primary)]',
}

function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {cards.map((card, i) => {
        const color = card.color || 'default'
        return (
          <div
            key={i}
            className={cn('rounded-xl border px-3 py-2.5', CARD_COLORS[color])}
          >
            <div className={cn('text-lg font-bold leading-none mb-1', CARD_TEXT[color])}>
              {card.value}
            </div>
            <div className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {card.label}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tea Break ─────────────────────────────────────────────────────────────────

function TeaBreakResponse({
  response,
  onRetry,
  onShowData,
  retrying,
}: {
  response: PandaResponseType
  onRetry?: () => void
  onShowData?: () => void
  retrying?: boolean
}) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border p-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <Coffee className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-[12px] font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              🐼 Panda's on a Tea Break! ☕
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Even the smartest pandas need a little chai time!
            </p>
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>
              My AI brain is temporarily unavailable, but I can still fetch your project data, QA reports, and support issues.
            </p>
            <p className="text-[11px] leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>
              Let's try the AI magic again in a little while! ✨
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {response.canRetry && onRetry && (
            <button
              onClick={onRetry}
              disabled={retrying}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--accent) 35%, transparent)',
                color: 'var(--accent)',
              }}
            >
              {retrying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Try Again
            </button>
          )}
          {response.canShowData && onShowData && (
            <button
              onClick={onShowData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all"
              style={{
                background: 'var(--surface-elevated)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <Database className="w-3 h-3" />
              Show Available Data
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AI Response ───────────────────────────────────────────────────────────────

function AIResponseBlock({ text }: { text: string }) {
  return (
    <div
      className="rounded-xl border px-3.5 py-3 text-[12px] leading-relaxed whitespace-pre-wrap"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
    >
      {text}
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ message, summaryCards }: { message?: string; summaryCards?: SummaryCard[] }) {
  return (
    <div className="space-y-3">
      {summaryCards && summaryCards.length > 0 && <SummaryCards cards={summaryCards} />}
      <div
        className="rounded-xl border px-4 py-5 flex flex-col items-center text-center gap-2"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <Info className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {message || 'No matching records found.'}
        </p>
      </div>
    </div>
  )
}

// ── Error State ───────────────────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      className="rounded-xl border px-4 py-3 flex items-start gap-3"
      style={{ background: 'var(--surface)', borderColor: 'color-mix(in srgb, #ef4444 30%, transparent)' }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          {message || 'An error occurred. Please try again.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-[11px] font-semibold"
            style={{ color: 'var(--accent)' }}
          >
            Try again
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main PandaResponse Component ──────────────────────────────────────────────

interface PandaResponseProps {
  response: PandaResponseType
  onRetry?: () => void
  onShowData?: () => void
  onNavigate?: () => void
  retrying?: boolean
}

export function PandaResponseView({
  response,
  onRetry,
  onShowData,
  onNavigate,
  retrying,
}: PandaResponseProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-2"
    >
      {/* Title */}
      {response.title && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--text-primary)' }}>
            {response.title}
          </p>
          {response.subtitle && (
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{response.subtitle}</p>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {response.summaryCards && response.summaryCards.length > 0 && response.type !== 'EMPTY_STATE' && (
        <SummaryCards cards={response.summaryCards} />
      )}

      {/* Content by type */}
      {response.type === 'TEA_BREAK' && (
        <TeaBreakResponse response={response} onRetry={onRetry} onShowData={onShowData} retrying={retrying} />
      )}

      {response.type === 'AI_RESPONSE' && response.aiText && (
        <AIResponseBlock text={response.aiText} />
      )}

      {response.type === 'EMPTY_STATE' && (
        <EmptyState message={response.emptyMessage} summaryCards={response.summaryCards} />
      )}

      {response.type === 'ERROR_STATE' && (
        <ErrorState message={response.errorMessage} onRetry={onRetry} />
      )}

      {response.type === 'CROSS_MODULE_RESULTS' && response.crossModuleGroups && (
        <PandaCrossModuleResults groups={response.crossModuleGroups} onNavigate={onNavigate} />
      )}

      {(response.type === 'DATA_TABLE' || response.type === 'PROJECT_OVERVIEW' || response.type === 'SUMMARY_CARDS') && (
        <>
          {response.supportIssues && response.supportIssues.length > 0 && (
            <div>
              {response.releaseTasks && <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Support Issues</p>}
              <SupportIssuesTable issues={response.supportIssues} onNavigate={onNavigate} />
            </div>
          )}
          {response.releaseTasks && response.releaseTasks.length > 0 && (
            <div>
              {response.supportIssues && <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 mt-3" style={{ color: 'var(--text-muted)' }}>Release Tasks</p>}
              <ReleaseTasksTable tasks={response.releaseTasks} onNavigate={onNavigate} />
            </div>
          )}
          {response.qaReports && response.qaReports.length > 0 && (
            <QAReportsTable reports={response.qaReports} onNavigate={onNavigate} />
          )}
          {response.projects && response.projects.length > 0 && (
            <ProjectsTable projects={response.projects} onNavigate={onNavigate} />
          )}
        </>
      )}

      {/* Total count footer */}
      {response.totalCount !== undefined && response.totalCount > 0 && response.type !== 'SUMMARY_CARDS' && (
        <p className="text-[10px] text-right" style={{ color: 'var(--text-muted)' }}>
          {response.hasMore ? `Showing first 20 of ${response.totalCount}` : `${response.totalCount} result${response.totalCount !== 1 ? 's' : ''}`}
        </p>
      )}
    </motion.div>
  )
}
