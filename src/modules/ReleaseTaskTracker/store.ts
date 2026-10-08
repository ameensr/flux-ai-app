// src/modules/ReleaseTaskTracker/store.ts
// Zustand store for Release Task Tracker module under QA Operations Hub.
// Authoritative single-source state with zero duplicate data.

import { create } from 'zustand'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  ReleaseTask,
  ReleaseTaskHistoryRecord,
  ReleaseTaskTimeLog,
  ReleaseDropdownOption,
  ReleaseFilters,
  ReleaseKPICounters,
  ReleaseProgressData,
  ProductReleaseSummary,
  EmployeeUser,
  TesterWorkload
} from './types'
import { DEFAULT_TASK_STATUSES } from './types'
import {
  fetchProductsFromProjectHub,
  fetchActiveEmployees,
  fetchReleaseTasks,
  saveReleaseTask as apiSaveTask,
  deleteReleaseTask as apiDeleteTask,
  toggleReleaseTaskEstimationLock,
  fetchReleaseHistory,
  fetchReleaseTimeLogs,
  addReleaseTimeLog as apiAddTimeLog,
  deleteReleaseTimeLog as apiDeleteTimeLog,
  fetchReleaseDropdownConfigs,
  saveReleaseDropdownConfigs as apiSaveDropdowns,
  LOCAL_STORAGE_TASKS_KEY
} from './releaseTrackerService'

interface ReleaseTrackerState {
  tasks: ReleaseTask[]
  products: ProjectWithMembers[]
  employees: EmployeeUser[]
  history: ReleaseTaskHistoryRecord[]
  timeLogs: ReleaseTaskTimeLog[]
  dropdownConfigs: {
    task_status: ReleaseDropdownOption[]
    priority: ReleaseDropdownOption[]
    assigned_to: ReleaseDropdownOption[]
  }
  filters: ReleaseFilters
  loading: boolean
  isRefreshing: boolean
  drillDownRelease: string | null

  // Actions
  fetchInitialData: () => Promise<void>
  refreshData: () => Promise<void>
  setFilters: (filters: Partial<ReleaseFilters>) => void
  resetFilters: () => void
  setSelectedProduct: (productId: string) => void
  setSelectedRelease: (release: string) => void
  setDrillDownRelease: (release: string | null) => void

  addOrUpdateTask: (
    taskInput: Partial<ReleaseTask> & {
      project_id: string
      product_name: string
      release_version: string
      description: string
    },
    currentUser: { name: string; id?: string }
  ) => Promise<ReleaseTask>

  deleteTask: (taskId: string, currentUser: { name: string; id?: string }) => Promise<void>
  toggleEstimationLock: (
    taskId: string,
    shouldLock: boolean,
    currentUser: { name: string; id?: string }
  ) => Promise<ReleaseTask>

  logWorkHours: (
    input: {
      task_id: string
      release_task_id?: string
      user_name: string
      user_id?: string | null
      hours_added: number
      comment: string
      date?: string
      logged_at?: string
    },
    currentUser: { name: string; id?: string }
  ) => Promise<{ newLog: ReleaseTaskTimeLog; updatedTask: ReleaseTask }>

  removeTimeLog: (logId: string, currentUser: { name: string; id?: string }) => Promise<void>
  getTimeLogsForTask: (taskId: string) => ReleaseTaskTimeLog[]

  updateDropdowns: (
    configs: {
      task_status: ReleaseDropdownOption[]
      priority: ReleaseDropdownOption[]
      assigned_to: ReleaseDropdownOption[]
    },
    currentUser: { name: string; id?: string }
  ) => Promise<void>

  // Selectors
  getFilteredTasks: () => ReleaseTask[]
  getKPICounters: () => ReleaseKPICounters
  getReleaseProgress: () => ReleaseProgressData
  getProductReleaseSummaries: () => ProductReleaseSummary[]
  getRecentActivities: () => ReleaseTaskHistoryRecord[]
  getAvailableReleases: () => string[]
  getTesterWorkloads: () => TesterWorkload[]
  getStatusDistribution: () => Array<{ status: string; count: number; color: string }>
}

