import { describe, expect, it, vi } from 'vitest'

const { from, fetchActivities } = vi.hoisted(() => ({ from: vi.fn(), fetchActivities: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from } }))
vi.mock('../openproject', () => ({ fetchWorkPackageActivities: fetchActivities }))

import { fetchActivitiesIncremental } from '../openproject-incremental-sync'

describe('activity cursor safety', () => {
  it('does not advance the cursor before forwarding history is committed', async () => {
    const query = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(async () => ({
        data: {
          project_id: 'project-1', work_package_id: 123,
          last_activity_id: 10, last_activity_synced_at: '2026-11-04T10:00:00Z',
          total_activities_fetched: 10, last_sync_at: '2026-11-04T10:05:00Z',
        },
        error: null,
      })),
    }
    query.select.mockReturnValue(query)
    query.eq.mockReturnValue(query)
    from.mockReturnValue(query)
    fetchActivities.mockResolvedValue([
      { id: 10, createdAt: '2026-11-04T10:00:00Z' },
      { id: 11, createdAt: '2026-11-05T09:30:00Z' },
    ])

    const result = await fetchActivitiesIncremental(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' }, 'project-1', 123
    )

    expect(result.activities.map(activity => activity.id)).toEqual([11])
    expect(result.lastActivityId).toBe(11)
    expect(from).toHaveBeenCalledTimes(1)
  })
})
