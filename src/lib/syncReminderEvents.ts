// src/lib/syncReminderEvents.ts
// Lightweight event bus for sync lifecycle signals.
// CachedStoryPot emits; useSyncReminder listens.

type SyncEvent = 'sync:start' | 'sync:success' | 'sync:fail'

type Listener = () => void
const listeners = new Map<SyncEvent, Set<Listener>>()

export function onSyncEvent(event: SyncEvent, fn: Listener): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event)!.add(fn)
  return () => listeners.get(event)?.delete(fn)
}

export function emitSyncEvent(event: SyncEvent): void {
  listeners.get(event)?.forEach(fn => fn())
}
