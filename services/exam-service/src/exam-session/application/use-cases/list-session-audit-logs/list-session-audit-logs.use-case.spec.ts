import { ForbiddenException } from '@nestjs/common'
import {
  MANAGE_ALL,
  READ_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../../../exam-room/application/room-access.service.js'
import {
  SUPERVISOR_ID,
  TECHNICIAN_ID,
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
    fixture,
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

  it('lets read-all and the assigned technician read the log, and refuses another technician', async () => {
    const { fixture, sessionId, useCase } = await build()
    const roomless = startSession(fixture, fixture.studentIds[1], {
      roomId: null,
    })

    await expect(
      useCase.execute(
        { id: 'principal-1', permissions: [READ_ALL] },
        sessionId,
      ),
    ).resolves.toHaveLength(1)
    await expect(
      useCase.execute(
        { id: 'principal-1', permissions: [READ_ALL] },
        roomless.id,
      ),
    ).resolves.toEqual([])
    await expect(
      useCase.execute(
        { id: TECHNICIAN_ID, permissions: [TECHNICIAN] },
        sessionId,
      ),
    ).resolves.toHaveLength(1)
    await expect(
      useCase.execute(
        { id: 'tech-other', permissions: [TECHNICIAN] },
        sessionId,
      ),
    ).rejects.toThrow(ForbiddenException)
  })
})
