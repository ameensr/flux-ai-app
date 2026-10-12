// src/features/panda-copilot/services/pandaDataService.ts
// Rule-based data retrieval for Panda Copilot.
// Reuses existing module services — no duplicate business logic.

import { supabase } from '@/lib/supabase'
import { fetchProjects } from '@/modules/ProjectHub/projectService'
import { fetchSupportIssues, fetchProductsFromProjectHub as fetchSupportProducts } from '@/modules/SupportIssueTracker/supportTrackerService'
import { fetchReleaseTasks, fetchProductsFromProjectHub as fetchReleaseProducts } from '@/modules/ReleaseTaskTracker/releaseTrackerService'
import type { ParsedQuery, SupportIssueRow, ReleaseTaskRow, QAReportRow, ProjectRow, PandaResponse, SummaryCard, CrossModuleGroup } from '../types/pandaTypes'
import type { PandaAccessContext } from '../permissions/pandaAccessControl'
import { canAccessSupportTracker, canAccessReleaseTracker, canAccessQAReport, canAccessProjectHub } from '../permissions/pandaAccessControl'

const PAGE_SIZE = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

function isInDateRange(dateStr: string | null | undefined, start: string, end: string): boolean {
  if (!dateStr) return false
  const d = dateStr.split('T')[0]
  return d >= start && d < end
}

function matchesStatus(status: string, filters: string[] | undefined): boolean {
  if (!filters || filters.length === 0) return true
  const s = status.toLowerCase()
  return filters.some(f => {
    if (f === 'open') {
      return !['completed', 'cancelled'].includes(s)
    }
    return s === f.toLowerCase()
  })
}

function matchesPriority(priority: string | undefined, filters: string[] | undefined): boolean {
  if (!filters || filters.length === 0) return true
  if (!priority) return false
  return filters.some(f => priority.toLowerCase() === f.toLowerCase())
}

// ── Support Issues ────────────────────────────────────────────────────────────

