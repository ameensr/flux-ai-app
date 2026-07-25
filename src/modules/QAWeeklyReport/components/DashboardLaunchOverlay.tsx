import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { QATriageLoader, type LineData } from './QATriageLoader'

/** Terminal-style sequence — reads as the engine analyzing the report before the dashboard appears. */
export const DASHBOARD_LAUNCH_SEQUENCE: LineData[] = [
  { id: 1, type: 'process', text: '> Syncing weekly report payload...' },
  { id: 2, type: 'process', text: '> Validating KPIs & quality score...' },
  { id: 3, type: 'process', text: '> Analyzing defect & release trends...' },
  { id: 4, type: 'process', text: '> Compiling team capacity signals...' },
  { id: 5, type: 'process', text: '> Assembling executive dashboard views...' },
  { id: 6, type: 'pass', text: '[PASS] Data integrity verified' },
  { id: 7, type: 'complete', text: '[PASS] Executive Dashboard ready' },
]

interface DashboardLaunchOverlayProps {
  open: boolean
  projectName?: string
  onComplete: () => void
}

/**
 * Full-screen intro for the /report-preview tab — qaly.ai / RELEASE TRIAGE
 * analysis, then the caller reveals the dashboard underneath.
 */
export const DashboardLaunchOverlay: React.FC<DashboardLaunchOverlayProps> = ({
  open,
  projectName,
  onComplete,
}) => {
  useBodyScrollLock(open)
  const { isDark } = useTheme()

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="dashboard-launch-triage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 overflow-hidden pointer-events-auto"
          style={{
            background: isDark ? 'rgba(7, 10, 19, 0.98)' : 'rgba(248, 250, 252, 0.98)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Preparing executive dashboard"
        >
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: isDark ? 0.4 : 0.25, scale: 1.05 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full blur-[110px]"
              style={{ background: isDark ? 'rgba(212,175,55,0.24)' : 'rgba(212,175,55,0.2)' }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: isDark ? 0.3 : 0.16 }}
              transition={{ duration: 1.4, delay: 0.15 }}
              className="absolute -bottom-32 -left-16 w-[420px] h-[420px] rounded-full blur-[100px]"
              style={{ background: isDark ? 'rgba(59,130,246,0.22)' : 'rgba(59,130,246,0.12)' }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 1.02 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-[28px] overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(160deg, rgba(26,33,51,0.96) 0%, rgba(11,15,26,0.98) 100%)'
                : 'linear-gradient(160deg, #ffffff 0%, #f8fafc 100%)',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)',
              boxShadow: isDark
                ? '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,175,55,0.08)'
                : '0 24px 60px rgba(15,23,42,0.1), 0 0 0 1px rgba(212,175,55,0.12)',
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.7), transparent)',
              }}
            />

            <div className="relative z-10 px-5 pt-6 pb-5 sm:px-7 sm:pt-8 sm:pb-6">
              <div className="mb-1 text-center">
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.22em]"
                  style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.4)' }}
                >
                  Preparing Executive Dashboard
                </p>
                {projectName && (
                  <p
                    className="mt-1.5 text-xs font-semibold truncate"
                    style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.55)' }}
                    title={projectName}
                  >
                    {projectName}
                  </p>
                )}
              </div>

              <QATriageLoader
                dense
                onComplete={onComplete}
                sequence={DASHBOARD_LAUNCH_SEQUENCE}
                brandLabel="RELEASE TRIAGE"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
