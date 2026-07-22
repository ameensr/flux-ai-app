export type SupportStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed'

export const isSupportStatus = (status: string): status is SupportStatus => {
  return ['Open', 'In Progress', 'Resolved', 'Closed'].includes(status)
}

export interface SupportTicket {
  id: string
  taskId: string
  description: string
  assignedQA: string
  status: SupportStatus
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  remarks: string
  // Values for QA Daily Update columns mapped to "Create New" during
  // Import from DUP, keyed by the DUP column's stable internal_key (never by
  // its editable display name, so a later rename doesn't break the mapping).
  customFields?: Record<string, any>
}

export type ReleaseStatus = 'Not Started' | 'In Progress' | 'Pass' | 'Fail' | 'Blocked'

export const isReleaseStatus = (status: string): status is ReleaseStatus => {
  return ['Not Started', 'In Progress', 'Pass', 'Fail', 'Blocked'].includes(status)
}

export interface ReleaseItem {
  id: string
  taskId: string
  featureName: string
  assignee: string
  status: ReleaseStatus
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  remarks: string
  // Values for QA Daily Update columns mapped to "Create New" during
  // Import from DUP, keyed by the DUP column's stable internal_key.
  customFields?: Record<string, any>
}

export interface ProductionIssueBlock {
  escapedIssue: number
  supportFix: number
  support: number
  changeRequest: number
  dataIssue: number
  backendUpdation: number
  completedCR?: number
}

export interface DefectMetrics {
  reported: number
  open: number
  fixed: number
  closed: number
}

export interface HistoricalDefectOptimization {
  previousFixedBugCount: number
  latestFixedBugCount: number
  trackingSince: string
  reducedBugs?: number
  improvementPercentage?: number
  executiveSummary?: string
}

export interface HistoricalDefect {
  id: string
  metric: string
  previous: number
  latest: number
}

export interface NextPriority {
  id: string
  title: string
  description: string
  owner: string
  dueDate: string
}

export interface TimelineNode {
  id: string
  week: string
  healthScore: number
  emails: number
  features: number
  fixes: number
  openDefects: number
  closedDefects: number
  emailChange?: string
  rawForm?: QAReportForm
}

