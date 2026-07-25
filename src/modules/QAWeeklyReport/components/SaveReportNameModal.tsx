import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, AlertTriangle, RefreshCw, Plus } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export type ReportSaveStatus = 'Draft' | 'Final'
export type ReportSaveMode = 'create' | 'update'

export interface SaveReportConfirmPayload {
  name: string
  status: ReportSaveStatus
  saveMode: ReportSaveMode
  existingId?: string
}

export interface MatchingExistingReport {
  id: string
  name: string
  status: ReportSaveStatus
  week: string
  generatedDate: string
}

interface SaveReportNameModalProps {
  open: boolean
  initialName: string
  /** Other report names in the same project (case-insensitive duplicate soft-warn) */
  existingNames?: string[]
  /** Recent prior names for this project — shown as autocomplete suggestions */
  recentNames?: string[]
  /** When renaming, ignore this name so the current report doesn't warn against itself */
  ignoreName?: string
  /** Same project + week match — offers Update existing vs Save as new */
  matchingExisting?: MatchingExistingReport | null
  /** Hide Draft/Final + update-existing (used for rename-only) */
  mode?: 'save' | 'rename'
  initialStatus?: ReportSaveStatus
  confirmLabel?: string
  title?: string
  description?: string
  onCancel: () => void
  onConfirm: (payload: SaveReportConfirmPayload) => void
}

