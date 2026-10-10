// src/modules/DashboardQuickDetails/quickDetailsDataService.ts

import { fetchProjects as fetchProjectHubProjects } from '@/modules/ProjectHub/projectService'
import { fetchReleaseTasks } from '@/modules/ReleaseTaskTracker/releaseTrackerService'
import { fetchSupportIssues } from '@/modules/SupportIssueTracker/supportTrackerService'
import { AIService } from '@/services/ai/ai-service'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type { ReleaseTask } from '@/modules/ReleaseTaskTracker/types'
import type { SupportIssue } from '@/modules/SupportIssueTracker/types'
import type { QuickDetailsSummary, AIInsightAlert } from './types'

export interface ScopeContext {
  userId?: string
  userName?: string
  role?: string
}

/**
 * Filter projects based on user role and project assignments.
 * Admins have global access; managers, QA leads, QA engineers, and other roles
 * are restricted to projects where they are explicitly assigned members.
 */
export function scopeProjects(projects: ProjectWithMembers[], ctx: ScopeContext): ProjectWithMembers[] {
  const { userId, role } = ctx
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (isAdmin) return projects
  if (!userId) return []

  return projects.filter(project => {
    // If user created the project
    if (project.created_by === userId) return true
    // If user is in the project members list
    if (Array.isArray(project.members) && project.members.length > 0) {
      return project.members.some(m => m.user_id === userId)
    }
    // If no members array was returned (e.g. basic list), allow only if project belonged to user
    return false
  })
}

/**
 * Filter release tasks according to role boundaries.
 * QA Engineers see only tasks assigned to them.
 * Managers and QA Leads see all tasks for projects in their authorized scope.
 */
export function scopeReleaseTasks(
  tasks: ReleaseTask[],
  scopedProjects: ProjectWithMembers[],
  ctx: ScopeContext
): ReleaseTask[] {
  const { userId, userName, role } = ctx
  const isAdmin = role === 'admin' || role === 'super_admin'
  const isQaEngineer = role === 'qa_engineer'

  const scopedProjectIds = new Set(scopedProjects.map(p => p.id))
  const cleanUserName = (userName || '').trim().toLowerCase()

  return tasks.filter(task => {
    if (task.is_deleted) return false

    // Project scope barrier (unless admin with empty project_id)
    if (!isAdmin && task.project_id && !scopedProjectIds.has(task.project_id)) {
      return false
    }

    // Role-specific barrier: QA Engineer only sees tasks assigned to them
    if (isQaEngineer) {
      const matchUserId = Boolean(userId && task.assigned_to_user_id === userId)
      const matchName = Boolean(cleanUserName && task.assigned_to_name?.toLowerCase().includes(cleanUserName))
      return matchUserId || matchName
    }

    return true
  })
}

/**
 * Filter support issues according to role boundaries.
 * QA Engineers see only issues assigned to them.
 * Managers and QA Leads see all issues for projects in their authorized scope.
 */
export function scopeSupportIssues(
  issues: SupportIssue[],
  scopedProjects: ProjectWithMembers[],
  ctx: ScopeContext
): SupportIssue[] {
  const { userName, role } = ctx
  const isAdmin = role === 'admin' || role === 'super_admin'
  const isQaEngineer = role === 'qa_engineer'

  const scopedProjectIds = new Set(scopedProjects.map(p => p.id))
  const cleanUserName = (userName || '').trim().toLowerCase()

  return issues.filter(issue => {
    // Project scope barrier
    if (!isAdmin && issue.project_id && !scopedProjectIds.has(issue.project_id)) {
      return false
    }

    // Role-specific barrier: QA Engineer only sees support issues assigned to them
    if (isQaEngineer) {
      return Boolean(cleanUserName && issue.tester_name?.toLowerCase().includes(cleanUserName))
    }

    return true
  })
}

/**
 * Calculate deterministic real-time metrics across authorized records.
 */
