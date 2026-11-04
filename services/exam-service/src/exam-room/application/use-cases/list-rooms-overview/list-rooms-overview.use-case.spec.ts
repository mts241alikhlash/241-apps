import type { RoomStaffUser } from '../../room-access.service.js'
import { MANAGE_ALL, SUPERVISE, TECHNICIAN } from '../../room-access.service.js'
import {
  MONITOR_NOW,
  SUPERVISOR_ID,
  TECHNICIAN_ID,
  seedMonitorRoom,
} from '../../room-monitor.test-support.js'
import { ListRoomsOverviewUseCase } from './list-rooms-overview.use-case.js'

const COORDINATOR: RoomStaffUser = {
  id: 'koord-1',
  permissions: [MANAGE_ALL],
}

async function build() {
  const fixture = await seedMonitorRoom(4)
  return {
    fixture,
    overview: new ListRoomsOverviewUseCase(
      fixture.rooms,
      fixture.authors,
      fixture.employees,
    ),
  }
}

describe('ListRoomsOverviewUseCase', () => {
  it('lists every active room for a coordinator', async () => {
    const { fixture, overview } = await build()

    const rows = await overview.execute(COORDINATOR, {}, MONITOR_NOW)

    expect(rows.map((row) => row.code)).toEqual(['R01', 'R02'])
    expect(rows[0]).toMatchObject({
      id: fixture.room.id,
      registeredCount: 4,
      capacity: 4,
      technicianName: null,
      currentSupervisorName: 'Ustadz Ahmad',
      isSubstituted: false,
      isActiveNow: true,
    })
  })

  it('keeps only the rooms a technician runs', async () => {
    const { overview } = await build()

    const rows = await overview.execute(
      { id: TECHNICIAN_ID, permissions: [TECHNICIAN] },
      {},
      MONITOR_NOW,
    )

    expect(rows.map((row) => row.code)).toEqual(['R01'])
  })

  it('keeps the rooms a supervisor holds any slot in, past or future', async () => {
    const { overview } = await build()

    const rows = await overview.execute(
      { id: SUPERVISOR_ID, permissions: [SUPERVISE] },
      {},
      MONITOR_NOW,
    )
    expect(rows.map((row) => row.code)).toEqual(['R01'])

    const later = await overview.execute(
      { id: SUPERVISOR_ID, permissions: [SUPERVISE] },
      {},
      new Date('2026-11-02T10:00:00.000Z'),
    )
    expect(later.map((row) => row.code)).toEqual(['R01'])
  })

  it('returns nothing for a supervisor with no assignment', async () => {
    const { overview } = await build()

    expect(
      await overview.execute(
        { id: 'sup-none', permissions: [SUPERVISE] },
        {},
        MONITOR_NOW,
      ),
    ).toEqual([])
  })

  it('scopes the list to one event when asked', async () => {
    const { fixture, overview } = await build()

    expect(
      await overview.execute(
        COORDINATOR,
        { eventId: fixture.eventId },
        MONITOR_NOW,
      ),
    ).toHaveLength(2)
  })
})
