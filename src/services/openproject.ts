// src/services/openproject.ts
// OpenProject API integration service

export interface OpenProjectConfig {
  openproject_url: string
  openproject_api_key: string
  openproject_project_id?: string
}

export interface OpenProjectProject {
  id: number
  name: string
  identifier: string
  description?: { raw: string }
  status: string
  _links: {
    self: { href: string }
  }
}

export interface OpenProjectWorkPackage {
  id: number
  subject: string
  description?: { raw: string }
  startDate?: string
  dueDate?: string
  createdAt?: string
  updatedAt?: string
  percentageDone?: number
  estimatedTime?: string
  spentTime?: string
  storyPoints?: number
  // Custom fields (OpenProject custom field format)
  customField1?: string | null  // Testing Status
  customField2?: string | null  // Is QA Missed
  customField3?: string | null  // QA Confirmation
  [key: string]: unknown  // Allow dynamic custom fields
  _links: {
    type: { href: string; title: string }
    status: { href: string; title: string }
    priority: { href: string; title: string }
    assignee?: { href: string; title: string }
    responsible?: { href: string; title: string }
    project: { href: string; title: string }
    author?: { href: string; title: string }
    version?: { href: string; title: string }
    customField1?: { href: string; title: string }  // Testing Status
    customField2?: { href: string; title: string }  // Is QA Missed  
    customField3?: { href: string; title: string }  // QA Confirmation
  }
}

export interface WorkPackageFilters {
  status?: string[]
  type?: string[]
  priority?: string[]
  assignee?: string
  customField9?: string // Release custom field - use option ID for API filtering
  updatedAfter?: string
  pageSize?: number
  offset?: number // 1-based offset
  page?: number // 1-based page number (alternative to offset)
  sortBy?: string
}

export interface WorkPackageStats {
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byPriority: Record<string, number>
  overdue: number
  unassigned: number
  completedPercentage: number
}

export interface PaginatedWorkPackages {
  items: OpenProjectWorkPackage[]
  total: number
  pageSize: number
  offset: number
}

function buildAuthHeader(apiKey: string): string {
  return `Basic ${btoa(`apikey:${apiKey}`)}`
}

// Check if we should use the proxy (production)
function shouldUseProxy(): boolean {
  return !import.meta.env.DEV
}

// Get the Supabase Edge Function URL for the proxy
function getProxyUrl(): string {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  return `${supabaseUrl}/functions/v1/openproject-proxy`
}

function buildBaseUrl(url: string): string {
  const cleanUrl = url.replace(/\/$/, '')
  
  // In development, route through Vite proxy to avoid CORS
  if (import.meta.env.DEV && cleanUrl.includes('tms.ktu.edu.in')) {
    return '/openproject-api'
  }
  
  return cleanUrl
}

// Make a proxied request to OpenProject API
async function proxyFetch(
  config: { openproject_url: string; openproject_api_key: string },
  apiPath: string
): Promise<Response> {
  const proxyUrl = `${getProxyUrl()}?path=${encodeURIComponent(apiPath)}`
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
  
  return fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      openproject_url: config.openproject_url,
      openproject_api_key: config.openproject_api_key,
    }),
  })
}