export function calculateQuickDetailsSummary(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[]
): QuickDetailsSummary {
  const todayStr = new Date().toISOString().split('T')[0]

  // 1. Active Projects
  const activeProjectsCount = scopedProjects.filter(p => p.status === 'active').length

  // 2. Tasks in progress (Release tasks + In Testing support issues)
  const tasksInProgressCount =
    scopedTasks.filter(t => t.task_status === 'In Progress').length +
    scopedIssues.filter(i => i.testing_status === 'In Testing' || i.testing_status === 'Retesting').length

  // 3. Pending tasks awaiting action
  const pendingTasksCount =
    scopedTasks.filter(t => t.task_status === 'Not Started' || t.task_status === 'Assigned').length +
    scopedIssues.filter(i => i.testing_status === 'Not Started' || i.testing_status === 'Assigned').length

  // 4. Overdue tasks (incomplete tasks past applicable deadline)
  const overdueTasksCount =
    scopedTasks.filter(t => {
      const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
      return !isComplete && Boolean(t.target_date) && t.target_date! < todayStr
    }).length +
    scopedIssues.filter(i => {
      const isComplete = i.testing_status === 'Completed' || i.testing_status === 'Cancelled'
      return !isComplete && Boolean(i.planned_end_date) && i.planned_end_date! < todayStr
    }).length

  // 5. Effort Overruns (Actual hours exceeding estimated hours)
  const effortOverrunsCount =
    scopedTasks.filter(t => Number(t.estimated_hours) > 0 && Number(t.actual_hours) > Number(t.estimated_hours)).length +
    scopedIssues.filter(i => Number(i.estimated_hours) > 0 && Number(i.actual_hours) > Number(i.estimated_hours)).length

  // 6. Open support issues
  const openSupportIssuesCount = scopedIssues.filter(
    i => i.testing_status !== 'Completed' && i.testing_status !== 'Cancelled'
  ).length

  return {
    activeProjectsCount,
    tasksInProgressCount,
    pendingTasksCount,
    overdueTasksCount,
    effortOverrunsCount,
    openSupportIssuesCount
  }
}

/**
 * Generate structured, deterministic smart alerts based on actual records.
 */
export function generateRuleBasedAlerts(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[]
): AIInsightAlert[] {
  const alerts: AIInsightAlert[] = []
  const todayStr = new Date().toISOString().split('T')[0]

  // A. Check for Overdue Tasks
  const overdueTasks = scopedTasks.filter(t => {
    const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
    return !isComplete && Boolean(t.target_date) && t.target_date! < todayStr
  })

  for (const task of overdueTasks.slice(0, 2)) {
    alerts.push({
      id: `alert-overdue-task-${task.id}`,
      type: 'overdue_task',
      title: 'Overdue testing activity',
      description: `Task ${task.task_id} ("${task.description || 'Testing activity'}") has passed its deadline. Target completion was ${task.target_date}.`,
      context: `${task.product_name || 'Project'} · ${task.task_id} · Select to view task`,
      severity: 'warning',
      targetRoute: `/release-tracker?search=${encodeURIComponent(task.task_id)}`,
      projectId: task.project_id,
      itemId: task.task_id
    })
  }

  // B. Check for Support Issues Overrun
  const overrunIssues = scopedIssues.filter(
    i => Number(i.estimated_hours) > 0 && Number(i.actual_hours) > Number(i.estimated_hours)
  )

  for (const issue of overrunIssues.slice(0, 2)) {
    const est = Number(issue.estimated_hours) || 0
    const act = Number(issue.actual_hours) || 0
    const diff = Math.round((act - est) * 10) / 10
    const pct = Math.round((diff / est) * 100)

    alerts.push({
      id: `alert-overrun-issue-${issue.id}`,
      type: 'effort_overrun',
      title: 'Estimation exceeded',
      description: `Support issue ${issue.issue_id} has used ${act}h vs ${est}h estimated (+${diff}h / +${pct}%). Review the effort and remaining work.`,
      context: `${issue.product_name || 'Project'} · ${issue.issue_id} · Select to view issue`,
      severity: 'warning',
      targetRoute: `/support-tracker?search=${encodeURIComponent(issue.issue_id)}`,
      projectId: issue.project_id,
      itemId: issue.issue_id
    })
  }

  // C. Check for Release Tasks Overrun (if not enough issue alerts)
  if (alerts.length < 2) {
    const overrunTasks = scopedTasks.filter(
      t => Number(t.estimated_hours) > 0 && Number(t.actual_hours) > Number(t.estimated_hours)
    )

    for (const task of overrunTasks.slice(0, 2 - alerts.length)) {
      const est = Number(task.estimated_hours) || 0
      const act = Number(task.actual_hours) || 0
      const diff = Math.round((act - est) * 10) / 10
      const pct = Math.round((diff / est) * 100)

      alerts.push({
        id: `alert-overrun-task-${task.id}`,
        type: 'effort_overrun',
        title: 'Effort estimation exceeded',
        description: `Task ${task.task_id} in "${task.product_name}" has recorded ${act}h actual vs ${est}h estimated (+${diff}h / +${pct}%).`,
        context: `${task.product_name || 'Project'} · ${task.task_id} · Select to view task`,
        severity: 'warning',
        targetRoute: `/release-tracker?search=${encodeURIComponent(task.task_id)}`,
        projectId: task.project_id,
        itemId: task.task_id
      })
    }
  }

  // D. Check for Overdue Support Issues
  if (alerts.length < 2) {
    const overdueIssues = scopedIssues.filter(i => {
      const isComplete = i.testing_status === 'Completed' || i.testing_status === 'Cancelled'
      return !isComplete && Boolean(i.planned_end_date) && i.planned_end_date! < todayStr
    })

    for (const issue of overdueIssues.slice(0, 2 - alerts.length)) {
      alerts.push({
        id: `alert-overdue-issue-${issue.id}`,
        type: 'support_issue',
        title: 'Overdue support issue',
        description: `Support issue ${issue.issue_id} is still open beyond its target date (${issue.planned_end_date}). Follow-up is required.`,
        context: `${issue.product_name || 'Project'} · ${issue.issue_id} · Select to view issue`,
        severity: 'critical',
        targetRoute: `/support-tracker?search=${encodeURIComponent(issue.issue_id)}`,
        projectId: issue.project_id,
        itemId: issue.issue_id
      })
    }
  }

  // E. Project or QA Risk alert (e.g. if any project has 2+ overdue tasks)
  if (alerts.length < 2) {
    const projectOverdueMap = new Map<string, { count: number; name: string }>()
    for (const t of overdueTasks) {
      const prev = projectOverdueMap.get(t.project_id) || { count: 0, name: t.product_name }
      projectOverdueMap.set(t.project_id, { count: prev.count + 1, name: t.product_name })
    }

    for (const [projId, data] of projectOverdueMap.entries()) {
      if (data.count >= 2 && alerts.length < 2) {
        alerts.push({
          id: `alert-risk-${projId}`,
          type: 'project_risk',
          title: `Testing risk in ${data.name}`,
          description: `Multiple tasks (${data.count}) are overdue in project ${data.name}. Review pending testing activities.`,
          context: `${data.name} · Release risk · Select to inspect`,
          severity: 'critical',
          targetRoute: `/release-tracker?productId=${encodeURIComponent(projId)}&status=overdue`,
          projectId: projId
        })
      }
    }
  }

  // F. Fallback Healthy Alert if all items are on track
  if (alerts.length === 0) {
    alerts.push({
      id: 'alert-healthy-all',
      type: 'healthy',
      title: 'All tracked activities on schedule',
      description: 'All tracked activities and support issues in your scope are within their estimated effort and target deadlines.',
      context: 'All projects healthy · Select to view projects',
      severity: 'info',
      targetRoute: '/project-hub?status=active'
    })
  }

  return alerts.slice(0, 2)
}

