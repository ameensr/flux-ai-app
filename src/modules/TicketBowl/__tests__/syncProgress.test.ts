import { describe, expect, it } from 'vitest'
import { getSyncProgressPercent } from '../syncProgress'
import type { TicketBowlSyncProgress } from '../types'

const progress = (phase: TicketBowlSyncProgress['phase'], current: number, total: number): TicketBowlSyncProgress => ({
  phase, current, total, message: '',
})

describe('Ticket Bowl overall sync progress', () => {
  it('keeps advancing when a new phase starts at zero', () => {
    const samples = [
      progress('fetching-tickets', 100, 100),
      progress('saving-snapshots', 0, 100),
      progress('saving-snapshots', 100, 100),
      progress('fetching-activities', 0, 25),
      progress('fetching-activities', 25, 25),
      progress('saving-history', 0, 0),
      progress('recalculating-counts', 100, 100),
      progress('committing', 0, 1),
      progress('complete', 1, 1),
    ]
    const percentages = samples.map(getSyncProgressPercent)
    expect(percentages).toEqual([...percentages].sort((a, b) => a - b))
    expect(percentages.at(-1)).toBe(100)
    expect(percentages.slice(0, -1).every(value => value < 100)).toBe(true)
  })

  it('clamps unexpected counters and handles unknown totals', () => {
    expect(getSyncProgressPercent(progress('fetching-tickets', 10, 0))).toBe(0)
    expect(getSyncProgressPercent(progress('saving-snapshots', -5, 10))).toBe(30)
    expect(getSyncProgressPercent(progress('fetching-activities', 20, 10))).toBe(80)
  })
})
