import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { ensureFormData } from './types'
import type { QAReportForm, SavedReport, ProjectConfig } from './types'

const defaultForm = (): QAReportForm => ({
  projectId: '',
  projectName: '', reportTitle: 'Weekly QA Status Report', weekStart: '', weekEnd: '', subtitle: '',
  supportEmails: 0, newFeatures: 0, codeFixes: 0,
  lastWeek: { escapedIssue: 0, supportFix: 0, support: 0, changeRequest: 0, dataIssue: 0, backendUpdation: 0 },
  monthToDate: { escapedIssue: 0, supportFix: 0, support: 0, changeRequest: 0, completedCR: 0, dataIssue: 0, backendUpdation: 0 },
  newFeatureTeam: [], supportTeam: [], automationTeam: [],
  supportTickets: [], releaseItems: [],
  defectsLastWeek: { reported: 0, open: 0, fixed: 0, closed: 0 },
  defectsMTD: { reported: 0, open: 0, fixed: 0, closed: 0 },
  historicalDefects: [], nextPriorities: [],
  showHistoricalAnalytics: true,
  showTimeline: true,
  customTimeline: [],
})

interface QAReportStore {
  form: QAReportForm
  setForm: (patch: Partial<QAReportForm>) => void
  resetForm: (projectId?: string, projectName?: string) => void
  generatedReport: string
  setGeneratedReport: (md: string) => void
  savedReports: SavedReport[]
  saveReport: (report: SavedReport) => Promise<void>
  deleteReport: (id: string) => Promise<void>
  fetchReports: (projectId?: string) => Promise<void>
  historySearch: string
  setHistorySearch: (s: string) => void

