import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'
import { DashboardLaunchOverlay } from '../DashboardLaunchOverlay'
import { ThreeBoardroomCanvas } from '@/components/CinematicBoardroomIntro/ThreeBoardroomCanvas'

describe('Dashboard Launch Components', () => {
  it('renders ThreeBoardroomCanvas without crashing', () => {
    const html = renderToString(
      <ThreeBoardroomCanvas
        projectName="Test Project"
        seniorPersonName="Lead QA"
        meetingWith="VP Eng"
        teamMembers={['Alice', 'Bob']}
        supportEmailsCount={5}
        newFeaturesCount={10}
        weekStart="2026-03-01"
        weekEnd="2026-03-07"
        scrollProgress={0}
        isDark={false}
      />
    )
    expect(html).toContain('canvas')
  })

  it('renders CinematicBoardroomIntro without crashing with empty/undefined props', () => {
    const html = renderToString(
      <CinematicBoardroomIntro
        projectName={undefined}
        seniorPersonName={undefined}
        meetingWith={undefined}
        teamMembers={undefined}
        supportEmailsCount={undefined}
        newFeaturesCount={undefined}
        weekStart={undefined}
        weekEnd={undefined}
        title={undefined}
        subtitle={undefined}
        onComplete={() => {}}
      >
        <div>Report Content</div>
      </CinematicBoardroomIntro>
    )
    expect(html).toContain('Report Content')
  })

  it('renders DashboardLaunchOverlay with empty props without crashing', () => {
    const html = renderToString(
      <DashboardLaunchOverlay
        open={true}
        projectName={undefined}
        seniorName={undefined}
        meetingWith={undefined}
        teamMembers={undefined}
        supportEmailsCount={0}
        newFeaturesCount={0}
        weekStart={undefined}
        weekEnd={undefined}
        onComplete={() => {}}
      >
        <div>Report Children</div>
      </DashboardLaunchOverlay>
    )
    expect(html).toContain('INITIALIZING...')
  })
})
