import { SEMESTER_ID } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { MANAGE_ALL } from '../../room-access.service.js'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import { AssignSupervisorUseCase } from './assign-supervisor.use-case.js'

describe('AssignSupervisorUseCase', () => {
  it('puts up a slot with no supervisor when none is named', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: 'UAS Ganjil',
      type: 'FINAL',
      startsAt: new Date('2026-11-02T00:00:00.000Z'),
      endsAt: new Date('2026-11-05T00:00:00.000Z'),
      createdById: 'admin-1',
    })
    const room = await rooms.createRoom({
      eventId: event.id,
      code: 'R01',
      name: 'Ruang 01',
      capacity: 30,
    })

    const slot = await new AssignSupervisorUseCase(rooms).execute(
      { id: 'koord-1', permissions: [MANAGE_ALL] },
      {
        roomId: room.id,
        startsAt: new Date('2026-11-02T01:00:00.000Z'),
        endsAt: new Date('2026-11-02T02:30:00.000Z'),
        reason: 'Slot awal jadwal',
      },
    )

    expect(slot).toMatchObject({ scheduledUserId: null, actualUserId: null })
  })
})
