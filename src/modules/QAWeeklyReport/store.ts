import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { ensureFormData } from './types'
import type { QAReportForm, SavedReport } from './types'

const defaultForm = (): QAReportForm => ({
  projectName: '', reportTitle: 'Weekly QA Status Report', weekStart: '', weekEnd: '', subtitle: '',
  supportEmails: 0, newFeatures: 0, codeFixes: 0,
  lastWeek: { codeFix: 0, support: 0, changeRequest: 0, dataIssue: 0, backendUpdation: 0 },
  monthToDate: { codeFix: 0, support: 0, changeRequest: 0, completedCR: 0, dataIssue: 0, backendUpdation: 0 },
  newFeatureTeam: [], supportTeam: [], automationTeam: [],
  supportTickets: [], releaseItems: [],
  defectsLastWeek: { reported: 0, open: 0, fixed: 0, closed: 0 },
  defectsMTD: { reported: 0, open: 0, fixed: 0, closed: 0 },
  historicalDefects: [], nextPriorities: [],
  showAIInsights: true,
  showAISummary: true,
  showHistoricalAnalytics: true,
  showTimeline: true,
  customTimeline: [],
})

interface QAReportStore {
  form: QAReportForm
  setForm: (patch: Partial<QAReportForm>) => void
  resetForm: () => void
  generatedReport: string
  setGeneratedReport: (md: string) => void
  savedReports: SavedReport[]
  saveReport: (report: SavedReport) => Promise<void>
  deleteReport: (id: string) => Promise<void>
  fetchReports: () => Promise<void>
  historySearch: string
  setHistorySearch: (s: string) => void
}

export const useQAReportStore = create<QAReportStore>()(
  persist(
    (set) => ({
      form: defaultForm(),
      setForm: (patch) => set((s) => ({ form: { ...s.form, ...patch } })),
      resetForm: () => set({ form: defaultForm(), generatedReport: '' }),
      generatedReport: '',
      setGeneratedReport: (md) => set({ generatedReport: md }),
      savedReports: [],
      saveReport: async (report) => {
        const user = useAppStore.getState().user
        if (user) {
          try {
            const { error } = await supabase
              .from('weekly_reports')
              .upsert({
                id: report.id,
                user_id: user.id,
                week: report.week,
                project: report.project,
                generated_date: report.generatedDate,
                created_by: report.createdBy,
                markdown: report.markdown,
                form_data: report.form,
                status: report.status
              })
            if (error) throw error
          } catch (e) {
            console.error('Error saving report to Supabase:', String(e).replace(/[\r\n]/g, ' '))
          }
        }

        set((s) => {
          const now = new Date()
          const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate())
          const filtered = s.savedReports.filter(r => {
            const generatedDate = new Date(r.generatedDate)
            return generatedDate >= twoMonthsAgo
          })
          const merged = [report, ...filtered.filter(r => r.id !== report.id)]
          const sliced = merged.slice(0, 10)

          if (user && sliced.length > 0) {
            const oldestDate = sliced[sliced.length - 1].generatedDate
            supabase
              .from('weekly_reports')
              .delete()
              .eq('user_id', user.id)
              .lt('generated_date', oldestDate)
              .then(({ error }) => {
                if (error) console.error('Error cleaning up Supabase reports:', String(error).replace(/[\r\n]/g, ' '))
              })
          }

          return { savedReports: sliced }
        })
      },
      deleteReport: async (id) => {
        const user = useAppStore.getState().user
        if (user) {
          try {
            const { error } = await supabase
              .from('weekly_reports')
              .delete()
              .eq('id', id)
            if (error) throw error
          } catch (e) {
            console.error('Error deleting report from Supabase:', String(e).replace(/[\r\n]/g, ' '))
          }
        }
        set((s) => ({ savedReports: s.savedReports.filter(r => r.id !== id) }))
      },
      fetchReports: async () => {
        const user = useAppStore.getState().user
        if (!user) return
        try {
          const { data, error } = await supabase
            .from('weekly_reports')
            .select('*')
            .order('generated_date', { ascending: false })
            .limit(10)
          if (error) throw error
          if (data) {
            const mapped: SavedReport[] = data.map(r => ({
              id: r.id,
              week: r.week,
              project: r.project,
              generatedDate: r.generated_date,
              createdBy: r.created_by,
              markdown: r.markdown,
              form: ensureFormData(r.form_data),
              status: r.status as 'Draft' | 'Final'
            }))
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
