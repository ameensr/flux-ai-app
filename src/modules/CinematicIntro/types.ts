// src/modules/CinematicIntro/types.ts

export type IntroScene =
  | 'scene_01_init'
  | 'scene_02_platform'
  | 'scene_03_team'
  | 'scene_04_hologram'
  | 'scene_05_reveal'
  | 'scene_06_interactive'

// ── 1. Support Emails Section
export interface SupportEmailsSection {
  count: number
  productionIssues: number
  fixesForValidation: number
  escapedDefects: number
  totalSupport: number
  slaRate: number
  avgResponseHours?: number
}

// ── 2. New Release Features Section
export interface NewReleaseFeaturesSection {
  count: number
  items: Array<{
    id: string
    taskId: string
    featureName: string
    assignee: string
    status: string
    priority: string
  }>
  passCount: number
  inProgressCount: number
  failCount: number
}

// ── 3. Support Fix Testing Section
export interface SupportFixTestingSection {
  count: number
  fixesForValidation: number
  verifiedCount: number
  pendingCount: number
  reductionRate: number
}

// ── 4. Release Testing Status Section
export interface ReleaseTestingStatusSection {
  totalBugs: number
  blockers: number
  critical: number
  major: number
  minor: number
  passRate: number
  readinessStatus: 'Ready' | 'Caution' | 'Blocked' | 'In Progress'
  releaseSummary: string
}

// ── 5. Task-Wise Status Section
export interface TaskWiseStatusSection {
  totalTasks: number
  completed: number
  inProgress: number
  blocked: number
  tasks: Array<{
    id: string
    name: string
    assignee: string
    status: string
    priority?: string
  }>
  assignees: Array<{
    name: string
    assignedCount: number
    completedCount: number
  }>
}

// ── 6. Support & Exception Log Section
export interface SupportExceptionLogSection {
  totalTickets: number
  openCount: number
  inProgressCount: number
  resolvedCount: number
  criticalCount: number
  tickets: Array<{
    id: string
    taskId: string
    description: string
    assignedQA: string
    status: string
    priority: string
    remarks?: string
  }>
}

// ── 7. Team Capacity Overview Section
export interface TeamCapacitySection {
  overallCapacityPercent: number
  totalAvailableDays: number
  totalLeaves: number
  totalMembers: number
  members: Array<{
    name: string
    role: string
    availableDays: number
    capacityPercent: number
    leaves: number
  }>
}

// ── 8. Weekly Charts & Distribution Section
export interface WeeklyChartsSection {
  reported: number
  open: number
  fixed: number
  closed: number
  mtdReported: number
  mtdClosed: number
  resolutionRate: number
  severityBreakdown: Array<{
    label: string
    count: number
    color: string
    pct: number
  }>
  dailyTrends: Array<{
    day: string
    defects: number
    fixes: number
  }>
}

// ── 9. Team Resource Allocation Section
export interface TeamResourceAllocationSection {
  featureTeam: string[]
  supportTeam: string[]
  automationTeam: string[]
  totalEngineers: number
  distribution: Array<{
    team: string
    count: number
    percent: number
    color: string
    members: string[]
  }>
}

// ── 10. Next Week Priorities Section
export interface NextWeekPrioritiesSection {
  priorities: Array<{
    id: string
    title: string
    description: string
    owner: string
    dueDate: string
  }>
}

export interface CinematicProjectData {
  projectId: string
  projectName: string
  projectCode: string
  description?: string
  meetingWith?: string
  reportTitle?: string
  status: 'active' | 'archived' | 'completed' | 'planning'
  qaEngineersCount: number
  teamMembers: Array<{
    id: string
    name: string
    role: string
    email: string
    avatarUrl?: string
  }>
  metrics: {
    activeBugs: number
    criticalBugs: number
    highBugs: number
    mediumBugs: number
    lowBugs: number
    resolvedBugs: number
    bugResolutionRate: number

    totalReleaseTasks: number
    completedReleaseTasks: number
    pendingReleaseTasks: number
    inProgressReleaseTasks: number
    releaseProgressPercent: number

    openSupportIssues: number
    urgentSupportIssues: number
    resolvedSupportIssues: number
    supportSlaPercent: number

    newFeaturesCount: number
    testCasesCount: number
    automatedTestCoverage: number
    overallHealthScore: number
    nextReleaseDate?: string
    targetMilestone?: string
  }
  insights: Array<{
    type: 'risk' | 'recommendation' | 'optimization'
    title: string
    description: string
    level: 'high' | 'medium' | 'low'
  }>

  // The 10 Core Sections
  supportEmails: SupportEmailsSection
  newReleaseFeatures: NewReleaseFeaturesSection
  supportFixTesting: SupportFixTestingSection
  releaseTestingStatus: ReleaseTestingStatusSection
  taskWiseStatus: TaskWiseStatusSection
  supportExceptionLog: SupportExceptionLogSection
  teamCapacity: TeamCapacitySection
  weeklyCharts: WeeklyChartsSection
  teamResourceAllocation: TeamResourceAllocationSection
  nextWeekPriorities: NextWeekPrioritiesSection
}

export interface HolographicPanelProps {
  data: CinematicProjectData
  activeScene: IntroScene
  activePanelId: string | null
  onSelectPanel: (panelId: string | null) => void
  isDark?: boolean
}
