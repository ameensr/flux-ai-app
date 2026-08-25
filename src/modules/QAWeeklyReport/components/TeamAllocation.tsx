import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Check, CheckCircle2, AlertTriangle, RefreshCw, Info, Plus,
  Users, Sparkles, Headphones, Bot, UserPlus,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { AutoFetchEmployeesModal } from './AutoFetchEmployeesModal'
import { getSectionVisibility } from './DashboardSectionToggles'
import { getStatusDisplay } from '../types/teamCapacity'
import type { QAReportForm } from '../types'
import {
  ALLOCATION_CATEGORIES,
  EMPLOYEE_DRAG_TYPE,
  addEmployeeUnique,
  buildEmployeePool,
  cleanEmployeeName,
  readAllocationAssignments,
  readDraggedEmployeeName,
  type AllocationFieldKey,
  type PoolEmployee,
} from '../utils/employeePool'
import {
  CAPACITY_FETCH_MESSAGES,
  requestCapacityUploadFocus,
  subscribeCapacityFetchSignal,
} from '../utils/capacityFetchBus'

const ACCENT_TINT = 'rgba(99,102,241,0.12)'
const ACCENT_TINT_STRONG = 'rgba(99,102,241,0.18)'
const ACCENT_LINE = 'rgba(99,102,241,0.38)'
const ACCENT_RING = '0 0 0 3px rgba(99,102,241,0.15)'

const CATEGORY_META: Record<
  AllocationFieldKey,
  { icon: typeof Sparkles; tint: string; line: string; soft: string; iconColor: string }
> = {
  newFeatureTeam: {
    icon: Sparkles,
    tint: 'rgba(245,158,11,0.14)',
    line: 'rgba(245,158,11,0.42)',
    soft: 'rgba(245,158,11,0.08)',
    iconColor: '#d97706',
  },
  supportTeam: {
    icon: Headphones,
    tint: 'rgba(59,130,246,0.14)',
    line: 'rgba(59,130,246,0.42)',
    soft: 'rgba(59,130,246,0.08)',
    iconColor: '#2563eb',
  },
  automationTeam: {
    icon: Bot,
    tint: 'rgba(168,85,247,0.14)',
    line: 'rgba(168,85,247,0.42)',
    soft: 'rgba(168,85,247,0.08)',
    iconColor: '#9333ea',
  },
}

interface AllocationFieldProps {
  fieldKey: AllocationFieldKey
  label: string
  tags: string[]
  onChange: (t: string[]) => void
  onDropEmployee?: (name: string) => void
  dragActive?: boolean
}

