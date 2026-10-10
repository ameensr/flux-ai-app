// src/modules/DashboardQuickDetails/types.ts

export interface QuickDetailsSummary {
  activeProjectsCount: number
  tasksInProgressCount: number
  overdueTasksCount: number
  effortOverrunsCount: number
  pendingTasksCount: number
  openSupportIssuesCount: number
}

export type AlertSeverity = 'critical' | 'warning' | 'info'

export interface AIInsightAlert {
  id: string
  type: 'overdue_task' | 'effort_overrun' | 'support_issue' | 'project_risk' | 'healthy'
  title: string
  description: string
  context: string
  severity: AlertSeverity
  targetRoute: string
  projectId?: string
  itemId?: string
}

export interface ProjectQuickItem {
  projectId: string
  projectName: string
  projectCode?: string
  activeTasksCount: number
  overdueTasksCount: number
  overrunCount: number
}
