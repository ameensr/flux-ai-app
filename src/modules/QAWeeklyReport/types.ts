export interface SupportTicket {
  id: string
  taskId: string
  description: string
  assignedQA: string
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  remarks: string
}

export interface ReleaseItem {
  id: string
  taskId: string
  featureName: string
  assignee: string
  status: 'Not Started' | 'In Progress' | 'Pass' | 'Fail' | 'Blocked'
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  remarks: string
}

export interface ProductionIssueBlock {
  codeFix: number
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

export interface QAReportForm {
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
  defectsLastWeek: DefectMetrics
  defectsMTD: DefectMetrics
  historicalDefects: HistoricalDefect[]
  nextPriorities: NextPriority[]
  showAIInsights?: boolean
  showAISummary?: boolean
  showHistoricalAnalytics?: boolean
  showTimeline?: boolean
  customTimeline?: TimelineNode[]
}

export interface SavedReport {
  id: string
  week: string
  project: string
  generatedDate: string
  createdBy: string
  markdown: string
  form: QAReportForm
  status: 'Draft' | 'Final'
}

export const ensureFormData = (form: any): QAReportForm => {
  const f = form || {}
  return {
    projectName: f.projectName || '',
    reportTitle: f.reportTitle || 'Weekly QA Status Report',
    weekStart: f.weekStart || '',
    weekEnd: f.weekEnd || '',
    subtitle: f.subtitle || '',
    supportEmails: Number(f.supportEmails) || 0,
    newFeatures: Number(f.newFeatures) || 0,
    codeFixes: Number(f.codeFixes) || 0,
    lastWeek: {
      codeFix: Number(f.lastWeek?.codeFix) || 0,
      support: Number(f.lastWeek?.support) || 0,
      changeRequest: Number(f.lastWeek?.changeRequest) || 0,
      dataIssue: Number(f.lastWeek?.dataIssue) || 0,
      backendUpdation: Number(f.lastWeek?.backendUpdation) || 0,
      completedCR: Number(f.lastWeek?.completedCR) || 0,
    },
    monthToDate: {
      codeFix: Number(f.monthToDate?.codeFix) || 0,
      support: Number(f.monthToDate?.support) || 0,
      changeRequest: Number(f.monthToDate?.changeRequest) || 0,
      completedCR: Number(f.monthToDate?.completedCR) || 0,
      dataIssue: Number(f.monthToDate?.dataIssue) || 0,
      backendUpdation: Number(f.monthToDate?.backendUpdation) || 0,
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
      remarks: t?.remarks || ''
    })) : [],
    releaseItems: Array.isArray(f.releaseItems) ? f.releaseItems.filter(Boolean).map((item: any) => ({
      id: item?.id || crypto.randomUUID(),
      taskId: item?.taskId || '',
      featureName: item?.featureName || '',
      assignee: item?.assignee || '',
      status: item?.status || 'Not Started',
      priority: item?.priority || 'Medium',
      remarks: item?.remarks || ''
    })) : [],
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
    showAIInsights: f.showAIInsights !== false,
    showAISummary: f.showAISummary !== false,
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
  }
}
