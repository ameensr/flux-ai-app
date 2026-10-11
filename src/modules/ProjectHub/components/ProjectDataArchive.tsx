// src/modules/ProjectHub/components/ProjectDataArchive.tsx
// Project Data Archive — export + safe deletion feature inside ProjectDetail.

import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive, Download, Trash2, AlertTriangle, CheckCircle2,
  X, RefreshCw, FileSpreadsheet, Database, Clock,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { usePermissions } from '@/hooks/usePermissions'
import type { ProjectWithMembers } from '../types'
import {
  fetchArchiveRecordCounts,
  fetchLatestArchiveJob,
  createArchiveJob,
  runExport,
  confirmDownload,
  runDeletion,
  type ArchiveRecordCounts,
  type ArchiveJob,
} from '../archiveService'

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending:                       { label: 'Pending',                    color: '#94a3b8' },
    exporting:                     { label: 'Exporting…',                 color: '#f59e0b' },
    awaiting_download_confirmation:{ label: 'Awaiting Download',          color: '#3b82f6' },
    ready_for_deletion:            { label: 'Ready for Deletion',         color: '#8b5cf6' },
    deleting:                      { label: 'Deleting…',                  color: '#f97316' },
    completed:                     { label: 'Completed',                  color: '#22c55e' },
    failed:                        { label: 'Failed',                     color: '#ef4444' },
  }
  const s = map[status] ?? { label: status, color: '#94a3b8' }
  return (
    <span
      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border"
      style={{
        color: s.color,
        background: `${s.color}18`,
        borderColor: `${s.color}40`,
      }}
    >
      {s.label}
    </span>
  )
}

// ── Confirmation modal ────────────────────────────────────────────────────────

interface ArchiveModalProps {
  project: ProjectWithMembers
  counts: ArchiveRecordCounts
  onClose: () => void
  onConfirm: (projectNameInput: string) => void
  busy: boolean
}

