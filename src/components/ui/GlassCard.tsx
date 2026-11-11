import React from 'react'
import { cn } from "@/lib/utils"

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  hoverEffect?: boolean
  glowEffect?: boolean
  variant?: 'default' | 'elevated' | 'subtle'
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hoverEffect = false, glowEffect = false, variant = 'default', style, ...props }, ref) => {
    return (
      <div
        className={cn(
          "glass-panel p-6 relative overflow-hidden transition-all duration-300",
          hoverEffect && "hover:-translate-y-1 hover:shadow-xl hover:border-white/20 cursor-pointer",
          variant === 'elevated' && "glass-panel-elevated shadow-xl",
          variant === 'subtle' && "bg-white/[0.02] dark:bg-white/[0.02] backdrop-blur-md",
          className
        )}
        style={style}
        ref={ref}
        {...props}
      >
        {/* Specular top edge highlight for true glass depth */}
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none z-10"
          style={{
            background: 'linear-gradient(90deg, transparent, var(--glass-highlight, rgba(255,255,255,0.15)), transparent)',
          }}
        />

        {/* Ambient glow mesh reflection if requested */}
        {glowEffect && (
          <div
            className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl"
            style={{
              background: 'radial-gradient(circle, var(--accent, #6366f1) 0%, transparent 70%)',
            }}
          />
        )}

        {/* Inner border */}
        <div
          className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ border: '1px solid var(--glass-border)' }}
        />
        <div className="relative z-10">{children}</div>
      </div>
    )
  }
)

GlassCard.displayName = "GlassCard"
