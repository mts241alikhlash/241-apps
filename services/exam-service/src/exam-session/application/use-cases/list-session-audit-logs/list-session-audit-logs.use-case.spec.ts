import { ForbiddenException } from '@nestjs/common'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import {
  SUPERVISOR_ID,
  seedMonitorRoom,
  startSession,
} from '../../../../exam-room/application/room-monitor.test-support.js'
import { ListSessionAuditLogsUseCase } from './list-session-audit-logs.use-case.js'

const SUPERVISOR: RoomStaffUser = {
  id: SUPERVISOR_ID,
  permissions: [SUPERVISE],
}

const COORDINATOR: RoomStaffUser = {
  id: 'koord-1',
  permissions: [MANAGE_ALL],
}

async function build() {
  const fixture = await seedMonitorRoom(2)
  const session = startSession(fixture, fixture.studentIds[0])
  await fixture.rooms.writeAuditLog({
    sessionId: session.id,
    roomId: fixture.room.id,
    action: 'RELEASE_DEVICE',
    actorId: SUPERVISOR_ID,
    reason: 'HP siswa mati',
  })
  return {
    sessionId: session.id,
    useCase: new ListSessionAuditLogsUseCase(
      fixture.rooms,
      fixture.sessions,
      new RoomAccessService(fixture.rooms),
    ),
  }
}

describe('ListSessionAuditLogsUseCase', () => {
  it('lists the recovery actions of a session', async () => {
    const { sessionId, useCase } = await build()

    const rows = await useCase.execute(SUPERVISOR, sessionId)

    expect(rows).toEqual([
      expect.objectContaining({
        action: 'RELEASE_DEVICE',
        reason: 'HP siswa mati',
      }),
    ])
  })

  it('lets a coordinator read the log of any room', async () => {
    const { sessionId, useCase } = await build()

    await expect(useCase.execute(COORDINATOR, sessionId)).resolves.toHaveLength(
      1,
    )
  })

  it('refuses a supervisor with no slot in the room', async () => {
    const { sessionId, useCase } = await build()

    await expect(
      useCase.execute({ id: 'sup-none', permissions: [SUPERVISE] }, sessionId),
    ).rejects.toThrow(ForbiddenException)
  })
})
