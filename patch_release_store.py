path = '/home/u1519/ASR/Flux-APP/flux-ai-app/src/modules/ReleaseTaskTracker/store.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add editReleaseTimeLog to imports
content = content.replace(
    '  addReleaseTimeLog as apiAddTimeLog,\n  deleteReleaseTimeLog as apiDeleteTimeLog,',
    '  addReleaseTimeLog as apiAddTimeLog,\n  deleteReleaseTimeLog as apiDeleteTimeLog,\n  editReleaseTimeLog as apiEditTimeLog,'
)

# 2. Add editTimeLog to the interface (after removeTimeLog)
content = content.replace(
    '  removeTimeLog: (logId: string, currentUser: { name: string; id?: string }) => Promise<void>',
    '  removeTimeLog: (logId: string, currentUser: { name: string; id?: string }) => Promise<void>\n  editTimeLog: (\n    logId: string,\n    updates: { hours_added: number; comment: string; correction_reason: string },\n    currentUser: { name: string; id?: string }\n  ) => Promise<{ updatedLog: ReleaseTaskTimeLog; updatedTask: ReleaseTask }>'
)

# 3. Add editTimeLog implementation after removeTimeLog
OLD_REMOVE = """  removeTimeLog: async (logId, currentUser) => {
    const { tasks } = get()
    const { deletedLogId, updatedTask } = await apiDeleteTimeLog(logId, currentUser, tasks)

    set((state) => {
      const nextLogs = state.timeLogs.filter(l => l.id !== deletedLogId)
      const nextTasks = state.tasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
      return { timeLogs: nextLogs, tasks: nextTasks }
    })

    const hist = await fetchReleaseHistory()
    set({ history: hist })
  },"""
NEW_REMOVE = """  removeTimeLog: async (logId, currentUser) => {
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

  editTimeLog: async (logId, updates, currentUser) => {
    const { tasks } = get()
    const { updatedLog, updatedTask } = await apiEditTimeLog(logId, updates, currentUser, tasks)
    set((state) => ({
      timeLogs: state.timeLogs.map(l => l.id === updatedLog.id ? updatedLog : l),
      tasks: state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
    }))
    const hist = await fetchReleaseHistory()
    set({ history: hist })
    return { updatedLog, updatedTask }
  },"""
content = content.replace(OLD_REMOVE, NEW_REMOVE)

# 4. Update getKPICounters to use total_estimation_hrs
content = content.replace(
    '      const est = Number(t.estimated_hours) || 0\n      const act = Number(t.actual_hours) || 0\n\n      totalEstimatedHours += est',
    '      const est = Number((t as any).total_estimation_hrs || t.estimated_hours) || 0\n      const act = Number(t.actual_hours) || 0\n\n      totalEstimatedHours += est'
)

# 5. Update getProductReleaseSummaries to use total_estimation_hrs
content = content.replace(
    '      item.estimatedHrs += Number(task.estimated_hours) || 0',
    '      item.estimatedHrs += Number((task as any).total_estimation_hrs || task.estimated_hours) || 0'
)

# 6. Update getTesterWorkloads to use total_estimation_hrs
content = content.replace(
    '      existing.estimatedHrs += Number(task.estimated_hours) || 0',
    '      existing.estimatedHrs += Number((task as any).total_estimation_hrs || task.estimated_hours) || 0'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("store.ts patched")