const DEFAULT_FILTERS: ReleaseFilters = {
  selectedProductId: 'all',
  selectedRelease: 'all',
  taskStatus: [],
  assignedTo: [],
  priority: [],
  dateRangeStart: '',
  dateRangeEnd: '',
  dateRangeType: 'start',
  searchQuery: '',
  estimationLock: 'all'
}

export const useReleaseTrackerStore = create<ReleaseTrackerState>((set, get) => ({
  tasks: [],
  products: [],
  employees: [],
  history: [],
  timeLogs: [],
  dropdownConfigs: {
    task_status: [],
    priority: [],
    assigned_to: []
  },
  filters: DEFAULT_FILTERS,
  loading: true,
  isRefreshing: false,
  drillDownRelease: null,

  fetchInitialData: async () => {
    // Guard: Prevent double-invocation on mount
    if (get().loading === false && get().tasks.length > 0) return

    try {
      set({ loading: true })

      // 1. Fetch products & active employees from single authoritative sources
      const [products, employees] = await Promise.all([
        fetchProductsFromProjectHub(),
        fetchActiveEmployees()
      ])

      // 2. Fetch time logs, history, and dropdown configs
      const [timeLogs, history, dropdownConfigs] = await Promise.all([
        fetchReleaseTimeLogs(),
        fetchReleaseHistory(),
        fetchReleaseDropdownConfigs()
      ])

      // 3. Fetch tasks with cumulative time logs
      const tasks = await fetchReleaseTasks(products, timeLogs)

      set({
        products,
        employees,
        tasks,
        timeLogs,
        history,
        dropdownConfigs,
        loading: false
      })
    } catch (err) {
      console.error('[ReleaseTrackerStore] fetchInitialData error:', err)
      set({ loading: false })
    }
  },

  refreshData: async () => {
    try {
      set({ isRefreshing: true })
      const [products, employees] = await Promise.all([
        fetchProductsFromProjectHub(),
        fetchActiveEmployees()
      ])
      const [timeLogs, history, dropdownConfigs] = await Promise.all([
        fetchReleaseTimeLogs(),
        fetchReleaseHistory(),
        fetchReleaseDropdownConfigs()
      ])
      const tasks = await fetchReleaseTasks(products, timeLogs)

      set({
        products,
        employees,
        tasks,
        timeLogs,
        history,
        dropdownConfigs,
        isRefreshing: false
      })
    } catch (err) {
      console.error('[ReleaseTrackerStore] refreshData error:', err)
      set({ isRefreshing: false })
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS, drillDownRelease: null })
  },

  setSelectedProduct: (productId) => {
    set((state) => ({
      filters: { ...state.filters, selectedProductId: productId, selectedRelease: 'all' }
    }))
  },

  setSelectedRelease: (release) => {
    set((state) => ({
      filters: { ...state.filters, selectedRelease: release }
    }))
  },

  setDrillDownRelease: (release) => {
    set({ drillDownRelease: release })
  },

  addOrUpdateTask: async (taskInput, currentUser) => {
    const { tasks, products, timeLogs } = get()
    const matchingProject = products.find(p => p.id === taskInput.project_id)
    const enrichedInput = {
      ...taskInput,
      product_name: matchingProject?.name || taskInput.product_name,
      product_code: matchingProject?.project_code ?? taskInput.product_code
    }

    const saved = await apiSaveTask(enrichedInput, currentUser, tasks, timeLogs)

    // Update store with authoritative record — avoids duplicate optimistic rows
    set((state) => {
      const exists = state.tasks.some(t => t.id === saved.id)
      const nextTasks = exists
        ? state.tasks.map(t => (t.id === saved.id ? saved : t))
        : [saved, ...state.tasks.filter(t => t.id !== saved.id)]

      try {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(nextTasks))
      } catch { /* ignore */ }

      return { tasks: nextTasks }
    })

    const hist = await fetchReleaseHistory()
    set({ history: hist })

    return saved
  },

  deleteTask: async (taskId, currentUser) => {
    const { tasks } = get()
    await apiDeleteTask(taskId, currentUser, tasks)

    const nextTasks = tasks.filter(t => t.id !== taskId)
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(nextTasks))
    } catch { /* ignore */ }

    const hist = await fetchReleaseHistory()
    set({ tasks: nextTasks, history: hist })
  },

  toggleEstimationLock: async (taskId, shouldLock, currentUser) => {
    const { tasks } = get()
    const updated = await toggleReleaseTaskEstimationLock(taskId, shouldLock, currentUser, tasks)
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === updated.id ? updated : t))
    }))
    const hist = await fetchReleaseHistory()
    set({ history: hist })
    return updated
  },

  logWorkHours: async (input, currentUser) => {
    const { tasks } = get()
    const { newLog, updatedTask } = await apiAddTimeLog(input, currentUser, tasks)

    set((state) => {
      const alreadyExists = state.timeLogs.some(l => l.id === newLog.id)
      const nextLogs = alreadyExists
        ? state.timeLogs.map(l => (l.id === newLog.id ? newLog : l))
        : [newLog, ...state.timeLogs]
      const nextTasks = state.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
      return { timeLogs: nextLogs, tasks: nextTasks }
    })

    const hist = await fetchReleaseHistory()
    set({ history: hist })

    return { newLog, updatedTask }
  },

  removeTimeLog: async (logId, currentUser) => {
    const { tasks } = get()
    const { deletedLogId, updatedTask } = await apiDeleteTimeLog(logId, currentUser, tasks)

    set((state) => {
      const nextLogs = state.timeLogs.filter(l => l.id !== deletedLogId)
      const nextTasks = state.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
      return { timeLogs: nextLogs, tasks: nextTasks }
    })

    const hist = await fetchReleaseHistory()
    set({ history: hist })
  },

  getTimeLogsForTask: (taskId) => {
    const { timeLogs } = get()
    const seen = new Set<string>()
    return timeLogs.filter((l) => {
      if (l.task_id !== taskId && l.release_task_id !== taskId) return false
      if (seen.has(l.id)) return false
      seen.add(l.id)
      return true
    })
  },

  updateDropdowns: async (configs, currentUser) => {
    await apiSaveDropdowns(configs, currentUser)
    const hist = await fetchReleaseHistory()
    set({ dropdownConfigs: configs, history: hist })
  },

  // ════════════════════════════════════════════════════════════════════════════
  // Computed Selectors
  // ════════════════════════════════════════════════════════════════════════════

  getFilteredTasks: () => {
    const { tasks, filters } = get()

    return tasks.filter((task) => {
      if (task.is_deleted) return false

      // 1. Product Filter
      if (filters.selectedProductId && filters.selectedProductId !== 'all') {
        if (task.project_id !== filters.selectedProductId) return false
      }

      // 2. Release Filter
      if (filters.selectedRelease && filters.selectedRelease !== 'all') {
        if (task.release_version !== filters.selectedRelease) return false
      }

      // 3. Status Filter
      if (filters.taskStatus && filters.taskStatus.length > 0) {
        if (!filters.taskStatus.includes(task.task_status)) return false
      }

      // 4. Assigned To Filter
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        const matchesUser = filters.assignedTo.some(
          val =>
            (task.assigned_to_user_id && task.assigned_to_user_id === val) ||
            task.assigned_to_name.toLowerCase() === val.toLowerCase()
        )
        if (!matchesUser) return false
      }

      // 5. Priority Filter
      if (filters.priority && filters.priority.length > 0) {
        if (!filters.priority.includes(task.priority)) return false
      }

      // 6. Date Range Filter
      const dateField =
        filters.dateRangeType === 'target'
          ? task.target_date
          : filters.dateRangeType === 'finish'
          ? task.finish_date
          : task.start_date

      if (filters.dateRangeStart) {
        if (!dateField || dateField < filters.dateRangeStart) return false
      }
      if (filters.dateRangeEnd) {
        if (!dateField || dateField > filters.dateRangeEnd) return false
      }

      // 7. Search Query
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const q = filters.searchQuery.toLowerCase().trim()
        const matches =
          task.task_id.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q) ||
          task.product_name.toLowerCase().includes(q) ||
          task.release_version.toLowerCase().includes(q) ||
          task.assigned_to_name.toLowerCase().includes(q) ||
          (task.comments && task.comments.toLowerCase().includes(q))
        if (!matches) return false
      }

      // 8. Estimation Lock Filter
      if (filters.estimationLock && filters.estimationLock !== 'all') {
        if (filters.estimationLock === 'locked' && !task.estimated_hours_locked) return false
        if (filters.estimationLock === 'unlocked' && task.estimated_hours_locked) return false
      }

      return true
    })
  },

  getKPICounters: () => {
    const filtered = get().getFilteredTasks()

    let notStarted = 0
    let assigned = 0
    let inProgress = 0
    let blocked = 0
    let inReview = 0
    let completed = 0
    let totalEstimatedHours = 0
    let totalActualHours = 0
    let remainingHours = 0
    let overrunHours = 0

    for (const t of filtered) {
      const status = t.task_status
      if (status === 'Not Started') notStarted++
      else if (status === 'Assigned') assigned++
      else if (status === 'In Progress') inProgress++
      else if (status === 'Blocked') blocked++
      else if (status === 'In Review') inReview++
      else if (status === 'Completed') completed++

      const est = Number(t.estimated_hours) || 0
      const act = Number(t.actual_hours) || 0

      totalEstimatedHours += est
      totalActualHours += act
      remainingHours += Number(t.remaining_hours) || 0
      overrunHours += Number(t.overrun_hours) || 0
    }

    return {
      totalTasks: filtered.length,
      notStarted,
      assigned,
      inProgress,
      blocked,
      inReview,
      completed,
      totalEstimatedHours: Math.round(totalEstimatedHours * 100) / 100,
      totalActualHours: Math.round(totalActualHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      overrunHours: Math.round(overrunHours * 100) / 100
    }
  },

  getReleaseProgress: () => {
    const { filters, tasks } = get()
    const filtered = get().getFilteredTasks()

    const activeRelease = filters.selectedRelease !== 'all' ? filters.selectedRelease : 'All Releases'
    const total = filtered.length
    const completed = filtered.filter(t => t.task_status === 'Completed').length
    const blocked = filtered.filter(t => t.task_status === 'Blocked').length
    const remaining = total - completed
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      release: activeRelease,
      totalTasks: total,
      completedTasks: completed,
      remainingTasks: remaining,
      blockedTasks: blocked,
      percentage
    }
  },

  getProductReleaseSummaries: () => {
    const { tasks, products } = get()
    // Group by (project_id + release_version)
    const groupMap = new Map<string, ProductReleaseSummary>()

    for (const task of tasks) {
      if (task.is_deleted) continue
      const key = `${task.project_id}_${task.release_version}`

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          projectId: task.project_id,
          productName: task.product_name,
          productCode: task.product_code || undefined,
          release: task.release_version,
          totalTasks: 0,
          inProgress: 0,
          blocked: 0,
          completed: 0,
          estimatedHrs: 0,
          actualHrs: 0,
          remainingHrs: 0,
          overrunHrs: 0
        })
      }

      const item = groupMap.get(key)!
      item.totalTasks++
      if (task.task_status === 'In Progress') item.inProgress++
      if (task.task_status === 'Blocked') item.blocked++
      if (task.task_status === 'Completed') item.completed++

      item.estimatedHrs += Number(task.estimated_hours) || 0
      item.actualHrs += Number(task.actual_hours) || 0
      item.remainingHrs += Number(task.remaining_hours) || 0
      item.overrunHrs += Number(task.overrun_hours) || 0
    }

    const summaries = Array.from(groupMap.values()).map(s => ({
      ...s,
      estimatedHrs: Math.round(s.estimatedHrs * 100) / 100,
      actualHrs: Math.round(s.actualHrs * 100) / 100,
      remainingHrs: Math.round(s.remainingHrs * 100) / 100,
      overrunHrs: Math.round(s.overrunHrs * 100) / 100
    }))

    // Sort by product name then release
    return summaries.sort((a, b) =>
      a.productName.localeCompare(b.productName) || a.release.localeCompare(b.release)
    )
  },

  getRecentActivities: () => {
    const { history } = get()
    return history.slice(0, 15)
  },

  getAvailableReleases: () => {
    const { tasks, filters } = get()
    const relSet = new Set<string>()

    for (const t of tasks) {
      if (t.is_deleted) continue
      if (filters.selectedProductId !== 'all' && t.project_id !== filters.selectedProductId) {
        continue
      }
      if (t.release_version) {
        relSet.add(t.release_version)
      }
    }

    return Array.from(relSet).sort()
  },

  getTesterWorkloads: () => {
    const filtered = get().getFilteredTasks()
    const { dropdownConfigs } = get()

    const testerMap = new Map<string, {
      activeTasks: number
      estimatedHrs: number
      actualHrs: number
      remainingHrs: number
      overrunHrs: number
    }>()

    // Initialize all active configured testers so all testers appear in workload
    for (const t of (dropdownConfigs.assigned_to || []).filter(t => t.is_active)) {
      testerMap.set(t.label.toUpperCase(), {
        activeTasks: 0,
        estimatedHrs: 0,
        actualHrs: 0,
        remainingHrs: 0,
        overrunHrs: 0
      })
    }

    // Accumulate from filtered tasks
    for (const task of filtered) {
      const rawName = task.assigned_to_name || 'Unassigned'
      const name = rawName === 'Unassigned' ? 'Unassigned' : rawName.toUpperCase()
      const existing = testerMap.get(name) || {
        activeTasks: 0,
        estimatedHrs: 0,
        actualHrs: 0,
        remainingHrs: 0,
        overrunHrs: 0
      }

      const s = (task.task_status || '').toLowerCase()
      if (s !== 'completed' && s !== 'cancelled') {
        existing.activeTasks++
      }

      existing.estimatedHrs += Number(task.estimated_hours) || 0
      existing.actualHrs += Number(task.actual_hours) || 0
      existing.remainingHrs += Number(task.remaining_hours) || 0
      existing.overrunHrs += Number(task.overrun_hours) || 0

      testerMap.set(name, existing)
    }

    return Array.from(testerMap.entries()).map(([testerName, data]) => ({
      testerName,
      activeTasks: data.activeTasks,
      estimatedHrs: Math.round(data.estimatedHrs * 10) / 10,
      actualHrs: Math.round(data.actualHrs * 10) / 10,
      remainingHrs: Math.round(data.remainingHrs * 10) / 10,
      overrunHrs: Math.round(data.overrunHrs * 10) / 10
    })).sort((a, b) => b.remainingHrs - a.remainingHrs || b.overrunHrs - a.overrunHrs)
  },

  getStatusDistribution: () => {
    const filtered = get().getFilteredTasks()
    const { dropdownConfigs } = get()

    if (dropdownConfigs.task_status && dropdownConfigs.task_status.length > 0) {
      return dropdownConfigs.task_status
        .filter(ts => ts.is_active)
        .map(ts => {
          const count = filtered.filter(t => t.task_status === ts.value).length
          return {
            status: ts.label,
            count,
            color: ts.color || '#6366f1'
          }
        })
    }

    return DEFAULT_TASK_STATUSES.map(s => ({
      status: s.label,
      count: filtered.filter(t => t.task_status === s.value).length,
      color: s.color
    }))
  }
}))
