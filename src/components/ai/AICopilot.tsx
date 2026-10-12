import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
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
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label={isOpen ? 'Close QA Pilot' : 'Open QA Pilot'}
          aria-expanded={isOpen}
          className={cn(
            "h-11 rounded-xl flex items-center justify-center border transition-all duration-200 relative cursor-pointer select-none",
            isOpen ? "w-11 px-0" : "px-3.5"
          )}
          style={{
            background: isOpen
              ? 'var(--surface-elevated)'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, var(--surface-elevated)), var(--surface-elevated))',
            borderColor: isOpen
              ? 'var(--border)'
              : 'color-mix(in srgb, var(--accent) 40%, transparent)',
            color: 'var(--accent)',
            boxShadow: isOpen
              ? 'var(--shadow)'
              : '0 4px 16px -2px color-mix(in srgb, var(--accent) 25%, transparent), 0 1px 4px rgba(0,0,0,0.12)',
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
                <X className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
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
                <span className="font-bold text-[13px] tracking-tight whitespace-nowrap">
                  <span style={{ color: 'var(--text-primary)' }}>QA</span>{' '}
                  <span style={{ color: 'var(--accent)' }}>Pilot</span>
                </span>
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