export async function testOpenProjectConnection(
  config: OpenProjectConfig
): Promise<{ success: boolean; message: string; user?: { name: string; email: string } }> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) {
    return { success: false, message: 'URL and API Key are required' }
  }

  try {
    let res: Response
    
    if (shouldUseProxy()) {
      res = await proxyFetch(config, '/api/v3/users/me')
    } else {
      res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/users/me`, {
        headers: { Authorization: buildAuthHeader(openproject_api_key) },
      })
    }
    
    if (!res.ok) {
      if (res.status === 401) return { success: false, message: 'Invalid API Key' }
      if (res.status === 403) return { success: false, message: 'Access forbidden. Check permissions.' }
      return { success: false, message: `Connection failed (${res.status})` }
    }
    const user = await res.json()
    return {
      success: true,
      message: `Connected as ${user.name || user.login}`,
      user: { name: user.name || user.login, email: user.email },
    }
  } catch (err) {
    console.error('OpenProject connection error:', err)
    return { success: false, message: 'Failed to connect. Check the URL.' }
  }
}

export async function fetchOpenProjectProjects(config: OpenProjectConfig): Promise<OpenProjectProject[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  const allProjects: OpenProjectProject[] = []
  let page = 1
  const pageSize = 100

  while (true) {
    let res: Response
    const apiPath = `/api/v3/projects?pageSize=${pageSize}&offset=${page}&sortBy=[["name","asc"]]`

    if (shouldUseProxy()) {
      res = await proxyFetch(config, apiPath)
    } else {
      res = await fetch(`${buildBaseUrl(openproject_url)}${apiPath}`, {
        headers: { Authorization: buildAuthHeader(openproject_api_key) },
      })
    }

    if (!res.ok) throw new Error(`Failed to fetch projects (page ${page}): ${res.status}`)

    const data = await res.json()
    const projects: OpenProjectProject[] = data._embedded?.elements || []

    allProjects.push(...projects)

    const total: number = data.total ?? 0
    console.log(`[fetchOpenProjectProjects] page=${page} got=${projects.length} total=${total} accumulated=${allProjects.length}`)

    // Stop when we have all projects or the page returned nothing
    if (projects.length === 0 || allProjects.length >= total) break

    page++
  }

  return allProjects
}

export async function fetchWorkPackages(
  config: OpenProjectConfig,
  filters?: WorkPackageFilters
): Promise<PaginatedWorkPackages> {
  const { openproject_url, openproject_api_key, openproject_project_id } = config
  if (!openproject_url || !openproject_api_key) {
    return { items: [], total: 0, pageSize: 0, offset: 0 }
  }

  const baseUrl = buildBaseUrl(openproject_url)
  const params = new URLSearchParams()

  // Pagination - in OpenProject v3, offset is the 1-based page index
  const pageOffset = filters?.offset ?? filters?.page ?? 1
  params.set('offset', String(pageOffset))
  params.set('pageSize', String(filters?.pageSize || 50))
  if (filters?.page) {
    params.set('page', String(filters.page))
  }

  // Sorting
  if (filters?.sortBy) {
    params.set('sortBy', filters.sortBy)
  } else {
    params.set('sortBy', '[["updatedAt","desc"]]')
  }

  // Build filter array for OpenProject API
  const apiFilters: Record<string, { operator: string; values: string[] }> = {}

  if (filters?.status?.length) {
    apiFilters.status = { operator: '=', values: filters.status }
  }
  if (filters?.type?.length) {
    apiFilters.type = { operator: '=', values: filters.type }
  }
  if (filters?.priority?.length) {
    apiFilters.priority = { operator: '=', values: filters.priority }
  }
  if (filters?.assignee) {
    apiFilters.assignee = { operator: '=', values: [filters.assignee] }
  }
  // Custom field filtering for Release (customField9) - use cf_X format with option ID
  if (filters?.customField9) {
    apiFilters['cf_9'] = { operator: '=', values: [filters.customField9] }
  }
  if (filters?.updatedAfter) {
    apiFilters.updatedAt = { operator: '>t-', values: [filters.updatedAfter] }
  }

  if (Object.keys(apiFilters).length > 0) {
    params.set('filters', JSON.stringify(Object.entries(apiFilters).map(([k, v]) => ({ [k]: v }))))
  }

  const apiPath = openproject_project_id
    ? `/api/v3/projects/${openproject_project_id}/work_packages?${params.toString()}`
    : `/api/v3/work_packages?${params.toString()}`

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, apiPath)
  } else {
    const endpoint = openproject_project_id
      ? `${baseUrl}/api/v3/projects/${openproject_project_id}/work_packages`
      : `${baseUrl}/api/v3/work_packages`
    res = await fetch(`${endpoint}?${params.toString()}`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Failed to fetch work packages: ${res.status} ${errText}`)
  }

  const data = await res.json()
  
  return {
    items: data._embedded?.elements || [],
    total: data.total || 0,
    pageSize: data.pageSize || filters?.pageSize || 50,
    offset: data.offset || 0,
  }
}

export interface FetchAllWorkPackagesOptions extends WorkPackageFilters {
  concurrency?: number
  maxPages?: number
  onProgress?: (loaded: number, total: number) => void
}

/**
 * High-speed concurrent fetch of ALL matching work packages.
 * Automatically discovers total count on page 1, then retrieves all remaining pages
 * in parallel batches with deduplication and progress reporting.
 */
