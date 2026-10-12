// src/components/ai/AICopilot.tsx
// Panda Copilot FAB — visible only when the user has can_view on hybrid-copilot module.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { PandaSVG } from '@/components/LazyPanda/PandaSVG'
import { PandaPanel } from '@/features/panda-copilot/components/PandaPanel'
import { useAIAccess } from '@/hooks/useAIAccess'

export const AICopilot = () => {
  const { canUseCopilot } = useAIAccess()
  const [isOpen, setIsOpen] = useState(false)

  // Only render when the hybrid-copilot permission is granted
  if (!canUseCopilot()) return null

  return (
    <>
      {/* FAB */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <motion.button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          aria-label={isOpen ? 'Close Panda Copilot' : 'Open Panda Copilot'}
          aria-expanded={isOpen}
          className="w-14 h-14 rounded-2xl flex items-center justify-center border transition-colors relative"
          style={{
            background: isOpen
              ? 'var(--surface-elevated)'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--surface-elevated)), color-mix(in srgb, var(--accent) 10%, var(--surface-elevated)))',
            borderColor: isOpen
              ? 'var(--border)'
              : 'color-mix(in srgb, var(--accent) 50%, transparent)',
            color: 'var(--accent)',
            boxShadow: isOpen
              ? 'var(--shadow)'
              : '0 4px 16px color-mix(in srgb, var(--accent) 30%, transparent), 0 1px 4px rgba(0,0,0,0.15)',
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
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center"
                aria-hidden
              >
                <PandaSVG
                  state="IDLE"
                  eyeOffset={{ x: 0, y: 0 }}
                  headRotation={0}
                  isBlinking={false}
                  size={36}
                  reducedMotion
                />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            style={{ transformOrigin: '100% 100%' }}
            className="fixed bottom-24 right-4 left-4 sm:left-auto sm:right-6 sm:w-[440px] h-[75vh] sm:h-[600px] z-[55]"
          >
            <PandaPanel onClose={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
