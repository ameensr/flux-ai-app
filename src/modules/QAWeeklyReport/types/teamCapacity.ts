// src/modules/QAWeeklyReport/types/teamCapacity.ts
// Simplified QA-focused team capacity tracking

export type MemberStatus =
  | 'available'   // Working normally
  | 'on-leave'    // On leave
  | 'no-logs'     // No logged hours

export interface TeamMemberCapacity {
  id: string
  name: string
  logged_hours: number
  leave_hours: number
  status: MemberStatus
}

export interface TeamCapacityStats {
  total_members: number
  available: number
  on_leave: number
  no_logs: number
  average_hours: number
  estimated_capacity_percent: number
}

export interface TeamCapacityData {
  period_start?: string
  period_end?: string
  file_name?: string
  members: TeamMemberCapacity[]
  stats: TeamCapacityStats
}

// Determine member status based on hours
// Uses percentage-based threshold: only mark as "On Leave" if leave hours exceed 50% of expected weekly hours
export function getMemberStatus(logged: number, leave: number): MemberStatus {
  const EXPECTED_WEEKLY_HOURS = 40 // Standard work week
  const LEAVE_THRESHOLD_PERCENT = 50 // 50% or more leave = "On Leave"

  const totalHours = logged + leave

  // No activity at all
  if (totalHours === 0) return 'no-logs'

  // Calculate leave percentage of expected work week
  const leavePercent = (leave / EXPECTED_WEEKLY_HOURS) * 100

  // If leave is 50%+ of the week, mark as "On Leave"
  if (leavePercent >= LEAVE_THRESHOLD_PERCENT) return 'on-leave'

  // If they have logged hours, they're available (even with some leave)
  if (logged > 0) return 'available'

  // Edge case: Only leave hours, no work logged
  return 'on-leave'
}

// Calculate team capacity statistics
export function calculateCapacityStats(members: TeamMemberCapacity[]): TeamCapacityStats {
  const total = members.length
  const available = members.filter(m => m.status === 'available').length
  const onLeave = members.filter(m => m.status === 'on-leave').length
  const noLogs = members.filter(m => m.status === 'no-logs').length

  const totalHours = members.reduce((sum, m) => sum + m.logged_hours, 0)
  const avgHours = total > 0 ? Number((totalHours / total).toFixed(1)) : 0

  // Improved capacity calculation: Based on actual hours worked vs expected hours
  // This gives a more accurate picture than just counting available members
  const EXPECTED_HOURS_PER_PERSON = 40
  const maxPossibleHours = total * EXPECTED_HOURS_PER_PERSON
  const actualWorkHours = members.reduce((sum, m) => sum + m.logged_hours, 0)
  const capacity = maxPossibleHours > 0
    ? Math.round((actualWorkHours / maxPossibleHours) * 100)
    : 0

  return {
    total_members: total,
    available,
    on_leave: onLeave,
    no_logs: noLogs,
    average_hours: avgHours,
    estimated_capacity_percent: capacity
  }
}

// Status display helpers
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

// Distribution for donut chart
export interface CapacityDistribution {
  status: MemberStatus
  label: string
  count: number
  percentage: number
  color: string
}

export function getCapacityDistribution(stats: TeamCapacityStats): CapacityDistribution[] {
  const total = stats.total_members

  const items: CapacityDistribution[] = [
    {
      status: 'available' as MemberStatus,
      label: 'Available',
      count: stats.available,
      percentage: total > 0 ? Number(((stats.available / total) * 100).toFixed(1)) : 0,
      color: '#10b981'
    },
    {
      status: 'on-leave' as MemberStatus,
      label: 'On Leave',
      count: stats.on_leave,
      percentage: total > 0 ? Number(((stats.on_leave / total) * 100).toFixed(1)) : 0,
      color: '#eab308'
    },
    {
      status: 'no-logs' as MemberStatus,
      label: 'No Logs',
      count: stats.no_logs,
      percentage: total > 0 ? Number(((stats.no_logs / total) * 100).toFixed(1)) : 0,
      color: '#ef4444'
    }
  ]

  return items.filter(d => d.count > 0) // Only show categories with members
}
