// src/modules/QAWeeklyReport/types/teamCapacity.ts
// QA team capacity from Excel: Name, Logged, Leave, Effective Work, Available, Utilization %

export type MemberStatus =
  | 'available' // Working normally
  | 'on-leave' // Significant leave vs available capacity
  | 'no-logs' // No logged hours and no leave

export interface TeamMemberCapacity {
  id: string
  name: string
  logged_hours: number
  leave_hours: number
  /** Planned/available hours for the period from Excel when present; else derived. */
  available_hours?: number
  /** Effective Work from Excel when present; else Logged − Leave. */
  effective_work?: number
  /** Utilization % from Excel when present; else Logged ÷ Available × 100. */
  utilization_percent?: number
  status: MemberStatus
}

export interface TeamCapacityStats {
  total_members: number
  available: number
  on_leave: number
  no_logs: number
  average_hours: number
  /** @deprecated Prefer average_utilization_percent — kept for older UI bindings */
  estimated_capacity_percent: number
  /** Mean of each employee's Utilization % */
  average_utilization_percent: number
  total_logged_hours: number
  total_available_hours: number
  total_leave_hours: number
  total_effective_work: number
  highest_utilization: { name: string; percent: number } | null
  lowest_utilization: { name: string; percent: number } | null
}

export interface TeamCapacityData {
  period_start?: string
  period_end?: string
  file_name?: string
  members: TeamMemberCapacity[]
  stats: TeamCapacityStats
}

/**
 * Bucket for Team Capacity Distribution donut.
 *
 * Uses Excel Available + Leave (not a fixed 40h week):
 * - no-logs: Logged = 0 and Leave = 0
 * - on-leave: Leave ≥ 50% of Available (or only leave, no logs)
 * - available: everyone else with activity
 */
export function getMemberStatus(
  logged: number,
  leave: number,
  availableHours?: number,
): MemberStatus {
  const LEAVE_THRESHOLD_PERCENT = 50
  const denom =
    Number.isFinite(availableHours) && (availableHours as number) > 0
      ? (availableHours as number)
      : 40

  if (logged <= 0 && leave <= 0) return 'no-logs'
  if (leave > 0 && (leave / denom) * 100 >= LEAVE_THRESHOLD_PERCENT) return 'on-leave'
  if (logged <= 0 && leave > 0) return 'on-leave'
  return 'available'
}

export function calculateCapacityStats(members: TeamMemberCapacity[]): TeamCapacityStats {
  const list = Array.isArray(members) ? members : []
  const total = list.length
  const available = list.filter(m => m.status === 'available').length
  const onLeave = list.filter(m => m.status === 'on-leave').length
  const noLogs = list.filter(m => m.status === 'no-logs').length

  const withUtil = getMembersWithUtilization(list)
  const totalLogged = withUtil.reduce((sum, m) => sum + m.logged_hours, 0)
  const totalAvailable = withUtil.reduce((sum, m) => sum + m.available_hours, 0)
  const totalLeave = withUtil.reduce((sum, m) => sum + m.leave_hours, 0)
  const totalEffective = withUtil.reduce((sum, m) => sum + m.effective_work, 0)
  const avgHours = total > 0 ? Number((totalLogged / total).toFixed(1)) : 0

  const averageUtilization =
    total > 0
      ? Number(
          (withUtil.reduce((sum, m) => sum + m.utilization_percent, 0) / total).toFixed(1),
        )
      : 0

  const highest = withUtil.length
    ? { name: withUtil[0].name, percent: withUtil[0].utilization_percent }
    : null
  const lowest = withUtil.length
    ? {
        name: withUtil[withUtil.length - 1].name,
        percent: withUtil[withUtil.length - 1].utilization_percent,
      }
    : null

  return {
    total_members: total,
    available,
    on_leave: onLeave,
    no_logs: noLogs,
    average_hours: avgHours,
    estimated_capacity_percent: Math.round(averageUtilization),
    average_utilization_percent: averageUtilization,
    total_logged_hours: Number(totalLogged.toFixed(1)),
    total_available_hours: Number(totalAvailable.toFixed(1)),
    total_leave_hours: Number(totalLeave.toFixed(1)),
    total_effective_work: Number(totalEffective.toFixed(1)),
    highest_utilization: highest,
    lowest_utilization: lowest,
  }
}

export function getStatusDisplay(status: MemberStatus): { label: string; icon: string; color: string } {
  switch (status) {
    case 'available':
      return { label: 'Available', icon: '✅', color: '#10b981' }
    case 'on-leave':
      return { label: 'On Leave', icon: '🌴', color: '#eab308' }
    case 'no-logs':
      return { label: 'No Logs', icon: '❌', color: '#ef4444' }
  }
}

