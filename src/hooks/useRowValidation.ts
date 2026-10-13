// src/hooks/useRowValidation.ts
// Live per-row validation for Support Tracker and Release Tracker.
// Returns RowIssue[] derived from the current row data + active dropdown configs.
// Called inline during render — no async, no side effects.

import type { RowIssue } from '@/modules/DailyUpdateReport/components/ValidationTooltip'
import type { SupportIssue, SupportDropdownOption } from '@/modules/SupportIssueTracker/types'
import { DEFAULT_TESTING_STATUSES, DEFAULT_RETESTING_STATUS_OPTIONS, DEFAULT_IS_QA_MISS_OPTIONS } from '@/modules/SupportIssueTracker/types'
import type { ReleaseTask, ReleaseDropdownOption } from '@/modules/ReleaseTaskTracker/types'
import { DEFAULT_TASK_STATUSES, DEFAULT_PRIORITIES } from '@/modules/ReleaseTaskTracker/types'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'

// ── Support Tracker ───────────────────────────────────────────────────────────

interface SupportDropdownConfigs {
  testing_status: SupportDropdownOption[]
  testers: SupportDropdownOption[]
  is_qa_miss: SupportDropdownOption[]
  retesting_status: SupportDropdownOption[]
}

export function validateSupportIssue(
  issue: SupportIssue,
  configs: SupportDropdownConfigs,
  products: ProjectWithMembers[]
): RowIssue[] {
  const issues: RowIssue[] = []

  // Product
  if (!issue.project_id || !issue.product_name?.trim()) {
    issues.push({
      field: 'Product',
      value: issue.product_name || '',
      reason: 'Product is not set.',
      suggestion: 'Assign a valid product from Project Hub.',
    })
  } else {
    const matched = products.find(p => p.id === issue.project_id)
    if (!matched) {
      issues.push({
        field: 'Product',
        value: issue.product_name,
        reason: `"${issue.product_name}" does not match any configured project.`,
        suggestion: `Available: ${products.slice(0, 3).map(p => p.name).join(', ')}${products.length > 3 ? ` (+${products.length - 3} more)` : ''}.`,
      })
    }
  }

  // Description
  if (!issue.description?.trim()) {
    issues.push({
      field: 'Description',
      value: '',
      reason: 'Description is required.',
      suggestion: 'Enter a description for this support issue.',
    })
  }

  // QA Engineer
  if (!issue.tester_name?.trim() || issue.tester_name.toLowerCase() === 'unassigned') {
    issues.push({
      field: 'QA Engineer',
      value: issue.tester_name || '',
      reason: 'QA Engineer is not assigned.',
      suggestion: 'Assign a QA Engineer from the configured tester list.',
    })
  } else {
    const activeTesters = configs.testers.filter(t => t.is_active).map(t => t.value.toLowerCase())
    if (activeTesters.length > 0 && !activeTesters.includes(issue.tester_name.toLowerCase())) {
      issues.push({
        field: 'QA Engineer',
        value: issue.tester_name,
        reason: `"${issue.tester_name}" is not in the configured tester list.`,
        suggestion: 'Check the QA Engineers dropdown configuration.',
      })
    }
  }

  // Testing Status
  const activeStatuses = configs.testing_status.filter(s => s.is_active).length > 0
    ? configs.testing_status.filter(s => s.is_active).map(s => s.value.toLowerCase())
    : DEFAULT_TESTING_STATUSES.map(s => s.value.toLowerCase())
  if (issue.testing_status && !activeStatuses.includes(issue.testing_status.toLowerCase())) {
    issues.push({
      field: 'Status',
      value: issue.testing_status,
      reason: `"${issue.testing_status}" is not in the configured status list.`,
      suggestion: `Configured: ${activeStatuses.slice(0, 4).map(s => s).join(', ')}.`,
    })
  }

  // Retesting Status
  const activeRetesting = [
    ...configs.retesting_status.filter(s => s.is_active).map(s => s.value.toLowerCase()),
    ...DEFAULT_RETESTING_STATUS_OPTIONS.map(s => s.value.toLowerCase()),
  ]
  if (issue.retesting_status && !activeRetesting.includes(issue.retesting_status.toLowerCase())) {
    issues.push({
      field: 'Retesting Status',
      value: issue.retesting_status,
      reason: `"${issue.retesting_status}" is not a valid retesting status.`,
      suggestion: `Valid values: ${DEFAULT_RETESTING_STATUS_OPTIONS.map(s => s.value).join(', ')}.`,
    })
  }

  // Is QA Miss
  const activeQaMiss = configs.is_qa_miss.filter(m => m.is_active).length > 0
    ? configs.is_qa_miss.filter(m => m.is_active).map(m => m.value.toLowerCase())
    : DEFAULT_IS_QA_MISS_OPTIONS.map(m => m.value.toLowerCase())
  if (issue.is_qa_miss && !activeQaMiss.includes(issue.is_qa_miss.toLowerCase())) {
    issues.push({
      field: 'Is QA Miss?',
      value: issue.is_qa_miss,
      reason: `"${issue.is_qa_miss}" is not a valid option.`,
      suggestion: `Valid values: ${activeQaMiss.join(', ')}.`,
    })
  }

  return issues
}

