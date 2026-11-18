import type { RoomStaffUser } from '../../room-access.service.js'
import { MANAGE_ALL, SUPERVISE, TECHNICIAN } from '../../room-access.service.js'
import {
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  seedMonitorRoom,
} from '../../room-monitor.test-support.js'
import { ListRoomReportsUseCase } from './list-room-reports.use-case.js'

const COORDINATOR: RoomStaffUser = { id: 'koord-1', permissions: [MANAGE_ALL] }

async function build() {
  const fixture = await seedMonitorRoom(4)
  return { fixture, reports: new ListRoomReportsUseCase(fixture.rooms) }
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
    await fixture.rooms.submitReport(report.id, SUPERVISOR_ID, new Date())

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
})
