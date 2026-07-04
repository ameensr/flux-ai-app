// src/components/LazyPanda/PandaSpeechBubble.tsx
// Interactive speech bubble for Smart Panda Messages.
// Shows contextual messages with interactive response buttons.

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePandaMessagesStore,
  pickMessage,
  shouldShowMessage,
  markMessageShown,
  detectMessageCategory,
  INTERACTIVE_RESPONSES,
  type SmartMessage,
} from './pandaMessages'
import { usePandaConfigStore } from './pandaConfig'

interface PandaSpeechBubbleProps {
  className?: string
}

export const PandaSpeechBubble: React.FC<PandaSpeechBubbleProps> = ({ className }) => {
  const globalConfig = usePandaConfigStore(s => s.config)
  const messagesConfig = usePandaMessagesStore(s => s.config)
  const [message, setMessage] = useState<SmartMessage | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null)
  const [showReply, setShowReply] = useState(false)

  // Detect and pick message on mount
  useEffect(() => {
    if (!globalConfig.enabled || !messagesConfig.enabled) return
    if (!shouldShowMessage(messagesConfig.frequency)) return

    const picked = pickMessage(messagesConfig)
    if (picked) {
      setMessage(picked)
      markMessageShown()
    }
  }, [])

  // Get interactive responses for the category
  const responses = useMemo(() => {
    if (!message) return null
    return INTERACTIVE_RESPONSES[message.category] ?? null
  }, [message])

  const handleDismiss = () => {
    setDismissed(true)
  }

  const handleResponse = (reply: string) => {
    setSelectedResponse(reply)
    setShowReply(true)
    // Auto-dismiss after showing reply
    setTimeout(() => setDismissed(true), 4000)
  }

  // Don't render if no message, dismissed, or globally disabled
  if (!message || dismissed || !globalConfig.enabled || !messagesConfig.enabled) return null

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn('relative max-w-xs w-full', className)}
        >
          {/* Speech bubble */}
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

            {/* Bubble tail (pointing down toward panda) */}
            <div
              className="absolute -bottom-2 left-6 w-4 h-4 rotate-45"
              style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
            />

            <AnimatePresence mode="wait">
              {!showReply ? (
                <motion.div
                  key="question"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Message */}
                  <p className="text-sm font-medium pr-5 mb-3" style={{ color: 'var(--text-primary)' }}>
                    <span className="mr-1.5">{message.emoji}</span>
                    {message.text}
                  </p>

                  {/* Interactive buttons */}
                  {responses && (
                    <div className="flex flex-col gap-1.5">
                      {responses.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handleResponse(opt.reply)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left w-full"
                          style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                        >
                          <span>{opt.emoji}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* If no interactive responses, just show dismiss hint */}
                  {!responses && (
                    <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                      Tap to dismiss
                    </p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="reply"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Panda's reply */}
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    🐼 {selectedResponse}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
