import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

/**
 * Declarative scroll lock for popups/modals/drawers.
 * Mount while the overlay is open (or pass `lock={isOpen}`).
 */
export function BodyScrollLock({ lock = true }: { lock?: boolean }) {
  useBodyScrollLock(lock)
  return null
}
