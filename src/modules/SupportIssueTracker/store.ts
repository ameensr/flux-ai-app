// src/modules/SupportIssueTracker/store.ts

import { create } from 'zustand'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  SupportIssue, SupportIssueHistoryRecord, SupportIssueTimeLog,
  SupportDropdownOption, SupportFilters, KPICounters, ProductSummary, TesterWorkload
} from './types'
import {
  fetchProductsFromProjectHub, fetchSupportIssues, saveSupportIssue,
  deleteSupportIssue as apiDeleteIssue, bulkDeleteSupportIssues as apiBulkDeleteIssues,
  toggleSupportIssueEstimationLock, fetchSupportHistory, fetchDropdownConfigurations,
  saveDropdownConfigurations, fetchSupportTimeLogs, addSupportTimeLog, deleteSupportTimeLog, editSupportTimeLog,
  LOCAL_STORAGE_ISSUES_KEY
} from './supportTrackerService'

interface DropdownConfigs {
  testing_status: SupportDropdownOption[]
  testers: SupportDropdownOption[]
  is_qa_miss: SupportDropdownOption[]
  retesting_status: SupportDropdownOption[]
}

interface SupportTrackerState {
  issues: SupportIssue[]
  products: ProjectWithMembers[]
  history: SupportIssueHistoryRecord[]
  timeLogs: SupportIssueTimeLog[]
  dropdownConfigs: DropdownConfigs
  filters: SupportFilters
  loading: boolean
  isRefreshing: boolean
  drillDownTarget: string | null

  fetchInitialData: () => Promise<void>
  refreshData: () => Promise<void>
  setFilters: (filters: Partial<SupportFilters>) => void
  resetFilters: () => void
  setSelectedProduct: (productId: string) => void
  setDrillDownTarget: (target: string | null) => void
  addOrUpdateIssue: (
    issue: Partial<SupportIssue> & { project_id: string; product_name: string; description: string },
    user: { name: string; id?: string }
  ) => Promise<SupportIssue>
  deleteIssue: (issueId: string, user: { name: string; id?: string }) => Promise<void>
  bulkDeleteIssues: (ids: string[], user: { name: string; id?: string }) => Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }> }>
  toggleEstimationLock: (issueId: string, shouldLock: boolean, user: { name: string; id?: string }) => Promise<SupportIssue>
  updateDropdowns: (configs: DropdownConfigs, user: { name: string; id?: string }) => Promise<void>
  logWorkHours: (
    input: { issue_id: string; support_issue_id?: string; user_name: string; user_id?: string | null; hours_added: number; comment: string; logged_at?: string },
    user: { name: string; id?: string }
  ) => Promise<{ newLog: SupportIssueTimeLog; updatedIssue: SupportIssue }>
  removeTimeLog: (logId: string, user: { name: string; id?: string }) => Promise<void>
  editTimeLog: (
    logId: string,
    updates: { hours_added: number; comment: string; correction_reason: string },
    user: { name: string; id?: string }
  ) => Promise<{ updatedLog: import('./types').SupportIssueTimeLog; updatedIssue: import('./types').SupportIssue }>
  getTimeLogsForIssue: (issueId: string) => SupportIssueTimeLog[]
  getFilteredIssues: () => SupportIssue[]
  getKPICounters: () => KPICounters
  getProductSummaries: () => ProductSummary[]
  getTesterWorkloads: () => TesterWorkload[]
  getStatusDistribution: () => Array<{ status: string; count: number; color: string }>
}

const DEFAULT_FILTERS: SupportFilters = {
  selectedProductId: 'all',
  testingStatus: [],
  tester: [],
  isQaMiss: [],
  retestingStatus: [],
  receivedDateStart: '',
  receivedDateEnd: '',
  startDateStart: '',
  startDateEnd: '',
  plannedEndDateStart: '',
  plannedEndDateEnd: '',
  actualEndDateStart: '',
  actualEndDateEnd: '',
  searchQuery: '',
  estimationLock: 'all'
}

