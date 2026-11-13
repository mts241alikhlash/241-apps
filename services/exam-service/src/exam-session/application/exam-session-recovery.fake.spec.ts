import { FakeExamSessionRepository } from './exam-session.repository.fake.js'
import { NOW, sessionFor } from './exam-session.test-support.js'

function seeded() {
  const sessions = new FakeExamSessionRepository()
  sessions.sessions.set(
    'a',
    sessionFor({ id: 'schedule' } as never, { id: 'a' }),
  )
  sessions.sessions.set(
    'b',
    sessionFor({ id: 'schedule' } as never, { id: 'b' }),
  )
  return sessions
}

describe('FakeExamSessionRepository recovery columns', () => {
  it('seats a session and lists it by room in seat order', async () => {
    const sessions = seeded()

    await sessions.seatSession('a', 'room-1', 7)
    await sessions.seatSession('b', 'room-1', 2)

    expect(sessions.sessions.get('a')?.seatNumber).toBe(7)
    expect(sessions.sessions.get('a')?.roomId).toBe('room-1')
    expect((await sessions.listByRoom('room-1')).map((row) => row.id)).toEqual([
      'b',
      'a',
    ])
    expect(await sessions.listByRoom('room-2')).toEqual([])
    expect(await sessions.seatSession('missing', 'room-1', 1)).toBeNull()
  })

  it('refreshes updatedAt when a seat is assigned', async () => {
    const sessions = seeded()
    const stale = new Date('2020-01-01T00:00:00.000Z')
    sessions.sessions.set('a', {
      ...sessions.sessions.get('a')!,
      updatedAt: stale,
    })

    const seated = await sessions.seatSession('a', 'room-1', 1)

    expect(seated?.updatedAt.getTime()).toBeGreaterThan(stale.getTime())
  })

  it('moves a session from locked to reopened to resumed', async () => {
    const sessions = seeded()

    const locked = await sessions.applyRecovery('a', {
      lockedByViolation: true,
      requiresTokenReentry: true,
    })
    expect(locked?.lockedByViolation).toBe(true)
    expect(locked?.requiresTokenReentry).toBe(true)

    const reopened = await sessions.applyRecovery('a', {
      lockedByViolation: false,
      requiresTokenReentry: true,
      extraMinutes: 10,
      allowLateEntry: true,
      kioskMode: 'FLOATING',
      deadline: new Date('2026-11-02T03:40:00.000Z'),
    })
    expect(reopened?.lockedByViolation).toBe(false)
    expect(reopened?.requiresTokenReentry).toBe(true)
    expect(reopened?.extraMinutes).toBe(10)
    expect(reopened?.allowLateEntry).toBe(true)
    expect(reopened?.kioskMode).toBe('FLOATING')
    expect(reopened?.deadline).toEqual(new Date('2026-11-02T03:40:00.000Z'))

    const resumed = await sessions.applyRecovery('a', {
      requiresTokenReentry: false,
    })
    expect(resumed?.requiresTokenReentry).toBe(false)
    expect(resumed?.status).toBe('IN_PROGRESS')
    expect(
      await sessions.applyRecovery('missing', { extraMinutes: 5 }),
    ).toBeNull()
  })

  it('keeps the default recovery state on a fresh session', async () => {
    const sessions = seeded()
    const created = await sessions.createInitial({
      scheduleId: 'schedule',
      studentId: 'student-9',
      userId: 'user-9',
      deviceId: 'device-9',
      enrollmentId: 'enr-9',
      shuffleSeed: 'seed-9',
      startedAt: NOW,
      deadline: NOW,
      finalizeAt: NOW,
    })

    expect(created?.roomId).toBeNull()
    expect(created?.seatNumber).toBeNull()
    expect(created?.requiresTokenReentry).toBe(false)
    expect(created?.lockedByViolation).toBe(false)
    expect(created?.client).toBe('ISTIQRA')
    expect(created?.allowLateEntry).toBe(false)
    expect(created?.extraMinutes).toBe(0)
    expect(created?.kioskMode).toBe('PINNED')
  })
})
