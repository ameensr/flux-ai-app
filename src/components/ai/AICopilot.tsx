// src/components/ai/AICopilot.tsx

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { MessageSquare, X, Send, Terminal, Code, Cpu, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '../ui/Logo'
import { callAIGateway } from '@/services/ai/aiProviderService'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  { label: 'Fix Bug', icon: Terminal, prompt: 'Help me identify and fix the bug in my current context.' },
  { label: 'Gen Tests', icon: Code, prompt: 'Generate test cases for the current feature.' },
  { label: 'Risk Check', icon: Cpu, prompt: 'Identify potential risks and edge cases.' },
]

export const AICopilot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Flux AI Copilot. How can I help you with your QA tasks today?' }
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

    setMessages(prev => [...prev, { role: 'user', content: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const content = await callAIGateway({
        prompt: trimmed,
        systemPrompt: 'You are Flux AI Copilot, an expert QA and software engineering assistant. Be concise and practical.',
        module: 'copilot'
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
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-accent-gold shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center z-50"
      >
        <Logo size="sm" collapsed={true} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] z-50"
          >
            <GlassCard hoverEffect={false} className="h-full flex flex-col p-0 bg-background/80 backdrop-blur-2xl border-white/10 shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Logo size="sm" collapsed={true} />
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-wide">Flux Copilot</h3>
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
                      {msg.role === 'user' ? 'You' : 'Flux AI'} • Just now
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