export async function fetchAllWorkPackages(
  config: OpenProjectConfig,
  filters?: FetchAllWorkPackagesOptions
): Promise<PaginatedWorkPackages> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) {
    return { items: [], total: 0, pageSize: 0, offset: 0 }
  }

  const requestedPageSize = filters?.pageSize || 200
  const concurrency = filters?.concurrency || 5
  const maxPages = filters?.maxPages || 100

  // 1. Fetch first page to get total count and actual page size
  const firstResult = await fetchWorkPackages(config, {
    ...filters,
    pageSize: requestedPageSize,
    offset: 1,
    page: 1,
  })

  const total = firstResult.total
  const firstItems = firstResult.items
  const actualPageSize = firstResult.pageSize || firstItems.length || requestedPageSize

  filters?.onProgress?.(firstItems.length, total)

  // If all items fit in first page or no items exist
  if (total <= firstItems.length || firstItems.length === 0 || actualPageSize <= 0) {
    return {
      items: firstItems,
      total,
      pageSize: actualPageSize,
      offset: 1,
    }
  }

  const totalPages = Math.min(Math.ceil(total / actualPageSize), maxPages)
  const remainingPages: number[] = []
  for (let p = 2; p <= totalPages; p++) {
    remainingPages.push(p)
  }

  const pageMap = new Map<number, OpenProjectWorkPackage[]>()
  pageMap.set(1, firstItems)

  let loadedCount = firstItems.length

  // 2. Fetch remaining pages in concurrent batches
  for (let i = 0; i < remainingPages.length; i += concurrency) {
    const batch = remainingPages.slice(i, i + concurrency)
    const batchResults = await Promise.all(
      batch.map(pageNum =>
        fetchWorkPackages(config, {
          ...filters,
          pageSize: requestedPageSize,
          offset: pageNum,
          page: pageNum,
        }).catch(err => {
          console.warn(`[OpenProject] Error fetching page ${pageNum}:`, err)
          return { items: [], total, pageSize: actualPageSize, offset: pageNum }
        })
      )
    )

    let allEmptyInBatch = true
    batch.forEach((pageNum, idx) => {
      const pageItems = batchResults[idx].items
      pageMap.set(pageNum, pageItems)
      loadedCount += pageItems.length
      if (pageItems.length > 0) {
        allEmptyInBatch = false
      }
    })

    filters?.onProgress?.(Math.min(loadedCount, total), total)

    if (allEmptyInBatch) {
      break
    }
  }

  // 3. Assemble all items in strict page order and deduplicate by ID
  const seenIds = new Set<number>()
  const allItems: OpenProjectWorkPackage[] = []

  for (let p = 1; p <= totalPages; p++) {
    const pageItems = pageMap.get(p) || []
    for (const item of pageItems) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id)
        allItems.push(item)
      }
    }
  }

  filters?.onProgress?.(allItems.length, Math.max(total, allItems.length))

  return {
    items: allItems,
    total: Math.max(total, allItems.length),
    pageSize: actualPageSize,
    offset: 1,
  }
}

export async function fetchWorkPackageById(
  config: OpenProjectConfig,
  workPackageId: number | string
): Promise<OpenProjectWorkPackage | null> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return null

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, `/api/v3/work_packages/${workPackageId}`)
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/work_packages/${workPackageId}`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }

  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(`Failed to fetch work package: ${res.status}`)
  }

  return res.json()
}

export async function fetchWorkPackageStats(config: OpenProjectConfig): Promise<WorkPackageStats> {
  const { items, total } = await fetchWorkPackages(config, { pageSize: 200 })

  const stats: WorkPackageStats = {
    total,
    byStatus: {},
    byType: {},
    byPriority: {},
    overdue: 0,
    unassigned: 0,
    completedPercentage: 0,
  }

  const today = new Date().toISOString().split('T')[0]
  let completedCount = 0

  for (const wp of items) {
    // By status
    const status = wp._links.status?.title || 'Unknown'
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1

    // By type
    const type = wp._links.type?.title || 'Unknown'
    stats.byType[type] = (stats.byType[type] || 0) + 1

    // By priority
    const priority = wp._links.priority?.title || 'Unknown'
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1

    // Overdue check
    if (wp.dueDate && wp.dueDate < today && wp.percentageDone !== 100) {
      stats.overdue++
    }

    // Unassigned
    if (!wp._links.assignee?.title) {
      stats.unassigned++
    }

    // Completed (assuming 100% or closed status)
    const statusLower = status.toLowerCase()
    if (wp.percentageDone === 100 || statusLower.includes('closed') || statusLower.includes('done')) {
      completedCount++
    }
  }

  stats.completedPercentage = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return stats
}

export async function fetchStatuses(config: OpenProjectConfig): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, '/api/v3/statuses')
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/statuses`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }
  if (!res.ok) return []

  const data = await res.json()
  return (data._embedded?.elements || []).map((s: { id: number; name: string }) => ({
    id: s.id,
    name: s.name,
  }))
}

export async function fetchTypes(config: OpenProjectConfig): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, '/api/v3/types')
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/types`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }
  if (!res.ok) return []

  const data = await res.json()
  return (data._embedded?.elements || []).map((t: { id: number; name: string }) => ({
    id: t.id,
    name: t.name,
  }))
}

export async function fetchPriorities(config: OpenProjectConfig): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, '/api/v3/priorities')
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/priorities`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }
  if (!res.ok) return []

  const data = await res.json()
  return (data._embedded?.elements || []).map((p: { id: number; name: string }) => ({
    id: p.id,
    name: p.name,
  }))
}

