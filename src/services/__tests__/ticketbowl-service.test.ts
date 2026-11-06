// src/services/__tests__/ticketbowl-service.test.ts
// Unit test suite for Ticket Bowl exact QA handoff detection & transition verification

import { describe, it, expect } from 'vitest'
import {
  detectExactForwardingTransitions,
  extractCustomFieldValue,
  EXACT_FORWARDED_TARGET_VALUE,
} from '../ticketbowl-service'
import type { WorkPackageActivity } from '../openproject'

describe('Ticket Bowl — Exact QA Handoff Transition Detection', () => {
  it('strictly defines the target QA handoff value as "Forwarded to the Testing Team"', () => {
    expect(EXACT_FORWARDED_TARGET_VALUE).toBe('Forwarded to the Testing Team')
  })

  // Test 1 – Exact transition
  it('Test 1: creates a verified forwarding event with exact date, time, and actor when Testing Status transitions to target value', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 101,
        createdAt: '2026-11-05T09:30:00Z',
        user: { id: 42, name: 'Alex Developer' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'In Progress',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16471, activities)
    expect(events).toHaveLength(1)
    expect(events[0].workPackageId).toBe(16471)
    expect(events[0].activityId).toBe(101)
    expect(events[0].changedAt).toBe('2026-11-05T09:30:00Z')
    expect(events[0].changedByName).toBe('Alex Developer')
    expect(events[0].changedById).toBe(42)
    expect(events[0].previousTestingStatus).toBe('In Progress')
    expect(events[0].newTestingStatus).toBe('Forwarded to the Testing Team')
    expect(events[0].verificationStatus).toBe('verified')
  })

  // Test 2 – Unrelated status change
  it('Test 2: does NOT create a forwarding event when Testing Status changes to another status (e.g. In Progress)', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 102,
        createdAt: '2026-11-06T14:15:00Z',
        user: { id: 45, name: 'Sam QA' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'Forwarded to the Testing Team',
            newValue: 'In Progress',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16471, activities)
    expect(events).toHaveLength(0)
  })

  // Test 3 – Similar but non-identical value (strict equality)
  it('Test 3: rejects similar or partial matching status values (e.g. "Forwarded to Testing", "Forwarded")', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 103,
        createdAt: '2026-11-06T10:00:00Z',
        user: { id: 50, name: 'Dev Lead' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'New',
            newValue: 'Forwarded to Testing', // Non-identical
          },
        ],
      },
      {
        id: 104,
        createdAt: '2026-11-06T11:00:00Z',
        user: { id: 50, name: 'Dev Lead' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'New',
            newValue: 'Forwarded', // Non-identical
          },
        ],
      },
      {
        id: 105,
        createdAt: '2026-11-06T12:00:00Z',
        user: { id: 50, name: 'Dev Lead' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'New',
            newValue: 'Forwarded to the Testing Team - Phase 1', // Non-identical
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16472, activities)
    expect(events).toHaveLength(0)
  })

  // Test 4 – General work package Status change must be ignored
  it('Test 4: strictly ignores standard work package "Status" field changes even if containing target string', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 106,
        createdAt: '2026-11-05T08:00:00Z',
        user: { id: 55, name: 'Project Manager' },
        details: [
          {
            property: 'status',
            propertyName: 'Status',
            oldValue: 'Open',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16473, activities)
    expect(events).toHaveLength(0)
  })

  // Test 5 – Repeated forwarding
  it('Test 5: preserves EVERY verified occurrence when a ticket is forwarded multiple times', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 201,
        createdAt: '2026-11-04T10:00:00Z',
        user: { id: 10, name: 'Alice' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'Not Started',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
      {
        id: 202,
        createdAt: '2026-11-05T12:00:00Z',
        user: { id: 11, name: 'Bob' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'Testing Failed',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
      {
        id: 203,
        createdAt: '2026-11-08T15:30:00Z',
        user: { id: 12, name: 'Charlie' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'Testing Failed',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16474, activities)
    expect(events).toHaveLength(3)

    // Sorted newest first
    expect(events[0].changedByName).toBe('Charlie')
    expect(events[0].changedAt).toBe('2026-11-08T15:30:00Z')
    expect(events[1].changedByName).toBe('Bob')
    expect(events[1].changedAt).toBe('2026-11-05T12:00:00Z')
    expect(events[2].changedByName).toBe('Alice')
    expect(events[2].changedAt).toBe('2026-11-04T10:00:00Z')
  })

  // Test 6 – Who Changed It (Actor must come from the same activity)
  it('Test 6: extracts the actor from the same journal activity record, never substituting author or assignee', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 301,
        createdAt: '2026-11-05T11:22:33Z',
        user: { id: 99, name: 'Priya Engineer' },
        details: [
          {
            property: 'customField14',
            propertyName: 'Testing Status',
            oldValue: 'In Progress',
            newValue: 'Forwarded to the Testing Team',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16475, activities)
    expect(events).toHaveLength(1)
    expect(events[0].changedByName).toBe('Priya Engineer')
    expect(events[0].changedById).toBe(99)
  })

  // Test 7 – Raw text journal parsing
  it('Test 7: correctly extracts exact transition from raw text format when structured fields are omitted by OpenProject', () => {
    const activities: WorkPackageActivity[] = [
      {
        id: 401,
        createdAt: '2026-11-05T16:00:00Z',
        user: { id: 77, name: 'Dev User' },
        details: [
          {
            property: '',
            raw: 'Testing Status changed from In Progress to Forwarded to the Testing Team',
          },
        ],
      },
    ]

    const events = detectExactForwardingTransitions(16476, activities)
    expect(events).toHaveLength(1)
    expect(events[0].previousTestingStatus).toBe('In Progress')
    expect(events[0].newTestingStatus).toBe('Forwarded to the Testing Team')
    expect(events[0].changedByName).toBe('Dev User')
  })

  // Test 8 – Structured Object Value normalization
  it('Test 8: extracts string representation from complex custom field objects before comparison', () => {
    expect(extractCustomFieldValue({ title: 'Forwarded to the Testing Team' })).toBe('Forwarded to the Testing Team')
    expect(extractCustomFieldValue({ name: 'Forwarded to the Testing Team' })).toBe('Forwarded to the Testing Team')
    expect(extractCustomFieldValue('  Forwarded to the Testing Team  ')).toBe('Forwarded to the Testing Team')
    expect(extractCustomFieldValue(null)).toBe('')
    expect(extractCustomFieldValue(undefined)).toBe('')
  })
})