export const SaveReportNameModal: React.FC<SaveReportNameModalProps> = ({
  open,
  initialName,
  existingNames = [],
  recentNames = [],
  ignoreName,
  matchingExisting = null,
  mode = 'save',
  initialStatus = 'Final',
  confirmLabel,
  title,
  description,
  onCancel,
  onConfirm,
}) => {
  useBodyScrollLock(open)
  const [name, setName] = useState(initialName)
  const [status, setStatus] = useState<ReportSaveStatus>(initialStatus)
  const [saveMode, setSaveMode] = useState<ReportSaveMode>(matchingExisting ? 'update' : 'create')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isRename = mode === 'rename'

  useEffect(() => {
    if (!open) return
    setName(initialName)
    setStatus(matchingExisting?.status || initialStatus)
    setSaveMode(matchingExisting ? 'update' : 'create')
    setShowSuggestions(false)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [open, initialName, initialStatus, matchingExisting])

  // When switching to update, prefer the existing report's name
  useEffect(() => {
    if (!open || isRename || !matchingExisting) return
    if (saveMode === 'update') {
      setName(matchingExisting.name || initialName)
      setStatus(matchingExisting.status || initialStatus)
    } else {
      setName(initialName)
    }
  }, [saveMode]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional: only react to saveMode toggles

  const trimmed = name.trim()
  const canSave = trimmed.length > 0
  const ignore = (ignoreName || '').trim().toLowerCase()
  const isDuplicate = Boolean(
    trimmed &&
    existingNames.some(n => {
      const other = n.trim().toLowerCase()
      if (saveMode === 'update' && matchingExisting) {
        const existingLabel = (matchingExisting.name || '').trim().toLowerCase()
        if (other === existingLabel) return false
      }
      return other === trimmed.toLowerCase() && other !== ignore
    }),
  )
  const duplicateWarning = isDuplicate
    ? `A report named “${trimmed}” already exists for this project. You can still save — consider a more specific name.`
    : null

  const suggestions = useMemo(() => {
    const q = trimmed.toLowerCase()
    const unique = Array.from(new Set(recentNames.map(n => n.trim()).filter(Boolean)))
    return unique
      .filter(n => n.toLowerCase() !== ignore)
      .filter(n => !q || n.toLowerCase().includes(q))
      .filter(n => n.toLowerCase() !== trimmed.toLowerCase())
      .slice(0, 6)
  }, [recentNames, trimmed, ignore])

  const resolvedConfirmLabel =
    confirmLabel ||
    (isRename
      ? 'Save changes'
      : saveMode === 'update'
        ? status === 'Draft'
          ? 'Update Draft'
          : 'Update Report'
        : status === 'Draft'
          ? 'Save Draft'
          : 'Save Report')

  const resolvedTitle =
    title || (isRename ? 'Edit report' : saveMode === 'update' ? 'Update existing report' : 'Name this report')

  const resolvedDescription =
    description ||
    (isRename
      ? 'Update the name or change Draft / Final status in Report History.'
      : 'Confirm the name and whether this week is still open (Draft) or ready to share (Final).')

  const submit = () => {
    if (!canSave) return
    onConfirm({
      name: trimmed,
      status,
      saveMode: isRename ? 'update' : saveMode,
      existingId: !isRename && saveMode === 'update' ? matchingExisting?.id : undefined,
    })
  }

  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return ''
    }
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
            onClick={onCancel}
          />
          <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md rounded-2xl shadow-2xl pointer-events-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="save-report-name-title"
            >
              <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="min-w-0">
                    <h2 id="save-report-name-title" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {resolvedTitle}
                    </h2>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {resolvedDescription}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCancel}
                  className="p-2 rounded-xl transition-all"
                  style={{ background: 'var(--hover)', color: 'var(--text-muted)' }}
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 pb-4 flex flex-col gap-4">
                {/* Update existing vs Save as new */}
                {!isRename && matchingExisting && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Same project & week found
                    </p>
                    <div
                      className="rounded-xl px-3 py-2 text-[11px]"
                      style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                    >
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {matchingExisting.name}
                      </span>
                      <span className="mx-1.5 opacity-50">·</span>
                      {matchingExisting.status}
                      <span className="mx-1.5 opacity-50">·</span>
                      saved {fmtDate(matchingExisting.generatedDate)}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSaveMode('update')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: saveMode === 'update' ? 'var(--accent)' : 'var(--hover)',
                          border: `1px solid ${saveMode === 'update' ? 'var(--accent)' : 'var(--border)'}`,
                          color: saveMode === 'update' ? '#000' : 'var(--text-secondary)',
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Update existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setSaveMode('create')}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
                        style={{
                          background: saveMode === 'create' ? 'var(--accent)' : 'var(--hover)',
                          border: `1px solid ${saveMode === 'create' ? 'var(--accent)' : 'var(--border)'}`,
                          color: saveMode === 'create' ? '#000' : 'var(--text-secondary)',
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Save as new
                      </button>
                    </div>
                  </div>
                )}

                {/* Name + autocomplete */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Report name
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      value={name}
                      onChange={e => {
                        setName(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => {
                        // Delay so suggestion click can register
                        window.setTimeout(() => setShowSuggestions(false), 150)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          submit()
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          if (showSuggestions && suggestions.length) {
                            setShowSuggestions(false)
                          } else {
                            onCancel()
                          }
                        }
                      }}
                      maxLength={120}
                      placeholder="e.g. Weekly QA Status Report"
                      autoComplete="off"
                      className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                      style={{
                        background: 'var(--hover)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <AnimatePresence>
                      {showSuggestions && suggestions.length > 0 && (
                        <motion.ul
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl overflow-hidden shadow-xl max-h-40 overflow-y-auto"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                        >
                          <li
                            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider sticky top-0"
                            style={{ background: 'var(--surface-secondary)', color: 'var(--text-muted)' }}
                          >
                            Recent names for this project
                          </li>
                          {suggestions.map(s => (
                            <li key={s}>
                              <button
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs transition-colors"
                                style={{ color: 'var(--text-primary)' }}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  setName(s)
                                  setShowSuggestions(false)
                                  inputRef.current?.focus()
                                }}
                                onMouseEnter={e => {
                                  ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--hover)'
                                }}
                                onMouseLeave={e => {
                                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                                }}
                              >
                                {s}
                              </button>
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Shown in Report History
                    </p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {trimmed.length}/120
                    </p>
                  </div>
                </div>

                {duplicateWarning && (
                  <div
                    className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]"
                    style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#d97706' }}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{duplicateWarning}</span>
                  </div>
                )}

                {/* Draft / Final — available on save and when editing from Report History */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
                    Status
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setStatus('Draft')}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left"
                      style={{
                        background: status === 'Draft' ? 'rgba(245, 158, 11, 0.15)' : 'var(--hover)',
                        border: `1px solid ${status === 'Draft' ? 'rgba(245, 158, 11, 0.45)' : 'var(--border)'}`,
                        color: status === 'Draft' ? '#d97706' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="block">Draft</span>
                      <span className="block text-[10px] font-medium opacity-80 mt-0.5">Week still open</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus('Final')}
                      className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left"
                      style={{
                        background: status === 'Final' ? 'rgba(34, 197, 94, 0.12)' : 'var(--hover)',
                        border: `1px solid ${status === 'Final' ? 'rgba(34, 197, 94, 0.4)' : 'var(--border)'}`,
                        color: status === 'Final' ? '#16a34a' : 'var(--text-secondary)',
                      }}
                    >
                      <span className="block">Final</span>
                      <span className="block text-[10px] font-medium opacity-80 mt-0.5">Ready to share</span>
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="flex items-center justify-end gap-2 px-5 py-4"
                style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}
              >
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSave}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: '#000' }}
                >
                  {resolvedConfirmLabel}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}
