// src/modules/StoryPot/DropdownPortal.tsx
import React, { useRef, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface DropdownPortalProps {
  isOpen: boolean
  onClose: () => void
  triggerRef: React.RefObject<HTMLElement | null>
  children: React.ReactNode
  isDark: boolean
}

export function DropdownPortal({ isOpen, onClose, triggerRef, children, isDark }: DropdownPortalProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      })
    }
  }, [isOpen, triggerRef])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed rounded-xl border shadow-2xl"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: 200,
        zIndex: 99999,
        background: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(12px)',
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
      }}
    >
      {children}
    </div>,
    document.body
  )
}
