import type { QAReportForm } from '../types'

export interface QualityScoreResult {
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
  desc: string
}

// Configurable thresholds
export const THRESHOLDS = {
  EXCELLENT: 90,
  GOOD: 75,
  FAIR: 60
}

export const calculateQAScore = (data: QAReportForm | null | undefined): QualityScoreResult => {
  if (!data) {
    return {
      score: 100,
      label: 'Excellent',
      color: 'text-green-400 border-green-500/20 bg-green-500/5',
      desc: 'System quality is extremely high. All main releases pass regression guidelines.'
    }
  }

  const releaseCount = data.releaseItems?.length || 0
  const releasePassed = data.releaseItems?.filter(i => i?.status === 'Pass').length || 0
  const releaseFailed = data.releaseItems?.filter(i => i?.status === 'Fail').length || 0

  const activeDefectsTotal = data.defectsLastWeek?.reported || 0
  const defectsClosed = data.defectsLastWeek?.closed || 0
  const defectsOpen = data.defectsLastWeek?.open || 0

  const escapedIssues = data.lastWeek?.escapedIssue || 0
  
  const supportTicketsCount = data.supportTickets?.length || 0
  const criticalSupport = data.supportTickets?.filter(t => t?.priority === 'Critical').length || 0
  const highSupport = data.supportTickets?.filter(t => t?.priority === 'High').length || 0

  const teamFeatureSize = data.newFeatureTeam?.length || 0
  const teamSupportSize = data.supportTeam?.length || 0
  const teamAutomationSize = data.automationTeam?.length || 0
  const totalTeam = teamFeatureSize + teamSupportSize + teamAutomationSize

  let totalWeight = 0
  let weightedSum = 0

  // 1. Release Pass Rate (Weight: 35)
  if (releaseCount > 0) {
    const val = (releasePassed / releaseCount) * 100
    weightedSum += val * 35
    totalWeight += 35
  }

  // 2. Failed Release Penalty (Weight: 15)
  if (releaseCount > 0) {
    const val = 100 - (releaseFailed / releaseCount) * 100
    weightedSum += val * 15
    totalWeight += 15
  }

  // 3. Defect Closure Rate (Weight: 20)
  if (activeDefectsTotal > 0) {
    const val = (defectsClosed / activeDefectsTotal) * 100
    weightedSum += val * 20
    totalWeight += 20
  }

  // 4. Open Defects Penalty (Weight: 15)
  if (defectsOpen !== undefined) {
    const val = Math.max(100 - defectsOpen * 10, 0)
    weightedSum += val * 15
    totalWeight += 15
  }

  // 5. Escaped Defects Penalty (Weight: 20)
  if (escapedIssues !== undefined) {
    const val = Math.max(100 - escapedIssues * 15, 0)
    weightedSum += val * 20
    totalWeight += 20
  }

  // 6. Critical Support Tickets Penalty (Weight: 15)
  if (supportTicketsCount > 0) {
    const val = Math.max(100 - criticalSupport * 25 - highSupport * 10, 0)
    weightedSum += val * 15
    totalWeight += 15
  }

  // 7. Automation Resource Coverage (Weight: 10)
  if (totalTeam > 0) {
    const val = (teamAutomationSize / totalTeam) * 100
    weightedSum += val * 10
    totalWeight += 10
  }

  // Final score calculation
  const score = totalWeight > 0 ? Math.max(Math.min(Math.round(weightedSum / totalWeight), 100), 0) : 100

  // Determine category and style colors based on thresholds
  if (score >= THRESHOLDS.EXCELLENT) {
    return {
      score,
      label: 'Excellent',
      color: 'text-green-400 border-green-500/20 bg-green-500/5',
      desc: 'System quality is extremely high. All main releases pass regression guidelines.'
    }
  } else if (score >= THRESHOLDS.GOOD) {
    return {
      score,
      label: 'Good',
      color: 'text-accent-gold border-accent-gold/20 bg-accent-gold/5',
      desc: 'QA health checks out stable. Backlog contains minor non-blocking issues.'
    }
  } else if (score >= THRESHOLDS.FAIR) {
    return {
      score,
      label: 'Fair',
      color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
      desc: 'Bugs open count is rising. Plan regression sprints to clear out backlog debt.'
    }
  } else {
    return {
      score,
      label: 'Needs Attention',
      color: 'text-red-400 border-red-500/20 bg-red-500/5',
      desc: 'Critical support queues are overflowing. Major deployment items blocked.'
    }
  }
}
