import React from 'react'
import { cn } from "@/lib/utils"

interface AmbientGlowProps {
  color?: string
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const AmbientGlow: React.FC<AmbientGlowProps> = ({ 
  color = 'accent-gold', 
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-32 h-32 blur-2xl',
    md: 'w-64 h-64 blur-3xl',
    lg: 'w-96 h-96 blur-[100px]',
    xl: 'w-[600px] h-[600px] blur-[150px]'
  }

  return (
    <div 
      className={cn(
        "absolute rounded-full opacity-10 animate-glow-pulse pointer-events-none z-0",
        sizeClasses[size],
        color === 'accent-gold' ? "bg-accent-gold" : "bg-white",
        className
      )} 
    />
  )
}
