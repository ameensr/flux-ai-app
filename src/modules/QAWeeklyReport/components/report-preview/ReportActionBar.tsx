import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Play, Download, Printer, FileText, LayoutGrid, Copy, X, MousePointer, MousePointer2 } from 'lucide-react'

type ThemeId = 'light' | 'dark'

interface ReportActionBarProps {
  theme: ThemeId
  cursorEnabled: boolean
  onToggleCursor: () => void
  clientMode: boolean
  onToggleClientMode: () => void
  onPresent: () => void
  showExportMenu: boolean
  onToggleExportMenu: () => void
  onPrint: () => void
  onPrintFriendly: () => void
  onDownloadHTML: () => void
  onDownloadMarkdown: () => void
  onClose: () => void
}

/**
 * Minimalist action area for report-preview capsule nav bar:
 * Smooth cursor toggle, client mode toggle, minimal Present button,
 * minimal Export dropdown, and Close button.
 */
export const ReportActionBar: React.FC<ReportActionBarProps> = ({
  theme,
  cursorEnabled,
  onToggleCursor,
  clientMode,
  onToggleClientMode,
  onPresent,
  showExportMenu,
  onToggleExportMenu,
  onPrint,
  onPrintFriendly,
  onDownloadHTML,
  onDownloadMarkdown,
  onClose
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Cursor toggle: switch between custom dot cursor and original system cursor */}
      <button
        onClick={onToggleCursor}
        title={cursorEnabled ? 'Switch to Original Cursor' : 'Enable Smooth Cursor'}
        aria-label={cursorEnabled ? 'Switch to Original Cursor' : 'Enable Smooth Cursor'}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full border overflow-hidden transition-all duration-200 ${
          cursorEnabled
            ? theme === 'dark'
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.25)]'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/25 shadow-[0_0_8px_rgba(99,102,241,0.2)]'
            : theme === 'dark'
              ? 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/80 hover:bg-white/[0.08]'
              : 'bg-slate-100/80 border-slate-200/80 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60'
        }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {cursorEnabled ? (
            <motion.span
              key="custom-cursor"
              initial={{ opacity: 0, rotate: -25, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 25, scale: 0.6 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex items-center justify-center relative"
            >
              <MousePointer2 className="w-3.5 h-3.5" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.9)]" />
            </motion.span>
          ) : (
            <motion.span
              key="system-cursor"
              initial={{ opacity: 0, rotate: 25, scale: 0.6 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -25, scale: 0.6 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="flex items-center justify-center"
            >
              <MousePointer className="w-3.5 h-3.5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Client Mode toggle */}
      <button
        onClick={onToggleClientMode}
        title={clientMode ? 'Client Mode: hiding confidential notes' : 'Client Mode: showing full view'}
        className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-all text-xs font-medium ${
          clientMode
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
            : theme === 'dark'
              ? 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.08]'
              : 'bg-slate-100/80 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
        }`}
      >
        {clientMode ? <EyeOff className="w-3.5 h-3.5 text-emerald-400" /> : <Eye className="w-3.5 h-3.5" />}
        <span className="hidden 2xl:inline">Client</span>
      </button>

      {/* Present Mode Button - Minimal Look */}
      <button
        onClick={onPresent}
        title="Enter presentation mode"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/80 hover:text-white border-white/[0.08] hover:border-white/[0.16]'
            : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 hover:text-slate-900 border-slate-200 hover:border-slate-300'
        }`}
      >
        <Play className="w-3 h-3 opacity-80" />
        <span className="hidden sm:inline">Present</span>
      </button>

      {/* Export Menu Button - Icon Only Minimal Look */}
      <div className="relative">
        <button
          onClick={onToggleExportMenu}
          title="Export report"
          aria-label="Export report"
          className={`relative flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 ${
            showExportMenu
              ? theme === 'dark'
                ? 'bg-white/[0.12] text-white border-white/[0.2] shadow-sm'
                : 'bg-slate-200 text-slate-900 border-slate-300 shadow-sm'
              : theme === 'dark'
                ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/[0.08] hover:border-white/[0.16]'
                : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
          }`}
        >
          <Download className="w-3.5 h-3.5 opacity-85" />
        </button>

        <AnimatePresence>
          {showExportMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className={`absolute right-0 mt-2.5 w-52 border rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl z-50 ${
                theme === 'dark'
                  ? 'bg-[#0F1629]/95 border-white/[0.1] text-white'
                  : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  onClick={onPrint}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/[0.06] text-white/90' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Printer className="w-4 h-4 text-indigo-400" /> Print to PDF
                </button>
                <button
                  onClick={onPrintFriendly}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/[0.06] text-white/90' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4 text-blue-400" /> Print Friendly Report
                </button>
                <button
                  onClick={onDownloadHTML}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/[0.06] text-white/90' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-purple-400" /> Standalone HTML
                </button>
                <button
                  onClick={onDownloadMarkdown}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                    theme === 'dark' ? 'hover:bg-white/[0.06] text-white/90' : 'hover:bg-slate-100 text-slate-800'
                  }`}
                >
                  <Copy className="w-4 h-4 text-emerald-400" /> Markdown File
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        title="Close report"
        className={`flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-200 ${
          theme === 'dark'
            ? 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-rose-500/15 hover:text-rose-400 hover:border-rose-500/30'
            : 'bg-slate-100/80 border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
        }`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