export interface ProjectConfig {
  id?: string
  projectName: string
  projectCode: string
  description?: string
  status: 'Active' | 'Inactive'
  isActive: boolean
  createdBy?: string
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface QAReportForm {
  projectId?: string
  projectName: string
  reportTitle: string
  weekStart: string
  weekEnd: string
  subtitle: string
  supportEmails: number
  newFeatures: number
  codeFixes: number
  lastWeek: ProductionIssueBlock
  monthToDate: ProductionIssueBlock
  newFeatureTeam: string[]
  supportTeam: string[]
  automationTeam: string[]
  supportTickets: SupportTicket[]
  releaseItems: ReleaseItem[]
  releaseBugStatus?: any // ReleaseBugAnalytics — stored as JSON
  teamCapacity?: any // TeamCapacityData — stored as JSON
  defectsLastWeek: DefectMetrics
  defectsMTD: DefectMetrics
  historicalDefectOptimization?: HistoricalDefectOptimization
  historicalDefects: HistoricalDefect[]
  nextPriorities: NextPriority[]
  showHistoricalAnalytics?: boolean
  showTimeline?: boolean
  customTimeline?: TimelineNode[]
  dashboardSections?: Record<string, boolean>
  visibleSupportColumns?: Record<string, boolean> // Column visibility state for Support Log
  visibleReleaseColumns?: Record<string, boolean> // Column visibility state for Release Testing
}

export interface SavedReport {
  id: string
  week: string
  project: string
  projectId?: string
  generatedDate: string
  createdBy: string
  markdown: string
  form: QAReportForm
  status: 'Draft' | 'Final'
}

export const ensureFormData = (form: any): QAReportForm => {
  const f = form || {}
  return {
    projectId: f.projectId || '',
    projectName: f.projectName || '',
    reportTitle: f.reportTitle || 'Weekly QA Status Report',
    weekStart: f.weekStart || '',
    weekEnd: f.weekEnd || '',
    subtitle: f.subtitle || '',
    supportEmails: Number(f.supportEmails) || 0,
    newFeatures: Number(f.newFeatures) || 0,
    codeFixes: Number(f.codeFixes) || 0,
    lastWeek: {
      escapedIssue: Number(f.lastWeek?.escapedIssue ?? f.lastWeek?.codeFix) || 0,
      supportFix: Number(f.lastWeek?.supportFix) || 0,
      changeRequest: Number(f.lastWeek?.changeRequest) || 0,
      dataIssue: Number(f.lastWeek?.dataIssue) || 0,
      backendUpdation: Number(f.lastWeek?.backendUpdation) || 0,
      completedCR: Number(f.lastWeek?.completedCR) || 0,
      support: (Number(f.lastWeek?.escapedIssue ?? f.lastWeek?.codeFix) || 0) +
        (Number(f.lastWeek?.supportFix) || 0) +
        (Number(f.lastWeek?.changeRequest) || 0) +
        (Number(f.lastWeek?.dataIssue) || 0) +
        (Number(f.lastWeek?.backendUpdation) || 0),
    },
    monthToDate: {
      escapedIssue: Number(f.monthToDate?.escapedIssue ?? f.monthToDate?.codeFix) || 0,
      supportFix: Number(f.monthToDate?.supportFix) || 0,
      changeRequest: Number(f.monthToDate?.changeRequest) || 0,
      completedCR: Number(f.monthToDate?.completedCR) || 0,
      dataIssue: Number(f.monthToDate?.dataIssue) || 0,
      backendUpdation: Number(f.monthToDate?.backendUpdation) || 0,
      support: (Number(f.monthToDate?.escapedIssue ?? f.monthToDate?.codeFix) || 0) +
        (Number(f.monthToDate?.supportFix) || 0) +
        (Number(f.monthToDate?.changeRequest) || 0) +
        (Number(f.monthToDate?.completedCR) || 0) +
        (Number(f.monthToDate?.dataIssue) || 0) +
        (Number(f.monthToDate?.backendUpdation) || 0),
    },
    newFeatureTeam: Array.isArray(f.newFeatureTeam) ? f.newFeatureTeam.filter(Boolean) : [],
    supportTeam: Array.isArray(f.supportTeam) ? f.supportTeam.filter(Boolean) : [],
    automationTeam: Array.isArray(f.automationTeam) ? f.automationTeam.filter(Boolean) : [],
    supportTickets: Array.isArray(f.supportTickets) ? f.supportTickets.filter(Boolean).map((t: any) => ({
      id: t?.id || crypto.randomUUID(),
      taskId: t?.taskId || '',
      description: t?.description || '',
      assignedQA: t?.assignedQA || '',
      status: t?.status || 'Open',
      priority: t?.priority || 'Medium',
      remarks: t?.remarks || '',
      customFields: t?.customFields || undefined
    })) : [],
    releaseItems: Array.isArray(f.releaseItems) ? f.releaseItems.filter(Boolean).map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      taskId: item?.taskId || '',
      featureName: item?.featureName || '',
      assignee: item?.assignee || '',
      status: item?.status || 'Not Started',
      priority: item?.priority || 'Medium',
      remarks: item?.remarks || '',
      customFields: item?.customFields || undefined
    })) : [],
    releaseBugStatus: f.releaseBugStatus || null,
    teamCapacity: f.teamCapacity || null,
    defectsLastWeek: {
      reported: Number(f.defectsLastWeek?.reported) || 0,
      open: Number(f.defectsLastWeek?.open) || 0,
      fixed: Number(f.defectsLastWeek?.fixed) || 0,
      closed: Number(f.defectsLastWeek?.closed) || 0,
    },
    defectsMTD: {
      reported: Number(f.defectsMTD?.reported) || 0,
      open: Number(f.defectsMTD?.open) || 0,
      fixed: Number(f.defectsMTD?.fixed) || 0,
      closed: Number(f.defectsMTD?.closed) || 0,
    },
    historicalDefectOptimization: f.historicalDefectOptimization ? {
      previousFixedBugCount: Number(f.historicalDefectOptimization.previousFixedBugCount) || 0,
      latestFixedBugCount: Number(f.historicalDefectOptimization.latestFixedBugCount) || 0,
      trackingSince: f.historicalDefectOptimization.trackingSince || '',
      reducedBugs: Number(f.historicalDefectOptimization.reducedBugs) || undefined,
      improvementPercentage: Number(f.historicalDefectOptimization.improvementPercentage) || undefined,
      executiveSummary: f.historicalDefectOptimization.executiveSummary || undefined,
    } : undefined,
    historicalDefects: Array.isArray(f.historicalDefects) ? f.historicalDefects.filter(Boolean).map((hd: any) => ({
      id: hd?.id || crypto.randomUUID(),
      metric: hd?.metric || '',
      previous: Number(hd?.previous) || 0,
      latest: Number(hd?.latest) || 0
    })) : [],
    nextPriorities: Array.isArray(f.nextPriorities) ? f.nextPriorities.filter(Boolean).map((np: any) => ({
      id: np?.id || crypto.randomUUID(),
      title: np?.title || '',
      description: np?.description || '',
      owner: np?.owner || '',
      dueDate: np?.dueDate || ''
    })) : [],
    showHistoricalAnalytics: f.showHistoricalAnalytics !== false,
    showTimeline: f.showTimeline !== false,
    customTimeline: Array.isArray(f.customTimeline) ? f.customTimeline.filter(Boolean).map((t: any) => ({
      id: t?.id || crypto.randomUUID(),
      week: t?.week || '',
      healthScore: Number(t?.healthScore) || 0,
      emails: Number(t?.emails) || 0,
      features: Number(t?.features) || 0,
      fixes: Number(t?.fixes) || 0,
      openDefects: Number(t?.openDefects) || 0,
      closedDefects: Number(t?.closedDefects) || 0,
      emailChange: t?.emailChange || '➜',
      rawForm: t?.rawForm
    })) : [],
    dashboardSections: f.dashboardSections || null,
    visibleSupportColumns: f.visibleSupportColumns || undefined,
    visibleReleaseColumns: f.visibleReleaseColumns || undefined,
  }
}

export function canonicalStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj).sort();
    const parts = keys.map(k => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
    return '{' + parts.join(',') + '}';
  }
  return JSON.stringify(obj);
}

export function createFormSnapshot(form: QAReportForm): string {
  const normalized = ensureFormData(form)
  const snapshot = { ...normalized }
  delete (snapshot as any).dashboardSections // Exclude display preferences
  delete (snapshot as any).showHistoricalAnalytics
  delete (snapshot as any).showTimeline
  delete (snapshot as any).visibleSupportColumns
  delete (snapshot as any).visibleReleaseColumns
  return canonicalStringify(snapshot)
}

export function isPassStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return ['passed', 'pass', 'completed', 'success'].some(v => normalized.includes(v))
}

export function isFailStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return ['fail', 'failed', 'failure'].some(v => normalized.includes(v))
}

export function isBlockedStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const normalized = status.toLowerCase()
  return normalized.includes('blocked')
}
