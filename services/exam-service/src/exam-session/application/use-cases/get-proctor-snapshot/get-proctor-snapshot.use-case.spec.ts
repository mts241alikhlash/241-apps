import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Readable } from 'node:stream'
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
import { fakeStorage } from '../../proctor-snapshot.test-support.js'
import { GetProctorSnapshotUseCase } from './get-proctor-snapshot.use-case.js'

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
  const created = await snapshots.create({
    sessionId: session.id,
    kind: 'SESSION_START',
    storageKey: `exam-proctor/${session.id}/evidence/1.jpg`,
    sizeBytes: 11_000,
    capturedAt: MONITOR_NOW,
    expiresAt: new Date(MONITOR_NOW.getTime() + 48 * 3_600_000),
  })
  const { storage } = fakeStorage()
  return {
    sessionId: session.id,
    snapshotId: created.id,
    useCase: new GetProctorSnapshotUseCase(
      fixture.sessions,
      snapshots,
      storage,
      new RoomAccessService(fixture.rooms),
    ),
  }
}

describe('GetProctorSnapshotUseCase', () => {
  it('streams the newest snapshot for the room supervisor', async () => {
    const { sessionId, useCase } = await build()

    const result = await useCase.execute(SUPERVISOR, sessionId, 'latest')

    expect(result.stream).toBeInstanceOf(Readable)
    expect(result.snapshot.kind).toBe('SESSION_START')
  })

  it('streams one evidence snapshot by id', async () => {
    const { sessionId, snapshotId, useCase } = await build()

    const result = await useCase.execute(SUPERVISOR, sessionId, snapshotId)

    expect(result.snapshot.id).toBe(snapshotId)
  })

  it('lets a coordinator read any room', async () => {
    const { sessionId, useCase } = await build()

    await expect(
      useCase.execute(
        { id: 'koord-1', permissions: [MANAGE_ALL] },
        sessionId,
        'latest',
      ),
    ).resolves.toBeDefined()
  })

  it('refuses a supervisor of another room with 403', async () => {
    const { sessionId, useCase } = await build()

    await expect(
      useCase.execute(
        { id: OTHER_SUPERVISOR_ID, permissions: [SUPERVISE] },
        sessionId,
        'latest',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('answers 404 when the session has no snapshot', async () => {
    const fixture = await seedMonitorRoom(1)
    const session = startSession(fixture, fixture.studentIds[0])
    const { storage } = fakeStorage()
    const useCase = new GetProctorSnapshotUseCase(
      fixture.sessions,
      new FakeExamProctorSnapshotRepository(),
      storage,
      new RoomAccessService(fixture.rooms),
    )

    await expect(
      useCase.execute(SUPERVISOR, session.id, 'latest'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
