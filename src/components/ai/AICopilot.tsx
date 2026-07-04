// src/components/ai/AICopilot.tsx

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { MessageSquare, X, Send, Terminal, Code, Cpu, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo, QalyIcon } from '../ui/Logo'
import { callAIGateway } from '@/services/ai/aiProviderService'
import { COPILOT_PROMPT } from '@/ai/prompts/copilotPrompt'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  { label: 'Fix Bug', icon: Terminal, prompt: 'Help me identify and fix the bug in my current context.' },
  { label: 'Gen Tests', icon: Code, prompt: 'Generate test cases for the current feature.' },
  { label: 'Risk Check', icon: Cpu, prompt: 'Identify potential risks and edge cases.' },
]

export const AICopilot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Qaly AI Engine Copilot. How can I help you with your QA tasks today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const updatedMessages: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      // Build conversation context from last 10 messages for memory
      const historyWindow = updatedMessages.slice(-10)
      const conversationPrompt = historyWindow
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n\n')

      const content = await callAIGateway({
        prompt: conversationPrompt,
        systemPrompt: COPILOT_PROMPT + '\n\nYou are in a multi-turn conversation. The above shows the recent conversation history. Respond only to the latest User message while considering the full context.',
        module: 'ai-copilot'
      })
      setMessages(prev => [...prev, { role: 'assistant', content }])
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Open Qaly Copilot"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl flex items-center justify-center z-50"
        style={{
          background: 'linear-gradient(135deg, #7C5CFF 0%, #5A7DFF 55%, #2D8CFF 100%)',
          boxShadow: '0 0 24px rgba(124,92,255,0.45), 0 4px 16px rgba(0,0,0,0.3)',
        }}
      >
        <QalyIcon size={28} mono />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[400px] h-[70vh] sm:h-[580px] z-50"
          >
            <GlassCard hoverEffect={false} className="h-full flex flex-col p-0 bg-background/80 backdrop-blur-2xl border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <QalyIcon size={22} />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Qaly Copilot</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Platform AI Online</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn('flex flex-col gap-2', msg.role === 'user' ? 'items-end' : 'items-start')}
                  >
                    <div className={cn(
                      'max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-accent-gold text-background font-medium rounded-tr-none'
                        : 'glass-panel border-white/5 rounded-tl-none text-text-primary'
                    )}>
                      {msg.content}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-text-muted">
                      {msg.role === 'user' ? 'You' : 'Qaly AI'} • Just now
                    </span>
                  </motion.div>
                ))}
                {loading && (
                  <div className="flex items-start gap-2">
                    <div className="glass-panel border-white/5 rounded-2xl rounded-tl-none p-4">
                      <RefreshCw className="w-4 h-4 text-accent-gold animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                <div className="flex gap-2 mb-4">
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp.label}
                      onClick={() => send(qp.prompt)}
                      disabled={loading}
                      className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted hover:text-white transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      <qp.icon className="w-3 h-3" /> {qp.label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && send(input)}
                    placeholder="Ask anything..."
                    disabled={loading}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-gold transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={loading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-accent-gold text-background rounded-lg hover:scale-105 transition-all disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