// ── Release Tracker ───────────────────────────────────────────────────────────

interface ReleaseDropdownConfigs {
  task_status: ReleaseDropdownOption[]
  priority: ReleaseDropdownOption[]
  assigned_to: ReleaseDropdownOption[]
}

export function validateReleaseTask(
  task: ReleaseTask,
  configs: ReleaseDropdownConfigs,
  products: ProjectWithMembers[]
): RowIssue[] {
  const issues: RowIssue[] = []

  // Product
  if (!task.project_id || !task.product_name?.trim()) {
    issues.push({
      field: 'Product',
      value: task.product_name || '',
      reason: 'Product is not set.',
      suggestion: 'Assign a valid product from Project Hub.',
    })
  } else {
    const matched = products.find(p => p.id === task.project_id)
    if (!matched) {
      issues.push({
        field: 'Product',
        value: task.product_name,
        reason: `"${task.product_name}" does not match any configured project.`,
        suggestion: `Available: ${products.slice(0, 3).map(p => p.name).join(', ')}${products.length > 3 ? ` (+${products.length - 3} more)` : ''}.`,
      })
    }
  }

  // Description
  if (!task.description?.trim()) {
    issues.push({
      field: 'Description',
      value: '',
      reason: 'Description is required.',
      suggestion: 'Enter a description for this release task.',
    })
  }

  // QA Engineer / Assigned To
  if (!task.assigned_to_name?.trim() || task.assigned_to_name.toLowerCase() === 'unassigned') {
    issues.push({
      field: 'QA Engineer',
      value: task.assigned_to_name || '',
      reason: 'QA Engineer is not assigned.',
      suggestion: 'Assign a QA Engineer from the configured team members.',
    })
  } else {
    const activeAssignees = configs.assigned_to.filter(a => a.is_active).map(a => a.label.toLowerCase())
    if (activeAssignees.length > 0 && !activeAssignees.includes(task.assigned_to_name.toLowerCase())) {
      issues.push({
        field: 'QA Engineer',
        value: task.assigned_to_name,
        reason: `"${task.assigned_to_name}" is not in the configured team members.`,
        suggestion: 'Check the QA Engineers dropdown configuration.',
      })
    }
  }

  // Task Status
  const activeStatuses = configs.task_status.filter(s => s.is_active).length > 0
    ? configs.task_status.filter(s => s.is_active).map(s => s.value.toLowerCase())
    : DEFAULT_TASK_STATUSES.map(s => s.value.toLowerCase())
  if (task.task_status && !activeStatuses.includes(task.task_status.toLowerCase())) {
    issues.push({
      field: 'Status',
      value: task.task_status,
      reason: `"${task.task_status}" is not in the configured status list.`,
      suggestion: `Configured: ${activeStatuses.slice(0, 4).join(', ')}.`,
    })
  }

  // Priority
  const activePriorities = configs.priority.filter(p => p.is_active).length > 0
    ? configs.priority.filter(p => p.is_active).map(p => p.value.toLowerCase())
    : DEFAULT_PRIORITIES.map(p => p.value.toLowerCase())
  if (task.priority && !activePriorities.includes(task.priority.toLowerCase())) {
    issues.push({
      field: 'Priority',
      value: task.priority,
      reason: `"${task.priority}" is not in the configured priorities.`,
      suggestion: `Configured: ${activePriorities.join(', ')}.`,
    })
  }

  return issues
}
