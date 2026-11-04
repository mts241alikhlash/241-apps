import { ForbiddenException } from '@nestjs/common'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  type RoomStaffUser,
} from '../../room-access.service.js'
import {
  FOREIGN_SUPERVISOR_ID,
  SUPERVISOR_ID,
  type MonitorFixture,
  seedMonitorRoom,
  startSession,
} from '../../room-monitor.test-support.js'
import { GetSessionTimelineUseCase } from './get-session-timeline.use-case.js'

const SUPERVISOR: RoomStaffUser = {
  id: SUPERVISOR_ID,
  permissions: [SUPERVISE],
}

interface TimelineFixture {
  fixture: MonitorFixture
  sessionId: string
  timeline: GetSessionTimelineUseCase
}

async function build(): Promise<TimelineFixture> {
  const fixture = await seedMonitorRoom(2)
  const session = startSession(fixture, fixture.studentIds[0])
  await fixture.rooms.recordSessionEvents(session.id, [
    {
      clientId: 'ev-2',
      type: 'LEFT_APP',
      isViolation: true,
      detail: null,
      occurredAt: new Date('2026-11-02T01:45:00.000Z'),
    },
    {
      clientId: 'ev-1',
      type: 'SCREEN_OFF',
      isViolation: false,
      detail: null,
      occurredAt: new Date('2026-11-02T01:40:00.000Z'),
    },
  ])
  await fixture.rooms.writeAuditLog({
    sessionId: session.id,
    roomId: fixture.room.id,
    action: 'RELEASE_DEVICE',
    actorId: SUPERVISOR_ID,
    reason: 'HP siswa mati',
  })
  return {
    fixture,
    sessionId: session.id,
    timeline: new GetSessionTimelineUseCase(
      fixture.rooms,
      fixture.sessions,
      new RoomAccessService(fixture.rooms),
    ),
  }
}

describe('GetSessionTimelineUseCase', () => {
  it('merges events and audit rows in chronological order', async () => {
    const { sessionId, timeline } = await build()

    const rows = await timeline.execute(SUPERVISOR, sessionId)

    const events = rows.filter((row) => row.kind === 'EVENT')
    const audits = rows.filter((row) => row.kind === 'AUDIT')

    expect(events.map((row) => row.type)).toEqual(['SCREEN_OFF', 'LEFT_APP'])
    expect(events[0]).toMatchObject({
      isViolation: false,
      occurredAt: '2026-11-02T01:40:00.000Z',
    })
    expect(events[1]).toMatchObject({
      isViolation: true,
      occurredAt: '2026-11-02T01:45:00.000Z',
    })
    expect(audits).toEqual([
      expect.objectContaining({
        action: 'RELEASE_DEVICE',
        reason: 'HP siswa mati',
      }),
    ])
    expect(
      rows
        .map((row) => row.occurredAt)
        .every((at, index, all) => (index === 0 ? true : all[index - 1] <= at)),
    ).toBe(true)
  })

  it('lets a coordinator read any room timeline', async () => {
    const { sessionId, timeline } = await build()

    await expect(
      timeline.execute({ id: 'koord-1', permissions: [MANAGE_ALL] }, sessionId),
    ).resolves.toHaveLength(3)
  })

  it('reads the timeline of a supervisor of another slot', async () => {
    const { sessionId, timeline } = await build()

    await expect(
      timeline.execute(
        { id: FOREIGN_SUPERVISOR_ID, permissions: [SUPERVISE] },
        sessionId,
      ),
    ).resolves.toHaveLength(3)
  })

  it('refuses a supervisor with no slot in the room', async () => {
    const { sessionId, timeline } = await build()

    await expect(
      timeline.execute({ id: 'sup-none', permissions: [SUPERVISE] }, sessionId),
    ).rejects.toThrow(ForbiddenException)
  })
})
