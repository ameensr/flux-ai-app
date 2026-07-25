import React from 'react'
import { motion } from 'framer-motion'
import { FileClock, ChevronRight, ArrowUpRight } from 'lucide-react'

type ThemeId = 'light' | 'dark'

export interface ReportRailItem {
  id: string
  project: string
  week: string
  name?: string
  generatedDate?: string
  status: 'Draft' | 'Final'
}

interface ReportRailProps {
  theme: ThemeId
  items: ReportRailItem[]
  currentReportId: string | null
  softCard: string
  viewAllHref: string
  maxItems?: number
}

function formatTimestamp(iso?: string, fallbackWeek?: string): string {
  if (iso) {
    const d = new Date(iso)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }
  }
  return fallbackWeek || '—'
}

/**
 * Right-rail "Recent Reports" card — reuses the same saved-report history data already
 * fetched for this project (no new data, no new fetching). Rows link via the existing
 * `?reportId=` query param the dashboard already supports, so clicking one simply reloads
 * this same page pointed at a different (already real) saved report.
 */
export const ReportRail: React.FC<ReportRailProps> = ({ theme, items, currentReportId, softCard, viewAllHref, maxItems = 5 }) => {
  const rows = items.slice(0, maxItems)

  return (
    <motion.aside
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className={`p-5 flex flex-col gap-1 h-fit ${softCard}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-100'}`}>
            <FileClock className="w-4 h-4 text-accent-gold" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold leading-tight">Recent Reports</h3>
            <p className={`text-[10px] font-medium ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>Same project, past weeks</p>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className={`py-6 text-center text-xs ${theme === 'dark' ? 'text-white/35' : 'text-slate-400'}`}>
          No other saved reports yet for this project.
        </div>
      ) : (
        <div className="flex flex-col">
          {rows.map((r, idx) => {
            const isCurrent = r.id === currentReportId
            const RowInner = (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.status === 'Final' ? 'bg-green-400' : 'bg-amber-400'}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {r.name?.trim() || r.project}
                    </p>
                    <p className={`text-[10px] font-medium truncate ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
                      {r.name?.trim() ? r.project + ' · ' : ''}
                      {formatTimestamp(r.generatedDate, r.week)} · {r.status}
                    </p>
                  </div>
                </div>
                {isCurrent ? (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-accent-gold shrink-0">Viewing</span>
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${theme === 'dark' ? 'text-white/25' : 'text-slate-300'}`} />
                )}
              </>
            )

            const rowClass = `flex items-center justify-between gap-3 py-3 ${idx !== rows.length - 1 ? `border-b ${theme === 'dark' ? 'border-white/5' : 'border-slate-100'}` : ''}`

            if (isCurrent) {
              return <div key={r.id} className={rowClass}>{RowInner}</div>
            }

            return (
              <a key={r.id} href={`?reportId=${r.id}`} className={`${rowClass} group transition-opacity hover:opacity-70`}>
                {RowInner}
              </a>
            )
          })}
        </div>
      )}

      <a
        href={viewAllHref}
        className={`mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-widest py-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'text-white/50 hover:text-white hover:bg-white/[0.05]' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
      >
        See all reports <ArrowUpRight className="w-3 h-3" />
      </a>
    </motion.aside>
  )
}