export const useSupportTrackerStore = create<SupportTrackerState>((set, get) => ({
  issues: [],
  products: [],
  history: [],
  timeLogs: [],
  dropdownConfigs: { testing_status: [], testers: [], is_qa_miss: [], retesting_status: [] },
  filters: DEFAULT_FILTERS,
  loading: true,
  isRefreshing: false,
  drillDownTarget: null,

  fetchInitialData: async () => {
    try {
      set({ loading: true })
      const products = await fetchProductsFromProjectHub()
      const [timeLogs, history, dropdownConfigs] = await Promise.all([
        fetchSupportTimeLogs(), fetchSupportHistory(), fetchDropdownConfigurations()
      ])
      const issues = await fetchSupportIssues(products, timeLogs)
      set({ products, issues, history, dropdownConfigs, timeLogs, loading: false })
    } catch (err) {
      console.error('[SupportTrackerStore] fetchInitialData error:', err)
      set({ loading: false })
    }
  },

  refreshData: async () => {
    try {
      set({ isRefreshing: true })
      const products = await fetchProductsFromProjectHub()
      const [timeLogs, history, dropdownConfigs] = await Promise.all([
        fetchSupportTimeLogs(), fetchSupportHistory(), fetchDropdownConfigurations()
      ])
      const issues = await fetchSupportIssues(products, timeLogs)
      set({ products, issues, history, dropdownConfigs, timeLogs, isRefreshing: false })
    } catch (err) {
      console.error('[SupportTrackerStore] refreshData error:', err)
      set({ isRefreshing: false })
    }
  },

  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  setSelectedProduct: (productId) => set((state) => ({ filters: { ...state.filters, selectedProductId: productId } })),
  setDrillDownTarget: (target) => set({ drillDownTarget: target }),

  addOrUpdateIssue: async (issueInput, user) => {
    const { issues, products } = get()
    const matchingProject = products.find(p => p.id === issueInput.project_id)
    const enrichedInput = {
      ...issueInput,
      product_name: matchingProject?.name || issueInput.product_name,
      product_code: matchingProject?.project_code
    }
    const saved = await saveSupportIssue(enrichedInput, user, issues)
    set((state) => {
      const exists = state.issues.some(i => i.id === saved.id)
      const nextIssues = exists
        ? state.issues.map(i => (i.id === saved.id ? saved : i))
        : [saved, ...state.issues.filter(i => i.id !== saved.id)]
      try { localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues)) } catch { /* ignore */ }
      return { issues: nextIssues }
    })
    const hist = await fetchSupportHistory()
    set({ history: hist })
    return saved
  },

  deleteIssue: async (issueId, user) => {
    const { issues } = get()
    await apiDeleteIssue(issueId, user, issues)
    const nextIssues = issues.filter(i => i.id !== issueId)
    try { localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues)) } catch { /* ignore */ }
    const hist = await fetchSupportHistory()
    set({ issues: nextIssues, history: hist })
  },

  bulkDeleteIssues: async (ids, user) => {
    const { issues } = get()
    const result = await apiBulkDeleteIssues(ids, user, issues)
    if (result.deleted.length > 0) {
      const nextIssues = issues.filter(i => !result.deleted.includes(i.id))
      try { localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues)) } catch { /* ignore */ }
      const hist = await fetchSupportHistory()
      set({ issues: nextIssues, history: hist })
    }
    return result
  },

  toggleEstimationLock: async (issueId, shouldLock, user) => {
    const { issues } = get()
    const updated = await toggleSupportIssueEstimationLock(issueId, shouldLock, user, issues)
    set((state) => ({ issues: state.issues.map((i) => (i.id === updated.id ? updated : i)) }))
    const hist = await fetchSupportHistory()
    set({ history: hist })
    return updated
  },

  updateDropdowns: async (configs, user) => {
    const normalizedConfigs = {
      ...configs,
      testers: configs.testers.map(t => ({
        ...t, label: t.label.trim().toUpperCase(), value: t.value.trim().toUpperCase()
      }))
    }
    await saveDropdownConfigurations(normalizedConfigs, user)
    const hist = await fetchSupportHistory()
    set({ dropdownConfigs: normalizedConfigs, history: hist })
  },

  logWorkHours: async (input, user) => {
    const { issues } = get()
    const { newLog, updatedIssue } = await addSupportTimeLog(input, user, issues)
    set((state) => {
      const alreadyExists = state.timeLogs.some(l => l.id === newLog.id)
      const nextLogs = alreadyExists
        ? state.timeLogs.map(l => l.id === newLog.id ? newLog : l)
        : [newLog, ...state.timeLogs]
      const nextIssues = state.issues.map((i) => i.id === updatedIssue.id ? updatedIssue : i)
      return { timeLogs: nextLogs, issues: nextIssues }
    })
    const hist = await fetchSupportHistory()
    set({ history: hist })
    return { newLog, updatedIssue }
  },

  removeTimeLog: async (logId, user) => {
    const { issues } = get()
    const { deletedLogId, updatedIssue } = await deleteSupportTimeLog(logId, user, issues)
    const nextLogs = get().timeLogs.filter((l) => l.id !== deletedLogId)
    const nextIssues = get().issues.map((i) => i.id === updatedIssue.id ? updatedIssue : i)
    const hist = await fetchSupportHistory()
    set({ timeLogs: nextLogs, issues: nextIssues, history: hist })
  },

  editTimeLog: async (logId, updates, user) => {
    const { issues } = get()
    const { updatedLog, updatedIssue } = await editSupportTimeLog(logId, updates, user, issues)
    set((state) => ({
      timeLogs: state.timeLogs.map(l => l.id === updatedLog.id ? updatedLog : l),
      issues: state.issues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
    }))
    const hist = await fetchSupportHistory()
    set({ history: hist })
    return { updatedLog, updatedIssue }
  },

  getTimeLogsForIssue: (issueId: string) => {
    const { timeLogs } = get()
    const seen = new Set<string>()
    return timeLogs.filter((l) => {
      if (l.issue_id !== issueId && l.support_issue_id !== issueId) return false
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })
  },

  getFilteredIssues: () => {
    const { issues, filters } = get()
    return issues.filter((issue) => {
      if (filters.selectedProductId && filters.selectedProductId !== 'all') {
        if (issue.project_id !== filters.selectedProductId) return false
      }
      if (filters.testingStatus?.length > 0) {
        if (!filters.testingStatus.includes(issue.testing_status)) return false
      }
      if (filters.tester?.length > 0) {
        const filterSet = new Set(filters.tester.map(f => f.toLowerCase()))
        if (!filterSet.has((issue.tester_name || '').toLowerCase())) return false
      }
      if (filters.isQaMiss?.length > 0) {
        if (!filters.isQaMiss.includes(issue.is_qa_miss || 'Not Applicable')) return false
      }
      if (filters.retestingStatus?.length > 0) {
        if (!filters.retestingStatus.includes(issue.retesting_status || 'Not Required')) return false
      }
      if (filters.receivedDateStart && issue.received_date < filters.receivedDateStart) return false
      if (filters.receivedDateEnd && issue.received_date > filters.receivedDateEnd) return false
      if (filters.startDateStart) {
        if (!issue.start_date || issue.start_date < filters.startDateStart) return false
      }
      if (filters.startDateEnd) {
        if (!issue.start_date || issue.start_date > filters.startDateEnd) return false
      }
      if (filters.plannedEndDateStart) {
        if (!issue.planned_end_date || issue.planned_end_date < filters.plannedEndDateStart) return false
      }
      if (filters.plannedEndDateEnd) {
        if (!issue.planned_end_date || issue.planned_end_date > filters.plannedEndDateEnd) return false
      }
      if (filters.actualEndDateStart) {
        if (!issue.actual_end_date || issue.actual_end_date < filters.actualEndDateStart) return false
      }
      if (filters.actualEndDateEnd) {
        if (!issue.actual_end_date || issue.actual_end_date > filters.actualEndDateEnd) return false
      }
      if (filters.searchQuery?.trim()) {
        const query = filters.searchQuery.toLowerCase().trim()
        const matches =
          issue.issue_id.toLowerCase().includes(query) ||
          issue.description.toLowerCase().includes(query) ||
          issue.product_name.toLowerCase().includes(query) ||
          issue.tester_name.toLowerCase().includes(query) ||
          (issue.comments && issue.comments.toLowerCase().includes(query))
        if (!matches) return false
      }
      if (filters.estimationLock && filters.estimationLock !== 'all') {
        if (filters.estimationLock === 'locked' && !issue.estimated_hours_locked) return false
        if (filters.estimationLock === 'unlocked' && issue.estimated_hours_locked) return false
      }
      return true
    })
  },

  getKPICounters: () => {
    const filtered = get().getFilteredIssues()
    let openIssues = 0, inTesting = 0, blocked = 0, retesting = 0, completed = 0
    let totalEstimatedHours = 0, totalActualHours = 0, remainingHours = 0, overrunHours = 0
    let totalBlockedHours = 0, totalRetestingEstHours = 0, qaMissCount = 0, totalTestCases = 0

    for (const issue of filtered) {
      const statusLower = (issue.testing_status || '').toLowerCase()
      if (statusLower !== 'completed' && statusLower !== 'cancelled') openIssues++
      if (statusLower === 'in testing') inTesting++
      if (statusLower === 'blocked') blocked++
      if (statusLower === 'retesting') retesting++
      if (statusLower === 'completed') completed++

      totalEstimatedHours += Number(issue.estimated_hours) || 0
      totalActualHours += Number(issue.actual_hours) || 0
      remainingHours += Number(issue.remaining_hours) || 0
      overrunHours += Number(issue.overrun_hours) || 0
      totalBlockedHours += Number(issue.blocked_hours) || 0
      totalRetestingEstHours += Number(issue.retesting_estimation_hrs) || 0
      if ((issue.is_qa_miss || '').toLowerCase() === 'yes') qaMissCount++
      totalTestCases += Number(issue.test_case_count) || 0
    }

    return {
      totalIssues: filtered.length, openIssues, inTesting, blocked, retesting, completed,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalActualHours: Math.round(totalActualHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      overrunHours: Math.round(overrunHours * 100) / 100,
      totalBlockedHours: Math.round(totalBlockedHours * 100) / 100,
      totalRetestingEstHours: Math.round(totalRetestingEstHours * 100) / 100,
      qaMissCount, totalTestCases
    }
  },

  getProductSummaries: () => {
    const { products } = get()
    const filtered = get().getFilteredIssues()
    return products.map((product) => {
      const productIssues = filtered.filter((i) => i.project_id === product.id)
      let open = 0, inTesting = 0, blocked = 0, retesting = 0, completed = 0
      let estimatedHrs = 0, actualHrs = 0, remainingHrs = 0, overrunHrs = 0
      let blockedHrs = 0, retestingEstHrs = 0, qaMissCount = 0, testCaseCount = 0

      for (const i of productIssues) {
        const s = (i.testing_status || '').toLowerCase()
        if (s !== 'completed' && s !== 'cancelled') open++
        if (s === 'in testing') inTesting++
        if (s === 'blocked') blocked++
        if (s === 'retesting') retesting++
        if (s === 'completed') completed++
        estimatedHrs += Number(i.estimated_hours) || 0
        actualHrs += Number(i.actual_hours) || 0
        remainingHrs += Number(i.remaining_hours) || 0
        overrunHrs += Number(i.overrun_hours) || 0
        blockedHrs += Number(i.blocked_hours) || 0
        retestingEstHrs += Number(i.retesting_estimation_hrs) || 0
        if ((i.is_qa_miss || '').toLowerCase() === 'yes') qaMissCount++
        testCaseCount += Number(i.test_case_count) || 0
      }

      return {
        projectId: product.id, productName: product.name, productCode: product.project_code || undefined,
        totalIssues: productIssues.length, open, inTesting, blocked, retesting, completed,
        estimatedHrs: Math.round(estimatedHrs * 10) / 10,
        actualHrs: Math.round(actualHrs * 10) / 10,
        remainingHrs: Math.round(remainingHrs * 10) / 10,
        overrunHrs: Math.round(overrunHrs * 10) / 10,
        blockedHrs: Math.round(blockedHrs * 10) / 10,
        retestingEstHrs: Math.round(retestingEstHrs * 10) / 10,
        qaMissCount, testCaseCount
      }
    })
  },

  getTesterWorkloads: () => {
    const filtered = get().getFilteredIssues()
    const { dropdownConfigs } = get()
    const testerMap = new Map<string, { activeIssues: number; estimatedHrs: number; actualHrs: number; remainingHrs: number; overrunHrs: number }>()

    for (const t of dropdownConfigs.testers.filter(t => t.is_active)) {
      testerMap.set(t.label.toUpperCase(), { activeIssues: 0, estimatedHrs: 0, actualHrs: 0, remainingHrs: 0, overrunHrs: 0 })
    }

    for (const issue of filtered) {
      const rawName = issue.tester_name || 'Unassigned'
      const name = rawName === 'Unassigned' ? 'Unassigned' : rawName.toUpperCase()
      const existing = testerMap.get(name) || { activeIssues: 0, estimatedHrs: 0, actualHrs: 0, remainingHrs: 0, overrunHrs: 0 }
      const s = (issue.testing_status || '').toLowerCase()
      if (s !== 'completed' && s !== 'cancelled') existing.activeIssues++
      existing.estimatedHrs += Number(issue.estimated_hours) || 0
      existing.actualHrs += Number(issue.actual_hours) || 0
      existing.remainingHrs += Number(issue.remaining_hours) || 0
      existing.overrunHrs += Number(issue.overrun_hours) || 0
      testerMap.set(name, existing)
    }

    return Array.from(testerMap.entries()).map(([testerName, data]) => ({
      testerName,
      activeIssues: data.activeIssues,
      estimatedHrs: Math.round(data.estimatedHrs * 10) / 10,
      actualHrs: Math.round(data.actualHrs * 10) / 10,
      remainingHrs: Math.round(data.remainingHrs * 10) / 10,
      overrunHrs: Math.round(data.overrunHrs * 10) / 10
    })).sort((a, b) => b.remainingHrs - a.remainingHrs || b.overrunHrs - a.overrunHrs)
  },

  getStatusDistribution: () => {
    const filtered = get().getFilteredIssues()
    const { dropdownConfigs } = get()
    return dropdownConfigs.testing_status.filter(ts => ts.is_active).map(ts => ({
      status: ts.label,
      count: filtered.filter(i => i.testing_status === ts.value).length,
      color: ts.color || '#6366f1'
    }))
  }
}))