export async function fetchProjectMembers(
  config: OpenProjectConfig,
  projectId?: string | number
): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key, openproject_project_id } = config
  if (!openproject_url || !openproject_api_key) return []

  const pid = projectId || openproject_project_id
  if (!pid) return []

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, `/api/v3/projects/${pid}/memberships?pageSize=100`)
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/projects/${pid}/memberships?pageSize=100`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }
  if (!res.ok) return []

  const data = await res.json()
  const members = data._embedded?.elements || []

  return members
    .filter((m: { _links?: { principal?: { title?: string } } }) => m._links?.principal?.title)
    .map((m: { id: number; _links: { principal: { title: string } } }) => ({
      id: m.id,
      name: m._links.principal.title,
    }))
}

// Fetch versions (releases) for a project
export async function fetchVersions(
  config: OpenProjectConfig,
  projectId?: string | number
): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key, openproject_project_id } = config
  if (!openproject_url || !openproject_api_key) return []

  const pid = projectId || openproject_project_id
  if (!pid) return []

  try {
    let res: Response
    if (shouldUseProxy()) {
      res = await proxyFetch(config, `/api/v3/projects/${pid}/versions?pageSize=100`)
    } else {
      res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/projects/${pid}/versions?pageSize=100`, {
        headers: { Authorization: buildAuthHeader(openproject_api_key) },
      })
    }
    if (!res.ok) return []

    const data = await res.json()
    return (data._embedded?.elements || []).map((v: { id: number; name: string }) => ({
      id: v.id,
      name: v.name,
    }))
  } catch {
    return []
  }
}

// Cache for release field ID
let releaseFieldId: number | null = null

// Get the Release custom field ID (customField9 = field ID 9)
export async function getReleaseFieldId(config: OpenProjectConfig): Promise<number | null> {
  if (releaseFieldId !== null) return releaseFieldId
  
  try {
    const customFields = await fetchCustomFields(config)
    const releaseField = customFields.find(cf => 
      cf.name.toLowerCase() === 'release' || 
      cf.name.toLowerCase().includes('release')
    )
    if (releaseField) {
      releaseFieldId = releaseField.id
      return releaseField.id
    }
  } catch {
    // Fallback to known field ID 9
  }
  return 9 // Default to customField9
}

