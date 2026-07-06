// src/modules/QAWeeklyReport/components/TeamCapacity/TeamCapacityUpload.tsx
// Simple Team Capacity Upload - QA-focused (not performance evaluation)

import React, { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, Trash2, AlertTriangle, X, CheckCircle, 
  FileSpreadsheet, RefreshCw, Users, Clock
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { parseTeamCapacityExcel, validateCapacityData } from '../../utils/capacityParser'
import type { TeamCapacityData } from '../../types/teamCapacity'
import { cn } from '@/lib/utils'

interface TeamCapacityUploadProps {
  capacityData: TeamCapacityData | null
  onChange: (data: TeamCapacityData | null) => void
}

export function TeamCapacityUpload({ capacityData, onChange }: TeamCapacityUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
  const ACCEPTED_EXT = ['.xlsx', '.xls']

  const processFile = useCallback(async (file: File) => {
    // Validate
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED_EXT.includes(ext)) {
      setError('Unsupported file type. Please upload .xlsx or .xls')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File too large. Maximum 50MB.')
      return
    }

    setError(null)
    setIsProcessing(true)

    try {
      const result = await parseTeamCapacityExcel(file)
      const validation = validateCapacityData(result)
      
      if (!validation.valid) {
        throw new Error(validation.errors.join(', '))
      }
      
      onChange(result)
      toast({ 
        title: 'Team Capacity Loaded', 
        description: `${result.members.length} team members processed from ${file.name}` 
      })
    } catch (err: any) {
      setError(err.message)
      toast({ 
        variant: 'destructive', 
        title: 'Parse Failed', 
        description: err.message 
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

  return (
    <GlassCard hoverEffect={false}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-5">
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
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        )}
      </div>

      {/* Upload Area (shown when no data) */}
      {!capacityData && (
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-300',
            isDragging ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/40 hover:bg-hover',
            isProcessing && 'pointer-events-none opacity-60'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileSelect}
          />

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
                  Expected columns: Employee Name, Logged Hours, Leave Hours (optional)
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
        {capacityData && (
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
                  {capacityData.file_name}
                </span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {capacityData.members.length} team members
                  {capacityData.period_start && ` · Period: ${capacityData.period_start}`}
                </span>
              </div>
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <QuickStatCard 
                label="Total Team" 
                value={capacityData.stats.total_members} 
                icon={<Users className="w-4 h-4" />}
                color="text-blue-400"
              />
              <QuickStatCard 
                label="Available" 
                value={capacityData.stats.available} 
                icon={<CheckCircle className="w-4 h-4" />}
                color="text-green-400"
              />
              <QuickStatCard 
                label="On Leave" 
                value={capacityData.stats.on_leave} 
                icon={<Clock className="w-4 h-4" />}
                color="text-yellow-400"
              />
              <QuickStatCard 
                label="No Logs" 
                value={capacityData.stats.no_logs} 
                icon={<AlertTriangle className="w-4 h-4" />}
                color="text-red-400"
              />
            </div>

            {/* Capacity Summary */}
            <div className="mt-4 p-4 rounded-xl border" style={{ 
              background: capacityData.stats.estimated_capacity_percent >= 80 
                ? 'rgba(34,197,94,0.05)' 
                : capacityData.stats.estimated_capacity_percent >= 60 
                ? 'rgba(245,158,11,0.05)' 
                : 'rgba(239,68,68,0.05)',
              borderColor: capacityData.stats.estimated_capacity_percent >= 80 
                ? 'rgba(34,197,94,0.2)' 
                : capacityData.stats.estimated_capacity_percent >= 60 
                ? 'rgba(245,158,11,0.2)' 
                : 'rgba(239,68,68,0.2)'
            }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                    Testing Capacity
                  </span>
                  <div className="text-2xl font-bold mt-1" style={{ 
                    color: capacityData.stats.estimated_capacity_percent >= 80 
                      ? '#22c55e' 
                      : capacityData.stats.estimated_capacity_percent >= 60 
                      ? '#f59e0b' 
                      : '#ef4444'
                  }}>
                    {capacityData.stats.estimated_capacity_percent}%
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Avg Hours/Member</span>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {capacityData.stats.average_hours}h
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// Quick Stat Card
interface QuickStatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}

function QuickStatCard({ label, value, icon, color }: QuickStatCardProps) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <div className={color}>{icon}</div>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
    </div>
  )
}
