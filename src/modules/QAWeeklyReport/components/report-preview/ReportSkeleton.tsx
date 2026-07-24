import React from 'react'
import { motion } from 'framer-motion'

type ThemeId = 'light' | 'dark'

/**
 * Branded loading skeleton shown while report data is being resolved (Supabase fetch or
 * cache lookup). Mirrors the hero + KPI row layout shape so the transition into the real
 * content feels seamless, instead of a jarring spinner-to-content swap.
 */
export const ReportSkeleton: React.FC<{ theme: ThemeId }> = ({ theme }) => {
  const shimmer = theme === 'dark' ? 'bg-white/[0.06]' : 'bg-slate-200/70'
  const bg = theme === 'dark' ? 'bg-[#070a13] text-white' : 'bg-[#f8fafc] text-slate-900'

  const Pulse: React.FC<{ className?: string }> = ({ className }) => (
    <motion.div
      className={`rounded-xl ${shimmer} ${className}`}
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
    />
  )

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <div className={`border-b px-4 sm:px-6 py-4 ${theme === 'dark' ? 'border-white/5' : 'border-slate-200'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Pulse className="h-8 w-32" />
          <Pulse className="h-8 w-64 hidden md:block" />
          <Pulse className="h-8 w-24" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 flex flex-col gap-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-center">
          <div className="flex flex-col gap-4">
            <Pulse className="h-6 w-40" />
            <Pulse className="h-12 w-3/4" />
            <Pulse className="h-4 w-full max-w-lg" />
            <Pulse className="h-4 w-2/3 max-w-md" />
            <div className="flex items-center gap-6 mt-2">
              <Pulse className="h-10 w-20" />
              <Pulse className="h-10 w-20" />
              <Pulse className="h-10 w-20" />
            </div>
          </div>
          <Pulse className="h-64 w-full rounded-3xl" />
        </div>

        <div className="flex flex-col gap-5">
          <Pulse className="h-6 w-56" />
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Pulse key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center py-4">
          <span className={`text-[11px] uppercase font-black tracking-widest ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`}>
            Loading Executive Report…
          </span>
        </div>
      </div>
    </div>
  )
}