// Fetch Release custom field options with their IDs (needed for API filtering)
export async function fetchReleaseOptions(
  config: OpenProjectConfig
): Promise<{ id: number; name: string }[]> {
  const { openproject_url, openproject_api_key, openproject_project_id } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    // Try to get options from custom fields API first
    const fieldId = await getReleaseFieldId(config)
    if (fieldId) {
      let res: Response
      if (shouldUseProxy()) {
        res = await proxyFetch(config, `/api/v3/custom_fields/${fieldId}/options`)
      } else {
        res = await fetch(
          `${buildBaseUrl(openproject_url)}/api/v3/custom_fields/${fieldId}/options`,
          { headers: { Authorization: buildAuthHeader(openproject_api_key) } }
        )
      }
      if (res.ok) {
        const data = await res.json()
        const options = (data._embedded?.elements || []).map((opt: { id: number; value: string }) => ({
          id: opt.id,
          name: opt.value,
        }))
        if (options.length > 0) {
          return options
        }
      }
    }

    // Fallback: Extract release values AND option IDs from work packages
    // The href contains the option ID like "/api/v3/custom_options/123"
    const { items } = await fetchWorkPackages(
      { ...config, openproject_project_id },
      { pageSize: 200 }
    )
    const releases = new Map<string, number>()
    items.forEach(wp => {
      const link = (wp._links as Record<string, { title?: string; href?: string }>)['customField9']
      if (link?.title && link?.href) {
        // Extract option ID from href like "/api/v3/custom_options/123"
        const match = link.href.match(/\/(\d+)$/)
        if (match) {
          releases.set(link.title, parseInt(match[1]))
        }
      }
    })
    
    const options = Array.from(releases.entries())
      .map(([name, id]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
    
    return options
  } catch (e) {
    console.error('[OpenProject] Failed to fetch release options:', e)
    return []
  }
}

// Helper to format work package for display
export function formatWorkPackage(wp: OpenProjectWorkPackage) {
  // Extract custom fields - OpenProject uses customFieldX naming
  const customFields: Record<string, string | null> = {}

  // Collect from direct properties
  Object.keys(wp).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const val = wp[key]
      customFields[key] = val != null ? String(val) : null
    }
  })

  // Collect from _links (list-type custom fields are stored here as { title, href })
  Object.keys(wp._links || {}).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const link = (wp._links as Record<string, { title?: string; href?: string }>)[key]
      if (link?.title) {
        customFields[key] = link.title
      }
    }
  })

  const links = wp._links as Record<string, { title?: string; href?: string } | undefined>

  // ── customField14 → Testing Status ──────────────────────────────────────
  // Prefer _links (list-type field); fall back to direct property.
  const testingStatus: string | null =
    links['customField14']?.title ||
    links['cf_14']?.title ||
    (customFields['customField14'] ?? customFields['cf_14'] ?? null)

  // ── customField9 → Release ───────────────────────────────────────────────
  const release: string | null =
    links['customField9']?.title ||
    links['cf_9']?.title ||
    (customFields['customField9'] ?? customFields['cf_9'] ?? null)

  // ── customField21 → Is QA Missed (boolean checkbox) ────────────────────
  // OpenProject checkbox fields are stored as direct boolean properties,
  // NOT in _links. true = checked = "Yes", false/absent = unchecked = "No".
  const rawIsQAMissedBool: unknown =
    wp['customField21'] ?? wp['cf_21'] ?? null
  // Normalise: true → 'Yes', false → 'No', null/undefined → null (resolve below)
  const rawIsQAMissed: string | null =
    rawIsQAMissedBool === true  ? 'Yes' :
    rawIsQAMissedBool === false ? 'No'  :
    // Fallback: some editions may still send it as a string
    (typeof rawIsQAMissedBool === 'string' && rawIsQAMissedBool.length > 0)
      ? rawIsQAMissedBool
      : null

  // ── customField3 → QA Confirmation ──────────────────────────────────────
  const qaConfirmation: string | null =
    links['customField3']?.title ||
    links['cf_3']?.title ||
    (customFields['customField3'] ?? customFields['cf_3'] ?? null)

  // ── Received Date (date-type custom field) ───────────────────────────────
  let receivedDate: string | null = null
  Object.keys(wp).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const value = wp[key]
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        if (!receivedDate) receivedDate = value
      }
    }
  })

  // ── Determine ticket type and resolve Is QA Missed ───────────────────────
  const ticketType = wp._links.type?.title || 'Unknown'
  const isBugTicket = ticketType.toLowerCase() === 'bug'

  // BUG tickets do not have customField21 — store 'N/A' explicitly.
  // All other ticket types: checkbox default is unchecked = 'No'.
  // null means the field was absent from the API response → treat as 'No' (unchecked).
  let isQAMissed: string | null
  if (isBugTicket) {
    isQAMissed = 'N/A'
  } else {
    // rawIsQAMissed is 'Yes', 'No', or null (absent = unchecked = No)
    isQAMissed = rawIsQAMissed ?? 'No'
  }

  return {
    id: wp.id,
    subject: wp.subject,
    description: wp.description?.raw || '',
    type: ticketType,
    status: wp._links.status?.title || 'Unknown',
    priority: wp._links.priority?.title || 'Normal',
    assignee: wp._links.assignee?.title || 'Unassigned',
    responsible: wp._links.responsible?.title || null,
    project: wp._links.project?.title || '',
    author: wp._links.author?.title || '',
    version: wp._links.version?.title || null,
    release: release || wp._links.version?.title || null,
    startDate: wp.startDate || null,
    dueDate: wp.dueDate || null,
    createdAt: wp.createdAt || null,
    updatedAt: wp.updatedAt || null,
    percentageDone: wp.percentageDone || 0,
    estimatedTime: wp.estimatedTime || null,
    spentTime: wp.spentTime || null,
    storyPoints: wp.storyPoints || null,
    isOverdue: wp.dueDate ? wp.dueDate < new Date().toISOString().split('T')[0] && wp.percentageDone !== 100 : false,
    customFields,
    testingStatus,
    isQAMissed,
    qaConfirmation,
    receivedDate,
  }
}

export type FormattedWorkPackage = ReturnType<typeof formatWorkPackage>

