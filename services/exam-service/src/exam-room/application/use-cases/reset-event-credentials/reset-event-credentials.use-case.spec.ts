import { NotFoundException } from '@nestjs/common'
import { FakeStudentDirectory } from '../../../../exam-session/application/exam-session.test-support.js'
import type { IssuedCredential } from '../../../../platform/identity-credentials/identity-credentials.port.js'
import { IIdentityCredentialsPort } from '../../../../platform/identity-credentials/identity-credentials.port.js'
import { SEMESTER_ID } from '../../../../exam-schedule/application/exam-schedule.test-support.js'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import { SLOT_START, LATER_SLOT_END } from '../../room-monitor.test-support.js'
import { ResetEventCredentialsUseCase } from './reset-event-credentials.use-case.js'

const CLASSROOM = '40404040-4040-4040-8040-404040404040'
const ACTOR = 'admin-1'

class FakeIdentityCredentials extends IIdentityCredentialsPort {
  readonly calls: string[][] = []

  resetPasswords(userIds: string[]): Promise<IssuedCredential[]> {
    this.calls.push(userIds)
    return Promise.resolve(
      userIds.map((userId) => ({
        userId,
        identifier: `nis-${userId}`,
        password: `Pw${userId.replace(/-/g, '').slice(0, 8)}ab`,
      })),
    )
  }
}

async function build(
  refs: {
    id: string
    nis: string
    name: string | null
    userId?: string | null
  }[],
) {
  const rooms = new FakeExamRoomRepository()
  const event = await rooms.createEvent({
    semesterId: SEMESTER_ID,
    name: 'UAS Ganjil',
    type: 'FINAL',
    startsAt: SLOT_START,
    endsAt: LATER_SLOT_END,
    createdById: 'admin-1',
  })
  const r1 = await rooms.createRoom({
    eventId: event.id,
    code: 'R01',
    name: 'Ruang 01',
    capacity: 10,
  })
  const r2 = await rooms.createRoom({
    eventId: event.id,
    code: 'R02',
    name: 'Ruang 02',
    capacity: 10,
  })
  const identity = new FakeIdentityCredentials()
  const useCase = new ResetEventCredentialsUseCase(
    rooms,
    new FakeStudentDirectory(refs),
    identity,
  )
  const seat = (roomId: string, studentId: string, seatNumber: number) =>
    rooms.assignSeat({
      roomId,
      eventId: event.id,
      studentId,
      classroomId: CLASSROOM,
      seatNumber,
    })
  return { rooms, event, r1, r2, identity, useCase, seat }
}

describe('ResetEventCredentialsUseCase', () => {
  it('resets every seated student of the event with one identity call', async () => {
    const { useCase, event, r1, r2, identity, seat } = await build([
      { id: 's1', nis: '1', name: 'A', userId: 'u1' },
      { id: 's2', nis: '2', name: 'B', userId: 'u2' },
      { id: 's3', nis: '3', name: 'C', userId: 'u3' },
    ])
    await seat(r1.id, 's1', 1)
    await seat(r1.id, 's2', 2)
    await seat(r2.id, 's3', 1)

    const result = await useCase.execute(event.id, ACTOR)

    expect(identity.calls).toHaveLength(1)
    expect([...identity.calls[0]].sort()).toEqual(['u1', 'u2', 'u3'])
    expect(result.items.map((i) => i.studentId).sort()).toEqual([
      's1',
      's2',
      's3',
    ])
    expect(result.items.find((i) => i.studentId === 's1')).toEqual({
      studentId: 's1',
      identifier: 'nis-u1',
      password: expect.any(String) as string,
    })
    expect(result.skipped).toEqual([])
  })

  it('limits the reset to one room when roomId is given', async () => {
    const { useCase, event, r1, r2, identity, seat } = await build([
      { id: 's1', nis: '1', name: 'A', userId: 'u1' },
      { id: 's2', nis: '2', name: 'B', userId: 'u2' },
    ])
    await seat(r1.id, 's1', 1)
    await seat(r2.id, 's2', 1)

    const result = await useCase.execute(event.id, ACTOR, r2.id)

    expect(identity.calls).toEqual([['u2']])
    expect(result.items.map((i) => i.studentId)).toEqual(['s2'])
  })

  it('answers empty without an identity call or a write when no seat is held', async () => {
    const { useCase, event, identity, rooms } = await build([])
    const spy = vi.spyOn(rooms, 'writeAuditLog')

    expect(await useCase.execute(event.id, ACTOR)).toEqual({
      items: [],
      skipped: [],
    })
    expect(identity.calls).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('lists students without an account in skipped instead of failing', async () => {
    const { useCase, event, r1, identity, seat } = await build([
      { id: 's1', nis: '1', name: 'A', userId: 'u1' },
      { id: 's2', nis: '2', name: 'B', userId: null },
    ])
    await seat(r1.id, 's1', 1)
    await seat(r1.id, 's2', 2)

    const result = await useCase.execute(event.id, ACTOR)

    expect(identity.calls).toEqual([['u1']])
    expect(result.items.map((i) => i.studentId)).toEqual(['s1'])
    expect(result.skipped).toEqual(['s2'])
  })

  it('answers 404 for an unknown event', async () => {
    const { useCase } = await build([])
    await expect(
      useCase.execute('00000000-0000-4000-8000-000000000000', ACTOR),
    ).rejects.toThrow(NotFoundException)
  })

  it('answers 404 for a room of another event', async () => {
    const { useCase, event } = await build([])
    await expect(
      useCase.execute(event.id, ACTOR, '00000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow('Ruang tidak ditemukan')
  })

  it('audits the count and the actor, never a password', async () => {
    const { useCase, event, r1, rooms, seat } = await build([
      { id: 's1', nis: '1', name: 'A', userId: 'u1' },
    ])
    await seat(r1.id, 's1', 1)
    const spy = vi.spyOn(rooms, 'writeAuditLog')

    const result = await useCase.execute(event.id, ACTOR)

    expect(spy).toHaveBeenCalledTimes(1)
    const entry = JSON.stringify(spy.mock.calls[0][0])
    expect(entry).toContain(ACTOR)
    expect(entry).toContain('"count":1')
    expect(entry).not.toContain(result.items[0].password)
  })
})
