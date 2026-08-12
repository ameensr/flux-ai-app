// src/modules/QAWeeklyReport/components/TeamCapacity/TeamCapacityUpload.tsx
// Simple Team Capacity Upload - QA-focused (not performance evaluation)

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Trash2, AlertTriangle, X, CheckCircle,
  FileSpreadsheet, RefreshCw, Users, Clock, Gauge
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { parseTeamCapacityExcel, validateCapacityData } from '../../utils/capacityParser'
import {
  classifyCapacityFailure,
  emitCapacityFetchSignal,
  subscribeCapacityFetchSignal,
} from '../../utils/capacityFetchBus'
import type { TeamCapacityData } from '../../types/teamCapacity'
import {
  calculateCapacityStats,
  getMembersWithUtilization,
  getUtilizationColor,
} from '../../types/teamCapacity'
import { cn } from '@/lib/utils'

interface TeamCapacityUploadProps {
  capacityData: TeamCapacityData | null
  onChange: (data: TeamCapacityData | null) => void
}

export function TeamCapacityUpload({ capacityData, onChange }: TeamCapacityUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const replaceBtnRef = useRef<HTMLButtonElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlight, setHighlight] = useState(false)

  const displayData = useMemo(() => {
    if (!capacityData || !Array.isArray(capacityData.members)) return null
    return { ...capacityData, stats: calculateCapacityStats(capacityData.members) }
  }, [capacityData])

  const membersWithUtil = useMemo(
    () => (displayData ? getMembersWithUtilization(displayData.members) : []),
    [displayData],
  )

  const avgUtil = displayData?.stats.average_utilization_percent ?? displayData?.stats.estimated_capacity_percent ?? 0
  const utilColor = avgUtil >= 95 ? '#10b981' : avgUtil >= 80 ? '#22c55e' : avgUtil >= 60 ? '#f59e0b' : '#3b82f6'

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ]
  const ACCEPTED_EXT = ['.xlsx', '.xls']

  const processFile = useCallback(async (file: File) => {
    // Validate
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXT.includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx or .xls')
      emitCapacityFetchSignal({ kind: 'fetch-error', reason: 'parse', detail: 'Unsupported file type' })
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB.')
      emitCapacityFetchSignal({ kind: 'fetch-error', reason: 'parse', detail: 'File too large' })
      return
    }

    setError(null)
    setIsProcessing(true)
    // Tells Team Resource Allocation to show "Fetching employees…".
    emitCapacityFetchSignal({ kind: 'fetch-start', fileName: file.name })

    try {
      const result = await parseTeamCapacityExcel(file)
      const validation = validateCapacityData(result)

      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }
      if (!result.stats || !Array.isArray(result.members)) {
        throw new Error('Parsed capacity data is incomplete. Please check the Excel format.')
      }

      onChange(result)
      emitCapacityFetchSignal({
        kind: 'fetch-success',
        fileName: file.name,
        count: result.members.length,
      })
      toast({
        title: 'Team Capacity Loaded',
        description: `${result.members.length} team members processed from ${file.name}`,
      })
    } catch (err: any) {
      const message = err?.message || 'An unexpected error occurred while parsing the file.'
      setError(message)
      emitCapacityFetchSignal({
        kind: 'fetch-error',
        reason: classifyCapacityFailure(message),
        detail: message,
      })
      toast({
        variant: 'destructive',
        title: 'Parse Failed',
        description: message,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [onChange, toast])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = '' // reset
  }, [processFile])

  const handleRemove = () => {
    onChange(null)
    setError(null)
  }

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // "Go to Upload" from Team Resource Allocation → reveal + highlight this card.
  useEffect(() => {
    return subscribeCapacityFetchSignal(signal => {
      if (signal.kind !== 'focus-upload') return

      try {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } catch {
        cardRef.current?.scrollIntoView()
      }

      setHighlight(true)
      window.setTimeout(() => {
        const target = dropZoneRef.current ?? replaceBtnRef.current
        target?.focus({ preventScroll: true })
      }, 420)
      window.setTimeout(() => setHighlight(false), 2800)
    })
  }, [])

  return (
    <GlassCard
      ref={cardRef}
      hoverEffect={false}
      id="team-capacity-overview"
      style={
        highlight
          ? {
            borderColor: 'var(--accent)',
            boxShadow: '0 0 0 3px rgba(99,102,241,0.22)',
            transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          }
          : { transition: 'box-shadow 0.3s ease, border-color 0.3s ease' }
      }
    >
      {/* Always-mounted file input so "Replace File" works once data is loaded */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            Team Capacity Overview
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Upload team hours to track QA testing capacity and availability for the week.
          </p>
        </div>
        {capacityData && (
          <div className="flex items-center gap-2">
            <button
              ref={replaceBtnRef}
              type="button"
              onClick={openFilePicker}
              disabled={isProcessing}
              title="Upload a new Team Capacity Overview file"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
              style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--accent)', border: '1px solid rgba(99,102,241,0.30)' }}
            >
              {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Replace File
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
              style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        )}
      </div>

      {/* Upload Area (shown when no data) */}
      {!displayData && (
        <div
          ref={dropZoneRef}
          role="button"
          tabIndex={0}
          aria-label="Upload Team Capacity Overview Excel file"
          aria-busy={isProcessing}
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={openFilePicker}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openFilePicker()
            }
          }}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold',
            isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/40 hover:bg-hover',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          {isProcessing ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Processing team data...</span>
            </motion.div>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Upload className="w-6 h-6" style={{ color: 'var(--accent)' }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Drag & Drop Team Hours File
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  or click to <span style={{ color: 'var(--accent)' }}>Browse Excel File</span>
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {ACCEPTED_EXT.map(ext => (
                  <span key={ext} className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                    {ext}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-center">
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Expected columns: Employee Name, Logged Hours, Leave Hours, Effective Work, Available, Utilization Percentage
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400"><X className="w-3 h-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capacity Data Display (simple summary) */}
      <AnimatePresence>
        {displayData && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            {/* File info */}
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <FileSpreadsheet className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>
                  {displayData.file_name}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {displayData.members.length} team members
                  {displayData.period_start && ` · Period: ${displayData.period_start}`}
                </span>
              </div>
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            </div>

            {/* Team utilization KPIs */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <QuickStatCard
                label="Avg Utilization"
                value={`${avgUtil}%`}
                icon={<Gauge className="w-4 h-4" />}
                color="text-emerald-400"
                valueColor={utilColor}
              />
              <QuickStatCard
                label="Total Logged"
                value={`${displayData.stats.total_logged_hours ?? displayData.stats.average_hours * displayData.stats.total_members}h`}
                icon={<Clock className="w-4 h-4" />}
                color="text-blue-400"
              />
            </div>

            <p className="mt-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Utilization % from Excel when present, else (Logged ÷ Available) × 100
            </p>

            {/* Employee utilization table */}
            {membersWithUtil.length > 0 && (
              <div
                className="mt-4 rounded-xl overflow-hidden border"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--hover)', color: 'var(--text-muted)' }}
                >
                  <span>Employee</span>
                  <span className="text-right">Logged</span>
                  <span className="text-right">Available</span>
                  <span className="text-right">Util %</span>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {membersWithUtil.map(m => (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr] gap-2 px-3 py-2 text-xs border-t"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                        {m.name}
                      </span>
                      <span className="text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {m.logged_hours}h
                      </span>
                      <span className="text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {m.available_hours}h
                      </span>
                      <span
                        className="text-right tabular-nums font-semibold"
                        style={{ color: getUtilizationColor(m.utilization_percent) }}
                      >
                        {m.utilization_percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <QuickStatCard
                label="Total Team"
                value={displayData.stats.total_members}
                icon={<Users className="w-4 h-4" />}
                color="text-blue-400"
              />
              <QuickStatCard
                label="Available"
                value={displayData.stats.available}
                icon={<CheckCircle className="w-4 h-4" />}
                color="text-green-400"
              />
              <QuickStatCard
                label="Total Leave Hours"
                value={`${displayData.stats.total_leave_hours ?? 0}h`}
                icon={<Clock className="w-4 h-4" />}
                color="text-yellow-400"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

interface QuickStatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  sub?: string
  valueColor?: string
}

function QuickStatCard({ label, value, icon, color, sub, valueColor }: QuickStatCardProps) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className={color}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="text-xl font-bold tabular-nums" style={{ color: valueColor ?? 'var(--text-primary)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}

