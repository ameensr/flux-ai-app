// Bridge between React idle-timeout hook and non-React services (AI gateway, etc.).
// useIdleTimeout registers the real registrar; services call beginIdleOperation().

type IdleRegistrar = (key: string) => () => void

let registrar: IdleRegistrar | null = null

/** Called by useIdleTimeout on mount / unmount. */
export function bindIdleOperationRegistrar(fn: IdleRegistrar | null): void {
  registrar = fn
}

/**
 * Pause the idle-session timer while a long-running operation is in flight.
 * Returns an unregister function — always call it in `finally`.
 */
export function beginIdleOperation(key: string): () => void {
  if (!registrar) return () => {}
  try {
    return registrar(key)
  } catch {
    return () => {}
  }
}

/** Run an async task while holding an idle lock. */
export async function withIdleOperation<T>(
  key: string,
  task: () => Promise<T>,
): Promise<T> {
  const release = beginIdleOperation(key)
  try {
    return await task()
  } finally {
    release()
  }
}
