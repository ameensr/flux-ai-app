import React, { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DotMatrixLaunchLoader } from './DotMatrixLaunchLoader'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'
import type { ReportHeroScreenData } from '@/components/CinematicBoardroomIntro/reportHeroScreen'

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
 * Two-Stage Executive Reveal:
 * 1. Dot-Matrix Loader (Swiss 0% -> 100% telemetry counter)
 * 2. Interactive 3D boardroom seat preview
 * 3. Interactive Executive Dashboard
 *
 * Sequence is strictly staged to guarantee zero flash of the 3D diorama before Stage 1:
 * Stage 1 (Dot-Matrix) -> Stage 2 (Cinematic 3D Intro) -> Dashboard Content
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
        {!dotMatrixDone && (
          <DotMatrixLaunchLoader
            open={!dotMatrixDone}
            onComplete={() => setDotMatrixDone(true)}
            durationMs={1100}
            label="INITIALIZING..."
            sublabel={projectName ? `SP • DEV  //  ${projectName.toUpperCase()}` : 'SP • DEV'}
          />
        )}
      </AnimatePresence>

      {/* Stage 2 mounts after the loader so the WebGL scene is loaded only when needed. */}
      {dotMatrixDone && (
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
