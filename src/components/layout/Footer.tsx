// src/components/layout/Footer.tsx
import React from 'react'
import { BRAND } from '@/lib/brand'
import { Logo } from '../ui/Logo'

export const Footer: React.FC = () => {
  const year = new Date().getFullYear()

  return (
    <footer
      className="mt-auto shrink-0 w-full py-4 px-4"
      style={{ borderTop: '1px solid var(--divider)' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <Logo size="sm" animate={false} />
        <span className="text-xs tracking-wide" style={{ color: 'var(--text-muted)' }}>
          &copy; {year} {BRAND.name}
        </span>
        <span className="text-xs" style={{ color: 'var(--divider)' }}>|</span>
        <span className="text-xs italic tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Powered by Intelligence. Built for Quality.
        </span>
      </div>
    </footer>
  )
}
