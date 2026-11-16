import { describe, expect, it, vi } from 'vitest'

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from, rpc } }))

import { getActiveSyncJob } from '../syncJobService'

describe('active sync job lookup', () => {
  it('prefers the running job over a newer pending job', async () => {
    const runningJob = { id: 'running-job', status: 'running', project_id: 'project-1' }
    const query = {
      select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(),
      maybeSingle: vi.fn(async () => ({ data: runningJob, error: null })),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    from.mockReturnValue(query)

    const result = await getActiveSyncJob('project-1')

    expect(result?.id).toBe('running-job')
    expect(query.eq).toHaveBeenCalledWith('status', 'running')
    expect(rpc).not.toHaveBeenCalled()
  })
})
