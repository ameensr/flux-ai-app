import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn(async () => ({ data: { session: { access_token: 'test-token' } } })) } },
}))

import { fetchAllWorkPackages, fetchWorkPackages } from '../openproject'

const config = { openproject_url: 'https://tms.ktu.edu.in', openproject_api_key: 'test-key' }

function requestParams(input: RequestInfo | URL): URLSearchParams {
  const url = String(input)
  const apiUrl = url.startsWith('/openproject-api') ? url : new URL(url).searchParams.get('path') || url
  return new URL(apiUrl, 'https://example.test').searchParams
}

function page(ids: number[], total: number, pageSize: number): Response {
  return new Response(JSON.stringify({
    total, pageSize, offset: 1,
    _embedded: { elements: ids.map(id => ({ id })) },
  }), { status: 200 })
}

afterEach(() => vi.unstubAllGlobals())

describe('OpenProject work package fetching', () => {
  it('requests all statuses without the default open-only filter', async () => {
    const fetchMock = vi.fn(async () => page([1], 1, 50))
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchWorkPackages(config, { includeAllStatuses: true })

    expect(result.items).toHaveLength(1)
    const params = requestParams(fetchMock.mock.calls[0][0])
    expect(params.get('filters')).toBe('[]')
    expect(params.has('page')).toBe(false)
    expect(params.get('offset')).toBe('1')
  })

  it('preserves OpenProject default filtering for callers that do not request all statuses', async () => {
    const fetchMock = vi.fn(async () => page([1], 1, 50))
    vi.stubGlobal('fetch', fetchMock)

    await fetchWorkPackages(config)

    expect(requestParams(fetchMock.mock.calls[0][0]).has('filters')).toBe(false)
  })

  it('fails the sync if a later page cannot be fetched', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
      requestParams(input).get('offset') === '1'
        ? page([1, 2], 3, 2)
        : new Response('Gateway error', { status: 502 })
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAllWorkPackages(config, { pageSize: 2, includeAllStatuses: true }))
      .rejects.toThrow('page 2 failed')
  })
})
