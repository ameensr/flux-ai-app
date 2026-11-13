import React from 'react'
import { CreativeDashboardLoader } from './CreativeDashboardLoader'

export type LineType = 'process' | 'pass' | 'fail' | 'complete'
export interface LineData {
  id: number
  type: LineType
  text: string
}

interface QATriageLoaderProps {
  onComplete: () => void
  isCompact?: boolean
  dense?: boolean
  sequence?: LineData[]
  brandLabel?: string
}

/**
 * Modern loading loader:
 * Renders the creative orbital loading animation instead of legacy triage text.
 */
export const QATriageLoader: React.FC<QATriageLoaderProps> = ({
  onComplete,
  isCompact = false,
  dense = false,
}) => {
  return (
    <CreativeDashboardLoader
      onComplete={onComplete}
      dense={dense}
      isCompact={isCompact}
      title="Processing Intelligence Engine"
      durationMs={1800}
    />
  )
}
