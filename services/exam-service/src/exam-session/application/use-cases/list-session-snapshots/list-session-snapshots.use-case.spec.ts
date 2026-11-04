import { ForbiddenException } from '@nestjs/common'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import {
  MONITOR_NOW,
  OTHER_SUPERVISOR_ID,
  SUPERVISOR_ID,
  seedMonitorRoom,
  startSession,
} from '../../../../exam-room/application/room-monitor.test-support.js'
import { FakeExamProctorSnapshotRepository } from '../../exam-proctor-snapshot.repository.fake.js'
import { ListSessionSnapshotsUseCase } from './list-session-snapshots.use-case.js'

const SUPERVISOR: RoomStaffUser = {
  id: SUPERVISOR_ID,
  permissions: [SUPERVISE],
}

async function build() {
  const fixture = await seedMonitorRoom(1)
  await fixture.rooms.assignSupervisor({
    roomId: fixture.otherRoom.id,
    startsAt: MONITOR_NOW,
    endsAt: new Date(MONITOR_NOW.getTime() + 3_600_000),
    scheduledUserId: OTHER_SUPERVISOR_ID,
  })
  const session = startSession(fixture, fixture.studentIds[0])
  const snapshots = new FakeExamProctorSnapshotRepository()
  snapshots.seed(
    session.id,
    'LIVE',
    new Date(MONITOR_NOW.getTime() + 48 * 3_600_000),
  )
  snapshots.seed(
    session.id,
    'SESSION_START',
    new Date(MONITOR_NOW.getTime() + 48 * 3_600_000),
  )
  return {
    sessionId: session.id,
    useCase: new ListSessionSnapshotsUseCase(
      fixture.sessions,
      snapshots,
      new RoomAccessService(fixture.rooms),
    ),
  }
}

describe('ListSessionSnapshotsUseCase', () => {
  it('lists only the evidence snapshots of the session', async () => {
    const { sessionId, useCase } = await build()

    const rows = await useCase.execute(SUPERVISOR, sessionId)

    expect(rows.map((row) => row.kind)).toEqual(['SESSION_START'])
  })

  it('lets a coordinator read any room', async () => {
    const { sessionId, useCase } = await build()

    await expect(
      useCase.execute({ id: 'koord-1', permissions: [MANAGE_ALL] }, sessionId),
    ).resolves.toHaveLength(1)
  })

  it('refuses a supervisor of another room with 403', async () => {
    const { sessionId, useCase } = await build()

    await expect(
      useCase.execute(
        { id: OTHER_SUPERVISOR_ID, permissions: [SUPERVISE] },
        sessionId,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
