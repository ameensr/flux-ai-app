// src/modules/SupportIssueTracker/store.ts
// Zustand store for Support Issue Tracker
// Synchronizes dynamically with Project Hub as single source of truth for products.

import { create } from 'zustand'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  SupportIssue,
  SupportIssueHistoryRecord,
  SupportIssueTimeLog,
  SupportDropdownOption,
  SupportFilters,
  KPICounters,
  ProductSummary,
  TesterWorkload
} from './types'
import {
  fetchProductsFromProjectHub,
  fetchSupportIssues,
  saveSupportIssue,
  deleteSupportIssue as apiDeleteIssue,
  toggleSupportIssueEstimationLock,
  fetchSupportHistory,
  fetchDropdownConfigurations,
  saveDropdownConfigurations,
  fetchSupportTimeLogs,
  addSupportTimeLog,
  deleteSupportTimeLog,
  LOCAL_STORAGE_ISSUES_KEY
} from './supportTrackerService'

interface SupportTrackerState {
  issues: SupportIssue[]
  products: ProjectWithMembers[]
  history: SupportIssueHistoryRecord[]
  timeLogs: SupportIssueTimeLog[]
  dropdownConfigs: {
    testing_status: SupportDropdownOption[]
    testers: SupportDropdownOption[]
  }
  filters: SupportFilters
  loading: boolean
  isRefreshing: boolean
  drillDownTarget: string | null

  // Actions
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
  toggleEstimationLock: (
    issueId: string,
    shouldLock: boolean,
    user: { name: string; id?: string }
  ) => Promise<SupportIssue>
  updateDropdowns: (
    configs: { testing_status: SupportDropdownOption[]; testers: SupportDropdownOption[] },
    user: { name: string; id?: string }
  ) => Promise<void>

  // Time logging actions
  logWorkHours: (
    input: {
      issue_id: string
      support_issue_id?: string
      user_name: string
      user_id?: string | null
      hours_added: number
      comment: string
      logged_at?: string
    },
    user: { name: string; id?: string }
  ) => Promise<{ newLog: SupportIssueTimeLog; updatedIssue: SupportIssue }>
  removeTimeLog: (logId: string, user: { name: string; id?: string }) => Promise<void>
  getTimeLogsForIssue: (issueId: string) => SupportIssueTimeLog[]

  // Selectors / Getters
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
  receivedDateStart: '',
  receivedDateEnd: '',
  startDateStart: '',
  startDateEnd: '',
  finishDateStart: '',
  finishDateEnd: '',
  searchQuery: '',
  estimationLock: 'all'
}

