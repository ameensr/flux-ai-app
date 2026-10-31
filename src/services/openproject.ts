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

  let res: Response
  if (shouldUseProxy()) {
    res = await proxyFetch(config, '/api/v3/projects?pageSize=100')
  } else {
    res = await fetch(`${buildBaseUrl(openproject_url)}/api/v3/projects?pageSize=100`, {
      headers: { Authorization: buildAuthHeader(openproject_api_key) },
    })
  }
  if (!res.ok) throw new Error('Failed to fetch projects')
  const data = await res.json()
  return data._embedded?.elements || []
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

  // Pagination - use pageSize and offset
  params.set('pageSize', String(filters?.pageSize || 50))
  if (filters?.offset) {
    params.set('offset', String(filters.offset))
  }
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
  Object.keys(wp).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const val = wp[key]
      // Convert to string if not null/undefined
      customFields[key] = val != null ? String(val) : null
    }
  })
  
  // Also check _links for custom field references
  Object.keys(wp._links || {}).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const link = (wp._links as Record<string, { title?: string }>)[key]
      if (link?.title) {
        customFields[key] = link.title
      }
    }
  })
  
  // Find specific custom fields by checking all customField values
  let testingStatus: string | null = null
  let isQAMissed: string | null = null
  let qaConfirmation: string | null = null
  let receivedDate: string | null = null
  let release: string | null = null
  
  // Check all custom fields for known field names
  Object.entries(customFields).forEach(([key, value]) => {
    if (!value || typeof value !== 'string') return
    const valLower = value.toLowerCase()
    // These are link-type fields, value would be the option title
    if (valLower.includes('forwarded') || valLower.includes('not started') || valLower.includes('in progress') || valLower.includes('completed')) {
      if (!testingStatus) testingStatus = value
    }
    if (valLower === 'yes' || valLower === 'no') {
      // Could be isQAMissed - check if we already have one
      if (!isQAMissed && key.includes('2')) isQAMissed = value
    }
  })
  
  // Fallback to numbered custom fields
  testingStatus = testingStatus || customFields['customField1'] || customFields['cf_1'] || null
  isQAMissed = isQAMissed || customFields['customField2'] || customFields['cf_2'] || null
  qaConfirmation = qaConfirmation || customFields['customField3'] || customFields['cf_3'] || null
  
  // Look for Release custom field - customField9 contains release values like "UAT.30.10.2026"
  Object.keys(wp._links || {}).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const link = (wp._links as Record<string, { title?: string; href?: string }>)[key]
      if (link?.title) {
        const title = link.title
        
        // customField9 is the Release field
        if (key === 'customField9' || key === 'cf_9') {
          release = title
        }
      }
    }
  })
  
  // Also check direct custom field values for dates (Received Date)
  Object.keys(wp).forEach(key => {
    if (key.startsWith('customField') || key.startsWith('cf_')) {
      const value = wp[key]
      // Date fields are stored as ISO date strings (YYYY-MM-DD)
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        // This is likely a date field - could be Received Date
        if (!receivedDate) receivedDate = value
      }
    }
  })

  return {
    id: wp.id,
    subject: wp.subject,
    description: wp.description?.raw || '',
    type: wp._links.type?.title || 'Unknown',
    status: wp._links.status?.title || 'Unknown',
    priority: wp._links.priority?.title || 'Normal',
    assignee: wp._links.assignee?.title || 'Unassigned',
    responsible: wp._links.responsible?.title || null,
    project: wp._links.project?.title || '',
    author: wp._links.author?.title || '',
    version: wp._links.version?.title || null,
    release: release || wp._links.version?.title || null, // Release custom field or fallback to version
    startDate: wp.startDate || null,
    dueDate: wp.dueDate || null,
    createdAt: wp.createdAt || null,
    updatedAt: wp.updatedAt || null,
    percentageDone: wp.percentageDone || 0,
    estimatedTime: wp.estimatedTime || null,
    spentTime: wp.spentTime || null,
    storyPoints: wp.storyPoints || null,
    isOverdue: wp.dueDate ? wp.dueDate < new Date().toISOString().split('T')[0] && wp.percentageDone !== 100 : false,
    // Custom fields for QA
    customFields,
    testingStatus,
    isQAMissed,
    qaConfirmation,
    receivedDate, // The "Received Date" custom field from OpenProject
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

    // Process activities and fetch user names
    const activities = await Promise.all(elements.map(async (activity: {
      id: number
      comment?: { raw: string }
      createdAt: string
      _links?: { user?: { title?: string; href?: string } }
      details?: Array<{ format?: string; raw?: string; html?: string }>
    }) => {
      // Parse details from raw text format
      const parsedDetails = (activity.details || []).map(d => {
        const raw = d.raw || ''
        let property = ''
        let oldValue = ''
        let newValue = ''

        const changedMatch = raw.match(/^(.+?) changed from (.+?) to (.+)$/i)
        if (changedMatch) {
          property = changedMatch[1]
          oldValue = changedMatch[2]
          newValue = changedMatch[3]
        } else {
          const setMatch = raw.match(/^(.+?) set to (.+)$/i)
          if (setMatch) {
            property = setMatch[1]
            newValue = setMatch[2]
          }
        }

        return { property, propertyName: property, oldValue, newValue, raw }
      })

      // Get user name - try title first, then fetch if needed
      let userName = activity._links?.user?.title || ''
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
    }))

    return activities
  } catch (e) {
    console.error('Failed to fetch activities:', e)
    return []
  }
}

