import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { CinematicBoardroomIntro } from '@/components/CinematicBoardroomIntro'
import { getTeamNames } from '@/components/CinematicBoardroomIntro/teamNamesHelper'
import { DashboardLaunchOverlay } from '../DashboardLaunchOverlay'

describe('Dashboard Launch Components', () => {

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

  it('keeps the role in the boardroom attendee label', () => {
    const html = renderToString(
      <CinematicBoardroomIntro meetingWith="Abhin(VP)" teamMembers={['QA Member']} />
    )
    expect(html).toMatch(/<span class="[^"]*nameTagText[^"]*">Abhin\(VP\)<\/span>/)
  })

  it('does not invent attendees or assurance claims when report data is empty', async () => {
    const html = renderToString(
      <CinematicBoardroomIntro teamMembers={[]} meetingWith="" autoFetchNames={false}>
        <button>Report action</button>
      </CinematicBoardroomIntro>
    )
    expect(html).not.toContain('Alex Morgan')
    expect(html).not.toContain('Sarah Jenkins')
    expect(html).not.toContain('SOC-2 QA ASSURED')
    expect(html).toMatch(/aria-hidden="true"[^>]*inert=""[^>]*><button>Report action<\/button>/)

    const names = await getTeamNames()
    expect(names.members).toEqual([])
    expect(names.seniorNames).toEqual([])
  })
})
