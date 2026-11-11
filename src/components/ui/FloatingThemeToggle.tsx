// src/components/ui/FloatingThemeToggle.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAIAccess } from '@/hooks/useAIAccess'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { canUseCopilot } = useAIAccess()
  const hasCopilot = canUseCopilot()
  const reduced = usePrefersReducedMotion()

  return (
    <div
      className="fixed z-[60] print:hidden transition-[right] duration-300 ease-out pointer-events-auto select-none"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: hasCopilot
          ? 'calc(7.25rem + env(safe-area-inset-right, 0px))'
          : 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <motion.button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to serene light atmosphere' : 'Switch to tranquil dark atmosphere'}
        title={isDark ? 'Switch to serene light atmosphere' : 'Switch to tranquil dark atmosphere'}
        whileHover={reduced ? undefined : { scale: 1.06, y: -1 }}
        whileTap={reduced ? undefined : { scale: 0.94 }}
        className="relative group w-11 h-11 rounded-2xl flex items-center justify-center p-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 select-none transition-all duration-500"
        style={{
          aspectRatio: '1 / 1',
        }}
      >
        {/* 1. Serene Ambient Depth Aura (Cool Blue Glow) */}
        <motion.div
          className="absolute -inset-1.5 rounded-3xl pointer-events-none transition-opacity duration-700 blur-xl"
          animate={reduced ? undefined : {
            opacity: isDark ? [0.4, 0.65, 0.4] : [0.3, 0.5, 0.3],
            scale: [0.98, 1.04, 0.98],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(56, 189, 248, 0.35) 0%, rgba(30, 58, 138, 0.2) 50%, transparent 75%)'
              : 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, rgba(186, 230, 253, 0.4) 50%, transparent 75%)',
          }}
        />

        {/* 2. Frosted Glass Body with Soft Cool-Blue Gradient */}
        <div
          className="relative w-full h-full rounded-2xl overflow-hidden backdrop-blur-2xl transition-all duration-500 flex items-center justify-center"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, rgba(15, 26, 47, 0.85) 0%, rgba(8, 15, 29, 0.92) 100%)'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.92) 0%, rgba(236, 246, 255, 0.85) 100%)',
            border: isDark
              ? '1px solid rgba(56, 189, 248, 0.25)'
              : '1px solid rgba(186, 230, 253, 0.85)',
            boxShadow: isDark
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.35), inset 0 -2px 4px rgba(2, 132, 199, 0.15)'
              : '0 8px 20px -4px rgba(14, 165, 233, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.95), inset 0 -2px 4px rgba(186, 230, 253, 0.5)',
          }}
        >
          {/* Specular Top Rim Reflection */}
          <div
            className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, transparent, rgba(186, 230, 253, 0.85), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 1), transparent)',
            }}
          />

          {/* Tranquil Internal Light Shimmer */}
          <div
            className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-75 transition-opacity duration-500"
            style={{
              background: isDark
                ? 'radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.25) 0%, transparent 60%)'
                : 'radial-gradient(circle at 50% 30%, rgba(14, 165, 233, 0.18) 0%, transparent 60%)',
            }}
          />

          {/* 3. Celestial Animated Icon (Sun / Moon with serene rotation and glow) */}
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="dark-sun"
                initial={{ rotate: -70, scale: 0.5, opacity: 0, filter: 'blur(4px)' }}
                animate={{ rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ rotate: 70, scale: 0.5, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center justify-center text-sky-300"
              >
                <Sun className="w-5 h-5 drop-shadow-[0_0_10px_rgba(56,189,248,0.7)]" strokeWidth={1.8} />
                {/* Subtle radiant sun halo */}
                <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-md pointer-events-none" />
              </motion.div>
            ) : (
              <motion.div
                key="light-moon"
                initial={{ rotate: 70, scale: 0.5, opacity: 0, filter: 'blur(4px)' }}
                animate={{ rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' }}
                exit={{ rotate: -70, scale: 0.5, opacity: 0, filter: 'blur(4px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex items-center justify-center text-sky-600"
              >
                <Moon className="w-5 h-5 drop-shadow-[0_0_8px_rgba(14,165,233,0.45)]" strokeWidth={1.8} />
                {/* Subtle tranquil moon halo */}
                <div className="absolute inset-0 rounded-full bg-sky-300/25 blur-md pointer-events-none" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.button>
    </div>
  )
}
