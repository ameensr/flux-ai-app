import type { QAReportForm } from '../types'
import { isPassStatus } from '../types'

export interface QualityScoreResult {
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
  desc: string
}

export interface QualityScoreComponent {
  key: 'passRate' | 'defectClosure'
  name: string
  /** Fixed max points this signal can contribute (weights sum to 100). */
  weight: number
  /** Raw metric 0–100 (e.g. pass rate %). */
  value: number
  /** Points contributed toward the final score: value × weight / 100. */
  points: number
  detail: string
  /** True when metric is based on real report data (not a neutral default). */
  active: boolean
}

/** Executive Quality Score — 2 signals totaling 100 points. */
export const QUALITY_WEIGHTS = {
  passRate: 55,
  defectClosure: 45,
} as const

export const THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

function pointsFrom(value: number, weight: number): number {
  return Math.round((value * weight) / 100)
}

/**
 * Shared inputs + component breakdown used by the score + modal.
 *
 * Score = Pass Rate points + Defect Closure points
 *   Pass points     = Pass% × 55 / 100   (max 55)
 *   Closure points  = Closure% × 45 / 100 (max 45)
 *
 * Pass%     = passed release items ÷ total release items
 * Closure%  = Release Bug Status closure % when uploaded,
 *             else closed ÷ reported from Defects — Last Week
 * Missing data defaults to 100% (neutral) so an empty section does not tank the score.
 */
export function getQualityScoreComponents(
  data: QAReportForm | null | undefined
): QualityScoreComponent[] {
  if (!data) return []

  const releaseCount = data.releaseItems?.length || 0
  const releasePassed = data.releaseItems?.filter(i => isPassStatus(i?.status)).length || 0
  const hasPassData = releaseCount > 0
  const passValue = hasPassData
    ? clampScore((releasePassed / releaseCount) * 100)
    : 100

  // Prefer uploaded Release Bug Status closure % (includes completed + resolved)
  const bugMetrics = data.releaseBugStatus?.metrics
  const hasBugSheet = !!(bugMetrics && bugMetrics.totalBugs > 0)
  const reported = data.defectsLastWeek?.reported || 0
  const closed = data.defectsLastWeek?.closed || 0
  const hasManualDefects = reported > 0

  let closureValue = 100
  let closureDetail = 'No defect data — counted as 100%'
  let hasClosureData = false

  if (hasBugSheet) {
    hasClosureData = true
    closureValue = clampScore(bugMetrics!.closurePercentage)
    const done = (bugMetrics!.completedBugs || 0) + (bugMetrics!.resolvedBugs || 0)
    closureDetail = `${done} of ${bugMetrics!.totalBugs} defects closed/resolved (${closureValue}%)`
  } else if (hasManualDefects) {
    hasClosureData = true
    closureValue = clampScore((closed / reported) * 100)
    closureDetail = `${closed} of ${reported} defects closed`
  }

  return [
    {
      key: 'passRate',
      name: 'Release Pass Rate',
      weight: QUALITY_WEIGHTS.passRate,
      value: passValue,
      points: pointsFrom(passValue, QUALITY_WEIGHTS.passRate),
      detail: hasPassData
        ? `${releasePassed} of ${releaseCount} release items passed`
        : 'No release items — counted as 100%',
      active: hasPassData,
    },
    {
      key: 'defectClosure',
      name: 'Defect Closure Rate',
      weight: QUALITY_WEIGHTS.defectClosure,
      value: closureValue,
      points: pointsFrom(closureValue, QUALITY_WEIGHTS.defectClosure),
      detail: closureDetail,
      active: hasClosureData,
    },
  ]
}

export const calculateQAScore = (data: QAReportForm | null | undefined): QualityScoreResult => {
  if (!data) {
    return {
      score: 100,
      label: 'Excellent',
      color: 'text-green-400 border-green-500/20 bg-green-500/5',
      desc: 'System quality is extremely high. All main releases pass regression guidelines.',
    }
  }

  const components = getQualityScoreComponents(data)
  // Additive points model — weights always sum to 100
  const score = clampScore(components.reduce((sum, c) => sum + c.points, 0))

  if (score >= THRESHOLDS.EXCELLENT) {
    return {
      score,
      label: 'Excellent',
      color: 'text-green-400 border-green-500/20 bg-green-500/5',
      desc: 'System quality is extremely high. All main releases pass regression guidelines.',
    }
  }
  if (score >= THRESHOLDS.GOOD) {
    return {
      score,
      label: 'Good',
      color: 'text-accent-gold border-accent-gold/20 bg-accent-gold/5',
      desc: 'QA health checks out stable. Backlog contains minor non-blocking issues.',
    }
  }
  if (score >= THRESHOLDS.FAIR) {
    return {
      score,
      label: 'Fair',
      color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
      desc: 'Release failures or low defect closure need attention. Plan focused regression work.',
    }
  }
  return {
    score,
    label: 'Needs Attention',
    color: 'text-red-400 border-red-500/20 bg-red-500/5',
    desc: 'Release pass rate or defect closure need immediate attention.',
  }
}
