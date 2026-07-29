import type { QAReportForm } from '../types'
import { isPassStatus } from '../types'

export interface QualityScoreResult {
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
  desc: string
}

export interface QualityScoreComponent {
  key: 'passRate' | 'defectClosure' | 'openDefects'
  name: string
  weight: number
  value: number
  detail: string
  active: boolean
}

/** Minimal Executive Quality Score — 3 signals (max weight 100). */
export const QUALITY_WEIGHTS = {
  passRate: 45,
  defectClosure: 35,
  openDefects: 20,
} as const

export const THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60,
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

/** Shared inputs + component breakdown used by the score + modal. */
export function getQualityScoreComponents(
  data: QAReportForm | null | undefined
): QualityScoreComponent[] {
  if (!data) return []

  const releaseCount = data.releaseItems?.length || 0
  const releasePassed = data.releaseItems?.filter(i => isPassStatus(i?.status)).length || 0

  // Prefer uploaded Release Bug Status metrics when present (same as preview widgets)
  const bugMetrics = data.releaseBugStatus?.metrics
  const reported =
    (bugMetrics?.totalBugs && bugMetrics.totalBugs > 0
      ? bugMetrics.totalBugs
      : data.defectsLastWeek?.reported) || 0
  const closed =
    bugMetrics?.totalBugs && bugMetrics.totalBugs > 0
      ? bugMetrics.completedBugs || 0
      : data.defectsLastWeek?.closed || 0
  const open =
    bugMetrics?.totalBugs && bugMetrics.totalBugs > 0
      ? bugMetrics.activeBugs ?? 0
      : data.defectsLastWeek?.open || 0

  return [
    {
      key: 'passRate',
      name: 'Release Pass Rate',
      weight: QUALITY_WEIGHTS.passRate,
      value: releaseCount > 0 ? clampScore((releasePassed / releaseCount) * 100) : 100,
      detail: `${releasePassed} of ${releaseCount} release items passed`,
      active: releaseCount > 0,
    },
    {
      key: 'defectClosure',
      name: 'Defect Closure Rate',
      weight: QUALITY_WEIGHTS.defectClosure,
      value: reported > 0 ? clampScore((closed / reported) * 100) : 100,
      detail: `${closed} of ${reported} defects closed`,
      active: reported > 0,
    },
    {
      key: 'openDefects',
      name: 'Open Defects Penalty',
      weight: QUALITY_WEIGHTS.openDefects,
      value: Math.max(100 - open * 10, 0),
      detail: `${open} defects currently open (−10 each)`,
      active: true,
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
  const active = components.filter(c => c.active)

  let totalWeight = 0
  let weightedSum = 0
  for (const c of active) {
    weightedSum += c.value * c.weight
    totalWeight += c.weight
  }

  const score = totalWeight > 0 ? clampScore(weightedSum / totalWeight) : 100

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
      desc: 'Open defects or release failures are rising. Plan focused regression work.',
    }
  }
  return {
    score,
    label: 'Needs Attention',
    color: 'text-red-400 border-red-500/20 bg-red-500/5',
    desc: 'Release pass rate or open defects need immediate attention.',
  }
}