function AllocationField({
  fieldKey,
  label,
  tags,
  onChange,
  onDropEmployee,
  dragActive,
}: AllocationFieldProps) {
  const [input, setInput] = useState('')
  const [isOver, setIsOver] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const meta = CATEGORY_META[fieldKey]
  const Icon = meta.icon

  const add = () => {
    const v = input.trim()
    if (v) onChange(addEmployeeUnique(tags, v))
    setInput('')
  }

  const acceptsDrag = (e: React.DragEvent) => {
    if (!onDropEmployee) return false
    if (dragActive) return true
    try {
      return Array.from(e.dataTransfer?.types || []).includes(EMPLOYEE_DRAG_TYPE)
    } catch {
      return false
    }
  }

  const active = isOver || isFocused
  const borderColor = active
    ? 'var(--accent)'
    : dragActive || isOver
      ? meta.line
      : 'var(--border)'

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-4 transition-colors"
      style={{
        background: isOver ? meta.soft : 'var(--input-bg)',
        border: `1px ${dragActive && !isOver ? 'dashed' : 'solid'} ${borderColor}`,
        boxShadow: active ? ACCENT_RING : 'none',
      }}
      onDragOver={e => {
        if (!acceptsDrag(e)) return
        e.preventDefault()
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        if (!isOver) setIsOver(true)
      }}
      onDragLeave={e => {
        if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
        setIsOver(false)
      }}
      onDrop={e => {
        if (!acceptsDrag(e)) return
        e.preventDefault()
        setIsOver(false)
        const name = readDraggedEmployeeName(e.dataTransfer)
        if (name) onDropEmployee?.(name)
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: meta.tint, color: 'var(--text-primary)' }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: meta.iconColor }} />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {label}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {dragActive ? 'Drop to assign' : 'Type or drop names'}
            </p>
          </div>
        </div>
        <span
          className="text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-lg shrink-0"
          style={{
            color: tags.length ? 'var(--accent)' : 'var(--text-muted)',
            background: tags.length ? ACCENT_TINT : 'transparent',
            border: tags.length ? `1px solid ${ACCENT_LINE}` : '1px solid transparent',
          }}
        >
          {tags.length}
        </span>
      </div>

      <div
        onMouseDown={e => {
          if (e.target === e.currentTarget) inputRef.current?.focus()
        }}
        className="flex flex-wrap items-center gap-1.5 min-h-[44px] px-2.5 py-2 rounded-xl cursor-text"
        style={{
          background: 'var(--card-bg)',
          border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
          transition: 'border-color 0.15s',
        }}
      >
        {tags.map(t => (
          <span
            key={t}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-[3px] rounded-lg text-[11px] font-semibold max-w-full"
            style={{
              background: meta.tint,
              border: `1px solid ${meta.line}`,
              color: 'var(--text-primary)',
            }}
          >
            <span className="truncate">{t}</span>
            <button
              type="button"
              onClick={() => onChange(tags.filter(x => x !== t))}
              aria-label={`Remove ${t} from ${label}`}
              className="p-0.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
              style={{ color: 'var(--accent)' }}
              onMouseEnter={e => { e.currentTarget.style.background = ACCENT_TINT_STRONG }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="bg-transparent text-[13px] focus:outline-none flex-1 min-w-[120px] py-0.5"
          style={{ color: 'var(--text-primary)' }}
          placeholder={tags.length ? 'Add another…' : 'Type a name and press Enter'}
          aria-label={`Add employee to ${label}`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
      </div>
    </div>
  )
}

type FetchPhase = 'idle' | 'loading' | 'success' | 'empty' | 'error'

interface FetchState {
  phase: FetchPhase
  count?: number
  fileName?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export const TeamAllocation: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const [modalOpen, setModalOpen] = useState(false)
  const [fetchState, setFetchState] = useState<FetchState>({ phase: 'idle' })
  const [dragActive, setDragActive] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const hintTimer = useRef<number | null>(null)

  const assignments = useMemo(() => readAllocationAssignments(form), [form])

  const pool = useMemo(
    () => buildEmployeePool(form.teamCapacity, assignments),
    [form.teamCapacity, assignments],
  )

  const assignedCount = useMemo(() => pool.filter(p => p.assignedTo.length > 0).length, [pool])
  const coveragePct = pool.length > 0 ? Math.round((assignedCount / pool.length) * 100) : 0
  const selected = useMemo(
    () => pool.find(p => p.key === selectedKey) ?? null,
    [pool, selectedKey],
  )

  const totalAllocated = useMemo(
    () => ALLOCATION_CATEGORIES.reduce((sum, cat) => sum + assignments[cat.key].length, 0),
    [assignments],
  )

  const capacityFileName: string | undefined = form.teamCapacity?.file_name
  const capacitySectionHidden = getSectionVisibility(form).show_teamCapacity === false

  useEffect(() => {
    return subscribeCapacityFetchSignal(signal => {
      if (signal.kind === 'fetch-start') {
        setFetchState({ phase: 'loading', fileName: signal.fileName })
      } else if (signal.kind === 'fetch-success') {
        setFetchState({
          phase: signal.count > 0 ? 'success' : 'empty',
          count: signal.count,
          fileName: signal.fileName,
        })
      } else if (signal.kind === 'fetch-error') {
        setFetchState({ phase: signal.reason === 'empty' ? 'empty' : 'error' })
      }
    })
  }, [])

  useEffect(() => {
    if (fetchState.phase !== 'success') return
    const t = window.setTimeout(() => setFetchState({ phase: 'idle' }), 6000)
    return () => window.clearTimeout(t)
  }, [fetchState])

  useEffect(() => {
    return () => {
      if (hintTimer.current) window.clearTimeout(hintTimer.current)
    }
  }, [])

  const showHint = (message: string) => {
    setHint(message)
    if (hintTimer.current) window.clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setHint(null), 3200)
  }

  const setCategory = (key: AllocationFieldKey, next: string[]) => {
    setForm({ [key]: next } as Partial<QAReportForm>)
  }

  const assignEmployee = (name: string, key: AllocationFieldKey) => {
    const label = ALLOCATION_CATEGORIES.find(c => c.key === key)?.label ?? key
    const clean = cleanEmployeeName(name)
    if (!clean) return
    const current = readAllocationAssignments(useQAReportStore.getState().form)[key]
    const next = addEmployeeUnique(current, clean)
    if (next === current) {
      showHint(`${clean} is already in ${label}.`)
      return
    }
    setCategory(key, next)
    showHint(`${clean} added to ${label}.`)
  }

  const handleGoToUpload = () => {
    setModalOpen(false)
    window.setTimeout(() => requestCapacityUploadFocus(), 220)
  }

  const statusLine = (() => {
    switch (fetchState.phase) {
      case 'loading':
        return {
          text: CAPACITY_FETCH_MESSAGES.loading,
          tone: 'var(--accent)',
          bg: ACCENT_TINT,
          border: ACCENT_LINE,
          icon: <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />,
          dismissible: false,
        }
      case 'success':
        return {
          text: `${CAPACITY_FETCH_MESSAGES.success}${fetchState.count ? ` ${fetchState.count} employee${fetchState.count === 1 ? '' : 's'} available.` : ''}`,
          tone: '#16a34a',
          bg: 'rgba(34,197,94,0.12)',
          border: 'rgba(34,197,94,0.38)',
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
          dismissible: true,
        }
      case 'empty':
        return {
          text: CAPACITY_FETCH_MESSAGES.empty,
          tone: '#d97706',
          bg: 'rgba(245,158,11,0.12)',
          border: 'rgba(245,158,11,0.38)',
          icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
          dismissible: true,
        }
      case 'error':
        return {
          text: CAPACITY_FETCH_MESSAGES.error,
          tone: '#dc2626',
          bg: 'rgba(239,68,68,0.12)',
          border: 'rgba(239,68,68,0.38)',
          icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
          dismissible: true,
        }
      default:
        return null
    }
  })()

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: ACCENT_TINT, border: `1px solid ${ACCENT_LINE}` }}
          >
            <Users className="h-4.5 w-4.5" style={{ color: 'var(--accent)', width: 18, height: 18 }} />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Team Resource Allocation
            </h3>
            <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Pull your team from Capacity Overview, then place people into feature, support, or automation.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-haspopup="dialog"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium tracking-wide transition-all active:scale-[0.98] shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-1"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.background = ACCENT_TINT
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <UserPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
          Auto Fetch
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'In pool', value: pool.length },
          { label: 'Assigned', value: assignedCount },
          { label: 'Placements', value: totalAllocated },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl px-3 py-2.5 text-center"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <div className="text-lg font-black tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {stat.value}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {pool.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Coverage
            </span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
              {coveragePct}%
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coveragePct}%` }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.55))',
              }}
            />
          </div>
        </div>
      )}

      {/* Loading / result status */}
      <AnimatePresence initial={false}>
        {statusLine && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[11px] font-semibold"
            style={{
              background: statusLine.bg,
              border: `1px solid ${statusLine.border}`,
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ color: statusLine.tone }} className="flex shrink-0">
              {statusLine.icon}
            </span>
            <span className="min-w-0">{statusLine.text}</span>
            {statusLine.dismissible && (
              <button
                type="button"
                onClick={() => setFetchState({ phase: 'idle' })}
                aria-label="Dismiss message"
                className="ml-auto shrink-0 p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee pool */}
      {pool.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              Available employees
            </span>
            <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {assignedCount}/{pool.length} assigned
            </span>
          </div>

          <ul
            className="flex flex-wrap gap-2 list-none m-0 p-3 rounded-2xl"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
          >
            {pool.map(emp => (
              <li key={emp.key} className="max-w-full">
                <EmployeeChip
                  employee={emp}
                  isSelected={selectedKey === emp.key}
                  onToggleSelect={() =>
                    setSelectedKey(prev => (prev === emp.key ? null : emp.key))
                  }
                  onDragStart={() => setDragActive(true)}
                  onDragEnd={() => setDragActive(false)}
                />
              </li>
            ))}
          </ul>

          <AnimatePresence initial={false}>
            {selected && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-wrap items-center gap-1.5 p-3 rounded-2xl"
                  style={{ background: ACCENT_TINT, border: `1px solid ${ACCENT_LINE}` }}
                >
                  <span className="text-[11px] mr-0.5" style={{ color: 'var(--text-secondary)' }}>
                    Assign{' '}
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selected.name}
                    </span>{' '}
                    to
                  </span>
                  {ALLOCATION_CATEGORIES.map(cat => {
                    const already = selected.assignedTo.includes(cat.key)
                    const meta = CATEGORY_META[cat.key]
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => {
                          assignEmployee(selected.name, cat.key)
                          setSelectedKey(null)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                        style={{
                          background: already ? 'transparent' : meta.tint,
                          border: `1px solid ${already ? 'var(--border)' : meta.line}`,
                          color: already ? 'var(--text-muted)' : 'var(--text-primary)',
                        }}
                      >
                        {already
                          ? <Check className="w-3 h-3" />
                          : <Plus className="w-3 h-3" style={{ color: 'var(--accent)' }} />}
                        {cat.label}
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedKey(null)}
                    className="ml-auto px-2 py-1 rounded-lg text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p
            className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[10px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            {hint ?? (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot assigned />
                  Assigned
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <StatusDot />
                  Unassigned
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Drag onto a category, or select to assign
                </span>
              </>
            )}
          </p>
        </div>
      ) : (
        <div
          className="flex items-start gap-3 px-4 py-3.5 rounded-2xl"
          style={{ background: 'var(--input-bg)', border: '1px dashed var(--border)' }}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: ACCENT_TINT }}
          >
            <Info className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          </span>
          <p className="text-[11px] leading-relaxed pt-1" style={{ color: 'var(--text-secondary)' }}>
            No employees fetched yet. Use{' '}
            <span className="font-semibold" style={{ color: 'var(--accent)' }}>
              Auto Fetch Employees
            </span>{' '}
            to pull your team from Team Capacity Overview, or type names into the categories below.
          </p>
        </div>
      )}

      {/* Allocation categories */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          Allocation categories
        </span>
        <div className="grid grid-cols-1 gap-3">
          {ALLOCATION_CATEGORIES.map(cat => (
            <AllocationField
              key={cat.key}
              fieldKey={cat.key}
              label={cat.label}
              tags={assignments[cat.key]}
              onChange={v => setCategory(cat.key, v)}
              onDropEmployee={name => assignEmployee(name, cat.key)}
              dragActive={dragActive}
            />
          ))}
        </div>
      </div>

      <AutoFetchEmployeesModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onGoToUpload={handleGoToUpload}
        loadedFileName={capacityFileName}
        capacitySectionHidden={capacitySectionHidden}
      />
    </GlassCard>
  )
}

interface EmployeeChipProps {
  employee: PoolEmployee
  isSelected: boolean
  onToggleSelect: () => void
  onDragStart: () => void
  onDragEnd: () => void
}

function StatusDot({ assigned }: { assigned?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="w-1.5 h-1.5 rounded-full shrink-0"
      style={{ background: assigned ? '#22c55e' : '#ef4444' }}
    />
  )
}

function EmployeeChip({
  employee,
  isSelected,
  onToggleSelect,
  onDragStart,
  onDragEnd,
}: EmployeeChipProps) {
  const isAssigned = employee.assignedTo.length > 0
  const statusInfo = employee.status ? getStatusDisplay(employee.status) : null
  const assignedLabels = employee.assignedTo
    .map(key => ALLOCATION_CATEGORIES.find(c => c.key === key)?.label)
    .filter(Boolean)
    .join(', ')

  const detail = [
    employee.employeeId ? `ID: ${employee.employeeId}` : '',
    assignedLabels ? `Assigned to ${assignedLabels}` : 'Not assigned',
    statusInfo ? `Capacity: ${statusInfo.label}` : '',
    employee.source === 'manual' ? 'Added manually' : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <button
      type="button"
      draggable
      onDragStart={e => {
        try {
          e.dataTransfer.setData(EMPLOYEE_DRAG_TYPE, employee.name)
          e.dataTransfer.setData('text/plain', employee.name)
          e.dataTransfer.effectAllowed = 'copy'
        } catch {
          /* older browsers — the select-to-assign path still works */
        }
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onClick={onToggleSelect}
      onKeyDown={e => {
        if (e.key === 'Escape' && isSelected) {
          e.preventDefault()
          onToggleSelect()
        }
      }}
      aria-pressed={isSelected}
      aria-label={`${employee.name} — ${detail}`}
      title={`${employee.name} · ${detail}`}
      className="flex items-center gap-2 max-w-full pl-1.5 pr-2.5 py-1 rounded-xl text-[11px] font-medium cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
      style={{
        background: isSelected ? ACCENT_TINT : 'var(--card-bg)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        color: 'var(--text-primary)',
        boxShadow: isSelected ? ACCENT_RING : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
      }}
    >
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold"
        style={{
          background: isAssigned ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.12)',
          color: isAssigned ? '#16a34a' : '#dc2626',
        }}
      >
        {initials(employee.name)}
      </span>
      <StatusDot assigned={isAssigned} />
      <span className="truncate">{employee.name}</span>
    </button>
  )
}
