// src/components/ui/MaintenanceBanner.tsx
// Pre-maintenance warning banner — shows 15 minutes before scheduled start.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
import { useAppStore } from '@/store/useAppStore'
import { AlertTriangle, X } from 'lucide-react'

export const MaintenanceBanner: React.FC = () => {
  const { config, minutesUntilStart } = useMaintenanceStore()
  const { role } = useAppStore()
  const [dismissed, setDismissed] = useState(false)
  const [minutes, setMinutes] = useState<number | null>(null)

  useEffect(() => {
    const check = () => {
      const m = minutesUntilStart()
      setMinutes(m)
    }
    check()
    const interval = setInterval(check, 30000) // re-check every 30s
    return () => clearInterval(interval)
  }, [config])

  // Don't show if:
  // - dismissed by user
  // - maintenance not enabled
  // - no scheduled start time
  // - more than 15 minutes away (or already active)
  // - user role is not in locked_roles (they won't be affected)
  if (dismissed) return null
  if (!config.enabled) return null
  if (minutes === null || minutes > 15 || minutes <= 0) return null
  if (!config.locked_roles.includes(role)) return null
  if (config.allowed_roles.includes(role)) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed top-0 left-0 right-0 z-[90] px-4 py-2.5 flex items-center justify-center gap-3"
        style={{
          background: 'linear-gradient(90deg, rgba(234,179,8,0.12) 0%, rgba(239,68,68,0.12) 100%)',
          borderBottom: '1px solid rgba(234,179,8,0.2)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs sm:text-sm font-semibold text-amber-200">
          Maintenance starts in <span className="font-black text-amber-100">{minutes} min</span> — please save your work.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md hover:bg-white/10 text-amber-300/60 hover:text-amber-200 transition-all shrink-0 ml-2"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