/**
 * Attempt to enhance summary with AI insights using existing AIService.
 * Falls back to deterministic rule-based alerts if AI is unavailable or disabled.
 */
export async function fetchAIInsights(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[],
  canUseAI: boolean
): Promise<AIInsightAlert[]> {
  const ruleAlerts = generateRuleBasedAlerts(scopedProjects, scopedTasks, scopedIssues)

  if (!canUseAI || ruleAlerts[0]?.type === 'healthy') {
    return ruleAlerts
  }

  try {
    const promptData = ruleAlerts.map(a => `- [${a.type}] ${a.title}: ${a.description} (${a.context})`).join('\n')
    const prompt = `Based on the following active project risks and alerts, rewrite the 2 item descriptions to be ultra-concise, action-oriented, and professional for an enterprise QA dashboard:\n${promptData}\nFormat each alert on a single line starting with "1. " and "2. ".`

    const aiResponse = await AIService.callAI({
      prompt,
      options: {
        module: 'writing-assistant',
        maxTokens: 200,
        timeout: 4000
      }
    })

    if (aiResponse) {
      const lines = aiResponse
        .split('\n')
        .map(l => l.replace(/^[0-9]+[.)]\s*/, '').trim())
        .filter(Boolean)

      if (lines.length >= 2) {
        return ruleAlerts.map((alert, idx) => ({
          ...alert,
          description: lines[idx] || alert.description
        }))
      }
    }
  } catch {
    // Graceful fallback to rule-based alerts on any AI timeout or offline state
  }

  return ruleAlerts
}

/**
 * Main coordinator function to fetch and calculate dashboard quick details data.
 */
export async function loadQuickDetailsData(ctx: ScopeContext, canUseAI: boolean) {
  // 1. Fetch from single authoritative sources
  const [allProjects, allTasks, allIssues] = await Promise.all([
    fetchProjectHubProjects().catch(() => []),
    fetchReleaseTasks([]).catch(() => []),
    fetchSupportIssues([]).catch(() => [])
  ])

  // 2. Scope by role and membership
  const scopedProjects = scopeProjects(allProjects, ctx)
  const scopedTasks = scopeReleaseTasks(allTasks, scopedProjects, ctx)
  const scopedIssues = scopeSupportIssues(allIssues, scopedProjects, ctx)

  // 3. Compute counters
  const summary = calculateQuickDetailsSummary(scopedProjects, scopedTasks, scopedIssues)

  // 4. Generate smart alerts (rule-based with AI enhancement attempt)
  const alerts = await fetchAIInsights(scopedProjects, scopedTasks, scopedIssues, canUseAI)

  return {
    summary,
    alerts,
    scopedProjectsCount: scopedProjects.length
  }
}