// Fetch custom fields defined in OpenProject
export async function fetchCustomFields(
  config: OpenProjectConfig
): Promise<{ id: number; name: string; fieldFormat: string }[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    let res: Response
    if (shouldUseProxy()) {
      res = await proxyFetch(config, '/api/v3/custom_fields')
    } else {
      res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/custom_fields`, {
        headers: { Authorization: buildAuthHeader(openproject_api_key) },
      })
    }
    if (!res.ok) return []

    const data = await res.json()
    return (data._embedded?.elements || []).map((cf: { id: number; name: string; fieldFormat: string }) => ({
      id: cf.id,
      name: cf.name,
      fieldFormat: cf.fieldFormat,
    }))
  } catch {
    return []
  }
}

// Fetch custom field options (for list-type custom fields)
export async function fetchCustomFieldOptions(
  config: OpenProjectConfig,
  customFieldId: number
): Promise<{ id: number; value: string }[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    let res: Response
    if (shouldUseProxy()) {
      res = await proxyFetch(config, `/api/v3/custom_fields/${customFieldId}/options`)
    } else {
      res = await fetch(
        `${buildBaseUrl(openproject_url)}/api/v3/custom_fields/${customFieldId}/options`,
        { headers: { Authorization: buildAuthHeader(openproject_api_key) } }
      )
    }
    if (!res.ok) return []

    const data = await res.json()
    return (data._embedded?.elements || []).map((opt: { id: number; value: string }) => ({
      id: opt.id,
      value: opt.value,
    }))
  } catch {
    return []
  }
}

// Fetch work package activities/journal (change history)
export interface WorkPackageActivity {
  id: number
  comment?: { raw: string }
  createdAt: string
  user: { name: string; id: number }
  details: {
    property: string
    propertyName?: string
    oldValue?: string
    newValue?: string
    raw?: string
  }[]
}

export interface TestingStatusChange {
  workPackageId: number
  changedAt: string
  changedBy: string
  oldValue: string | null
  newValue: string
}

// Cache for user names
const userCache = new Map<string, string>()

async function fetchUserName(config: OpenProjectConfig, userHref: string): Promise<string> {
  if (!userHref) return 'Unknown'
  
  // Check cache first
  if (userCache.has(userHref)) {
    return userCache.get(userHref)!
  }
  
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return 'Unknown'
  
  try {
    // userHref is like "/api/v3/users/145"
    let res: Response
    if (shouldUseProxy()) {
      res = await proxyFetch(config, userHref)
    } else {
      res = await fetch(`${buildBaseUrl(openproject_url)}${userHref}`, {
        headers: { Authorization: buildAuthHeader(openproject_api_key) },
      })
    }
    if (!res.ok) return 'Unknown'
    
    const user = await res.json()
    const name = user.name || user.login || 'Unknown'
    userCache.set(userHref, name)
    return name
  } catch {
    return 'Unknown'
  }
}

export async function fetchWorkPackageActivities(
  config: OpenProjectConfig,
  workPackageId: number | string
): Promise<WorkPackageActivity[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    const allRawActivities: any[] = []
    let nextPath: string | null = `/api/v3/work_packages/${workPackageId}/activities`
    let pageCount = 0
    const MAX_ACTIVITY_PAGES = 500 // Safety cap — never silently truncate

    while (nextPath && pageCount < MAX_ACTIVITY_PAGES) {
      pageCount++
      let cleanPath = nextPath
      if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
        try {
          const parsed = new URL(cleanPath)
          cleanPath = parsed.pathname + parsed.search
        } catch {
          // keep cleanPath
        }
      }

      let res: Response
      if (shouldUseProxy()) {
        res = await proxyFetch(config, cleanPath)
      } else {
        const fullUrl = `${buildBaseUrl(openproject_url)}${cleanPath}`
        res = await fetch(fullUrl, {
          headers: { Authorization: buildAuthHeader(openproject_api_key) },
        })
      }

      if (!res.ok) {
        console.warn(`[Ticket Bowl] Activities fetch for WP#${workPackageId} status: ${res.status}`)
        break
      }

      const data = await res.json()
      const elements = data._embedded?.elements || []
      allRawActivities.push(...elements)

      // Paginate if more activities exist
      const nextHref = data._links?.nextByOffset?.href || data._links?.next?.href || null
      if (nextHref && elements.length > 0) {
        nextPath = nextHref
      } else {
        nextPath = null
      }
    }

    const activities = await Promise.all(
      allRawActivities.map(async (activity: any) => {
        const rawDetails = activity.details || activity._embedded?.details || []
        const parsedDetails = rawDetails.map((d: any) => {
          // Extract property from all possible structured locations
          let property =
            d.propertyName ||
            d.property ||
            d._links?.property?.title ||
            d._links?.property?.href ||
            d._links?.schema?.title ||
            ''

          // Extract newValue
          let newValue =
            (typeof d.newValue === 'string' ? d.newValue : '') ||
            (typeof d.new_value === 'string' ? d.new_value : '') ||
            d._links?.newValue?.title ||
            d._links?.new_value?.title ||
            d._links?.value?.title ||
            (typeof d.newValue === 'object' && d.newValue?.title) ||
            ''

          // Extract oldValue
          let oldValue =
            (typeof d.oldValue === 'string' ? d.oldValue : '') ||
            (typeof d.old_value === 'string' ? d.old_value : '') ||
            d._links?.oldValue?.title ||
            d._links?.old_value?.title ||
            (typeof d.oldValue === 'object' && d.oldValue?.title) ||
            ''

          // Raw / HTML text clean-up
          const rawText = d.raw || ''
          const htmlText = d.html || ''
          const combinedCleanText = (rawText || htmlText).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

          // If structured fields are missing or incomplete, parse from combined clean text
          if (!property || !newValue) {
            const changedMatch = combinedCleanText.match(/(?:Testing\s+Status|customfield14|custom_field_14|cf_14)\s+changed\s+from\s+(.+?)\s+to\s+(.+)/i)
            if (changedMatch) {
              if (!property) property = 'Testing Status'
              if (!oldValue) oldValue = changedMatch[1].replace(/\.+$/, '').trim()
              if (!newValue) newValue = changedMatch[2].replace(/\.+$/, '').trim()
            } else {
              const setMatch = combinedCleanText.match(/(?:Testing\s+Status|customfield14|custom_field_14|cf_14)\s+set\s+to\s+(.+)/i)
              if (setMatch) {
                if (!property) property = 'Testing Status'
                if (!newValue) newValue = setMatch[1].replace(/\.+$/, '').trim()
              }
            }
          }

          return {
            property,
            propertyName: property,
            oldValue: String(oldValue || '').replace(/\.+$/, '').trim(),
            newValue: String(newValue || '').replace(/\.+$/, '').trim(),
            raw: combinedCleanText || rawText,
          }
        })

        let userName = (activity._links?.user?.title || '').trim()
        if (!userName && activity._links?.user?.href) {
          userName = await fetchUserName(config, activity._links.user.href)
        }

        return {
          id: activity.id,
          comment: activity.comment,
          createdAt: activity.createdAt,
          user: {
            name: userName || 'Unknown',
            id: parseInt(activity._links?.user?.href?.split('/').pop() || '0'),
          },
          details: parsedDetails,
        }
      })
    )

    return activities
  } catch (e) {
    console.error('Failed to fetch activities:', e)
    return []
  }
}

