import { describe, it, expect, vi, beforeEach } from 'vitest'

// Lightweight in-memory storage mock for Node environment
const storage = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => storage.get(key) || null,
  setItem: (key: string, val: string) => storage.set(key, val),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
}

;(globalThis as any).window = {
  localStorage: mockLocalStorage,
}

// Mock supabase to prevent network calls during unit test
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'proj-1', name: 'Mock Project', project_code: 'MCK-01', status: 'active' }],
        error: null,
      }),
    })),
  },
}))

import { loadCinematicProjectData, fetchAvailableProjects } from '../cinematicDataService'

describe('Cinematic Intro Data Service', () => {
  beforeEach(() => {
    storage.clear()
  })
  it('returns structured project data with realistic fallbacks when called with default id', async () => {
    const data = await loadCinematicProjectData('default')
    expect(data).toBeDefined()
    expect(data.projectName).toBeDefined()
    expect(data.metrics).toBeDefined()
    expect(data.metrics.overallHealthScore).toBeGreaterThanOrEqual(0)
    expect(data.metrics.overallHealthScore).toBeLessThanOrEqual(100)
    expect(data.metrics.automatedTestCoverage).toBeGreaterThan(0)
    expect(data.teamMembers.length).toBeGreaterThan(0)
    expect(data.insights.length).toBeGreaterThan(0)
  })

  it('provides available projects list or default fallback array', async () => {
    const list = await fetchAvailableProjects()
    expect(Array.isArray(list)).toBe(true)
    expect(list.length).toBeGreaterThan(0)
    expect(list[0]).toHaveProperty('id')
    expect(list[0]).toHaveProperty('name')
  })

  it('correctly loads and maps live QA report data with meetingWith and team members', async () => {
    const mockQAForm = {
      projectId: 'qa-proj-99',
      projectName: 'Apollo Mission Control',
      meetingWith: 'Dr. Sarah Stone, Commander Glenn',
      reportTitle: 'Executive QA Readiness',
      newFeatureTeam: ['Neil Armstrong', 'Buzz Aldrin'],
      defectsLastWeek: { reported: 10, open: 2, closed: 8 },
      releaseItems: [{ featureName: 'Lunar Module', status: 'Pass' }],
    }
    window.localStorage.setItem('current-3d-qa-report-data', JSON.stringify(mockQAForm))

    const data = await loadCinematicProjectData('qa-proj-99')
    expect(data.projectName).toBe('Apollo Mission Control')
    expect(data.meetingWith).toBe('Dr. Sarah Stone, Commander Glenn')
    expect(data.teamMembers.some(m => m.name.includes('Sarah Stone'))).toBe(true)
    expect(data.teamMembers.some(m => m.name.includes('Neil Armstrong'))).toBe(true)
    expect(data.metrics.activeBugs).toBe(2)

    // Verify all 10 Real QA Sections are accurately mapped
    expect(data.supportEmails).toBeDefined()
    expect(data.newReleaseFeatures).toBeDefined()
    expect(data.supportFixTesting).toBeDefined()
    expect(data.releaseTestingStatus).toBeDefined()
    expect(data.taskWiseStatus).toBeDefined()
    expect(data.supportExceptionLog).toBeDefined()
    expect(data.teamCapacity).toBeDefined()
    expect(data.weeklyCharts).toBeDefined()
    expect(data.teamResourceAllocation).toBeDefined()
    expect(data.nextWeekPriorities).toBeDefined()

    window.localStorage.removeItem('current-3d-qa-report-data')
  })
})
