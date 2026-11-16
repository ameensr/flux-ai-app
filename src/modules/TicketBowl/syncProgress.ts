import type { TicketBowlSyncProgress } from './types'

// Stage ranges keep overall progress moving forward as each phase starts at zero.
// The result is an estimate; the number of journals is only known after fetching tickets.
const PHASE_RANGES: Record<Exclude<TicketBowlSyncProgress['phase'], 'complete' | 'error'>, [number, number]> = {
  'fetching-tickets': [0, 30],
  'saving-snapshots': [30, 45],
  'fetching-activities': [45, 80],
  'saving-history': [80, 90],
  'recalculating-counts': [90, 97],
  committing: [97, 99],
}

export function getSyncProgressPercent(progress: TicketBowlSyncProgress): number {
  if (progress.phase === 'complete') return 100
  if (progress.phase === 'error') return 0

  const [start, end] = PHASE_RANGES[progress.phase]
  if (!Number.isFinite(progress.current) || !Number.isFinite(progress.total) || progress.total <= 0) {
    return start
  }

  const fraction = Math.min(1, Math.max(0, progress.current / progress.total))
  return Math.min(99, Math.round(start + (end - start) * fraction))
}
