import type { RoomStaffUser } from '../../room-access.service.js'
import { SAMPLE_ATTACHMENT } from '../../room-report-file-storage.fake.js'
import { CLASSROOM_7A } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { MANAGE_ALL, SUPERVISE, TECHNICIAN } from '../../room-access.service.js'
import {
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  seedMonitorRoom,
} from '../../room-monitor.test-support.js'
import { FakeAcademicLookup } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { ListRoomReportsUseCase } from './list-room-reports.use-case.js'

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
})
