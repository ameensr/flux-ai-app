import React from 'react'
import { DotMatrixLaunchLoader } from './DotMatrixLaunchLoader'

interface DashboardLaunchOverlayProps {
  open: boolean
  projectName?: string
  onComplete: () => void
}

/**
 * Full-screen loading entrance overlay:
 * Replaces legacy loading sequences with the Swiss dot-matrix 0% -> 100% counter.
 */
export const DashboardLaunchOverlay: React.FC<DashboardLaunchOverlayProps> = ({
  open,
  projectName,
  onComplete,
}) => {
  return (
    <DotMatrixLaunchLoader
      open={open}
      onComplete={onComplete}
      durationMs={1100}
      label="LOADING..."
      sublabel={projectName ? `SP • DEV  //  ${projectName.toUpperCase()}` : 'SP • DEV'}
    />
  )
}
