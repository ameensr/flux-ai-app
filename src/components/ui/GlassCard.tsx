import React from 'react'
import { cn } from "@/lib/utils"
import { motion, type HTMLMotionProps } from "framer-motion"

type GlassCardProps = HTMLMotionProps<'div'> & {
  children: React.ReactNode
  hoverEffect?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hoverEffect = true, style, ...props }, ref) => {
    return (
      <motion.div
        whileHover={hoverEffect ? { y: -6, scale: 1.015, boxShadow: '0 20px 30px -10px rgba(0,0,0,0.12)' } : {}}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className={cn("glass-panel p-6 relative overflow-hidden group", className)}
        style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--glass-border)',
          ...style,
        }}
        ref={ref}
        {...props}
      >
        {/* Inner highlight */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ border: '1px solid var(--glass-border)' }}
        />
        {/* Glow on hover */}
        <div
          className="absolute -inset-[100%] opacity-0 group-hover:opacity-[0.05] transition-opacity duration-500 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}
        />
        <div className="relative z-10">{children}</div>
      </motion.div>
    )
  }
)

GlassCard.displayName = "GlassCard"