// Returns true when a normalised journal detail represents a Testing Status
// transition to targetValue. Matches against all sources.
function isForwardingDetail(
  detail: { property?: string; newValue?: string; raw?: string },
  targetValue: string
): boolean {
  const prop = (detail.property || '').toLowerCase()
  const newVal = (detail.newValue || '').toLowerCase()
  const raw = (detail.raw || '').toLowerCase()
  const target = targetValue.toLowerCase()

  // 1. newValue must match the target
  if (!newVal.includes(target) && !raw.includes(`to ${target}`)) return false

  // 2. Hard-exclude the plain work-package Status field.
  if (prop === 'status') return false

  // 3. Identify as the Testing Status field (customField14).
  const isTestingStatusField =
    prop === 'testing status' ||
    prop.includes('testing') ||
    prop === 'customfield14' ||
    prop === 'cf_14' ||
    prop === 'cf14' ||
    prop === 'custom_field_14' ||
    prop === 'custom_field14' ||
    prop.includes('customfield14') ||
    prop.includes('custom_field_14') ||
    prop.includes('custom_field14') ||
    prop.includes('cf_14') ||
    prop.includes('cf14') ||
    prop.includes('custom_fields/14') ||
    prop.endsWith('/14') ||
    raw.includes('testing status') ||
    raw.includes('customfield14') ||
    raw.includes('custom_field_14') ||
    raw.includes('cf_14')

  // 4. If prop is set but not recognised as Testing Status — reject.
  if (prop.length > 0 && !isTestingStatusField) return false

  return true
}

// Returns ALL forwarding events for a work package, sorted newest-first.
export async function findAllTestingStatusChanges(
  config: OpenProjectConfig,
  workPackageId: number | string,
  targetValue: string = 'Forwarded to the Testing Team'
): Promise<TestingStatusChange[]> {
  const activities = await fetchWorkPackageActivities(config, workPackageId)
  const matches: TestingStatusChange[] = []

  for (const activity of activities) {
    for (const detail of activity.details) {
      // Log ALL details during sync so we can diagnose match failures
      console.log(`[Ticket Bowl] WP#${workPackageId} activity#${activity.id} detail:`, {
        property: detail.property,
        newValue: detail.newValue,
        oldValue: detail.oldValue,
        raw: detail.raw,
        user: activity.user.name,
        date: activity.createdAt,
        isMatch: isForwardingDetail(detail, targetValue),
      })
      if (isForwardingDetail(detail, targetValue)) {
        const event: TestingStatusChange = {
          workPackageId: Number(workPackageId),
          changedAt: activity.createdAt,
          changedBy: activity.user.name || 'Unknown',
          oldValue: detail.oldValue || null,
          newValue: detail.newValue || targetValue,
        }
        console.log(`[Ticket Bowl] WP#${workPackageId} forwarding event found:`, {
          changedAt: event.changedAt,
          changedBy: event.changedBy,
          oldValue: event.oldValue,
          newValue: event.newValue,
          activityId: activity.id,
          userFromLinks: activity.user.name,
        })
        matches.push(event)
      }
    }
  }

  // Newest first
  matches.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
  return matches
}

