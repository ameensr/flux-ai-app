// src/hooks/useActiveOperation.ts
// Convenience hook to lock the idle timer during long-running operations
// (file uploads, AI generation, report exports, etc.)
//
// Usage:
//   const { withOperation } = useActiveOperation()
//   await withOperation('ai-generation', async () => { /* long-running work */ })
//
// Or manual control:
//   const { start, stop } = useActiveOperation()
//   start('file-upload')
//   // ... later when done:
//   stop('file-upload')

import { useCallback, useRef } from 'react'
import { useRegisterActiveOperation } from '@/App'

interface UseActiveOperationReturn {
  /** Wrap an async operation — idle timer is paused for its duration */
  withOperation: <T>(key: string, fn: () => Promise<T>) => Promise<T>
  /** Manually start locking the idle timer for an operation */
  start: (key: string) => void
  /** Manually stop locking (call when the operation completes) */
  stop: (key: string) => void
}

export function useActiveOperation(): UseActiveOperationReturn {
  const registerOperation = useRegisterActiveOperation()
  const unregisterMapRef = useRef<Map<string, () => void>>(new Map())

  const start = useCallback((key: string) => {
    // If already registered, don't double-register
    if (unregisterMapRef.current.has(key)) return
    const unregister = registerOperation(key)
    unregisterMapRef.current.set(key, unregister)
  }, [registerOperation])

  const stop = useCallback((key: string) => {
    const unregister = unregisterMapRef.current.get(key)
    if (unregister) {
      unregister()
      unregisterMapRef.current.delete(key)
    }
  }, [])

  const withOperation = useCallback(async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    start(key)
    try {
      return await fn()
    } finally {
      stop(key)
    }
  }, [start, stop])

  return { withOperation, start, stop }
}
