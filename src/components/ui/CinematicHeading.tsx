import React from 'react'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { springMove } from '@/lib/motion'

interface CinematicHeadingProps {
  title: string
  subtitle?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

export const CinematicHeading: React.FC<CinematicHeadingProps> = ({
  title,
  subtitle,
  align = 'center',
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col gap-3 sm:gap-4 mb-8 sm:mb-12",
      align === 'center' ? "items-center text-center" : align === 'right' ? "items-end text-right" : "items-start text-left",
      className
    )}>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springMove}
        className="text-[clamp(2rem,7vw,4.5rem)] font-clash font-bold tracking-tight text-white leading-[1.05]"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springMove, delay: 0.05 }}
          className="text-base sm:text-xl text-text-secondary max-w-2xl font-montreal"
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ ...springMove, delay: 0.08 }}
        className="h-px w-24 bg-gradient-to-r from-transparent via-accent-gold to-transparent"
      />
    </div>
  )
}