function ArchiveConfirmModal({ project, counts, onClose, onConfirm, busy }: ArchiveModalProps) {
  useBodyScrollLock(true)
  const [nameInput, setNameInput] = useState('')
  const isValid = nameInput === project.name

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="archive-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          key="archive-panel"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-modal-title"
          className="pointer-events-auto relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        >
          {/* Amber top stripe */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />

          {/* Header */}
          <div className="p-6 pb-4 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                  <Archive className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h2 id="archive-modal-title" className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    Archive Project Data?
                  </h2>
                  <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                    Export then permanently remove records from the active database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="p-2 rounded-lg hover:bg-[var(--hover)] transition-all disabled:opacity-50 shrink-0"
                style={{ color: 'var(--text-muted)' }}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="px-6 pb-6 space-y-5 overflow-y-auto flex-1 overscroll-contain">
            {/* Description */}
            <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20 text-sm" style={{ color: 'var(--text-primary)' }}>
              Archiving will export the selected project's data into an Excel workbook. After the
              export has been successfully generated, verified, and downloaded, the corresponding
              records will be <strong>permanently deleted</strong> from the active database.
            </div>

            {/* Project info */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Selected Project
              </p>
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
                {project.project_code && (
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {project.project_code}
                  </p>
                )}
              </div>
            </div>

            {/* Modules & counts */}
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Modules Included
              </p>
              <div className="space-y-2">
                {[
                  { label: 'QA Operations Hub — Support Issue Tracker',      count: counts.support_logs },
                  { label: 'QA Operations Hub — Release Task Tracker',       count: counts.release_logs },
                  { label: 'Daily Update Report — Support & Exception Log',  count: counts.daily_support_logs },
                  { label: 'Daily Update Report — Release Testing Log',      count: counts.daily_release_logs },
                  { label: 'Daily Update Report — QA Weekly Reports',        count: counts.weekly_reports },
                ].map(m => (
                  <div
                    key={m.label}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                  >
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {m.count.toLocaleString()} records
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/8">
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total Records</span>
                  <span className="text-xs font-bold tabular-nums text-amber-500">
                    {counts.total.toLocaleString()} records
                  </span>
                </div>
              </div>
            </div>

            {/* Export format */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]">
              <FileSpreadsheet className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Export format: <strong style={{ color: 'var(--text-primary)' }}>Excel (.xlsx)</strong> — 6 worksheets
              </span>
            </div>

            {/* Type-to-confirm */}
            <div className="space-y-2">
              <label className="block text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Type the project name to confirm
              </label>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Type{' '}
                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--surface-secondary)]">
                  {project.name}
                </span>{' '}
                to enable the archive action
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                disabled={busy}
                placeholder={`Type "${project.name}" here`}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                autoFocus
              />
              {nameInput && !isValid && (
                <p className="text-xs text-red-500 font-medium">
                  Project name does not match. Type exactly: {project.name}
                </p>
              )}
              {isValid && (
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Project name confirmed
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onConfirm(nameInput)}
                disabled={!isValid || busy}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 text-black hover:bg-amber-400 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Exporting…
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Export &amp; Archive
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}

// ── Download confirmation modal ───────────────────────────────────────────────

interface DownloadConfirmModalProps {
  job: ArchiveJob
  onClose: () => void
  onConfirmed: () => void
  busy: boolean
}

function DownloadConfirmModal({ job, onClose, onConfirmed, busy }: DownloadConfirmModalProps) {
  useBodyScrollLock(true)
  const [checked, setChecked] = useState(false)

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="dl-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={busy ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          key="dl-panel"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto relative w-full max-w-md flex flex-col rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-500" />
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
                <Download className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Confirm File Saved
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  The Excel workbook has been downloaded to your device.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/8 border border-blue-500/20 text-sm space-y-1" style={{ color: 'var(--text-primary)' }}>
              <p className="font-bold text-blue-400">Before proceeding to deletion:</p>
              <p>Please verify that the Excel file has been saved to a safe location. Once you confirm, the records will be <strong>permanently deleted</strong> from the active database.</p>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] cursor-pointer" onClick={() => setChecked(c => !c)}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${checked ? 'bg-blue-500 border-blue-500' : 'border-[var(--border)]'}`}>
                {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
              </div>
              <p className="text-sm select-none" style={{ color: 'var(--text-primary)' }}>
                I have verified that the Excel workbook has been saved to a safe location and I understand that the records will be permanently deleted.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmed}
                disabled={!checked || busy}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-2"
              >
                {busy ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Records
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  )
}

// ── Main section component ────────────────────────────────────────────────────

interface ProjectDataArchiveProps {
  project: ProjectWithMembers
}

export function ProjectDataArchive({ project }: ProjectDataArchiveProps) {
  const { toast } = useToast()
  const { can } = usePermissions()
  const canArchive = can('project-hub', 'can_archive_data')

  const [counts, setCounts] = useState<ArchiveRecordCounts | null>(null)
  const [countsLoading, setCountsLoading] = useState(false)
  const [latestJob, setLatestJob] = useState<ArchiveJob | null>(null)
  const [jobLoading, setJobLoading] = useState(false)

  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadCounts = useCallback(async () => {
    setCountsLoading(true)
    try {
      const c = await fetchArchiveRecordCounts(project.id)
      setCounts(c)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load record counts', description: err.message })
    } finally {
      setCountsLoading(false)
    }
  }, [project.id, toast])

  const loadLatestJob = useCallback(async () => {
    setJobLoading(true)
    try {
      const job = await fetchLatestArchiveJob(project.id)
      setLatestJob(job)
      // If there's an in-progress job awaiting download confirmation, restore that state
      if (job && job.status === 'awaiting_download_confirmation') {
        setActiveJobId(job.id)
        setShowDownloadModal(true)
      }
    } catch {
      // Non-critical — silently ignore
    } finally {
      setJobLoading(false)
    }
  }, [project.id])

  useEffect(() => {
    if (!canArchive) return
    loadCounts()
    loadLatestJob()
  }, [canArchive, loadCounts, loadLatestJob])

  // Step 1: user clicks "Archive Project Data" → show confirm modal
  const handleArchiveClick = () => {
    setShowConfirmModal(true)
  }

  // Step 2: user confirms project name → create job + run export
  const handleExportConfirm = async (_nameInput: string) => {
    setBusy(true)
    let jobId: string | null = null
    try {
      const job = await createArchiveJob(project.id)
      jobId = job.id
      setActiveJobId(job.id)
      setShowConfirmModal(false)

      await runExport(job.id, project.id, project.name)

      // Reload job state and show download confirmation
      const updated = await fetchLatestArchiveJob(project.id)
      setLatestJob(updated)
      setShowDownloadModal(true)
    } catch (err: any) {
      setShowConfirmModal(false)
      toast({
        variant: 'destructive',
        title: 'Archive Export Failed. No data was deleted.',
        description: err.message,
      })
      if (jobId) {
        const refreshed = await fetchLatestArchiveJob(project.id).catch(() => null)
        if (refreshed) setLatestJob(refreshed)
      }
    } finally {
      setBusy(false)
    }
  }

  // Step 3: user confirms download → run deletion
  const handleDeleteConfirm = async () => {
    if (!activeJobId) return
    setBusy(true)
    try {
      const result = await confirmDownload(activeJobId)
      setLatestJob(result)
      setShowDownloadModal(false)

      const finalJob = await runDeletion(activeJobId)
      setLatestJob(finalJob)
      setActiveJobId(null)

      if (finalJob.status === 'completed') {
        toast({
          title: 'Project Data Archived Successfully!',
          description: `Exported ${finalJob.total_records_count?.toLocaleString()} records. Deleted ${finalJob.total_deleted_count?.toLocaleString()} records.`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Export completed, but data cleanup failed.',
          description: finalJob.failure_details ?? 'Some records may still remain. Please review the archive status.',
        })
      }
      // Refresh counts
      await loadCounts()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion failed',
        description: err.message,
      })
      const refreshed = await fetchLatestArchiveJob(project.id).catch(() => null)
      if (refreshed) setLatestJob(refreshed)
    } finally {
      setBusy(false)
    }
  }

  if (!canArchive) return null

  const isJobInProgress = latestJob && !['completed', 'failed'].includes(latestJob.status)

  return (
    <>
      <GlassCard hoverEffect={false} className="p-5">
        {/* Section header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
              <Archive className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Project Data Archive
              </h3>
              <p className="text-xs mt-1 max-w-md" style={{ color: 'var(--text-muted)' }}>
                Export historical project data into a consolidated Excel workbook and safely remove
                archived records from the active database.
              </p>
            </div>
          </div>
          <button
            onClick={() => { loadCounts(); loadLatestJob() }}
            disabled={countsLoading || jobLoading}
            className="p-1.5 rounded-lg hover:bg-[var(--hover)] transition-all disabled:opacity-50 shrink-0"
            style={{ color: 'var(--text-muted)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(countsLoading || jobLoading) ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Project info row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Project</p>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{project.name}</p>
            {project.project_code && (
              <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>{project.project_code}</p>
            )}
          </div>
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)]">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Export Format</p>
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-green-500" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Excel (.xlsx) — 6 worksheets</p>
            </div>
          </div>
        </div>

        {/* Record counts */}
        <div className="space-y-2 mb-5">
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Records Eligible for Archival
          </p>
          {countsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-9 rounded-lg animate-pulse" style={{ background: 'var(--hover)' }} />
              ))}
            </div>
          ) : counts ? (
            <div className="space-y-1.5">
              {[
                { label: 'QA Ops — Support Issue Tracker',    icon: <Database className="w-3.5 h-3.5" />, count: counts.support_logs },
                { label: 'QA Ops — Release Task Tracker',     icon: <Database className="w-3.5 h-3.5" />, count: counts.release_logs },
                { label: 'Daily Report — Support & Exc. Log', icon: <Database className="w-3.5 h-3.5" />, count: counts.daily_support_logs },
                { label: 'Daily Report — Release Testing',    icon: <Database className="w-3.5 h-3.5" />, count: counts.daily_release_logs },
                { label: 'QA Weekly Reports',                 icon: <Database className="w-3.5 h-3.5" />, count: counts.weekly_reports },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-secondary)]"
                >
                  <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    {row.icon}
                    <span className="text-xs">{row.label}</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                    {row.count.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-amber-500/30 bg-amber-500/8">
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Total</span>
                <span className="text-xs font-bold tabular-nums text-amber-500">{counts.total.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Unable to load counts</p>
          )}
        </div>

        {/* Latest job status */}
        {latestJob && (
          <div className="mb-5 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Latest Archive Job
                </span>
              </div>
              <StatusBadge status={latestJob.status} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Started: </span>
                {latestJob.created_at ? new Date(latestJob.created_at).toLocaleString() : '—'}
              </div>
              {latestJob.total_records_count > 0 && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Exported: </span>
                  {latestJob.total_records_count.toLocaleString()} records
                </div>
              )}
              {latestJob.total_deleted_count != null && (
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Deleted: </span>
                  {latestJob.total_deleted_count.toLocaleString()} records
                </div>
              )}
              {latestJob.failure_details && (
                <div className="col-span-2 text-red-400">{latestJob.failure_details}</div>
              )}
            </div>
            {/* Resume awaiting-download job */}
            {latestJob.status === 'awaiting_download_confirmation' && (
              <button
                onClick={() => { setActiveJobId(latestJob.id); setShowDownloadModal(true) }}
                className="w-full mt-1 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-all flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Resume — Confirm Download &amp; Delete
              </button>
            )}
          </div>
        )}

        {/* Primary action */}
        <button
          onClick={handleArchiveClick}
          disabled={busy || isJobInProgress || countsLoading || (counts?.total === 0)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-amber-500 text-black hover:bg-amber-400"
        >
          {busy ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Processing…
            </>
          ) : (
            <>
              <Archive className="w-4 h-4" />
              Archive Project Data
            </>
          )}
        </button>
        {counts?.total === 0 && !countsLoading && (
          <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
            No eligible records found for this project.
          </p>
        )}
      </GlassCard>

      {/* Modals */}
      {showConfirmModal && counts && (
        <ArchiveConfirmModal
          project={project}
          counts={counts}
          onClose={() => !busy && setShowConfirmModal(false)}
          onConfirm={handleExportConfirm}
          busy={busy}
        />
      )}

      {showDownloadModal && activeJobId && (
        <DownloadConfirmModal
          job={latestJob!}
          onClose={() => !busy && setShowDownloadModal(false)}
          onConfirmed={handleDeleteConfirm}
          busy={busy}
        />
      )}
    </>
  )
}
