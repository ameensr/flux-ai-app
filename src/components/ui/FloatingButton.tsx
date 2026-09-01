import React from 'react'
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ButtonProps } from "@/components/ui/button"

interface FloatingButtonProps extends ButtonProps {
  glow?: boolean
}

export const FloatingButton = React.forwardRef<HTMLButtonElement, FloatingButtonProps>(
  ({ className, glow = true, children, ...props }, ref) => {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        className="relative group"
      >
        {glow && (
          <div className="absolute inset-0 bg-accent-gold/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
        )}
        <Button
          ref={ref}
          className={cn(
            "relative rounded-full bg-accent-gold text-background hover:bg-accent-gold/90 border-none px-8 h-12 text-sm font-bold tracking-wider uppercase transition-all duration-300",
            className
          )}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    )
  }
)

FloatingButton.displayName = "FloatingButton"
