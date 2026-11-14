import React, { useState, useEffect } from 'react'
import { DotMatrixLaunchLoader } from './DotMatrixLaunchLoader'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'

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
}

/**
 * Full-screen loading entrance overlay:
 * Two-Stage Executive Reveal:
 * 1. Dot-Matrix Loader (Swiss 0% -> 100% telemetry counter)
 * 2. Cinematic 3D Boardroom Intro (Scroll-driven table rotation, 3D chairs & avatars)
 * 3. Interactive Executive Dashboard
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
      <DotMatrixLaunchLoader
        open={!dotMatrixDone}
        onComplete={() => setDotMatrixDone(true)}
        durationMs={1100}
        label="INITIALIZING..."
        sublabel={projectName ? `SP • DEV  //  ${projectName.toUpperCase()}` : 'SP • DEV'}
      />

      {/* ── STAGE 2: Cinematic 3D Boardroom Scene with Scroll Transition ── */}
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
      >
        {children}
      </CinematicBoardroomIntro>
    </>
  )
}
