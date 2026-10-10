// src/modules/ProjectPulse/types.ts

export type RiskSeverity = 'critical' | 'warning' | 'info'

export interface SupportHealthMetrics {
  openIssues: number
  overdueIssues: number
  effortOverruns: number
}

export interface ReleaseHealthMetrics {
  pendingTasks: number
  overdueTasks: number
  effortOverruns: number
}

export interface ProjectPulseSummary {
  supportHealth: SupportHealthMetrics
  releaseHealth: ReleaseHealthMetrics
  activeProjectsCount: number
  approachingDeadlinesCount: number
}

export interface AIRiskItem {
  id: string
  severity: RiskSeverity
  title: string
  description: string
  projectName?: string
  itemId?: string
  itemType: 'support_issue' | 'release_task' | 'project_risk' | 'healthy'
  actionLabel: 'View Task' | 'View Issue' | 'View Project'
  targetRoute: string
  overrunInfo?: {
    estimatedHours: number
    actualHours: number
    overrunHours: number
    overrunPercentage: number
  }
}
