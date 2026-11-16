import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X } from 'lucide-react'
import { PandaPanel } from '@/features/panda-copilot/components/PandaPanel'
import { useAIAccess } from '@/hooks/useAIAccess'

export const AICopilot = () => {
  const { canUseCopilot } = useAIAccess()
  const [isOpen, setIsOpen] = useState(false)

  // Only render when the hybrid-copilot permission is granted
  if (!canUseCopilot()) return null

  return (
    <>
      {/* Compact launcher aligned with the theme control */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <motion.button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          aria-label={isOpen ? 'Close QA Pilot' : 'Open QA Pilot'}
          aria-expanded={isOpen}
          className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border backdrop-blur-xl transition-[background-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
          style={{
            background: isOpen
              ? 'var(--surface-elevated)'
              : 'linear-gradient(145deg, color-mix(in srgb, var(--accent) 15%, var(--surface-elevated)), var(--surface-elevated))',
            borderColor: isOpen
              ? 'var(--border)'
              : 'color-mix(in srgb, var(--accent) 36%, var(--border))',
            color: 'var(--accent)',
            boxShadow: isOpen
              ? '0 6px 18px rgba(0,0,0,0.16)'
              : '0 6px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.14)',
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
                className="flex items-center justify-center"
              >
                <X className="h-[18px] w-[18px]" style={{ color: 'var(--text-secondary)' }} />
              </motion.span>
            ) : (
              <motion.span
                key="open"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18 }}
                className="flex items-center justify-center select-none"
                aria-hidden
              >
                <Bot className="h-[19px] w-[19px]" strokeWidth={1.8} />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="pointer-events-none absolute -top-10 right-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
            style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
            {isOpen ? 'Close QA Pilot' : 'QA Pilot'}
          </span>
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
