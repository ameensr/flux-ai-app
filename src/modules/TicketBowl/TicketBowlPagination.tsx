// src/modules/TicketBowl/TicketBowlPagination.tsx
import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TicketBowlPaginationProps {
  page: number
  pageSize: number
  total: number
  totalPages: number
  onPageChange: (newPage: number) => void
  onPageSizeChange: (newPageSize: number) => void
  disabled?: boolean
}

export function TicketBowlPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  disabled = false,
}: TicketBowlPaginationProps) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted py-2">
      {/* Total matching items info */}
      <div className="flex items-center gap-2">
        <span>
          Showing <span className="font-semibold text-text-primary">{startItem}</span> to{' '}
          <span className="font-semibold text-text-primary">{endItem}</span> of{' '}
          <span className="font-semibold text-text-primary">{total.toLocaleString()}</span> tickets
        </span>

        {/* Page size selector */}
        <div className="flex items-center gap-1.5 ml-4">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="px-2 py-1 rounded border border-border/70 bg-surface text-text-primary text-xs focus:ring-1 focus:ring-accent cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || disabled}
          title="First Page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || disabled}
          title="Previous Page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        <span className="px-3 font-medium text-text-primary">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || disabled}
          title="Next Page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || disabled}
          title="Last Page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

