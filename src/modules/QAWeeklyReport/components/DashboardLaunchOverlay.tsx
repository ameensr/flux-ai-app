import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DotMatrixLaunchLoader } from './DotMatrixLaunchLoader'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'
import type { ReportHeroScreenData } from '@/components/CinematicBoardroomIntro/reportHeroScreen'

// Temporarily skip the 0–100% loader. Set this to true to restore it.
const ENABLE_DOT_MATRIX_LAUNCH = false

interface DashboardLaunchOverlayProps {
  open: boolean
  projectName?: string
  seniorName?: string
  meetingWith?: string
  teamMembers?: string[]
  supportEmailsCount?: number
  newFeaturesCount?: number
  weekStart?: string
  weekEnd?: string
  onComplete: () => void
  children?: React.ReactNode
  heroScreen?: ReportHeroScreenData
}

/**
 * Full-screen loading entrance overlay:
 * The dot-matrix loader is retained behind ENABLE_DOT_MATRIX_LAUNCH.
 * With it disabled, the interactive boardroom opens immediately.
 */
export const DashboardLaunchOverlay: React.FC<DashboardLaunchOverlayProps> = ({
  open,
  projectName,
  seniorName,
  meetingWith,
  teamMembers,
  supportEmailsCount = 0,
  newFeaturesCount = 0,
  weekStart,
  weekEnd,
  onComplete,
  children,
  heroScreen,
}) => {
  // Stage 1: Dot-matrix loader plays first
  const [dotMatrixDone, setDotMatrixDone] = useState(false)

  // Reset when open changes to true
  useEffect(() => {
    if (open) {
      setDotMatrixDone(false)
    }
  }, [open])

  if (!open) {
    return <>{children}</>
  }

  const title = projectName || 'Executive Briefing'
  const subtitle = weekStart && weekEnd
    ? `QA Report Sprint: ${weekStart} – ${weekEnd}`
    : 'Executive QA & Engineering Overview'

  return (
    <>
      {/* ── STAGE 1: Dot-Matrix Telemetry Counter (0% -> 100%) ── */}
      <AnimatePresence>
        {ENABLE_DOT_MATRIX_LAUNCH && !dotMatrixDone && (
          <DotMatrixLaunchLoader
            open={!dotMatrixDone}
            onComplete={() => setDotMatrixDone(true)}
            durationMs={1100}
            label="INITIALIZING..."
            sublabel={projectName ? `SP • DEV  //  ${projectName.toUpperCase()}` : 'SP • DEV'}
          />
        )}
      </AnimatePresence>

      {/* The boardroom mounts immediately while the dot-matrix stage is disabled. */}
      {(!ENABLE_DOT_MATRIX_LAUNCH || dotMatrixDone) && (
        <CinematicBoardroomIntro
          projectName={projectName}
          seniorPersonName={seniorName}
          meetingWith={meetingWith}
          teamMembers={teamMembers}
          supportEmailsCount={supportEmailsCount}
          newFeaturesCount={newFeaturesCount}
          weekStart={weekStart}
          weekEnd={weekEnd}
          title={title}
          subtitle={subtitle}
          onComplete={onComplete}
          heroScreen={heroScreen}
        >
          {children}
        </CinematicBoardroomIntro>
      )}
    </>
  )
}