export async function getSupportIssues(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  if (!canAccessSupportTracker(ctx)) {
    return { type: 'ERROR_STATE', errorMessage: "You don't have permission to access Support Tracker." }
  }

  try {
    const products = await fetchSupportProducts()
    const allIssues = await fetchSupportIssues(products)

    let filtered = allIssues

    // Project filter
    if (query.filters.projectId) {
      filtered = filtered.filter(i => i.project_id === query.filters.projectId)
    } else if (query.filters.projectName) {
      const pn = query.filters.projectName.toLowerCase()
      filtered = filtered.filter(i => i.product_name.toLowerCase().includes(pn))
    }

    // Status filter
    if (query.filters.status && query.filters.status.length > 0) {
      filtered = filtered.filter(i => matchesStatus(i.testing_status, query.filters.status))
    } else if (query.intent === 'GET_OPEN_ISSUES' || query.intent === 'GET_SUPPORT_ISSUES') {
      // Default: show open issues
      filtered = filtered.filter(i => !['Completed', 'Cancelled'].includes(i.testing_status))
    }

    // Priority filter (support issues don't have priority field, skip)

    // Date filter
    if (query.filters.dateRange) {
      const { start, end } = query.filters.dateRange
      const field = query.filters.dateField ?? 'received'
      filtered = filtered.filter(i => {
        const dateStr = field === 'updated' ? i.updated_at : i.received_date
        return isInDateRange(dateStr, start, end)
      })
    }

    // Issue ID filter
    if (query.filters.issueId) {
      const id = query.filters.issueId.toUpperCase()
      filtered = filtered.filter(i => i.issue_id.toUpperCase() === id)
    }

    // Keyword filter
    if (query.filters.keyword) {
      const kw = query.filters.keyword.toLowerCase()
      filtered = filtered.filter(i =>
        i.description.toLowerCase().includes(kw) ||
        i.issue_id.toLowerCase().includes(kw) ||
        i.product_name.toLowerCase().includes(kw)
      )
    }

    // Critical issues shortcut
    if (query.intent === 'GET_CRITICAL_ISSUES') {
      filtered = filtered.filter(i => i.testing_status === 'Blocked' || i.testing_status === 'In Testing')
    }

    const total = filtered.length
    const page = filtered.slice(0, PAGE_SIZE)

    const rows: SupportIssueRow[] = page.map(i => ({
      id: i.id,
      issue_id: i.issue_id,
      description: i.description,
      testing_status: i.testing_status,
      tester_name: i.tester_name,
      product_name: i.product_name,
      received_date: i.received_date,
      updated_at: i.updated_at,
      estimated_hours: Number(i.estimated_hours) || 0,
      actual_hours: Number(i.actual_hours) || 0,
      project_id: i.project_id,
    }))

    // Summary cards
    const open = allIssues.filter(i => !['Completed', 'Cancelled'].includes(i.testing_status)).length
    const blocked = allIssues.filter(i => i.testing_status === 'Blocked').length
    const completed = allIssues.filter(i => i.testing_status === 'Completed').length

    const summaryCards: SummaryCard[] = [
      { label: 'Total Shown', value: total, color: 'blue' },
      { label: 'Open', value: open, color: 'amber' },
      { label: 'Blocked', value: blocked, color: 'red' },
      { label: 'Completed', value: completed, color: 'green' },
    ]

    if (rows.length === 0) {
      return {
        type: 'EMPTY_STATE',
        emptyMessage: 'No support issues found matching your filters.',
        summaryCards,
      }
    }

    return {
      type: 'DATA_TABLE',
      title: 'Support Issues',
      summaryCards,
      supportIssues: rows,
      totalCount: total,
      hasMore: total > PAGE_SIZE,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to retrieve support issues. ${err?.message || ''}` }
  }
}

// ── Release Tasks ─────────────────────────────────────────────────────────────

export async function getReleaseTasks(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  if (!canAccessReleaseTracker(ctx)) {
    return { type: 'ERROR_STATE', errorMessage: "You don't have permission to access Release Tracker." }
  }

  try {
    const products = await fetchReleaseProducts()
    const allTasks = await fetchReleaseTasks(products)

    let filtered = allTasks.filter(t => !t.is_deleted)

    // Project filter
    if (query.filters.projectId) {
      filtered = filtered.filter(t => t.project_id === query.filters.projectId)
    } else if (query.filters.projectName) {
      const pn = query.filters.projectName.toLowerCase()
      filtered = filtered.filter(t => t.product_name.toLowerCase().includes(pn))
    }

    // Status filter
    if (query.filters.status && query.filters.status.length > 0) {
      filtered = filtered.filter(t => matchesStatus(t.task_status, query.filters.status))
    } else if (query.intent === 'GET_PENDING_RELEASES') {
      filtered = filtered.filter(t => ['Not Started', 'Assigned', 'In Progress'].includes(t.task_status))
    } else if (query.intent === 'GET_RELEASE_STATUS') {
      filtered = filtered.filter(t => !['Completed', 'Cancelled'].includes(t.task_status))
    }

    // Priority filter
    if (query.filters.priority && query.filters.priority.length > 0) {
      filtered = filtered.filter(t => matchesPriority(t.priority, query.filters.priority))
    }

    // Date filter
    if (query.filters.dateRange) {
      const { start, end } = query.filters.dateRange
      filtered = filtered.filter(t => {
        const dateStr = query.filters.dateField === 'updated' ? t.updated_at : (t.start_date ?? t.updated_at)
        return isInDateRange(dateStr, start, end)
      })
    }

    // Issue ID filter
    if (query.filters.issueId) {
      const id = query.filters.issueId.toUpperCase()
      filtered = filtered.filter(t => t.task_id.toUpperCase() === id)
    }

    // Keyword filter
    if (query.filters.keyword) {
      const kw = query.filters.keyword.toLowerCase()
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(kw) ||
        t.task_id.toLowerCase().includes(kw) ||
        t.release_version.toLowerCase().includes(kw) ||
        t.product_name.toLowerCase().includes(kw)
      )
    }

    const total = filtered.length
    const page = filtered.slice(0, PAGE_SIZE)

    const rows: ReleaseTaskRow[] = page.map(t => ({
      id: t.id,
      task_id: t.task_id,
      description: t.description,
      task_status: t.task_status,
      assigned_to_name: t.assigned_to_name,
      product_name: t.product_name,
      release_version: t.release_version,
      target_date: t.target_date,
      updated_at: t.updated_at,
      estimated_hours: Number(t.estimated_hours) || 0,
      actual_hours: Number(t.actual_hours) || 0,
      project_id: t.project_id,
    }))

    const pending = allTasks.filter(t => !t.is_deleted && ['Not Started', 'Assigned', 'In Progress'].includes(t.task_status)).length
    const blocked = allTasks.filter(t => !t.is_deleted && t.task_status === 'Blocked').length
    const completed = allTasks.filter(t => !t.is_deleted && t.task_status === 'Completed').length

    const summaryCards: SummaryCard[] = [
      { label: 'Total Shown', value: total, color: 'blue' },
      { label: 'Pending', value: pending, color: 'amber' },
      { label: 'Blocked', value: blocked, color: 'red' },
      { label: 'Completed', value: completed, color: 'green' },
    ]

    if (rows.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: 'No release tasks found matching your filters.', summaryCards }
    }

    return {
      type: 'DATA_TABLE',
      title: 'Release Tasks',
      summaryCards,
      releaseTasks: rows,
      totalCount: total,
      hasMore: total > PAGE_SIZE,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to retrieve release tasks. ${err?.message || ''}` }
  }
}

