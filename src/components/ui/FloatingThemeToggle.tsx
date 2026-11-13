// src/components/ui/FloatingThemeToggle.tsx
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAIAccess } from '@/hooks/useAIAccess'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

/**
 * Creative Premium Theme Toggler:
 * - Side-Aligned (Side Bottom): Aligned to the side margin (right-side rail),
 *   stacked vertically with Copilot so both sit flush along the side edge.
 * - Dot-Matrix telemetry status beacon & atmospheric breathing aura
 * - Celestial morphing Sun / Moon with solar rays & orbital star flares
 * - Expandable luxury glassmorphic capsule on hover with monospace telemetry
 * - Automatically conceals during native fullscreen (e.g. Presentation mode)
 */
export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { canUseCopilot } = useAIAccess()
  const hasCopilot = canUseCopilot()
  const reduced = usePrefersReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      const fs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement
      )
      setIsFullscreen(fs)
    }

    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
    }
  }, [])

  // Hide in presentation fullscreen mode to avoid overlapping presentation controls
  if (isFullscreen) return null

  return (
    <div
      className="fixed z-[60] print:hidden pointer-events-auto select-none transition-[bottom,right] duration-300 ease-out"
      style={{
        // Side-aligned at bottom:
        // When Copilot is present, stacks vertically right above Copilot on the exact same side axis.
        // When Copilot is not present, docks at the bottom side corner.
        bottom: hasCopilot
          ? 'calc(5.25rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <motion.button
        type="button"
        layout
        onClick={toggleTheme}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        whileHover={reduced ? undefined : { scale: 1.05, y: -1 }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        transition={{
          layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
        }}
        className="relative group h-11 rounded-2xl flex items-center gap-2.5 p-2.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 select-none backdrop-blur-2xl transition-all duration-300"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.88) 0%, rgba(9, 13, 26, 0.94) 100%)'
            : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 246, 251, 0.92) 100%)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.12)'
            : '1px solid rgba(226, 232, 240, 0.95)',
          boxShadow: isDark
            ? '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 16px rgba(99, 102, 241, 0.15), inset 0 1px 1px rgba(255, 255, 255, 0.2)'
            : '0 10px 25px -4px rgba(15, 23, 42, 0.1), 0 0 14px rgba(99, 102, 241, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* ── 1. Atmospheric Ambient UI Aura ── */}
        <motion.div
          className="absolute -inset-1.5 rounded-3xl pointer-events-none transition-opacity duration-700 blur-xl"
          animate={
            reduced
              ? undefined
              : {
                  opacity: isDark ? [0.35, 0.6, 0.35] : [0.25, 0.45, 0.25],
                  scale: [0.98, 1.04, 0.98],
                }
          }
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(79, 70, 229, 0.2) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 75%)',
          }}
        />

        {/* Specular Top Rim Specular Reflection */}
        <div
          className="absolute inset-x-2 top-0 h-[1px] pointer-events-none rounded-full"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)',
          }}
        />

        {/* ── 2. Dot-Matrix Telemetry Beacon (3-Dot Vertical Array) ── */}
        <div className="flex flex-col gap-1 items-center justify-center shrink-0 pl-0.5">
          <span
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: isDark ? '#818CF8' : '#F59E0B',
              boxShadow: isDark
                ? '0 0 6px rgba(129, 140, 248, 0.9)'
                : '0 0 6px rgba(245, 158, 11, 0.8)',
            }}
          />
          <span
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: isDark
                ? 'rgba(129, 140, 248, 0.4)'
                : 'rgba(99, 102, 241, 0.3)',
            }}
          />
          <span
            className="w-1 h-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor: isDark
                ? 'rgba(129, 140, 248, 0.2)'
                : 'rgba(99, 102, 241, 0.15)',
            }}
          />
        </div>

        {/* ── 3. Creative Celestial Morphing Icon ── */}
        <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="celestial-dark"
                initial={{ rotate: -90, scale: 0.45, opacity: 0, filter: 'blur(3px)' }}
                animate={{ rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ rotate: 90, scale: 0.45, opacity: 0, filter: 'blur(3px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center justify-center text-indigo-400"
              >
                <Moon
                  className="w-4 h-4 drop-shadow-[0_0_8px_rgba(99,102,241,0.85)] fill-indigo-400/20"
                  strokeWidth={2}
                />
                {/* Micro celestial star accent */}
                <span className="absolute -top-1 -right-0.5 w-1 h-1 rounded-full bg-indigo-300 animate-pulse shadow-[0_0_4px_rgba(165,180,252,0.9)]" />
              </motion.div>
            ) : (
              <motion.div
                key="celestial-light"
                initial={{ rotate: 90, scale: 0.45, opacity: 0, filter: 'blur(3px)' }}
                animate={{ rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ rotate: -90, scale: 0.45, opacity: 0, filter: 'blur(3px)' }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex items-center justify-center text-amber-500"
              >
                <Sun
                  className="w-4 h-4 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] fill-amber-400/25"
                  strokeWidth={2}
                />
                {/* Rotating solar corona accent */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-1 rounded-full border border-dashed border-amber-400/35 pointer-events-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── 4. Expandable Monospace Telemetry Label (On Hover) ── */}
        <AnimatePresence>
          {isHovered && !reduced && (
            <motion.div
              initial={{ opacity: 0, width: 0, x: 4 }}
              animate={{ opacity: 1, width: 'auto', x: 0 }}
              exit={{ opacity: 0, width: 0, x: 4 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden whitespace-nowrap flex items-center gap-1.5 pl-0.5 pr-1 font-mono text-[11px] font-bold tracking-widest uppercase select-none"
              style={{
                color: isDark ? '#A5B4FC' : '#475569',
              }}
            >
              <span>{isDark ? 'DARK' : 'LIGHT'}</span>
              <span className="text-[9px] opacity-45 font-sans tracking-normal font-semibold">
                // MODE
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}
