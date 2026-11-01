// src/modules/StoryPot/Pagination.tsx
import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

interface PaginationProps {
  currentPage: number
  totalPages: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  isDark: boolean
}

export function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  isDark,
}: PaginationProps) {
  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('ellipsis')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis')
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }
    return pages
  }

  return (
    <div 
      className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>
          {startRecord}–{endRecord} of {totalRecords.toLocaleString()}
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-7 px-2 rounded-md border text-xs"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            color: 'var(--text-primary)',
          }}
        >
          {PAGE_SIZE_OPTIONS.map(size => (
            <option key={size} value={size}>{size}/page</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 px-2 rounded-lg text-xs disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {getPageNumbers().map((page, idx) => (
          page === 'ellipsis' ? (
            <span key={`e-${idx}`} className="w-8 text-center">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className="w-8 h-8 rounded-lg text-xs font-medium"
              style={{
                background: currentPage === page 
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                  : 'transparent',
                color: currentPage === page ? 'white' : 'var(--text-secondary)',
              }}
            >
              {page}
            </button>
          )
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 px-2 rounded-lg text-xs disabled:opacity-40"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
