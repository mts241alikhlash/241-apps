import { ForbiddenException } from '@nestjs/common'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import {
  MANAGE_ALL,
  RoomAccessService,
  SUPERVISE,
  TECHNICIAN,
} from '../../room-access.service.js'
import { ListSupervisorsUseCase } from './list-supervisors.use-case.js'

describe('ListSupervisorsUseCase', () => {
  it('allows the room technician and assigned supervisors, and blocks outsiders', async () => {
    const rooms = new FakeExamRoomRepository()
    const room = await rooms.createRoom({
      eventId: 'ev-1',
      code: 'R05',
      name: 'Ruang 5',
      capacity: 30,
      technicianUserId: 'tech-1',
    })
    const slot = await rooms.assignSupervisor({
      roomId: room.id,
      scheduledUserId: 'sup-1',
      startsAt: new Date('2026-11-24T08:30:00.000Z'),
      endsAt: new Date('2026-11-24T09:45:00.000Z'),
    })
    const useCase = new ListSupervisorsUseCase(
      rooms,
      new RoomAccessService(rooms),
    )

    const techSlots = await useCase.execute(
      { id: 'tech-1', permissions: [TECHNICIAN] },
      room.id,
    )
    const supSlots = await useCase.execute(
      { id: 'sup-1', permissions: [SUPERVISE] },
      room.id,
    )
    const adminSlots = await useCase.execute(
      { id: 'admin-1', permissions: [MANAGE_ALL] },
      room.id,
    )

    expect(techSlots.map((item) => item.id)).toEqual([slot.id])
    expect(supSlots.map((item) => item.id)).toEqual([slot.id])
    expect(adminSlots.map((item) => item.id)).toEqual([slot.id])

    await expect(
      useCase.execute({ id: 'other-tech', permissions: [TECHNICIAN] }, room.id),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })
})
