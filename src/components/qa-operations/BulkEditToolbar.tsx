// src/components/qa-operations/BulkEditToolbar.tsx
// Shared bulk-edit toolbar for Support Tracker and Release Tracker.
// Supports dropdown, text, number, date, time, datetime-local, and boolean fields.

import React, { useState } from 'react'
import { Pencil, X, CheckCheck, ChevronDown } from 'lucide-react'

export type BulkFieldType = 'dropdown' | 'text' | 'textarea' | 'number' | 'date' | 'time' | 'datetime-local' | 'boolean'

export interface BulkField {
  key: string
  label: string
  type: BulkFieldType
  options?: Array<{ label: string; value: string }>  // required for dropdown / boolean
}

interface Props {
  selectedCount: number
  totalFilteredCount: number
  allFilteredSelected: boolean
  fields: BulkField[]
  isApplying: boolean
  onSelectAllFiltered: () => void
  onClearSelection: () => void
  onApply: (fieldKey: string, value: string) => void
}

export function BulkEditToolbar({
  selectedCount,
  totalFilteredCount,
  allFilteredSelected,
  fields,
  isApplying,
  onSelectAllFiltered,
  onClearSelection,
  onApply,
}: Props) {
  const [fieldKey, setFieldKey] = useState(fields[0]?.key ?? '')
  const [value, setValue] = useState('')

  const currentField = fields.find(f => f.key === fieldKey)

  const handleFieldChange = (key: string) => {
    setFieldKey(key)
    setValue('')
  }

  const isValueReady = value.trim() !== ''

  const handleApply = () => {
    if (!fieldKey || !isValueReady) return
    onApply(fieldKey, value.trim())
    setValue('')
  }

  const renderValueInput = () => {
    if (!currentField) return null
    const inputClass = 'h-7 px-2 bg-surface-secondary/80 border border-border/60 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent'

    switch (currentField.type) {
      case 'dropdown':
        return (
          <div className="relative shrink-0">
            <select
              value={value}
              onChange={e => setValue(e.target.value)}
              className={`${inputClass} pr-6 cursor-pointer appearance-none min-w-[140px]`}
            >
              <option value="">— Select value —</option>
              {currentField.options?.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )

      case 'boolean':
        return (
          <div className="relative shrink-0">
            <select
              value={value}
              onChange={e => setValue(e.target.value)}
              className={`${inputClass} pr-6 cursor-pointer appearance-none min-w-[120px]`}
            >
              <option value="">— Select —</option>
              {(currentField.options ?? [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`New ${currentField.label}…`}
            rows={2}
            className="px-2 py-1 bg-surface-secondary/80 border border-border/60 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none min-w-[220px]"
          />
        )

      case 'number':
        return (
          <input
            type="number"
            min={0}
            step={0.5}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder="0"
            className={`${inputClass} min-w-[90px]`}
          />
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={e => setValue(e.target.value)}
            className={`${inputClass} min-w-[140px]`}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={e => setValue(e.target.value)}
            className={`${inputClass} min-w-[120px]`}
          />
        )

      case 'datetime-local':
        return (
          <input
            type="datetime-local"
            value={value}
            onChange={e => setValue(e.target.value)}
            className={`${inputClass} min-w-[180px]`}
          />
        )

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={`New ${currentField.label}…`}
            className={`${inputClass} min-w-[160px]`}
          />
        )
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-2 px-3.5 py-2.5 rounded-xl border border-accent/30 bg-accent/[0.06] text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
      {/* Selection count */}
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="font-semibold text-text-primary">
          {selectedCount} {selectedCount === 1 ? 'row' : 'rows'} selected
        </span>
      </div>

      <div className="w-px h-4 bg-border/60 shrink-0 self-center" />

      {/* Select all filtered */}
      {!allFilteredSelected && totalFilteredCount > selectedCount && (
        <button
          type="button"
          onClick={onSelectAllFiltered}
          className="flex items-center gap-1 text-accent hover:underline font-semibold shrink-0 cursor-pointer self-center"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          Select all {totalFilteredCount}
        </button>
      )}
      {allFilteredSelected && (
        <span className="text-accent font-semibold shrink-0 flex items-center gap-1 self-center">
          <CheckCheck className="w-3.5 h-3.5" />
          All {totalFilteredCount} selected
        </span>
      )}

      <div className="w-px h-4 bg-border/60 shrink-0 self-center" />

      {/* Field picker */}
      <div className="flex items-center gap-1.5 shrink-0 self-center">
        <Pencil className="w-3 h-3 text-text-muted" />
        <span className="text-text-muted">Update:</span>
        <div className="relative">
          <select
            value={fieldKey}
            onChange={e => handleFieldChange(e.target.value)}
            className="h-7 pl-2 pr-6 bg-surface-secondary/80 border border-border/60 rounded-lg text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer appearance-none"
          >
            {fields.map(f => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
          <ChevronDown className="w-3 h-3 text-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Dynamic value input */}
      <div className="shrink-0 self-center">
        {renderValueInput()}
      </div>

      {/* Apply */}
      <button
        type="button"
        disabled={!isValueReady || isApplying}
        onClick={handleApply}
        className="h-7 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0 active:scale-95 self-center"
      >
        {isApplying ? 'Applying…' : `Apply to ${selectedCount}`}
      </button>

      <div className="w-px h-4 bg-border/60 shrink-0 self-center" />

      {/* Clear */}
      <button
        type="button"
        onClick={onClearSelection}
        className="flex items-center gap-1 text-text-muted hover:text-text-primary transition-colors cursor-pointer shrink-0 self-center"
      >
        <X className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  )
}