export interface CapacityDistribution {
  status: MemberStatus
  label: string
  count: number
  percentage: number
  color: string
}

/** Team Capacity Distribution = count of Available / On Leave / No Logs from Excel rows. */
export function getCapacityDistribution(stats: TeamCapacityStats): CapacityDistribution[] {
  const total = stats.total_members

  const items: CapacityDistribution[] = [
    {
      status: 'available',
      label: 'Available',
      count: stats.available,
      percentage: total > 0 ? Number(((stats.available / total) * 100).toFixed(1)) : 0,
      color: '#10b981',
    },
    {
      status: 'on-leave',
      label: 'On Leave',
      count: stats.on_leave,
      percentage: total > 0 ? Number(((stats.on_leave / total) * 100).toFixed(1)) : 0,
      color: '#eab308',
    },
    {
      status: 'no-logs',
      label: 'No Logs',
      count: stats.no_logs,
      percentage: total > 0 ? Number(((stats.no_logs / total) * 100).toFixed(1)) : 0,
      color: '#ef4444',
    },
  ]

  return items.filter(d => d.count > 0)
}

const EXPECTED_WEEKLY_HOURS = 40

/**
 * Default planned hours when Excel has no Available column.
 * Weekly sheets (~40h logged) → 40; monthly sheets (~160–180h) → 176.
 */
export function inferDefaultAvailableHours(members: TeamMemberCapacity[]): number {
  const logged = (members || [])
    .map(m => Number(m.logged_hours) || 0)
    .filter(n => n > 0)
    .sort((a, b) => a - b)
  if (logged.length === 0) return 40
  const mid = logged[Math.floor(logged.length / 2)]
  return mid > 80 ? 176 : 40
}

export interface MemberUtilization {
  id: string
  name: string
  logged_hours: number
  leave_hours: number
  status: MemberStatus
  effective_work: number
  available_hours: number
  utilization_percent: number
}

/**
 * Per-employee row for Capacity Distribution tables.
 *
 * Priority for each field:
 * - Available: Excel → inferred default
 * - Effective Work: Excel → Logged − Leave
 * - Utilization %: Excel → Logged ÷ Available × 100
 */
export function getMemberUtilization(
  member: TeamMemberCapacity,
  defaultAvailableHours: number = EXPECTED_WEEKLY_HOURS,
): MemberUtilization {
  const logged = Number(member.logged_hours) || 0
  const leave = Number(member.leave_hours) || 0

  const fromExcelAvailable = Number(member.available_hours)
  const available =
    Number.isFinite(fromExcelAvailable) && fromExcelAvailable > 0
      ? Number(fromExcelAvailable.toFixed(1))
      : defaultAvailableHours

  const fromExcelEffective = Number(member.effective_work)
  const effective =
    Number.isFinite(fromExcelEffective)
      ? Number(fromExcelEffective.toFixed(1))
      : Number((logged - leave).toFixed(1))

  const fromExcelUtil = Number(member.utilization_percent)
  const utilization =
    Number.isFinite(fromExcelUtil) && fromExcelUtil >= 0
      ? Number(fromExcelUtil.toFixed(1))
      : available > 0
        ? Number(((logged / available) * 100).toFixed(1))
        : logged > 0
          ? 100
          : 0

  return {
    id: member.id,
    name: member.name,
    logged_hours: logged,
    leave_hours: leave,
    status: member.status,
    effective_work: effective,
    available_hours: available,
    utilization_percent: utilization,
  }
}

export function getMembersWithUtilization(members: TeamMemberCapacity[]): MemberUtilization[] {
  const list = members || []
  const fallback = inferDefaultAvailableHours(list)
  return list
    .map(m => getMemberUtilization(m, fallback))
    .sort((a, b) => b.utilization_percent - a.utilization_percent)
}

export function getUtilizationColor(utilization: number): string {
  if (utilization > 115) return '#ef4444'
  if (utilization > 105) return '#f59e0b'
  if (utilization >= 95) return '#10b981'
  if (utilization >= 80) return '#22c55e'
  return '#3b82f6'
}

export function getUtilizationLabel(utilization: number): string {
  if (utilization > 115) return 'Overloaded'
  if (utilization > 105) return 'High Load'
  if (utilization >= 95) return 'Optimal'
  if (utilization >= 80) return 'Healthy'
  return 'Under Utilized'
}
