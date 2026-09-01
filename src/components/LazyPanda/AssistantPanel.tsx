// src/components/LazyPanda/AssistantPanel.tsx
// Left-side Lazy Panda Assistant Panel for the authentication page.
// Displays: Panda, Speech Bubble, Event Greetings, Today's Highlights, Daily Quote.

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Calendar, Lightbulb } from 'lucide-react'
import { LazyPanda } from './LazyPanda'
import { PandaSpeechBubble } from './PandaSpeechBubble'
import { EventGreetingBubble } from './EventGreetingBubble'
import { usePandaConfigStore } from './pandaConfig'
import { useEventGreetingsStore, isEventActiveToday } from './eventGreetings'
import type { PandaEvent } from './types'
import { FitToBox } from '@/components/ui/FitToBox'

// ── Daily Quotes (admin-configurable in future; defaults for now) ─────────────

const DAILY_QUOTES = [
  'Quality is never an accident; it is always the result of intelligent effort.',
  'Every bug fixed makes tomorrow better.',
  'Great software starts with great testing.',
  'The best error message is the one that never shows up.',
  'First, solve the problem. Then, write the code.',
  'Testing leads to failure, and failure leads to understanding.',
  'Simplicity is the soul of efficiency.',
  'Code without tests is broken by design.',
  'Automation is good, so long as you know exactly where to put the machine.',
  'In the world of QA, attention to detail is everything.',
]

// ── Today's Highlights ────────────────────────────────────────────────────────

function TodaysHighlights() {
  const eventConfig = useEventGreetingsStore(s => s.config)
  const activeEvents = eventConfig.events.filter(e => isEventActiveToday(e)).slice(0, 3)

  if (activeEvents.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="w-full rounded-2xl p-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Today's Highlights</span>
      </div>
      <div className="space-y-2.5">
        {activeEvents.map(event => (
          <div key={event.id} className="flex items-start gap-2.5">
            <span className="text-sm shrink-0 mt-0.5">{event.emoji}</span>
            <div className="min-w-0">
              <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{event.name}</span>
              <span className="text-[10px] line-clamp-1" style={{ color: 'var(--text-muted)' }}>{event.message}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Daily Quote ───────────────────────────────────────────────────────────────

function DailyQuote() {
  const quote = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_QUOTES.length
    return DAILY_QUOTES[dayIndex]
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className="w-full rounded-2xl p-4"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2 mb-2.5">
        <Lightbulb className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Daily Thought</span>
      </div>
      <p className="text-xs italic leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        "{quote}"
      </p>
    </motion.div>
  )
}

// ── Main Assistant Panel ──────────────────────────────────────────────────────

interface AssistantPanelProps {
  isSignUp: boolean
  onPandaReady?: (send: (event: PandaEvent) => void) => void
}

export function AssistantPanel({ isSignUp, onPandaReady }: AssistantPanelProps) {
  const globalConfig = usePandaConfigStore(s => s.config)

  return (
    <div className="hidden lg:block relative h-full min-h-0 overflow-hidden">
      {/* Subtle background decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%)',
        }}
      />

      <FitToBox className="relative z-10 px-6 xl:px-10">
        <div className="flex w-[min(18rem,42vw)] flex-col items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--text-muted)' }}>
              Lazy Panda Assistant
            </span>
          </motion.div>

          <EventGreetingBubble className="w-full" />
          <PandaSpeechBubble className="w-full" />

          {globalConfig.enabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              <LazyPanda isSignUp={isSignUp} onReady={onPandaReady} />
            </motion.div>
          )}

          <TodaysHighlights />
          <DailyQuote />
        </div>
      </FitToBox>
    </div>
  )
}
