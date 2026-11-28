import type { RoomStaffUser } from '../../room-access.service.js'
import { SAMPLE_ATTACHMENT } from '../../room-report-file-storage.fake.js'
import { CLASSROOM_7A } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import {
  MANAGE_ALL,
  READ_ALL,
  SUPERVISE,
  TECHNICIAN,
} from '../../room-access.service.js'
import {
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  seedMonitorRoom,
} from '../../room-monitor.test-support.js'
import { FakeAcademicLookup } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { ListRoomReportsUseCase } from './list-room-reports.use-case.js'
import {
  LATER_SLOT_END,
  LATER_SLOT_START,
} from '../../room-monitor.test-support.js'

const COORDINATOR: RoomStaffUser = { id: 'koord-1', permissions: [MANAGE_ALL] }

async function build() {
  const fixture = await seedMonitorRoom(4)
  const academic = new FakeAcademicLookup({
    subjects: [{ id: CLASSROOM_7A.id, name: 'Matematika' }],
  })
  return {
    fixture,
    reports: new ListRoomReportsUseCase(
      fixture.rooms,
      fixture.schedules,
      academic,
      fixture.authors,
      fixture.employees,
    ),
  }
}

describe('ListRoomReportsUseCase', () => {
  it('gives one row per supervisor slot the caller may see, draft when unfilled', async () => {
    const { fixture, reports } = await build()

    const rows = await reports.execute(COORDINATOR, {})

    expect(rows.map((row) => [row.roomCode, row.slotId, row.status])).toEqual([
      ['R01', fixture.slotId, 'DRAFT'],
      ['R01', fixture.foreignSlotId, 'DRAFT'],
      ['R01', fixture.laterSlotId, 'DRAFT'],
    ])
    expect(rows[0]).toMatchObject({
      roomId: fixture.room.id,
      roomName: 'Ruang 01',
      registeredCount: 4,
      reportId: null,
      startsAt: fixture.slotId === '' ? '' : expect.any(String),
    })
  })

  it('reports the status of a report that was already submitted', async () => {
    const { fixture, reports } = await build()
    const report = await fixture.rooms.createReport({
      roomId: fixture.room.id,
      supervisorSlotId: fixture.slotId,
    })
    await fixture.rooms.submitReport(
      report.id,
      SUPERVISOR_ID,
      new Date(),
      SAMPLE_ATTACHMENT,
    )

    const rows = await reports.execute(COORDINATOR, {})

    expect(rows.find((row) => row.slotId === fixture.slotId)).toMatchObject({
      status: 'SUBMITTED',
      reportId: report.id,
    })
  })

  it('keeps only the rooms a technician runs and the slots a supervisor holds', async () => {
    const { reports } = await build()

    const technicianRooms = await reports.execute(
      { id: TECHNICIAN_ID, permissions: [TECHNICIAN] },
      {},
    )
    const supervised = await reports.execute(
      { id: SUPERVISOR_ID, permissions: [SUPERVISE] },
      {},
    )

    expect(technicianRooms.map((row) => row.roomCode)).toEqual([
      'R01',
      'R01',
      'R01',
    ])
    expect(supervised.map((row) => row.roomCode)).toEqual(['R01', 'R01'])
    expect(supervised.map((row) => row.slotId)).not.toContain('foreign-slot')
  })

  it('keeps only the slots of the requested event', async () => {
    const { fixture, reports } = await build()

    expect(await reports.execute(COORDINATOR, { eventId: 'lain' })).toEqual([])
    expect(
      (await reports.execute(COORDINATOR, { eventId: fixture.eventId })).length,
    ).toBe(3)
  })

  it('names the subject once when two classrooms of the room sit the same subject', async () => {
    const { fixture, reports } = await build()

    const rows = await reports.execute(COORDINATOR, {})

    expect(rows.find((row) => row.slotId === fixture.slotId)).toMatchObject({
      subjectNames: ['Matematika'],
      supervisorName: 'Ustadz Ahmad',
    })
  })

  it('leaves subjectNames empty for a slot without a matching schedule', async () => {
    const { fixture, reports } = await build()

    const rows = await reports.execute(COORDINATOR, {})

    expect(
      rows.find((row) => row.slotId === fixture.laterSlotId)?.subjectNames,
    ).toEqual([])
  })

  it('shows the actual supervisor after a substitution', async () => {
    const { fixture, reports } = await build()
    const before = await reports.execute(COORDINATOR, {})
    await fixture.rooms.substituteSupervisor({
      supervisorId: fixture.foreignSlotId,
      actualUserId: SUPERVISOR_ID,
      substitutedByAdminId: 'admin-1',
      reason: 'sakit',
      at: new Date(),
    })

    const after = await reports.execute(COORDINATOR, {})

    expect(
      before.find((row) => row.slotId === fixture.foreignSlotId)
        ?.supervisorName,
    ).toBe(null)
    expect(
      after.find((row) => row.slotId === fixture.foreignSlotId)?.supervisorName,
    ).toBe('Ustadz Ahmad')
  })

  it('names the subject of an activity whose slot has no schedule yet', async () => {
    const { fixture } = await build()
    const ipaId = '55555555-5555-4555-8555-555555555555'
    fixture.rooms.activities.set('act-ipa', {
      id: 'act-ipa',
      eventId: fixture.eventId,
      gradeId: CLASSROOM_7A.gradeId,
      subjectId: ipaId,
      startsAt: LATER_SLOT_START,
      endsAt: LATER_SLOT_END,
      deliveryMode: 'ONLINE',
      offlineKind: null,
    })
    const reports = new ListRoomReportsUseCase(
      fixture.rooms,
      fixture.schedules,
      new FakeAcademicLookup({
        classrooms: [CLASSROOM_7A],
        subjects: [{ id: ipaId, name: 'IPA' }],
      }),
      fixture.authors,
      fixture.employees,
    )

    const rows = await reports.execute(COORDINATOR, {})

    expect(
      rows.find((row) => row.slotId === fixture.laterSlotId)?.subjectNames,
    ).toEqual(['IPA'])
  })

  it('shows no supervisor name for a slot that has no supervisor', async () => {
    const { fixture, reports } = await build()
    const open = await fixture.rooms.assignSupervisor({
      roomId: fixture.room.id,
      startsAt: new Date('2026-11-02T09:00:00.000Z'),
      endsAt: new Date('2026-11-02T10:00:00.000Z'),
      scheduledUserId: null,
    })

    const rows = await reports.execute(COORDINATOR, {})

    expect(rows.find((row) => row.slotId === open.id)).toMatchObject({
      status: 'DRAFT',
      supervisorName: null,
    })
  })

  it('lists every room and slot for exam-rooms.read-all', async () => {
    const { reports } = await build()

    const rows = await reports.execute(
      { id: 'principal-1', permissions: [READ_ALL] },
      {},
    )

    expect(rows).toHaveLength(3)
  })
})