// ── QA Reports ────────────────────────────────────────────────────────────────

export async function getQAReports(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  if (!canAccessQAReport(ctx)) {
    return { type: 'ERROR_STATE', errorMessage: "You don't have permission to access QA Reports." }
  }

  try {
    let dbQuery = supabase
      .from('weekly_reports')
      .select('id, week, project, project_id, generated_date, created_by, status, form_data')
      .order('generated_date', { ascending: false })
      .limit(50)

    if (query.filters.projectId) {
      dbQuery = dbQuery.eq('project_id', query.filters.projectId)
    } else if (query.filters.projectName) {
      dbQuery = dbQuery.ilike('project', `%${query.filters.projectName}%`)
    }

    if (query.filters.dateRange) {
      const { start, end } = query.filters.dateRange
      dbQuery = dbQuery.gte('generated_date', start).lt('generated_date', end)
    }

    const { data, error } = await dbQuery
    if (error) throw error

    const reports: QAReportRow[] = (data || []).map((r: any) => ({
      id: r.id,
      week: r.week,
      project: r.project,
      projectId: r.project_id,
      generatedDate: r.generated_date,
      createdBy: r.created_by,
      status: r.status as 'Draft' | 'Final',
      name: r.form_data?.__reportName || undefined,
    }))

    if (reports.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: 'No QA reports found.' }
    }

    return {
      type: 'DATA_TABLE',
      title: 'QA Weekly Reports',
      qaReports: reports,
      totalCount: reports.length,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to retrieve QA reports. ${err?.message || ''}` }
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  if (!canAccessProjectHub(ctx)) {
    return { type: 'ERROR_STATE', errorMessage: "You don't have permission to access Project Hub." }
  }

  try {
    const projects = await fetchProjects({ status: ['active'] })

    const rows: ProjectRow[] = projects.map(p => ({
      id: p.id,
      name: p.name,
      project_code: p.project_code || '',
      status: p.status,
      description: p.description || '',
      member_count: p.member_count || 0,
    }))

    if (rows.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: 'No active projects found.' }
    }

    const summaryCards: SummaryCard[] = [
      { label: 'Active Projects', value: rows.length, color: 'green' },
    ]

    return {
      type: 'PROJECT_OVERVIEW',
      title: 'Active Projects',
      summaryCards,
      projects: rows,
      totalCount: rows.length,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to retrieve projects. ${err?.message || ''}` }
  }
}

