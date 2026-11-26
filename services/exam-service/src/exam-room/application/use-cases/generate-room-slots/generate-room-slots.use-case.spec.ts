import { NotFoundException } from '@nestjs/common'
import { SEMESTER_ID } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import { GenerateRoomSlotsUseCase } from './generate-room-slots.use-case.js'

const GRADE_7 = '22222222-2222-4222-8222-222222222222'

async function seed() {
  const rooms = new FakeExamRoomRepository()
  const event = await rooms.createEvent({
    semesterId: SEMESTER_ID,
    name: 'UAS Ganjil',
    type: 'FINAL',
    startsAt: new Date('2026-11-02T00:00:00.000Z'),
    endsAt: new Date('2026-11-05T00:00:00.000Z'),
    createdById: 'admin-1',
  })
  await rooms.createRoom({
    eventId: event.id,
    code: 'R01',
    name: 'Ruang 01',
    capacity: 30,
  })
  await rooms.createRoom({
    eventId: event.id,
    code: 'R02',
    name: 'Ruang 02',
    capacity: 30,
  })
  const windows = [
    ['2026-11-02T01:00:00.000Z', '2026-11-02T02:30:00.000Z'],
    ['2026-11-03T01:00:00.000Z', '2026-11-03T02:30:00.000Z'],
    ['2026-11-04T01:00:00.000Z', '2026-11-04T02:30:00.000Z'],
  ]
  windows.forEach(([startsAt, endsAt], index) => {
    rooms.activities.set(`act-${index}`, {
      id: `act-${index}`,
      eventId: event.id,
      gradeId: GRADE_7,
      subjectId: `subject-${index}`,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      deliveryMode: 'ONLINE',
      offlineKind: null,
    })
  })
  rooms.activities.set('act-0-ipa', {
    id: 'act-0-ipa',
    eventId: event.id,
    gradeId: GRADE_7,
    subjectId: 'subject-ipa',
    startsAt: new Date(windows[0][0]),
    endsAt: new Date(windows[0][1]),
    deliveryMode: 'ONLINE',
    offlineKind: null,
  })
  return {
    rooms,
    eventId: event.id,
    useCase: new GenerateRoomSlotsUseCase(rooms),
  }
}

describe('GenerateRoomSlotsUseCase', () => {
  it('creates one empty slot per room and distinct activity window', async () => {
    const { rooms, eventId, useCase } = await seed()

    const result = await useCase.execute(eventId)

    expect(result).toEqual({ created: 6, skipped: 0 })
    expect(rooms.supervisors.size).toBe(6)
    expect(
      [...rooms.supervisors.values()].every(
        (slot) => slot.scheduledUserId === null && slot.actualUserId === null,
      ),
    ).toBe(true)
  })

  it('creates nothing when the slots already exist', async () => {
    const { eventId, useCase } = await seed()
    await useCase.execute(eventId)

    expect(await useCase.execute(eventId)).toEqual({ created: 0, skipped: 6 })
  })

  it('refuses an unknown event', async () => {
    const { useCase } = await seed()

    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
