// src/modules/ProjectPulse/projectPulseService.ts

import { fetchProjects as fetchProjectHubProjects } from '@/modules/ProjectHub/projectService'
import { fetchReleaseTasks } from '@/modules/ReleaseTaskTracker/releaseTrackerService'
import { fetchSupportIssues } from '@/modules/SupportIssueTracker/supportTrackerService'
import { AIService } from '@/services/ai/ai-service'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type { ReleaseTask } from '@/modules/ReleaseTaskTracker/types'
import type { SupportIssue } from '@/modules/SupportIssueTracker/types'
import type { ProjectPulseSummary, AIRiskItem } from './types'

export interface ScopeContext {
  userId?: string
  userName?: string
  role?: string
}

// In-memory cache for AI summaries to avoid duplicate calls on re-renders
const aiSummaryCache = new Map<string, { summary: AIRiskItem[]; timestamp: number }>()
const CACHE_TTL_MS = 2 * 60 * 1000 // 2 minutes

/**
 * Filter projects based on user role and project assignments.
 * Admins have global access.
 * Managers, QA Leads, QA Engineers, and other roles are strictly restricted
 * to projects where they are assigned members or creators.
 */
export function scopeProjects(projects: ProjectWithMembers[], ctx: ScopeContext): ProjectWithMembers[] {
  const { userId, role } = ctx
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (isAdmin) return projects
  if (!userId) return []

  return projects.filter((project) => {
    if (project.created_by === userId) return true
    if (Array.isArray(project.members) && project.members.length > 0) {
      return project.members.some((m) => m.user_id === userId)
    }
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

  const scopedProjectIds = new Set(scopedProjects.map((p) => p.id))
  const cleanUserName = (userName || '').trim().toLowerCase()

  return tasks.filter((task) => {
    if (task.is_deleted) return false

    // Project boundary
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

  const scopedProjectIds = new Set(scopedProjects.map((p) => p.id))
  const cleanUserName = (userName || '').trim().toLowerCase()

  return issues.filter((issue) => {
    // Project boundary
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
export function calculateProjectPulseSummary(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[]
): ProjectPulseSummary {
  const todayStr = new Date().toISOString().split('T')[0]
  const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  // ── Support Health ──────────────────────────────────────────────────────────
  const openIssues = scopedIssues.filter(
    (i) => i.testing_status !== 'Completed' && i.testing_status !== 'Cancelled'
  ).length

  const overdueIssues = scopedIssues.filter((i) => {
    const isComplete = i.testing_status === 'Completed' || i.testing_status === 'Cancelled'
    return !isComplete && Boolean(i.planned_end_date) && i.planned_end_date! < todayStr
  }).length

  const supportEffortOverruns = scopedIssues.filter(
    (i) => Number(i.estimated_hours) > 0 && Number(i.actual_hours) > Number(i.estimated_hours)
  ).length

  // ── Release Task Health ────────────────────────────────────────────────────
  const pendingTasks = scopedTasks.filter(
    (t) => t.task_status === 'Not Started' || t.task_status === 'Assigned'
  ).length

  const overdueTasks = scopedTasks.filter((t) => {
    const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
    return !isComplete && Boolean(t.target_date) && t.target_date! < todayStr
  }).length

  const releaseEffortOverruns = scopedTasks.filter((t) => {
    const est = Number((t as any).total_estimation_hrs ?? t.estimated_hours) || 0
    const act = Number(t.actual_hours) || 0
    return est > 0 && act > est
  }).length

  // ── Active Projects ────────────────────────────────────────────────────────
  const activeProjectsCount = scopedProjects.filter((p) => p.status === 'active').length

  // ── Deadlines Approaching (within next 3 days) ──────────────────────────────
  const approachingTasks = scopedTasks.filter((t) => {
    const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
    return (
      !isComplete &&
      Boolean(t.target_date) &&
      t.target_date! >= todayStr &&
      t.target_date! <= threeDaysFromNow
    )
  }).length

  const approachingIssues = scopedIssues.filter((i) => {
    const isComplete = i.testing_status === 'Completed' || i.testing_status === 'Cancelled'
    return (
      !isComplete &&
      Boolean(i.planned_end_date) &&
      i.planned_end_date! >= todayStr &&
      i.planned_end_date! <= threeDaysFromNow
    )
  }).length

  return {
    supportHealth: {
      openIssues,
      overdueIssues,
      effortOverruns: supportEffortOverruns,
    },
    releaseHealth: {
      pendingTasks,
      overdueTasks,
      effortOverruns: releaseEffortOverruns,
    },
    activeProjectsCount,
    approachingDeadlinesCount: approachingTasks + approachingIssues,
  }
}

/**
 * Generate structured, deterministic smart risk items based on actual records.
 * Prioritizes:
 * 1. Overdue activities
 * 2. Estimation overruns (with exact overrun hours & percentage)
 * 3. Multi-delay project risks
 * 4. Critical / blocked issues
 * 5. Approaching deadlines
 */
export function generateRuleBasedRisks(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[]
): AIRiskItem[] {
  const risks: AIRiskItem[] = []
  const todayStr = new Date().toISOString().split('T')[0]
  const threeDaysFromNow = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  // 1. Overdue Release Tasks
  const overdueTasks = scopedTasks.filter((t) => {
    const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
    return !isComplete && Boolean(t.target_date) && t.target_date! < todayStr
  })

  for (const task of overdueTasks.slice(0, 2)) {
    risks.push({
      id: `risk-overdue-task-${task.id}`,
      severity: 'critical',
      title: `Release task ${task.task_id} is overdue`,
      description: `Task "${task.description || 'Testing activity'}" is incomplete past its deadline (${task.target_date}). Immediate follow-up required.`,
      projectName: task.product_name,
      itemId: task.task_id,
      itemType: 'release_task',
      actionLabel: 'View Task',
      targetRoute: `/release-tracker?search=${encodeURIComponent(task.task_id)}`,
    })
  }

  // 2. Overdue Support Issues
  const overdueIssues = scopedIssues.filter((i) => {
    const isComplete = i.testing_status === 'Completed' || i.testing_status === 'Cancelled'
    return !isComplete && Boolean(i.planned_end_date) && i.planned_end_date! < todayStr
  })

  for (const issue of overdueIssues.slice(0, 2)) {
    risks.push({
      id: `risk-overdue-issue-${issue.id}`,
      severity: 'critical',
      title: `Support issue ${issue.issue_id} is overdue`,
      description: `Support issue in "${issue.product_name}" is still open beyond its target date (${issue.planned_end_date}). Action is needed to avoid SLA breach.`,
      projectName: issue.product_name,
      itemId: issue.issue_id,
      itemType: 'support_issue',
      actionLabel: 'View Issue',
      targetRoute: `/support-tracker?search=${encodeURIComponent(issue.issue_id)}`,
    })
  }

  // 3. Support Issues Exceeding Estimated Effort
  const overrunIssues = scopedIssues.filter(
    (i) => Number(i.estimated_hours) > 0 && Number(i.actual_hours) > Number(i.estimated_hours)
  )

  for (const issue of overrunIssues.slice(0, 2)) {
    const est = Number(issue.estimated_hours) || 0
    const act = Number(issue.actual_hours) || 0
    const diff = Math.round((act - est) * 10) / 10
    const pct = Math.round((diff / est) * 100)

    risks.push({
      id: `risk-overrun-issue-${issue.id}`,
      severity: 'warning',
      title: `Support issue ${issue.issue_id} effort exceeded`,
      description: `Issue has recorded ${act}h actual vs ${est}h estimated effort (+${diff}h / +${pct}%). Review remaining work and logged time.`,
      projectName: issue.product_name,
      itemId: issue.issue_id,
      itemType: 'support_issue',
      actionLabel: 'View Issue',
      targetRoute: `/support-tracker?search=${encodeURIComponent(issue.issue_id)}`,
      overrunInfo: {
        estimatedHours: est,
        actualHours: act,
        overrunHours: diff,
        overrunPercentage: pct,
      },
    })
  }

  // 4. Release Tasks Exceeding Estimated Effort
  const overrunTasks = scopedTasks.filter((t) => {
    const est = Number((t as any).total_estimation_hrs ?? t.estimated_hours) || 0
    const act = Number(t.actual_hours) || 0
    return est > 0 && act > est
  })

  for (const task of overrunTasks.slice(0, 2)) {
    const est = Number((task as any).total_estimation_hrs ?? task.estimated_hours) || 0
    const act = Number(task.actual_hours) || 0
    const diff = Math.round((act - est) * 10) / 10
    const pct = Math.round((diff / est) * 100)

    risks.push({
      id: `risk-overrun-task-${task.id}`,
      severity: 'warning',
      title: `Release task ${task.task_id} effort exceeded`,
      description: `Task has used ${act}h actual effort vs ${est}h estimated (+${diff}h / +${pct}%). Check testing scope and re-estimation.`,
      projectName: task.product_name,
      itemId: task.task_id,
      itemType: 'release_task',
      actionLabel: 'View Task',
      targetRoute: `/release-tracker?search=${encodeURIComponent(task.task_id)}`,
      overrunInfo: {
        estimatedHours: est,
        actualHours: act,
        overrunHours: diff,
        overrunPercentage: pct,
      },
    })
  }

  // 5. Project-wide Risk (Multiple delayed activities)
  if (risks.length < 3) {
    const projectOverdueMap = new Map<string, { count: number; name: string }>()
    for (const t of overdueTasks) {
      const prev = projectOverdueMap.get(t.project_id) || { count: 0, name: t.product_name }
      projectOverdueMap.set(t.project_id, { count: prev.count + 1, name: t.product_name })
    }
    for (const i of overdueIssues) {
      const prev = projectOverdueMap.get(i.project_id) || { count: 0, name: i.product_name }
      projectOverdueMap.set(i.project_id, { count: prev.count + 1, name: i.product_name })
    }

    for (const [projId, data] of projectOverdueMap.entries()) {
      if (data.count >= 2 && risks.length < 3) {
        risks.push({
          id: `risk-project-multi-${projId}`,
          severity: 'critical',
          title: `Multiple delayed activities in ${data.name}`,
          description: `${data.count} items are overdue in project "${data.name}". Delivery and release readiness are at risk.`,
          projectName: data.name,
          itemType: 'project_risk',
          actionLabel: 'View Project',
          targetRoute: `/release-tracker?productId=${encodeURIComponent(projId)}&status=overdue`,
        })
      }
    }
  }

  // 6. Blocked / Critical Unresolved Support Issues
  if (risks.length < 3) {
    const blockedIssues = scopedIssues.filter(
      (i) => i.testing_status === 'Blocked'
    )

    for (const issue of blockedIssues.slice(0, 1)) {
      risks.push({
        id: `risk-blocked-issue-${issue.id}`,
        severity: 'critical',
        title: `Blocked support issue ${issue.issue_id}`,
        description: `Testing is currently blocked on issue "${issue.description || issue.issue_id}" in project "${issue.product_name}".`,
        projectName: issue.product_name,
        itemId: issue.issue_id,
        itemType: 'support_issue',
        actionLabel: 'View Issue',
        targetRoute: `/support-tracker?search=${encodeURIComponent(issue.issue_id)}`,
      })
    }
  }

  // 7. Activities Approaching Deadline (Next 3 Days)
  if (risks.length < 3) {
    const approachingTasks = scopedTasks.filter((t) => {
      const isComplete = t.task_status === 'Completed' || t.task_status === 'Cancelled'
      return (
        !isComplete &&
        Boolean(t.target_date) &&
        t.target_date! >= todayStr &&
        t.target_date! <= threeDaysFromNow
      )
    })

    for (const task of approachingTasks.slice(0, 1)) {
      risks.push({
        id: `risk-approaching-task-${task.id}`,
        severity: 'warning',
        title: `Deadline approaching: ${task.task_id}`,
        description: `Release task in "${task.product_name}" is due on ${task.target_date}. Ensure testing activities are completed on time.`,
        projectName: task.product_name,
        itemId: task.task_id,
        itemType: 'release_task',
        actionLabel: 'View Task',
        targetRoute: `/release-tracker?search=${encodeURIComponent(task.task_id)}`,
      })
    }
  }

  // 8. Fallback Healthy Status if all tracked items are on time and within estimates
  if (risks.length === 0) {
    risks.push({
      id: 'risk-healthy-state',
      severity: 'info',
      title: 'No overdue support issues or release tasks found',
      description: 'All tracked support issues and release tasks across your authorised project scope are within their estimated effort and target deadlines.',
      itemType: 'healthy',
      actionLabel: 'View Project',
      targetRoute: '/project-hub?status=active',
    })
  }

  return risks.slice(0, 5)
}

/**
 * AI-assisted risk summary enrichment.
 * Summarizes the verified factual risks into crisp, executive insights.
 * Falls back safely to deterministic rules if AI is unavailable.
 */
export async function fetchAIRiskSummary(
  scopedProjects: ProjectWithMembers[],
  scopedTasks: ReleaseTask[],
  scopedIssues: SupportIssue[],
  canUseAI: boolean
): Promise<AIRiskItem[]> {
  const ruleRisks = generateRuleBasedRisks(scopedProjects, scopedTasks, scopedIssues)

  // Skip AI if disabled, not permitted, or project is 100% healthy
  if (!canUseAI || ruleRisks[0]?.itemType === 'healthy') {
    return ruleRisks
  }

  // Check in-memory cache
  const cacheKey = ruleRisks.map((r) => `${r.id}:${r.title}`).join('|')
  const cached = aiSummaryCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.summary
  }

  try {
    const factsList = ruleRisks
      .map(
        (r) =>
          `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description} (Project: ${r.projectName || 'General'})`
      )
      .join('\n')

    const prompt = `You are an AI QA Operations Director. Review the following verified project risk facts:\n${factsList}\n\nRewrite each fact into a concise, high-impact 1-sentence executive risk assessment and recommended operational next step. Keep each item under 25 words.\nOutput only the rewritten sentences numbered 1, 2, 3.`

    const response = await AIService.callAI({
      prompt,
      options: {
        module: 'writing-assistant',
        maxTokens: 250,
        timeout: 4500,
      },
    })

    if (response) {
      const lines = response
        .split('\n')
        .map((l) => l.replace(/^[0-9]+[.)]\s*/, '').trim())
        .filter(Boolean)

      if (lines.length >= ruleRisks.length) {
        const enriched = ruleRisks.map((item, idx) => ({
          ...item,
          description: lines[idx] || item.description,
        }))
        aiSummaryCache.set(cacheKey, { summary: enriched, timestamp: Date.now() })
        return enriched
      }
    }
  } catch {
    // Seamless fallback to deterministic rule risks
  }

  return ruleRisks
}

/**
 * Main coordinator function to fetch and compute Project Pulse data.
 */
export async function loadProjectPulseData(ctx: ScopeContext, canUseAI: boolean) {
  // 1. Fetch from single authoritative sources
  const [allProjects, allTasks, allIssues] = await Promise.all([
    fetchProjectHubProjects().catch(() => []),
    fetchReleaseTasks([]).catch(() => []),
    fetchSupportIssues([]).catch(() => []),
  ])

  // 2. Scope by role and membership
  const scopedProjects = scopeProjects(allProjects, ctx)
  const scopedTasks = scopeReleaseTasks(allTasks, scopedProjects, ctx)
  const scopedIssues = scopeSupportIssues(allIssues, scopedProjects, ctx)

  // 3. Compute counters
  const summary = calculateProjectPulseSummary(scopedProjects, scopedTasks, scopedIssues)

  // 4. Generate AI Risk Summary
  const risks = await fetchAIRiskSummary(scopedProjects, scopedTasks, scopedIssues, canUseAI)

  return {
    summary,
    risks,
    scopedProjectsCount: scopedProjects.length,
  }
}