// ── Today's Summary ───────────────────────────────────────────────────────────

export async function getTodaysSummary(
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const cards: SummaryCard[] = []

  try {
    const [supportProducts, releaseProducts] = await Promise.all([
      fetchSupportProducts().catch(() => []),
      fetchReleaseProducts().catch(() => []),
    ])

    const [allIssues, allTasks] = await Promise.all([
      canAccessSupportTracker(ctx) ? fetchSupportIssues(supportProducts).catch(() => []) : Promise.resolve([]),
      canAccessReleaseTracker(ctx) ? fetchReleaseTasks(releaseProducts).catch(() => []) : Promise.resolve([]),
    ])

    if (canAccessSupportTracker(ctx)) {
      const openIssues = allIssues.filter(i => !['Completed', 'Cancelled'].includes(i.testing_status))
      const blockedIssues = allIssues.filter(i => i.testing_status === 'Blocked')
      const todayIssues = allIssues.filter(i => isInDateRange(i.received_date, today, tomorrow))
      cards.push(
        { label: 'Open Support Issues', value: openIssues.length, color: openIssues.length > 0 ? 'amber' : 'green' },
        { label: 'Blocked Issues', value: blockedIssues.length, color: blockedIssues.length > 0 ? 'red' : 'green' },
        { label: 'Received Today', value: todayIssues.length, color: 'blue' },
      )
    }

    if (canAccessReleaseTracker(ctx)) {
      const activeTasks = allTasks.filter(t => !t.is_deleted && ['In Progress', 'Assigned'].includes(t.task_status))
      const blockedTasks = allTasks.filter(t => !t.is_deleted && t.task_status === 'Blocked')
      cards.push(
        { label: 'Active Release Tasks', value: activeTasks.length, color: activeTasks.length > 0 ? 'purple' : 'green' },
        { label: 'Blocked Tasks', value: blockedTasks.length, color: blockedTasks.length > 0 ? 'red' : 'green' },
      )
    }

    if (cards.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: 'No data available for your workspace.' }
    }

    return {
      type: 'SUMMARY_CARDS',
      title: "Today's Workspace Summary",
      subtitle: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      summaryCards: cards,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to load workspace summary. ${err?.message || ''}` }
  }
}

// ── My Tasks ──────────────────────────────────────────────────────────────────

export async function getMyTasks(
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  const { userId } = ctx
  if (!userId) {
    return { type: 'ERROR_STATE', errorMessage: 'Not authenticated.' }
  }

  try {
    const [supportProducts, releaseProducts] = await Promise.all([
      fetchSupportProducts().catch(() => []),
      fetchReleaseProducts().catch(() => []),
    ])

    const [allIssues, allTasks] = await Promise.all([
      canAccessSupportTracker(ctx) ? fetchSupportIssues(supportProducts).catch(() => []) : Promise.resolve([]),
      canAccessReleaseTracker(ctx) ? fetchReleaseTasks(releaseProducts).catch(() => []) : Promise.resolve([]),
    ])

    // Get user's name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single()
    const userName = (profile?.full_name || '').toLowerCase()

    const myIssues = allIssues.filter(i =>
      !['Completed', 'Cancelled'].includes(i.testing_status) &&
      (i.tester_name?.toLowerCase().includes(userName) || false)
    )

    const myTasks = allTasks.filter(t =>
      !t.is_deleted &&
      !['Completed', 'Cancelled'].includes(t.task_status) &&
      (t.assigned_to_user_id === userId || t.assigned_to_name?.toLowerCase().includes(userName))
    )

    const issueRows: SupportIssueRow[] = myIssues.slice(0, PAGE_SIZE).map(i => ({
      id: i.id, issue_id: i.issue_id, description: i.description,
      testing_status: i.testing_status, tester_name: i.tester_name,
      product_name: i.product_name, received_date: i.received_date,
      updated_at: i.updated_at, estimated_hours: Number(i.estimated_hours) || 0,
      actual_hours: Number(i.actual_hours) || 0, project_id: i.project_id,
    }))

    const taskRows: ReleaseTaskRow[] = myTasks.slice(0, PAGE_SIZE).map(t => ({
      id: t.id, task_id: t.task_id, description: t.description,
      task_status: t.task_status, assigned_to_name: t.assigned_to_name,
      product_name: t.product_name, release_version: t.release_version,
      target_date: t.target_date, updated_at: t.updated_at,
      estimated_hours: Number(t.estimated_hours) || 0,
      actual_hours: Number(t.actual_hours) || 0, project_id: t.project_id,
    }))

    const summaryCards: SummaryCard[] = [
      { label: 'My Support Issues', value: myIssues.length, color: 'amber' },
      { label: 'My Release Tasks', value: myTasks.length, color: 'purple' },
    ]

    if (issueRows.length === 0 && taskRows.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: 'No active tasks assigned to you.', summaryCards }
    }

    return {
      type: 'DATA_TABLE',
      title: 'My Active Tasks',
      summaryCards,
      supportIssues: issueRows.length > 0 ? issueRows : undefined,
      releaseTasks: taskRows.length > 0 ? taskRows : undefined,
      totalCount: myIssues.length + myTasks.length,
    }
  } catch (err: any) {
    return { type: 'ERROR_STATE', errorMessage: `Unable to retrieve your tasks. ${err?.message || ''}` }
  }
}

// ── Cross-Module Search ───────────────────────────────────────────────────────

export async function searchAcrossModules(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  const keyword = query.filters.keyword || query.filters.issueId || query.raw
  if (!keyword || keyword.length < 2) {
    return { type: 'ERROR_STATE', errorMessage: 'Please provide a search term.' }
  }

  const kw = keyword.toLowerCase()
  const groups: CrossModuleGroup[] = []

  const [supportProducts, releaseProducts] = await Promise.all([
    fetchSupportProducts().catch(() => []),
    fetchReleaseProducts().catch(() => []),
  ])

  const [allIssues, allTasks, qaReportsRes] = await Promise.all([
    canAccessSupportTracker(ctx) ? fetchSupportIssues(supportProducts).catch(() => []) : Promise.resolve([]),
    canAccessReleaseTracker(ctx) ? fetchReleaseTasks(releaseProducts).catch(() => []) : Promise.resolve([]),
    canAccessQAReport(ctx)
      ? supabase.from('weekly_reports').select('id, week, project, project_id, generated_date, status').ilike('project', `%${kw}%`).limit(10)
      : Promise.resolve({ data: [], error: null }),
  ])

  // Support issues
  if (canAccessSupportTracker(ctx)) {
    const matched = allIssues.filter(i =>
      i.description.toLowerCase().includes(kw) ||
      i.issue_id.toLowerCase().includes(kw) ||
      i.product_name.toLowerCase().includes(kw)
    ).slice(0, 5)

    if (matched.length > 0) {
      groups.push({
        module: 'Support Tracker',
        moduleKey: 'support-tracker',
        route: '/support-tracker',
        count: matched.length,
        items: matched.map(i => ({
          id: i.id,
          title: i.issue_id,
          subtitle: i.description.slice(0, 80),
          status: i.testing_status,
          route: `/support-tracker`,
        })),
      })
    }
  }

  // Release tasks
  if (canAccessReleaseTracker(ctx)) {
    const matched = allTasks.filter(t =>
      !t.is_deleted && (
        t.description.toLowerCase().includes(kw) ||
        t.task_id.toLowerCase().includes(kw) ||
        t.release_version.toLowerCase().includes(kw) ||
        t.product_name.toLowerCase().includes(kw)
      )
    ).slice(0, 5)

    if (matched.length > 0) {
      groups.push({
        module: 'Release Tracker',
        moduleKey: 'release-tracker',
        route: '/release-tracker',
        count: matched.length,
        items: matched.map(t => ({
          id: t.id,
          title: t.task_id,
          subtitle: `${t.release_version} — ${t.description.slice(0, 60)}`,
          status: t.task_status,
          route: `/release-tracker`,
        })),
      })
    }
  }

  // QA Reports
  if (canAccessQAReport(ctx) && qaReportsRes.data && qaReportsRes.data.length > 0) {
    groups.push({
      module: 'QA Reports',
      moduleKey: 'qa-report',
      route: '/qa-report',
      count: qaReportsRes.data.length,
      items: (qaReportsRes.data as any[]).map(r => ({
        id: r.id,
        title: r.project,
        subtitle: `Week: ${r.week} · ${r.status}`,
        status: r.status,
        route: `/qa-report`,
      })),
    })
  }

  if (groups.length === 0) {
    return {
      type: 'EMPTY_STATE',
      emptyMessage: `No results found for "${keyword}" across accessible modules.`,
    }
  }

  return {
    type: 'CROSS_MODULE_RESULTS',
    title: `Search Results for "${keyword}"`,
    crossModuleGroups: groups,
    totalCount: groups.reduce((sum, g) => sum + g.count, 0),
  }
}

// ── Issue by ID ───────────────────────────────────────────────────────────────

export async function getIssueById(
  query: ParsedQuery,
  ctx: PandaAccessContext
): Promise<PandaResponse> {
  const issueId = query.filters.issueId
  if (!issueId) {
    return { type: 'ERROR_STATE', errorMessage: 'No issue ID detected in your query.' }
  }

  if (issueId.startsWith('SUP-') && canAccessSupportTracker(ctx)) {
    const products = await fetchSupportProducts()
    const allIssues = await fetchSupportIssues(products)
    const found = allIssues.filter(i => i.issue_id.toUpperCase() === issueId.toUpperCase())
    if (found.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: `Issue ${issueId} not found.` }
    }
    return {
      type: 'DATA_TABLE',
      title: `Issue ${issueId}`,
      supportIssues: found.map(i => ({
        id: i.id, issue_id: i.issue_id, description: i.description,
        testing_status: i.testing_status, tester_name: i.tester_name,
        product_name: i.product_name, received_date: i.received_date,
        updated_at: i.updated_at, estimated_hours: Number(i.estimated_hours) || 0,
        actual_hours: Number(i.actual_hours) || 0, project_id: i.project_id,
      })),
      totalCount: found.length,
    }
  }

  if (issueId.startsWith('REL-') && canAccessReleaseTracker(ctx)) {
    const products = await fetchReleaseProducts()
    const allTasks = await fetchReleaseTasks(products)
    const found = allTasks.filter(t => t.task_id.toUpperCase() === issueId.toUpperCase())
    if (found.length === 0) {
      return { type: 'EMPTY_STATE', emptyMessage: `Task ${issueId} not found.` }
    }
    return {
      type: 'DATA_TABLE',
      title: `Task ${issueId}`,
      releaseTasks: found.map(t => ({
        id: t.id, task_id: t.task_id, description: t.description,
        task_status: t.task_status, assigned_to_name: t.assigned_to_name,
        product_name: t.product_name, release_version: t.release_version,
        target_date: t.target_date, updated_at: t.updated_at,
        estimated_hours: Number(t.estimated_hours) || 0,
        actual_hours: Number(t.actual_hours) || 0, project_id: t.project_id,
      })),
      totalCount: found.length,
    }
  }

  return { type: 'ERROR_STATE', errorMessage: `You don't have permission to access ${issueId}.` }
}
