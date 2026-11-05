import { ForbiddenException } from '@nestjs/common'
import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ConfigService } from '@nestjs/config'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../room-access.service.js'
import { RoomAccessCodeService } from '../../room-access-code.service.js'
import {
  MONITOR_NOW,
  OTHER_SUPERVISOR_ID,
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  scheduleOf,
  seedMonitorRoom,
  startSession,
} from '../../room-monitor.test-support.js'
import { GetRoomMonitorUseCase } from './get-room-monitor.use-case.js'

const SUPERVISOR_USER: RoomStaffUser = {
  id: SUPERVISOR_ID,
  permissions: [SUPERVISE],
}
const ROOM_TECH: RoomStaffUser = {
  id: TECHNICIAN_ID,
  permissions: [TECHNICIAN],
}
const COORDINATOR: RoomStaffUser = {
  id: 'koord-1',
  permissions: [MANAGE_ALL],
}

function build() {
  return seedMonitorRoom(120).then((fixture) => ({
    fixture,
    monitor: new GetRoomMonitorUseCase(
      fixture.rooms,
      fixture.sessions,
      fixture.schedules,
      fixture.packages,
      fixture.students,
      fixture.academic,
      fixture.authors,
      fixture.employees,
      new RoomAccessService(fixture.rooms),
      new RoomAccessCodeService('unit-test-secret-of-at-least-32-characters'),
      new SchoolTimeService({
        getOrThrow: () => 'Asia/Jakarta',
      } as unknown as ConfigService),
    ),
  }))
}

describe('GetRoomMonitorUseCase school day window', () => {
  it('bounds the fallback window by the local day: 23:45 UTC is 06:45 WIB of the next day', async () => {
    const { fixture, monitor } = await build()
    const spy = vi.spyOn(fixture.schedules, 'listSchedulesForEventWindow')
    await monitor
      .execute(
        COORDINATOR,
        fixture.room.id,
        { page: 1, limit: 25 },
        new Date('2026-11-05T23:45:00Z'),
      )
      .catch(() => undefined)
    const [, from, to] = spy.mock.calls[0]
    expect(from.toISOString()).toBe('2026-11-05T17:00:00.000Z')
    expect(to.toISOString()).toBe('2026-11-06T17:00:00.000Z')
  })
})

