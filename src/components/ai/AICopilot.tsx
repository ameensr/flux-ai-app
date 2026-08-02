// src/components/ai/AICopilot.tsx
// Qaly Copilot — Triage-style terminal chat panel (light + dark theme safe)

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Terminal, Code, Cpu, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIService } from '@/services/ai/ai-service'
import { COPILOT_PROMPT } from '@/ai/prompts/copilotPrompt'
import {
  ADVANCED_AI_PERMISSION_DENIED,
  AI_USER_RESTRICTED,
  useAIAccess,
} from '@/hooks/useAIAccess'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  { label: 'Fix Bug', icon: Terminal, prompt: 'Help me identify and fix the bug in my current context.' },
  { label: 'Gen Tests', icon: Code, prompt: 'Generate test cases for the current feature.' },
  { label: 'Risk Check', icon: Cpu, prompt: 'Identify potential risks and edge cases.' },
]

const WELCOME =
  'Hello! I am your Qaly AI Engine Copilot. How can I help you with your QA tasks today?'

export const AICopilot = () => {
  const { aiEnabled, userAllowed, canUseCopilot, notifyIfRestricted } = useAIAccess()
  const copilotAllowed = canUseCopilot()
  // Restricted users stay interactive so the allowlist popup can appear.
  const inputLocked = !copilotAllowed && userAllowed
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen, loading])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const toggle = () => setIsOpen((prev) => !prev)

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    if (!aiEnabled) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '[FAIL] Centralised AI is disabled by an administrator.' },
      ])
      setInput('')
      return
    }
    if (!userAllowed) {
      notifyIfRestricted()
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: `[FAIL] ${AI_USER_RESTRICTED}` },
      ])
      setInput('')
      return
    }
    if (!copilotAllowed) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: `[FAIL] ${ADVANCED_AI_PERMISSION_DENIED}` },
      ])
      setInput('')
      return
    }

    const updatedMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const historyWindow = updatedMessages.slice(-10)
      const conversationPrompt = historyWindow
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')

      const content = await AIService.callAI({
        prompt: conversationPrompt,
        options: {
          systemPrompt:
            COPILOT_PROMPT +
            '\n\nYou are in a multi-turn conversation. The above shows the recent conversation history. Respond only to the latest User message while considering the full context.',
          module: 'ai-copilot',
        },
      })
      setMessages((prev) => [...prev, { role: 'assistant', content }])
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `[FAIL] ${err.message || 'Request failed'}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* FAB — toggles open/close */}
      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        aria-label={isOpen ? 'Close Qaly Copilot' : 'Open Qaly Copilot'}
        aria-expanded={isOpen}
        className={cn(
          'fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-[60]',
          'border transition-colors'
        )}
        style={{
          background: isOpen ? 'var(--surface-elevated)' : 'color-mix(in srgb, var(--accent) 16%, var(--surface-elevated))',
          borderColor: isOpen ? 'var(--border)' : 'color-mix(in srgb, var(--accent) 40%, transparent)',
          color: isOpen ? 'var(--text-primary)' : 'var(--accent)',
          boxShadow: isOpen ? 'var(--shadow)' : 'var(--shadow-sm)',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, rotate: 90, scale: 0.8 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              className="text-[26px] font-inter font-extrabold leading-none select-none"
              style={{ color: 'var(--accent)' }}
              aria-hidden
            >
              Q
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[420px] h-[70vh] sm:h-[560px] z-[55]"
          >
            {/* Solid theme surfaces — no /opacity on CSS vars (breaks light mode) */}
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
                className="px-5 pt-5 pb-4 shrink-0 border-b"
                style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-bold tracking-[0.12em]">
                      <span style={{ color: 'var(--accent)' }}>qaly.ai</span>
                      <span className="mx-1.5" style={{ color: 'var(--border)' }}>/</span>
                      <span style={{ color: 'var(--text-muted)' }}>QALY COPILOT</span>
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        copilotAllowed ? 'bg-green-600 dark:bg-green-400 animate-pulse' : 'bg-red-500',
                      )} />
                      <span
                        className="text-[10px] font-bold uppercase tracking-[0.14em]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {!aiEnabled
                          ? 'AI Disabled by Admin'
                          : !userAllowed
                            ? 'AI Restricted'
                            : copilotAllowed
                              ? 'Platform AI Online'
                              : 'Advanced AI Locked'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg border transition-all"
                    style={{
                      color: 'var(--text-muted)',
                      borderColor: 'transparent',
                      background: 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--text-primary)'
                      e.currentTarget.style.background = 'var(--hover)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = 'transparent'
                    }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0"
                style={{ background: 'var(--bg)' }}
              >
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-1"
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {msg.role === 'user' ? '> user' : '> qaly'}
                    </p>
                    <div
                      className="rounded-xl px-3.5 py-3 text-[12px] md:text-[13px] leading-relaxed whitespace-pre-wrap border"
                      style={
                        msg.role === 'user'
                          ? {
                              background: 'color-mix(in srgb, var(--accent) 12%, var(--surface))',
                              borderColor: 'color-mix(in srgb, var(--accent) 28%, transparent)',
                              color: 'var(--text-primary)',
                            }
                          : {
                              background: 'var(--surface)',
                              borderColor: 'var(--border)',
                              color: 'var(--text-secondary)',
                            }
                      }
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="space-y-1">
                    <p
                      className="text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      &gt; qaly
                    </p>
                    <div
                      className="flex items-center gap-2 rounded-xl px-3.5 py-3 border"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
                      <span>processing…</span>
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                        className="inline-block w-1.5 h-3"
                        style={{ background: 'var(--text-secondary)' }}
                      />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="px-5 py-4 shrink-0 border-t"
                style={{ borderColor: 'var(--divider)', background: 'var(--surface)' }}
              >
                <div className="flex gap-1.5 mb-3">
                  {QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => send(qp.prompt)}
                      disabled={loading || inputLocked}
                      className="flex-1 py-1.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-1 disabled:opacity-40"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => {
                        if (loading) return
                        e.currentTarget.style.background = 'var(--hover)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--input-bg)'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }}
                    >
                      <qp.icon className="w-3 h-3" />
                      {qp.label}
                    </button>
                  ))}
                </div>

                <div
                  className="flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--input-bg)',
                  }}
                >
                  <span className="select-none shrink-0" style={{ color: 'var(--accent)' }}>
                    &gt;
                  </span>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        send(input)
                      }
                    }}
                    placeholder={
                      !aiEnabled
                        ? 'AI disabled by admin…'
                        : !userAllowed
                          ? 'AI access restricted…'
                          : !copilotAllowed
                            ? 'Advanced AI permission required…'
                            : 'ask anything…'
                    }
                    disabled={loading || inputLocked}
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm disabled:opacity-50 placeholder:opacity-60"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  <button
                    type="button"
                    onClick={() => send(input)}
                    disabled={loading || inputLocked || !input.trim()}
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
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
