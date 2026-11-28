import {
  MANAGE_ALL,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../room-access.service.js'
import {
  MONITOR_NOW,
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  seedMonitorRoom,
} from '../../room-monitor.test-support.js'
import { ListFieldNotesUseCase } from './list-field-notes.use-case.js'

const COORDINATOR: RoomStaffUser = { id: 'koord-1', permissions: [MANAGE_ALL] }

async function build() {
  const fixture = await seedMonitorRoom(4)
  const report = await fixture.rooms.createReport({
    roomId: fixture.room.id,
    supervisorSlotId: fixture.slotId,
  })
  fixture.rooms.fieldNotes.push({
    id: 'note-1',
    reportId: report.id,
    studentId: fixture.studentIds[0],
    sessionId: null,
    category: 'OTHER',
    note: 'Keluar ruangan',
    recordedBy: SUPERVISOR_ID,
    createdAt: MONITOR_NOW,
  })
  return {
    fixture,
    notes: new ListFieldNotesUseCase(fixture.rooms, fixture.students),
  }
}

describe('ListFieldNotesUseCase', () => {
  it('returns the notes of the current slot of each room for a coordinator', async () => {
    const { fixture, notes } = await build()

    const rows = await notes.execute(COORDINATOR, {}, MONITOR_NOW)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'note-1',
      roomId: fixture.room.id,
      roomName: fixture.room.name,
      slotId: fixture.slotId,
      studentId: fixture.studentIds[0],
      category: 'OTHER',
      note: 'Keluar ruangan',
    })
  })

  it('returns only the rooms a technician runs', async () => {
    const { notes } = await build()

    const mine = await notes.execute(
      { id: TECHNICIAN_ID, permissions: [TECHNICIAN] },
      {},
      MONITOR_NOW,
    )
    const others = await notes.execute(
      { id: 'tech-other', permissions: [TECHNICIAN] },
      {},
      MONITOR_NOW,
    )

    expect(mine).toHaveLength(1)
    expect(others).toEqual([])
  })

  it('reads all rooms in one slot query and one supervisor query', async () => {
    const { fixture, notes } = await build()
    const slots = vi.spyOn(fixture.rooms, 'listSupervisorsAt')
    const found = vi.spyOn(fixture.rooms, 'listFieldNotesForSlots')

    await notes.execute(COORDINATOR, {}, MONITOR_NOW)

    expect(slots).toHaveBeenCalledTimes(1)
    expect(found).toHaveBeenCalledTimes(1)
  })

  it('uses the given slot ids instead of the current slots', async () => {
    const { fixture, notes } = await build()

    const none = await notes.execute(
      COORDINATOR,
      { slotIds: [fixture.laterSlotId] },
      MONITOR_NOW,
    )
    const given = await notes.execute(
      COORDINATOR,
      { slotIds: [fixture.slotId] },
      MONITOR_NOW,
    )

    expect(none).toEqual([])
    expect(given).toHaveLength(1)
  })
})