describe('GetRoomMonitorUseCase', () => {
  it('returns the exact page slice while the summary covers the whole roster', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0], { syncedAnswerCount: 12 })
    startSession(fixture, fixture.studentIds[1], {
      syncedAnswerCount: 4,
      unsyncedCount: 4,
    })
    startSession(fixture, fixture.studentIds[2], {
      status: 'SUBMITTED',
      submittedAt: MONITOR_NOW,
    })
    startSession(fixture, fixture.studentIds[3], { lockedByViolation: true })

    const result = await monitor.execute(
      COORDINATOR,
      fixture.room.id,
      { page: 3, limit: 25 },
      MONITOR_NOW,
    )

    expect(result.data).toHaveLength(25)
    expect(result.data[0].seatNumber).toBe(51)
    expect(result.data[24].seatNumber).toBe(75)
    expect(result.meta).toMatchObject({
      page: 3,
      limit: 25,
      total: 120,
      summary: {
        totalRegistered: 120,
        notStartedCount: 116,
        inProgressCount: 3,
        offlineOrUnsyncedCount: 1,
        lockedOrViolationCount: 1,
        finishedCount: 1,
        absentMarkedCount: 0,
      },
    })
    expect(result.meta.serverTime).toEqual(MONITOR_NOW.toISOString())
  })

  it('keeps the summary over the roster when a search narrows the page', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0])

    const result = await monitor.execute(
      COORDINATOR,
      fixture.room.id,
      { page: 1, limit: 10, search: 'Siswa 11' },
      MONITOR_NOW,
    )

    expect(result.data[0].studentName).toBe('Siswa 11')
    expect(
      result.data.every((row) => row.studentName?.includes('Siswa 11')),
    ).toBe(true)
    expect(result.meta.total).toBe(11)
    expect(result.meta.summary.totalRegistered).toBe(120)
    expect(result.meta.summary.inProgressCount).toBe(1)
  })

  it('filters by status and classroom without touching the summary', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0], {
      status: 'SUBMITTED',
      submittedAt: MONITOR_NOW,
    })

    const result = await monitor.execute(
      COORDINATOR,
      fixture.room.id,
      { page: 1, limit: 100, status: 'SUBMITTED' },
      MONITOR_NOW,
    )

    expect(result.data).toHaveLength(1)
    expect(result.data[0].session?.status).toBe('SUBMITTED')
    expect(result.meta.summary.finishedCount).toBe(1)
  })

  it('counts a marked absence and exposes it on the participant row', async () => {
    const { fixture, monitor } = await build()
    const report = await fixture.rooms.createReport({
      roomId: fixture.room.id,
      supervisorSlotId: fixture.slotId,
    })
    await fixture.rooms.recordAbsence({
      reportId: report.id,
      studentId: fixture.studentIds[4],
      scheduleId: scheduleOf(fixture, fixture.studentIds[4]).id,
      reason: 'SICK',
      note: 'Demam tinggi',
      recordedBy: SUPERVISOR_ID,
    })

    const result = await monitor.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.meta.summary.absentMarkedCount).toBe(1)
    expect(result.data[4].absence).toEqual({
      reason: 'SICK',
      note: 'Demam tinggi',
    })
  })

  it('refuses a supervisor of another room', async () => {
    const { fixture, monitor } = await build()

    await expect(
      monitor.execute(
        { id: OTHER_SUPERVISOR_ID, permissions: [SUPERVISE] },
        fixture.room.id,
        {},
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('keeps reading after the slot window ends', async () => {
    const { fixture, monitor } = await build()

    await expect(
      monitor.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        {},
        new Date('2026-11-02T10:00:00.000Z'),
      ),
    ).resolves.toMatchObject({ meta: { room: { id: fixture.room.id } } })
  })

  it('reads an explicit slot the caller is scheduled for', async () => {
    const { fixture, monitor } = await build()

    await expect(
      monitor.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        { slotId: fixture.laterSlotId },
        MONITOR_NOW,
      ),
    ).resolves.toMatchObject({ meta: { room: { id: fixture.room.id } } })

    await expect(
      monitor.execute(
        COORDINATOR,
        fixture.room.id,
        { slotId: fixture.laterSlotId },
        MONITOR_NOW,
      ),
    ).resolves.toMatchObject({ meta: { room: { id: fixture.room.id } } })
  })

  it('refuses an explicit slot of another supervisor', async () => {
    const { fixture, monitor } = await build()

    await expect(
      monitor.execute(
        SUPERVISOR_USER,
        fixture.room.id,
        { slotId: fixture.foreignSlotId },
        MONITOR_NOW,
      ),
    ).rejects.toThrow(ForbiddenException)
  })

  it('keeps both overlapping schedules of one classroom', async () => {
    const { fixture, monitor } = await build()
    const second = await fixture.packages.create({
      title: 'PAS Bahasa Arab',
      subjectId: '33333333-3333-4333-8333-333333333333',
      gradeId: '22222222-2222-4222-8222-222222222222',
      createdById: 'admin-1',
      items: [],
    })
    const overlapping = await fixture.schedules.createAndLockPackage({
      packageId: second.id,
      classroomId: scheduleOf(fixture, fixture.studentIds[1]).classroomId,
      semesterId: '88888888-8888-4888-8888-888888888888',
      eventId: fixture.eventId,
      startsAt: new Date('2026-11-02T01:30:00.000Z'),
      endsAt: new Date('2026-11-02T03:00:00.000Z'),
      durationMinutes: 90,
      type: 'UAS',
      createdById: 'admin-1',
    })
    if (overlapping === null) throw new Error('schedule not created')
    startSession(fixture, fixture.studentIds[1], {
      scheduleId: overlapping.id,
    })

    const result = await monitor.execute(
      COORDINATOR,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.data[1].packageTitle).toBe('PAS Bahasa Arab')
    expect(result.data[1].session?.status).toBe('IN_PROGRESS')
    expect(result.meta.summary.inProgressCount).toBe(1)
  })

  it('keeps a started student out of the absentee list', async () => {
    const { fixture, monitor } = await build()
    const report = await fixture.rooms.createReport({
      roomId: fixture.room.id,
      supervisorSlotId: fixture.slotId,
    })
    await fixture.rooms.recordAbsence({
      reportId: report.id,
      studentId: fixture.studentIds[0],
      scheduleId: scheduleOf(fixture, fixture.studentIds[0]).id,
      reason: 'SICK',
      note: null,
      recordedBy: SUPERVISOR_ID,
    })
    startSession(fixture, fixture.studentIds[0])

    const result = await monitor.execute(
      SUPERVISOR_USER,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.data[0].session).not.toBeNull()
    expect(result.data[0].absence).toBeNull()
  })

  it('counts every finished status under the SUBMITTED filter', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0], {
      status: 'SUBMITTED',
      submittedAt: MONITOR_NOW,
    })
    startSession(fixture, fixture.studentIds[1], { status: 'EXPIRED' })

    const result = await monitor.execute(
      COORDINATOR,
      fixture.room.id,
      { page: 1, limit: 100, status: 'SUBMITTED' },
      MONITOR_NOW,
    )

    expect(result.data).toHaveLength(2)
    expect(result.meta.total).toBe(2)
  })

  it('reports the room, the rotating token, and the staff names', async () => {
    const { fixture, monitor } = await build()

    const result = await monitor.execute(
      ROOM_TECH,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.meta.room).toMatchObject({
      id: fixture.room.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 120,
    })
    expect(result.meta.room.currentSupervisorName).toBe('Ustadz Ahmad')
    expect(result.meta.token?.accessCode).toHaveLength(6)
    expect(result.data[0].totalQuestions).toBe(40)
    expect(result.data[0].packageTitle).toBe('PAS Matematika')
  })

  it('exposes the snapshot stamp, the block reason, and the read path', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0], {
      lastSnapshotAt: MONITOR_NOW,
      cameraBlocked: 'permission',
    })

    const result = await monitor.execute(
      ROOM_TECH,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.data[0].session).toMatchObject({
      lastSnapshotAt: MONITOR_NOW.toISOString(),
      cameraBlocked: 'permission',
      latestSnapshotUrl: `/exam-sessions/${result.data[0].session?.sessionId}/snapshots/latest`,
    })
  })

  it('reports no snapshot path for a session that never sent one', async () => {
    const { fixture, monitor } = await build()
    startSession(fixture, fixture.studentIds[0], {
      lastSnapshotAt: null,
      cameraBlocked: null,
    })

    const result = await monitor.execute(
      ROOM_TECH,
      fixture.room.id,
      { page: 1, limit: 5 },
      MONITOR_NOW,
    )

    expect(result.data[0].session).toMatchObject({
      lastSnapshotAt: null,
      cameraBlocked: null,
      latestSnapshotUrl: null,
    })
  })
})
