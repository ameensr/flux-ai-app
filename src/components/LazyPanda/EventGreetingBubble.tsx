// src/components/LazyPanda/EventGreetingBubble.tsx
// Displays the highest-priority active event greeting on the auth page.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useEventGreetingsStore,
  getActiveEvent,
  markEventShown,
  type GreetingEvent,
} from './eventGreetings'
import { usePandaConfigStore } from './pandaConfig'

interface EventGreetingBubbleProps {
  className?: string
}

export const EventGreetingBubble: React.FC<EventGreetingBubbleProps> = ({ className }) => {
  const globalConfig = usePandaConfigStore(s => s.config)
  const eventConfig = useEventGreetingsStore(s => s.config)
  const [event, setEvent] = useState<GreetingEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Find active event on mount
  useEffect(() => {
    if (!globalConfig.enabled || !eventConfig.enabled) return
    const active = getActiveEvent(eventConfig)
    if (active) setEvent(active)
  }, [])

  // Auto-dismiss timer
  useEffect(() => {
    if (!event || dismissed) return
    if (event.autoDismissSeconds && event.autoDismissSeconds > 0) {
      autoDismissRef.current = setTimeout(() => {
        handleDismiss()
      }, event.autoDismissSeconds * 1000)
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current)
    }
  }, [event, dismissed])

  const handleDismiss = () => {
    if (event) markEventShown(event.id, true)
    setDismissed(true)
  }

  const handleAction = (actionType: string) => {
    if (event) markEventShown(event.id, true)
    setDismissed(true)
  }

  if (!event || dismissed || !globalConfig.enabled || !eventConfig.enabled) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn('relative max-w-xs w-full', className)}
        >
          <div
            className="rounded-2xl p-4 relative"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-lg transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              aria-label="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Bubble tail */}
            <div
              className="absolute -bottom-2 left-8 w-4 h-4 rotate-45"
              style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            />

            {/* Message */}
            <p className="text-sm font-medium pr-5 mb-3" style={{ color: 'var(--text-primary)' }}>
              <span className="mr-1.5 text-base">{event.emoji}</span>
              {event.message}
            </p>

            {/* Action buttons */}
            {event.actions.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {event.actions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(action.type)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                    style={{
                      background: i === 0 ? 'rgba(99,102,241,0.12)' : 'var(--hover)',
                      color: i === 0 ? 'var(--accent)' : 'var(--text-secondary)',
                      border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
                  >
                    <span>{action.emoji}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Auto-dismiss indicator */}
            {event.autoDismissSeconds && (
              <motion.div
                className="absolute bottom-0 left-0 h-0.5 rounded-full"
                style={{ background: 'var(--accent)' }}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: event.autoDismissSeconds, ease: 'linear' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
