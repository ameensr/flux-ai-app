import React from 'react'
import { cn } from "@/lib/utils"

type GlassCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode
  hoverEffect?: boolean
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ children, className, hoverEffect = false, style, ...props }, ref) => {
    return (
      <div
        className={cn("glass-panel p-6 relative overflow-hidden", className)}
        style={style}
        ref={ref}
        {...props}
      >
        {/* Inner highlight */}
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
