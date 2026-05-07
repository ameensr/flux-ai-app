import React from 'react'
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

type GlassCardProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode
  hoverEffect?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hoverEffect = true, ...props }, ref) => {
    return (
      <motion.div
        whileHover={hoverEffect ? { y: -4, scale: 1.005 } : {}}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "glass-panel p-6 relative overflow-hidden group",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* Inner Highlight */}
        <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none" />
        
        {/* Glow Effect */}
        <div className="absolute -inset-[100%] bg-gradient-to-tr from-accent-gold/0 via-accent-gold/5 to-accent-gold/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-3xl pointer-events-none" />
        
        <div className="relative z-10">{children}</div>
      </motion.div>
    )
  }
)

GlassCard.displayName = "GlassCard"
