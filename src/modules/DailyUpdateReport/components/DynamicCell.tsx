// src/modules/DailyUpdateReport/components/DynamicCell.tsx
// Shared cell display/editor renderer for dynamic (metadata-driven) columns,
// used by both SupportExceptionLog and ReleaseTestingStatus so type-specific
// editing behavior (dropdown, multiselect, boolean, url, etc.) stays
// consistent across both QA Daily Update tables.

import React from 'react'
import { Calendar, Link as LinkIcon, User as UserIcon } from 'lucide-react'
import type { ColumnConfig, ColumnType } from '../types'

export function defaultWidthForType(type: ColumnType): number {
  switch (type) {
    case 'long_text': return 220
    case 'short_text': return 150
    case 'number': return 110
    case 'percentage': return 110
    case 'date': return 140
    case 'datetime': return 170
    case 'dropdown': return 150
    case 'multiselect': return 200
    case 'status': return 130
    case 'boolean': return 100
    case 'user': return 150
    case 'url': return 200
    default: return 150
  }
}

interface DisplayProps {
  column: ColumnConfig
  value: any
}

/** Read-only cell rendering (non-editing state) */
export const CellDisplay: React.FC<DisplayProps> = ({ column, value }) => {
  if (value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0)) {
    return <span className="text-[10px] italic text-text-muted select-none opacity-30">—</span>
  }

  switch (column.column_type) {
    case 'date':
      return (
        <span className="flex items-center gap-1.5 text-xs">
          <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" />
          <span className="font-mono font-medium">{value}</span>
        </span>
      )
    case 'datetime':
      return <span className="font-mono font-medium text-xs">{value}</span>
    case 'number':
      return <span className="font-mono font-semibold">{value}</span>
    case 'percentage':
      return <span className="font-mono font-semibold">{value}%</span>
    case 'boolean':
      return (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${value === true || value === 'Yes' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-white/5 text-text-muted border border-white/10'}`}>
          {value === true || value === 'Yes' ? 'Yes' : 'No'}
        </span>
      )
    case 'multiselect': {
      const items: string[] = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : [])
      return (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent-gold/10 text-accent-gold border border-accent-gold/20 font-semibold">{item}</span>
          ))}
        </div>
      )
    }
    case 'status':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-gold/10 text-accent-gold border border-accent-gold/20">{value}</span>
    case 'user':
      return (
        <span className="flex items-center gap-1.5 text-xs">
          <UserIcon className="w-3.5 h-3.5 text-text-muted shrink-0" />
          {value}
        </span>
      )
    case 'url':
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline truncate max-w-full"
        >
          <LinkIcon className="w-3 h-3 shrink-0" />
          <span className="truncate">{value}</span>
        </a>
      )
    case 'long_text':
      return <span className="whitespace-pre-wrap break-words leading-relaxed">{value}</span>
    default:
      return <span>{value}</span>
  }
}

interface EditorProps {
  column: ColumnConfig
  value: any
  onChange: (val: any) => void
  onBlur: () => void
  inputRef?: React.Ref<any>
}

/** Editable cell input, keyed to the column's type. */
export const CellEditor: React.FC<EditorProps> = ({ column, value, onChange, onBlur, inputRef }) => {
  const baseInputClass = "w-full h-full bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-1.5 focus:ring-0 font-sans font-semibold"

  switch (column.column_type) {
    case 'long_text':
      return (
        <textarea
          ref={inputRef as any}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          placeholder={column.placeholder || undefined}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onBlur() } }}
          className="w-full h-24 bg-transparent focus:outline-none text-xs text-[var(--text-primary)] border-none p-2 focus:ring-0 resize-y font-sans leading-relaxed"
        />
      )
    case 'number':
      return (
        <input
          ref={inputRef as any}
          type="number"
          value={value ?? ''}
          placeholder={column.placeholder || undefined}
          onChange={e => { const v = e.target.value; onChange(v === '' ? '' : parseFloat(v)) }}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') onBlur() }}
          className={baseInputClass}
        />
      )
    case 'percentage':
      return (
        <input
          ref={inputRef as any}
          type="number"
          min={0}
          max={100}
          value={value ?? ''}
          placeholder={column.placeholder || '0-100'}
          onChange={e => { const v = e.target.value; onChange(v === '' ? '' : Math.max(0, Math.min(100, parseFloat(v)))) }}
          onBlur={onBlur}
          onKeyDown={e => { if (e.key === 'Enter') onBlur() }}
          className={baseInputClass}
        />
      )
    case 'date':
      return (
        <input
          ref={inputRef as any}
          type="date"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          className={`${baseInputClass} dark:[color-scheme:dark]`}
        />
      )
    case 'datetime':
      return (
        <input
          ref={inputRef as any}
          type="datetime-local"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          className={`${baseInputClass} dark:[color-scheme:dark]`}
        />
      )
    case 'dropdown':
    case 'status': {
      const options = column.dropdown_options.map(o => o.label)
      return (
        <select
          ref={inputRef as any}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${baseInputClass} cursor-pointer`}
        >
          <option value="" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">Choose Option...</option>
          {options.map(opt => (
            <option key={opt} value={opt} className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">{opt}</option>
          ))}
        </select>
      )
    }
    case 'multiselect': {
      const options = column.dropdown_options.map(o => o.label)
      const selected: string[] = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : [])
      return (
        <div className="w-full h-full max-h-32 overflow-y-auto p-2 flex flex-col gap-1 bg-[var(--surface-elevated)]">
          {options.length === 0 && <span className="text-[10px] italic text-text-muted">No options configured</span>}
          {options.map(opt => (
            <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={e => {
                  const next = e.target.checked ? [...selected, opt] : selected.filter(s => s !== opt)
                  onChange(next)
                }}
                className="rounded border-white/20 text-accent-gold focus:ring-0"
              />
              {opt}
            </label>
          ))}
          <button onMouseDown={e => e.preventDefault()} onClick={onBlur} className="text-[10px] font-bold text-accent-gold mt-1 self-end">Done</button>
        </div>
      )
    }
    case 'boolean':
      return (
        <select
          ref={inputRef as any}
          value={value === true || value === 'Yes' ? 'Yes' : value === false || value === 'No' ? 'No' : ''}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className={`${baseInputClass} cursor-pointer`}
        >
          <option value="" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">—</option>
          <option value="Yes" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">Yes</option>
          <option value="No" className="bg-[var(--surface-elevated)] text-[var(--text-primary)]">No</option>
        </select>
      )
    case 'user':
      return (
        <input
          ref={inputRef as any}
          type="text"
          value={value ?? ''}
          placeholder={column.placeholder || 'Team member name'}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') onBlur() }}
          className={baseInputClass}
        />
      )
    case 'url':
      return (
        <input
          ref={inputRef as any}
          type="url"
          value={value ?? ''}
          placeholder={column.placeholder || 'https://...'}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') onBlur() }}
          className={baseInputClass}
        />
      )
    default: // short_text
      return (
        <input
          ref={inputRef as any}
          type="text"
          value={value ?? ''}
          placeholder={column.placeholder || undefined}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          onPaste={e => e.stopPropagation()}
          onKeyDown={e => { if (e.key === 'Enter') onBlur() }}
          className={baseInputClass}
        />
      )
  }
}
