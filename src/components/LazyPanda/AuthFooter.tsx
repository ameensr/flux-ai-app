// src/components/LazyPanda/AuthFooter.tsx
// Premium dynamic footer for the authentication pages.
// Features rotating Lazy Panda messages, security badges, and hover interactions.

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Lock, Zap } from 'lucide-react'
import { usePandaConfigStore } from './pandaConfig'

// ── Default Footer Messages ───────────────────────────────────────────────────

const DEFAULT_FOOTER_MESSAGES = [
  { emoji: '🐼', text: 'Built with ❤️ by Lazy Panda.' },
  { emoji: '☕', text: 'Crafted with coffee, AI & Lazy Panda.' },
  { emoji: '🚀', text: 'Building quality, one feature at a time.' },
  { emoji: '🐞', text: 'Hunting bugs before they find you.' },
  { emoji: '😴', text: 'Taking tiny naps between deployments.' },
  { emoji: '🛡', text: 'Enterprise Secure. Panda Approved.' },
  { emoji: '💜', text: 'Build Quality. Accelerate Delivery.' },
  { emoji: '🤖', text: 'Powered by AI. Supervised by Lazy Panda.' },
  { emoji: '🎯', text: 'Every great release starts with great testing.' },
  { emoji: '🌿', text: 'Keep calm and let Lazy Panda handle it.' },
]

const ROTATION_INTERVAL = 8000 // 8 seconds

// ── Component ─────────────────────────────────────────────────────────────────

export function AuthFooter() {
  const globalConfig = usePandaConfigStore(s => s.config)
  const [messageIndex, setMessageIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  // Rotate messages
  useEffect(() => {
    if (!globalConfig.enabled) return
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % DEFAULT_FOOTER_MESSAGES.length)
    }, ROTATION_INTERVAL)
    return () => clearInterval(interval)
  }, [globalConfig.enabled])

  // Hover randomizes the message
  const handleHover = useCallback(() => {
    setIsHovered(true)
    setMessageIndex(Math.floor(Math.random() * DEFAULT_FOOTER_MESSAGES.length))
  }, [])

  const currentMessage = DEFAULT_FOOTER_MESSAGES[messageIndex]
  const year = new Date().getFullYear()

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className="w-full py-3 px-4 flex flex-col items-center gap-2 mt-3"
    >
      {/* Rotating Panda Message */}
      {globalConfig.enabled && (
        <div
          className="flex items-center justify-center cursor-default"
          onMouseEnter={handleHover}
          onMouseLeave={() => setIsHovered(false)}
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={messageIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-medium text-center"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="mr-1.5">{currentMessage.emoji}</span>
              {currentMessage.text}
              {isHovered && <span className="ml-1.5 inline-block animate-pulse">👋</span>}
            </motion.p>
          </AnimatePresence>
        </div>
      )}

      {/* Security Badges */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          <Lock className="w-3 h-3" /> SOC 2 Compliant
        </span>
        <span style={{ color: 'var(--divider)' }}>•</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          <Shield className="w-3 h-3" /> AES-256 Encrypted
        </span>
        <span style={{ color: 'var(--divider)' }}>•</span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          <Zap className="w-3 h-3" /> AI Powered
        </span>
      </div>

      {/* Copyright */}
      <p className="text-[10px] tracking-wide" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        &copy; {year} Qaly AI Engine
      </p>
    </motion.footer>
  )
}
