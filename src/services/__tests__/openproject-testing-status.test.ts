// src/services/__tests__/openproject-testing-status.test.ts
// Unit tests for Testing Status change detection
// Tests the findTestingStatusChange function to ensure it:
// 1. Only uses "Testing Status" custom field, not standard "Status" field
// 2. Returns the FIRST occurrence when forwarded multiple times
// 3. Returns null when Testing Status was never set to "Forwarded to the Testing Team"
// 4. Uses the journal entry's user, not the ticket author

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the fetchWorkPackageActivities function
const mockFetchWorkPackageActivities = vi.fn()

vi.mock('../openproject', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../openproject')>()
  return {
    ...actual,
    fetchWorkPackageActivities: (...args: unknown[]) => mockFetchWorkPackageActivities(...args),
  }
})

// Import after mocking
import { findTestingStatusChange } from '../openproject'

describe('findTestingStatusChange', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Test Case A: Status changed Forwarded -> In progress by Person3, 
   * Testing Status never forwarded: no Forwarded info
   */
  it('should return null when only standard Status field changed, not Testing Status', async () => {
    // Simulate: Standard "Status" changed from "Forwarded to the Testing Team" to "In progress"
    // But "Testing Status" custom field was never set to "Forwarded to the Testing Team"
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-11T10:50:00Z',
        user: { name: 'Person3', id: 3 },
        details: [
          {
            property: 'Status',
            propertyName: 'Status',
            oldValue: 'Forwarded to the Testing Team',
            newValue: 'In progress',
            raw: 'Status changed from Forwarded to the Testing Team to In progress',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    // Should return null because Testing Status custom field was never changed
    expect(result).toBeNull()
  })

  /**
   * Test Case B: Testing Status set to "Forwarded to the Testing Team" by Person2:
   * shows that date and Person2
   */
  it('should return correct date and user when Testing Status is set to Forwarded', async () => {
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T14:30:00Z',
        user: { name: 'Person2', id: 2 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Not Started',
            newValue: 'Forwarded to the Testing Team',
            raw: 'Testing Status changed from Not Started to Forwarded to the Testing Team',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    expect(result).not.toBeNull()
    expect(result?.changedAt).toBe('2026-03-12T14:30:00Z')
    expect(result?.changedBy).toBe('Person2')
    expect(result?.newValue).toBe('Forwarded to the Testing Team')
  })

  /**
   * Test Case C: Forwarded more than once - should return the FIRST occurrence
   */
  it('should return the FIRST occurrence when Testing Status is set to Forwarded multiple times', async () => {
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T10:00:00Z', // First forwarding
        user: { name: 'Person2', id: 2 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Not Started',
            newValue: 'Forwarded to the Testing Team',
            raw: 'Testing Status changed from Not Started to Forwarded to the Testing Team',
          },
        ],
      },
      {
        id: 3,
        createdAt: '2026-03-13T09:00:00Z',
        user: { name: 'Person3', id: 3 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Forwarded to the Testing Team',
            newValue: 'In Progress',
            raw: 'Testing Status changed from Forwarded to the Testing Team to In Progress',
          },
        ],
      },
      {
        id: 4,
        createdAt: '2026-03-15T16:00:00Z', // Second forwarding (later)
        user: { name: 'Person4', id: 4 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'In Progress',
            newValue: 'Forwarded to the Testing Team',
            raw: 'Testing Status changed from In Progress to Forwarded to the Testing Team',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    // Should return the FIRST occurrence (Person2 on March 12)
    expect(result).not.toBeNull()
    expect(result?.changedAt).toBe('2026-03-12T10:00:00Z')
    expect(result?.changedBy).toBe('Person2')
  })

  /**
   * Test Case D: Ticket author differs from the forwarding user:
   * shows the forwarding user, not the author
   */
  it('should return the forwarding user, not the ticket author', async () => {
    // Person1 created the ticket, but Person2 forwarded it
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1 (Author)', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T14:30:00Z',
        user: { name: 'Person2 (Forwarder)', id: 2 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Not Started',
            newValue: 'Forwarded to the Testing Team',
            raw: 'Testing Status changed from Not Started to Forwarded to the Testing Team',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team',
      // Provide fallback info with author - should NOT be used
      { createdAt: '2026-03-10T08:00:00Z', author: 'Person1 (Author)', updatedAt: '2026-03-12T14:30:00Z' }
    )

    expect(result).not.toBeNull()
    // Should show Person2 (the forwarder), NOT Person1 (the author)
    expect(result?.changedBy).toBe('Person2 (Forwarder)')
    expect(result?.changedBy).not.toBe('Person1 (Author)')
  })

  /**
   * Test: Should NOT use fallback when no Testing Status change found
   */
  it('should NOT use fallback info when Testing Status was never set to Forwarded', async () => {
    // No Testing Status changes at all
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team',
      // Provide fallback info - should NOT be used
      { createdAt: '2026-03-10T08:00:00Z', author: 'Person1', updatedAt: '2026-03-11T10:00:00Z' }
    )

    // Should return null, NOT use the fallback
    expect(result).toBeNull()
  })

  /**
   * Test: Should match customField14 (Testing Status field ID)
   */
  it('should match Testing Status changes via customField14', async () => {
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T14:30:00Z',
        user: { name: 'Person2', id: 2 },
        details: [
          {
            property: 'customField14',
            propertyName: 'customField14',
            oldValue: 'Not Started',
            newValue: 'Forwarded to the Testing Team',
            raw: 'customField14 changed from Not Started to Forwarded to the Testing Team',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    expect(result).not.toBeNull()
    expect(result?.changedBy).toBe('Person2')
  })

  /**
   * Test: Should NOT match when new value is different (e.g., "In Progress")
   */
  it('should NOT match when Testing Status is set to a different value', async () => {
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T14:30:00Z',
        user: { name: 'Person2', id: 2 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Not Started',
            newValue: 'In Progress', // NOT "Forwarded to the Testing Team"
            raw: 'Testing Status changed from Not Started to In Progress',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    expect(result).toBeNull()
  })

  /**
   * Test: Should NOT match on OLD value being "Forwarded to the Testing Team"
   */
  it('should NOT match when old value was Forwarded but new value is different', async () => {
    mockFetchWorkPackageActivities.mockResolvedValue([
      {
        id: 1,
        createdAt: '2026-03-10T08:00:00Z',
        user: { name: 'Person1', id: 1 },
        details: [{ property: '', raw: 'Work package created' }],
      },
      {
        id: 2,
        createdAt: '2026-03-12T14:30:00Z',
        user: { name: 'Person2', id: 2 },
        details: [
          {
            property: 'Testing Status',
            propertyName: 'Testing Status',
            oldValue: 'Forwarded to the Testing Team', // OLD value is Forwarded
            newValue: 'Completed', // NEW value is different
            raw: 'Testing Status changed from Forwarded to the Testing Team to Completed',
          },
        ],
      },
    ])

    const result = await findTestingStatusChange(
      { openproject_url: 'https://test.com', openproject_api_key: 'key' },
      123,
      'Forwarded to the Testing Team'
    )

    // Should NOT match because we only care about NEW value being "Forwarded to the Testing Team"
    expect(result).toBeNull()
  })
})