  // Project Master actions
  projects: ProjectConfig[]
  fetchProjects: (activeOnly?: boolean) => Promise<void>
  saveProject: (project: ProjectConfig) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

export const useQAReportStore = create<QAReportStore>()(
  persist(
    (set, get) => ({
      form: defaultForm(),
      setForm: (patch) => set((s) => {
        const next = { ...s.form, ...patch }
        try { localStorage.setItem('current-qa-report-data', JSON.stringify(next)) } catch(e) {}
        return { form: next }
      }),
      resetForm: (projectId, projectName) => set(() => {
        const resetData = {
          ...defaultForm(),
          projectId: projectId || '',
          projectName: projectName || ''
        }
        try { localStorage.setItem('current-qa-report-data', JSON.stringify(resetData)) } catch(e) {}
        return {
          form: resetData,
          generatedReport: ''
        }
      }),
      generatedReport: '',
      setGeneratedReport: (md) => set({ generatedReport: md }),
      savedReports: [],
      projects: [],

      fetchProjects: async (activeOnly = true) => {
        try {
          let query = supabase
            .from('projects')
            .select('id, name, project_code, description, status, created_by, created_at, updated_at')

          if (activeOnly) {
            query = query.eq('status', 'active')
          }

          const { data, error } = await query.order('name', { ascending: true })
          if (error) throw error
          if (data) {
            const mapped: ProjectConfig[] = data.map(p => ({
              id: p.id,
              projectName: p.name,
              projectCode: p.project_code,
              description: p.description || '',
              status: p.status === 'active' ? 'Active' : 'Inactive',
              isActive: p.status === 'active',
              createdBy: p.created_by,
              createdAt: p.created_at,
              updatedAt: p.updated_at,
              deletedAt: null
            }))
            set({ projects: mapped })
          }
        } catch (e) {
          console.error('Error fetching projects from Supabase:', String(e).replace(/[\r\n]/g, ' '))
        }
      },

      saveProject: async (project) => {
        const user = useAppStore.getState().user
        if (!user) return
        try {
          const payload = {
            name: project.projectName,
            project_code: project.projectCode,
            description: project.description,
            status: project.status === 'Active' ? 'active' : 'archived',
            updated_at: new Date().toISOString()
          } as any

          if (project.id) {
            const { error } = await supabase
              .from('projects')
              .update(payload)
              .eq('id', project.id)
            if (error) throw error
          } else {
            payload.created_by = user.id
            payload.created_at = new Date().toISOString()
            const { error } = await supabase
              .from('projects')
              .insert(payload)
            if (error) throw error
          }
          await get().fetchProjects(false)
        } catch (e) {
          console.error('Error saving project to Supabase:', String(e).replace(/[\r\n]/g, ' '))
          throw e
        }
      },

      deleteProject: async (id) => {
        try {
          const { error } = await supabase
            .from('projects')
            .update({
              status: 'archived'
            })
            .eq('id', id)
          if (error) throw error
          await get().fetchProjects(false)
        } catch (e) {
          console.error('Error archiving project from Supabase:', String(e).replace(/[\r\n]/g, ' '))
          throw e
        }
      },

      saveReport: async (report) => {
        const user = useAppStore.getState().user
        if (!user) {
          throw new Error('User not authenticated')
        }

        // Validate required fields
        if (!report.projectId) {
          throw new Error('Project ID is required to save the report')
        }

        try {
          const reportName = (report.name || '').trim() || undefined
          const { error } = await supabase
            .from('weekly_reports')
            .upsert({
              id: report.id,
              user_id: user.id,
              week: report.week,
              project: report.project,
              project_id: report.projectId,
              generated_date: report.generatedDate,
              created_by: report.createdBy,
              markdown: report.markdown,
              // Persist custom name inside form_data (no DB migration required)
              form_data: {
                ...report.form,
                projectId: report.projectId,
                projectName: report.project,
                __reportName: reportName ?? null,
              },
              status: report.status
            })
          if (error) {
            console.error('Supabase error saving report:', error)
            throw new Error(`Failed to save report: ${error.message}`)
          }
        } catch (e) {
          console.error('Error saving report to Supabase:', String(e).replace(/[\r\n]/g, ' '))
          throw e // Re-throw to propagate to UI
        }

        // Maintain local store cache — keep last 50, never auto-delete from Supabase
        const normalized: SavedReport = {
          ...report,
          name: (report.name || '').trim() || undefined,
        }
        set((s) => {
          const merged = [normalized, ...s.savedReports.filter(r => r.id !== report.id)]
          return { savedReports: merged.slice(0, 50) }
        })
      },

      deleteReport: async (id) => {
        const user = useAppStore.getState().user
        if (!user) {
          throw new Error('User not authenticated')
        }
        try {
          const { error } = await supabase
            .from('weekly_reports')
            .delete()
            .eq('id', id)
          if (error) throw error
        } catch (e) {
          console.error('Error deleting report from Supabase:', String(e).replace(/[\r\n]/g, ' '))
          throw e // Re-throw so the UI doesn't show a false "deleted" state
        }
        // Only drop from local cache after the DB delete actually succeeded
        set((s) => ({ savedReports: s.savedReports.filter(r => r.id !== id) }))
      },

      fetchReports: async (projectId) => {
        const user = useAppStore.getState().user
        if (!user) return
        try {
          // No longer filtering by user_id here - let RLS policies handle visibility
          // This allows managers and QA leads to see team reports from shared projects
          let query = supabase
            .from('weekly_reports')
            .select('*')

          if (projectId) {
            query = query.eq('project_id', projectId)
          }

          const { data, error } = await query
            .order('generated_date', { ascending: false })
            .limit(50) // Increased limit to show more team reports

          if (error) throw error
          if (data) {
            const mapped: SavedReport[] = data.map(r => {
              const rawName = r.form_data?.__reportName
              const name = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : undefined
              const { __reportName: _omit, ...formWithoutName } = (r.form_data || {}) as Record<string, unknown>
              return {
                id: r.id,
                name,
                week: r.week,
                project: r.project,
                projectId: r.project_id,
                generatedDate: r.generated_date,
                createdBy: r.created_by,
                markdown: r.markdown,
                form: ensureFormData({ ...formWithoutName, projectId: r.project_id, projectName: r.project }),
                status: r.status as 'Draft' | 'Final'
              }
            })
            set({ savedReports: mapped })
          }
        } catch (e) {
          console.error('Error fetching reports from Supabase:', String(e).replace(/[\r\n]/g, ' '))
        }
      },
      historySearch: '',
      setHistorySearch: (s) => set({ historySearch: s }),
    }),
    { name: 'qa-report-store', partialize: (s) => ({ savedReports: s.savedReports }) }
  )
)