// Returns the LATEST forwarding event for a work package, or null if none found.
// Used by the main cache table to store the most-recent handoff date for date filtering.
export async function findTestingStatusChange(
  config: OpenProjectConfig,
  workPackageId: number | string,
  targetValue: string = 'Forwarded to the Testing Team',
  _fallbackInfo?: { createdAt?: string | null; author?: string | null; updatedAt?: string | null }
): Promise<TestingStatusChange | null> {
  const all = await findAllTestingStatusChanges(config, workPackageId, targetValue)
  return all.length > 0 ? all[0] : null
}

// Debug: Fetch and log all activities for a work package
export async function debugWorkPackageActivities(
  config: OpenProjectConfig,
  workPackageId: number | string
): Promise<unknown[]> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    let res: Response
    if (shouldUseProxy()) {
      res = await proxyFetch(config, `/api/v3/work_packages/${workPackageId}/activities`)
    } else {
      res = await fetch(
        `${buildBaseUrl(openproject_url)}/api/v3/work_packages/${workPackageId}/activities`,
        { headers: { Authorization: buildAuthHeader(openproject_api_key) } }
      )
    }
    if (!res.ok) return []
    const data = await res.json()
    const elements = data._embedded?.elements || []
    
    // Search for Testing Status changes specifically
    const testingChanges: Array<{ activityId: number; date: string; user: string; raw: string }> = []
    
    elements.forEach((activity: { 
      id: number; createdAt: string; 
      details?: Array<{ raw?: string }>;
      _links?: { user?: { title?: string } }
    }) => {
      if (activity.details && Array.isArray(activity.details)) {
        activity.details.forEach((detail: { raw?: string }) => {
          const raw = (detail.raw || '').toLowerCase()
          if (raw.includes('testing status') || raw.includes('testing_status')) {
            testingChanges.push({
              activityId: activity.id,
              date: activity.createdAt,
              user: activity._links?.user?.title || 'Unknown',
              raw: detail.raw || ''
            })
          }
        })
      }
    })
    
    return testingChanges
  } catch (e) {
    console.error('Debug error:', e)
    return []
  }
}

export type WorkPackageIdentifier = number | string | { 
  id: number | string
  createdAt?: string | null
  author?: string | null
  updatedAt?: string | null 
}

// Batch fetch ALL Testing Status forwarding events for multiple work packages.
// Returns Map<wpId, events[]> where events are sorted newest-first.
export async function fetchTestingStatusChanges(
  config: OpenProjectConfig,
  workPackages: WorkPackageIdentifier[],
  targetValue: string = 'Forwarded to the Testing Team',
  onProgress?: (current: number, found: number) => void
): Promise<Map<number, TestingStatusChange[]>> {
  const results = new Map<number, TestingStatusChange[]>()

  const batchSize = 10
  for (let i = 0; i < workPackages.length; i += batchSize) {
    const batch = workPackages.slice(i, i + batchSize)
    const promises = batch.map(item => {
      const id = typeof item === 'object' && item !== null ? item.id : item
      return findAllTestingStatusChanges(config, id, targetValue)
    })
    const batchResults = await Promise.all(promises)

    batchResults.forEach((events, idx) => {
      const item = batch[idx]
      const id = Number(typeof item === 'object' && item !== null ? item.id : item)
      if (events.length > 0) {
        results.set(id, events)
      }
    })

    const processed = Math.min(i + batchSize, workPackages.length)
    onProgress?.(processed, results.size)
  }

  return results
}

// Legacy export for backward compatibility
export async function fetchOpenProjectWorkPackages(
  config: OpenProjectConfig,
  projectId?: string | number
): Promise<OpenProjectWorkPackage[]> {
  const result = await fetchWorkPackages(
    { ...config, openproject_project_id: projectId?.toString() || config.openproject_project_id },
    { pageSize: 100 }
  )
  return result.items
}
