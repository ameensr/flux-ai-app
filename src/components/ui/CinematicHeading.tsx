import React from 'react'
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

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
      "flex flex-col gap-4 mb-12",
      align === 'center' ? "items-center text-center" : align === 'right' ? "items-end text-right" : "items-start text-left",
      className
    )}>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="text-5xl md:text-7xl font-clash font-bold tracking-tight text-white"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="text-xl text-text-secondary max-w-2xl font-montreal"
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="h-px w-24 bg-gradient-to-r from-transparent via-accent-gold to-transparent"
      />
    </div>
  )
}
