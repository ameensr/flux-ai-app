import React from 'react'
import { motion } from 'framer-motion'
import { EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DisabledSectionWrapperProps {
  isEnabled: boolean
  sectionName: string
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper component that grays out form sections when they're disabled in Dashboard Display Sections
 */
export const DisabledSectionWrapper: React.FC<DisabledSectionWrapperProps> = ({
  isEnabled,
  sectionName,
  children,
  className
}) => {
  if (isEnabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={cn('relative', className)}>
      {/* Grayed out content */}
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>

      {/* Overlay with message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      >
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/80 border border-white/20 backdrop-blur-sm shadow-xl">
          <EyeOff className="w-4 h-4 text-orange-400 shrink-0" />
          <div className="text-left">
            <p className="text-xs font-bold text-white leading-tight">
              {sectionName} Hidden
            </p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
              Enable in "Dashboard Display Sections" above
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
