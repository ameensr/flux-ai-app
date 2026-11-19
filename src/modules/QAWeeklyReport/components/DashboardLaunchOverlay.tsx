import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DotMatrixLaunchLoader } from './DotMatrixLaunchLoader'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'
import type { ReportHeroScreenData } from '@/components/CinematicBoardroomIntro/reportHeroScreen'

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
  const [dotMatrixDone, setDotMatrixDone] = useState(false)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    if (open) setDotMatrixDone(false)
  }, [open])

  useEffect(() => {
    if (open || !finishing) return
    const timer = window.setTimeout(() => setFinishing(false), 680)
    return () => window.clearTimeout(timer)
  }, [open, finishing])

  const overlayVisible = open || finishing
  const title = projectName || 'Executive Briefing'
  const subtitle = weekStart && weekEnd
    ? `QA Report Sprint: ${weekStart} – ${weekEnd}`
    : 'Executive QA & Engineering Overview'
  const finishLaunch = () => {
    setFinishing(true)
    onComplete()
  }

  return (
    <>
      {/* Keep the dashboard mounted while the boardroom covers it. */}
      <div aria-hidden={overlayVisible} inert={overlayVisible}>{children}</div>
      {overlayVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, overflow: 'hidden', isolation: 'isolate', background: '#080b16', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity 580ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
          <AnimatePresence>
            {open && ENABLE_DOT_MATRIX_LAUNCH && !dotMatrixDone && (
              <DotMatrixLaunchLoader
                open={!dotMatrixDone}
                onComplete={() => setDotMatrixDone(true)}
                durationMs={1100}
                label="INITIALIZING..."
                sublabel={projectName ? `SP • DEV  //  ${projectName.toUpperCase()}` : 'SP • DEV'}
              />
            )}
          </AnimatePresence>
          {open && (!ENABLE_DOT_MATRIX_LAUNCH || dotMatrixDone) && (
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
              onComplete={finishLaunch}
              heroScreen={heroScreen}
            />
          )}
        </div>
      )}
    </>
  )
}
