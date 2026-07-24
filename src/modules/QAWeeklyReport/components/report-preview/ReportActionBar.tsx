import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Play, Download, Printer, FileText, LayoutGrid, Copy, X } from 'lucide-react'

type ThemeId = 'light' | 'dark'

interface ReportActionBarProps {
  theme: ThemeId
  clientMode: boolean
  onToggleClientMode: () => void
  onPresent: () => void
  showExportMenu: boolean
  onToggleExportMenu: () => void
  onPrint: () => void
  onDownloadPPTX: () => void
  onDownloadHTML: () => void
  onDownloadMarkdown: () => void
  onClose: () => void
}

/**
 * Consolidated action area for report-preview: view options (client mode),
 * Present mode, the Export menu (Print/PPTX/HTML/Markdown), and Close. All handlers are
 * passed through unchanged from the dashboard — this component only organizes them visually.
 */
export const ReportActionBar: React.FC<ReportActionBarProps> = ({
  theme,
  clientMode,
  onToggleClientMode,
  onPresent,
  showExportMenu,
  onToggleExportMenu,
  onPrint,
  onDownloadPPTX,
  onDownloadHTML,
  onDownloadMarkdown,
  onClose
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* View options group */}
      <button
        onClick={onToggleClientMode}
        title={clientMode ? 'Client Mode: hiding confidential notes' : 'Client Mode: showing full view'}
        className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all text-[11px] font-bold ${clientMode ? 'bg-green-500/10 border-green-500/25 text-green-400' : theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-white/50 hover:text-white hover:bg-white/[0.08]' : 'bg-black/[0.03] border-black/[0.06] text-slate-500 hover:text-slate-800 hover:bg-black/[0.05]'}`}
      >
        {clientMode ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        <span className="hidden 2xl:inline">Client</span>
      </button>

      <button
        onClick={onPresent}
        title="Enter presentation mode"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-gold hover:bg-[#c3a030] text-black font-extrabold text-[11px] uppercase tracking-widest transition-all shadow-[0_2px_12px_rgba(212,175,55,0.25)]"
      >
        <Play className="w-3 h-3 fill-black" /> <span className="hidden sm:inline">Present</span>
      </button>

      <div className="relative">
        <button
          onClick={onToggleExportMenu}
          title="Export report"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-[11px] uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.06] text-white hover:bg-white/[0.08]' : 'bg-white border-black/[0.06] text-slate-800 hover:bg-slate-50 shadow-sm'}`}
        >
          <Download className="w-3 h-3" /> <span className="hidden sm:inline">Export</span>
        </button>

        <AnimatePresence>
          {showExportMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`absolute right-0 mt-3 w-48 border rounded-2xl overflow-hidden shadow-2xl z-50 ${theme === 'dark' ? 'bg-[#111114] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}
            >
              <div className="p-1.5 flex flex-col gap-1">
                <button onClick={onPrint} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                  <Printer className="w-4 h-4 text-accent-gold" /> Print to PDF
                </button>
                <button onClick={onDownloadPPTX} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                  <FileText className="w-4 h-4 text-blue-400" /> PowerPoint Outline
                </button>
                <button onClick={onDownloadHTML} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                  <LayoutGrid className="w-4 h-4 text-purple-400" /> Standalone HTML
                </button>
                <button onClick={onDownloadMarkdown} className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${theme === 'dark' ? 'hover:bg-white/5 text-white' : 'hover:bg-black/5 text-slate-800'}`}>
                  <Copy className="w-4 h-4 text-green-400" /> Markdown File
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <button
        onClick={onClose}
        title="Close report"
        className={`p-2.5 rounded-xl border transition-all ${theme === 'dark' ? 'bg-white/5 border-white/10 text-white hover:bg-red-500/20 hover:text-red-400' : 'bg-white border-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 shadow-sm'}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