// Find when Testing Status was changed to "Forwarded to the Testing Team"
// Returns the MOST RECENT forwarding event if forwarded multiple times
export async function findTestingStatusChange(
  config: OpenProjectConfig,
  workPackageId: number | string,
  targetValue: string = 'Forwarded to the Testing Team'
): Promise<TestingStatusChange | null> {
  const activities = await fetchWorkPackageActivities(config, workPackageId)
  
  let lastMatch: TestingStatusChange | null = null

  for (const activity of activities) {
    for (const detail of activity.details) {
      // Get the raw text and check various patterns
      const raw = ((detail as { raw?: string }).raw || '').toLowerCase()
      const propLower = (detail.property || '').toLowerCase()
      const newValLower = (detail.newValue || '').toLowerCase()
      
      // Check if this is a Testing Status change to "Forwarded to the Testing Team"
      // Pattern 1: Property contains "testing" and new value contains "forwarded"
      // Pattern 2: Raw text contains "testing status" and "forwarded"
      const isTestingStatusChange = 
        propLower.includes('testing') ||
        raw.includes('testing status') ||
        raw.includes('testing_status') ||
        raw.includes('testingstatus')
      
      const isForwarded = 
        newValLower.includes('forwarded') ||
        raw.includes('forwarded to the testing') ||
        raw.includes('forwarded to testing')
      
      if (isTestingStatusChange && isForwarded) {
        lastMatch = {
          workPackageId: Number(workPackageId),
          changedAt: activity.createdAt,
          changedBy: activity.user.name,
          oldValue: detail.oldValue || null,
          newValue: detail.newValue || targetValue,
        }
      }
    }
  }

  return lastMatch
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
    let found = false
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
            found = true
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

// Batch fetch Testing Status changes for multiple work packages
export async function fetchTestingStatusChanges(
  config: OpenProjectConfig,
  workPackageIds: (number | string)[],
  targetValue: string = 'Forwarded to the Testing Team',
  onProgress?: (current: number, found: number) => void
): Promise<Map<number, TestingStatusChange>> {
  const results = new Map<number, TestingStatusChange>()
  
  // Fetch in parallel with batching for speed
  const batchSize = 10
  for (let i = 0; i < workPackageIds.length; i += batchSize) {
    const batch = workPackageIds.slice(i, i + batchSize)
    const promises = batch.map(id => findTestingStatusChange(config, id, targetValue))
    const batchResults = await Promise.all(promises)

    batchResults.forEach((result, idx) => {
      if (result) {
        results.set(Number(batch[idx]), result)
      }
    })
    
    // Report progress
    const processed = Math.min(i + batchSize, workPackageIds.length)
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