export const useSupportTrackerStore = create<SupportTrackerState>((set, get) => ({
  issues: [],
  products: [],
  history: [],
  timeLogs: [],
  dropdownConfigs: {
    testing_status: [],
    testers: []
  },
  filters: DEFAULT_FILTERS,
  loading: true,
  isRefreshing: false,
  drillDownTarget: null,

  fetchInitialData: async () => {
    // Guard: skip if already loading to prevent double-invocation
    if (get().loading === false && get().issues.length > 0) return
    try {
      set({ loading: true })
      // 1. Fetch products from Project Hub (Single Source of Truth)
      const products = await fetchProductsFromProjectHub()

      // 2. Fetch time logs first so fetchSupportIssues can use them without a second fetch
      const [timeLogs, history, dropdownConfigs] = await Promise.all([
        fetchSupportTimeLogs(),
        fetchSupportHistory(),
        fetchDropdownConfigurations()
      ])

      // 3. Pass pre-fetched timeLogs to avoid double-fetching inside fetchSupportIssues
      const issues = await fetchSupportIssues(products, timeLogs)

      set({
        products,
        issues,
        history,
        dropdownConfigs,
        timeLogs,
        loading: false
      })
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
        fetchSupportTimeLogs(),
        fetchSupportHistory(),
        fetchDropdownConfigurations()
      ])
      const issues = await fetchSupportIssues(products, timeLogs)

      set({
        products,
        issues,
        history,
        dropdownConfigs,
        timeLogs,
        isRefreshing: false
      })
    } catch (err) {
      console.error('[SupportTrackerStore] refreshData error:', err)
      set({ isRefreshing: false })
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS })
  },

  setSelectedProduct: (productId) => {
    set((state) => ({
      filters: { ...state.filters, selectedProductId: productId }
    }))
  },

  setDrillDownTarget: (target) => {
    set({ drillDownTarget: target })
  },

  addOrUpdateIssue: async (issueInput, user) => {
    const { issues, products } = get()
    const matchingProject = products.find(p => p.id === issueInput.project_id)
    const enrichedInput = {
      ...issueInput,
      product_name: matchingProject?.name || issueInput.product_name,
      product_code: matchingProject?.project_code
    }

    const saved = await saveSupportIssue(enrichedInput, user, issues)

    // Update store with the authoritative saved record — no blind append
    set((state) => {
      const exists = state.issues.some(i => i.id === saved.id)
      const nextIssues = exists
        ? state.issues.map(i => (i.id === saved.id ? saved : i))
        : [saved, ...state.issues.filter(i => i.id !== saved.id)]

      try {
        localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues))
      } catch { /* ignore */ }

      return { issues: nextIssues }
    })

    // Refresh history once after save (not in background to avoid race)
    const hist = await fetchSupportHistory()
    set({ history: hist })

    return saved
  },

  deleteIssue: async (issueId, user) => {
    const { issues } = get()
    await apiDeleteIssue(issueId, user, issues)

    const nextIssues = issues.filter(i => i.id !== issueId)
    try {
      localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues))
    } catch { /* ignore */ }

    const hist = await fetchSupportHistory()
    set({ issues: nextIssues, history: hist })
  },

  toggleEstimationLock: async (issueId, shouldLock, user) => {
    const { issues } = get()
    const updated = await toggleSupportIssueEstimationLock(issueId, shouldLock, user, issues)
    set((state) => ({
      issues: state.issues.map((i) => (i.id === updated.id ? updated : i))
    }))
    const hist = await fetchSupportHistory()
    set({ history: hist })
    return updated
  },

  updateDropdowns: async (configs, user) => {
    const normalizedConfigs = {
      testing_status: configs.testing_status,
      testers: configs.testers.map(t => ({
        ...t,
        label: t.label.trim().toUpperCase(),
        value: t.value.trim().toUpperCase()
      }))
    }
    await saveDropdownConfigurations(normalizedConfigs, user)
    const hist = await fetchSupportHistory()
    set({ dropdownConfigs: normalizedConfigs, history: hist })
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Time Logging Actions (Cumulative Work Hours System)
  // ════════════════════════════════════════════════════════════════════════════

  logWorkHours: async (input, user) => {
    const { issues } = get()
    const { newLog, updatedIssue } = await addSupportTimeLog(input, user, issues)

    // Deduplicate: only prepend if not already in state (prevents optimistic+DB duplication)
    set((state) => {
      const alreadyExists = state.timeLogs.some(l => l.id === newLog.id)
      const nextLogs = alreadyExists
        ? state.timeLogs.map(l => l.id === newLog.id ? newLog : l)
        : [newLog, ...state.timeLogs]
      const nextIssues = state.issues.map((i) =>
        i.id === updatedIssue.id ? updatedIssue : i
      )
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
    const nextIssues = get().issues.map((i) =>
      i.id === updatedIssue.id ? updatedIssue : i
    )
    const hist = await fetchSupportHistory()
    set({ timeLogs: nextLogs, issues: nextIssues, history: hist })
  },

  getTimeLogsForIssue: (issueId: string) => {
    const { timeLogs } = get()
    // Deduplicate by id before returning to prevent double-display
    const seen = new Set<string>()
    return timeLogs.filter((l) => {
      if (l.issue_id !== issueId && l.support_issue_id !== issueId) return false
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Computed Selectors
  // ════════════════════════════════════════════════════════════════════════════

  getFilteredIssues: () => {
    const { issues, filters } = get()
    return issues.filter((issue) => {
      // 1. Product Filter
      if (filters.selectedProductId && filters.selectedProductId !== 'all') {
        if (issue.project_id !== filters.selectedProductId) return false
      }

      // 2. Testing Status Filter
      if (filters.testingStatus && filters.testingStatus.length > 0) {
        if (!filters.testingStatus.includes(issue.testing_status)) return false
      }

      // 3. Tester Filter
      if (filters.tester && filters.tester.length > 0) {
        const filterSet = new Set(filters.tester.map(f => f.toLowerCase()))
        if (!filterSet.has((issue.tester_name || '').toLowerCase())) return false
      }

      // 4. Received Date Range
      if (filters.receivedDateStart && issue.received_date < filters.receivedDateStart) {
        return false
      }
      if (filters.receivedDateEnd && issue.received_date > filters.receivedDateEnd) {
        return false
      }

      // 5. Start Date Range
      if (filters.startDateStart) {
        if (!issue.start_date || issue.start_date < filters.startDateStart) return false
      }
      if (filters.startDateEnd) {
        if (!issue.start_date || issue.start_date > filters.startDateEnd) return false
      }

      // 6. Finish Date Range
      if (filters.finishDateStart) {
        if (!issue.finish_date || issue.finish_date < filters.finishDateStart) return false
      }
      if (filters.finishDateEnd) {
        if (!issue.finish_date || issue.finish_date > filters.finishDateEnd) return false
      }

      // 7. Search Query
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim()
        const matches =
          issue.issue_id.toLowerCase().includes(query) ||
          issue.description.toLowerCase().includes(query) ||
          issue.product_name.toLowerCase().includes(query) ||
          issue.tester_name.toLowerCase().includes(query) ||
          (issue.comments && issue.comments.toLowerCase().includes(query))
        if (!matches) return false
      }

      // 8. Estimation Lock Filter
      if (filters.estimationLock && filters.estimationLock !== 'all') {
        if (filters.estimationLock === 'locked' && !issue.estimated_hours_locked) return false
        if (filters.estimationLock === 'unlocked' && issue.estimated_hours_locked) return false
      }

      return true
    })
  },

  getKPICounters: () => {
    const filtered = get().getFilteredIssues()

    let openIssues = 0
    let inTesting = 0
    let blocked = 0
    let retesting = 0
    let completed = 0
    let totalEstimatedHours = 0
    let totalActualHours = 0
    let remainingHours = 0
    let overrunHours = 0

    for (const issue of filtered) {
      const statusLower = (issue.testing_status || '').toLowerCase()

      if (statusLower !== 'completed' && statusLower !== 'cancelled') {
        openIssues++
      }
      if (statusLower === 'in testing') inTesting++
      if (statusLower === 'blocked') blocked++
      if (statusLower === 'retesting') retesting++
      if (statusLower === 'completed') completed++

      const est = Number(issue.estimated_hours) || 0
      const act = Number(issue.actual_hours) || 0
      totalEstimatedHours += est
      totalActualHours += act
      remainingHours += Number(issue.remaining_hours) || 0
      overrunHours += Number(issue.overrun_hours) || 0
    }

    return {
      totalIssues: filtered.length,
      openIssues,
      inTesting,
      blocked,
      retesting,
      completed,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalActualHours: Math.round(totalActualHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      overrunHours: Math.round(overrunHours * 100) / 100
    }
  },

  getProductSummaries: () => {
    const { products } = get()
    // Use filtered issues so dashboard always matches the tracker table
    const filtered = get().getFilteredIssues()

    return products.map((product) => {
      const productIssues = filtered.filter((i) => i.project_id === product.id)

      let open = 0
      let inTesting = 0
      let blocked = 0
      let retesting = 0
      let completed = 0
      let estimatedHrs = 0
      let actualHrs = 0
      let remainingHrs = 0
      let overrunHrs = 0

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
      }

      return {
        projectId: product.id,
        productName: product.name,
        productCode: product.project_code || undefined,
        totalIssues: productIssues.length,
        open,
        inTesting,
        blocked,
        retesting,
        completed,
        estimatedHrs: Math.round(estimatedHrs * 10) / 10,
        actualHrs: Math.round(actualHrs * 10) / 10,
        remainingHrs: Math.round(remainingHrs * 10) / 10,
        overrunHrs: Math.round(overrunHrs * 10) / 10
      }
    })
  },

  getTesterWorkloads: () => {
    const filtered = get().getFilteredIssues()
    const { dropdownConfigs } = get()

    const testerMap = new Map<string, {
      activeIssues: number
      estimatedHrs: number
      actualHrs: number
      remainingHrs: number
      overrunHrs: number
    }>()

    // Initialize all active configured testers so all testers appear in workload
    for (const t of dropdownConfigs.testers.filter(t => t.is_active)) {
      testerMap.set(t.label.toUpperCase(), {
        activeIssues: 0,
        estimatedHrs: 0,
        actualHrs: 0,
        remainingHrs: 0,
        overrunHrs: 0
      })
    }

    // Accumulate from filtered issues
    for (const issue of filtered) {
      const rawName = issue.tester_name || 'Unassigned'
      const name = rawName === 'Unassigned' ? 'Unassigned' : rawName.toUpperCase()
      const existing = testerMap.get(name) || {
        activeIssues: 0,
        estimatedHrs: 0,
        actualHrs: 0,
        remainingHrs: 0,
        overrunHrs: 0
      }

      const s = (issue.testing_status || '').toLowerCase()
      if (s !== 'completed' && s !== 'cancelled') {
        existing.activeIssues++
      }

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

    return dropdownConfigs.testing_status
      .filter(ts => ts.is_active)
      .map(ts => {
        const count = filtered.filter(i => i.testing_status === ts.value).length
        return {
          status: ts.label,
          count,
          color: ts.color || '#6366f1'
        }
      })
  }
}))
