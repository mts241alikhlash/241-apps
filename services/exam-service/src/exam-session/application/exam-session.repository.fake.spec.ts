import { randomUUID } from 'node:crypto'
import { FakeExamSessionRepository } from './exam-session.repository.fake.js'
import { NOW, sessionFor } from './exam-session.test-support.js'
import type { SaveAnswerBatchItem } from '../domain/repositories/exam-session.repository.js'

describe('FakeExamSessionRepository.saveAnswersBatch', () => {
  const item = (questionId: string, clientId: string): SaveAnswerBatchItem => ({
    questionId,
    clientId,
    answer: { key: 'B' },
    receivedAfterDeadline: false,
  })

  function setup() {
    const sessions = new FakeExamSessionRepository()
    sessions.sessions.set(
      'a',
      sessionFor({ id: 'schedule' } as never, { id: 'a' }),
    )
    return sessions
  }

  const batch = (count: number, prefix = 'q') =>
    Array.from({ length: count }, (_, index) =>
      item(`${prefix}-${index}`, randomUUID()),
    )

  it('saves 46 answers in one call and stores the telemetry', async () => {
    const sessions = setup()

    const result = await sessions.saveAnswersBatch('a', batch(46), {
      now: NOW,
      unsyncedCount: 0,
      batteryLevel: 82,
      isCharging: false,
    })

    expect(result.saved).toHaveLength(46)
    expect(result.totalConfirmedCount).toBe(46)
    const session = sessions.sessions.get('a')
    expect(session?.syncedAnswerCount).toBe(46)
    expect(session?.unsyncedCount).toBe(0)
    expect(session?.lastBatteryLevel).toBe(82)
    expect(session?.isCharging).toBe(false)
    expect(session?.lastSeenAt).toEqual(NOW)
  })

  it('keeps the last entry when a question repeats in the payload', async () => {
    const sessions = setup()

    const result = await sessions.saveAnswersBatch(
      'a',
      [
        { ...item('q-1', 'c-1'), answer: { key: 'A' } },
        { ...item('q-1', 'c-2'), answer: { key: 'C' } },
      ],
      { now: NOW },
    )

    expect(result.saved).toHaveLength(1)
    expect(result.saved[0]?.answer).toEqual({ key: 'C' })
    expect(result.totalConfirmedCount).toBe(1)
  })

  it('treats a repeated question and client id as a successful retry', async () => {
    const sessions = setup()
    const items = batch(46)
    await sessions.saveAnswersBatch('a', items, { now: NOW })

    const again = await sessions.saveAnswersBatch('a', items, {
      now: NOW,
      unsyncedCount: 0,
    })

    expect(again.saved).toHaveLength(46)
    expect(again.totalConfirmedCount).toBe(46)
    expect(sessions.sessions.get('a')?.syncedAnswerCount).toBe(46)
    expect(sessions.answers.size).toBe(46)
  })

  it('counts the answers of earlier batches', async () => {
    const sessions = setup()
    await sessions.saveAnswersBatch('a', batch(20, 'first'), { now: NOW })

    const result = await sessions.saveAnswersBatch('a', batch(26, 'second'), {
      now: NOW,
    })

    expect(result.saved).toHaveLength(26)
    expect(result.totalConfirmedCount).toBe(46)
    expect(sessions.sessions.get('a')?.syncedAnswerCount).toBe(46)
  })

  it('leaves the battery level alone when the update omits it', async () => {
    const sessions = setup()
    await sessions.saveAnswersBatch('a', [], {
      now: NOW,
      batteryLevel: 82,
      isCharging: false,
    })

    await sessions.saveAnswersBatch('a', [], { now: NOW })

    const session = sessions.sessions.get('a')
    expect(session?.lastBatteryLevel).toBe(82)
    expect(session?.isCharging).toBe(false)
  })

  it('returns the existing answer when upsertAnswer reuses a client id', async () => {
    const sessions = setup()
    const first = await sessions.upsertAnswer({
      sessionId: 'a',
      questionId: 'q-1',
      clientId: 'c-1',
      answer: { key: 'A' },
      receivedAfterDeadline: false,
    })

    const replay = await sessions.upsertAnswer({
      sessionId: 'a',
      questionId: 'q-2',
      clientId: 'c-1',
      answer: { key: 'B' },
      receivedAfterDeadline: false,
    })

    expect(replay?.id).toBe(first?.id)
    expect(replay?.questionId).toBe('q-1')
    expect(sessions.answers.size).toBe(1)
  })

  it('skips a client id already bound to another question', async () => {
    const sessions = setup()

    const result = await sessions.saveAnswersBatch(
      'a',
      [item('q-1', 'c-1'), item('q-2', 'c-1')],
      { now: NOW },
    )

    expect(result.saved).toHaveLength(1)
    expect(result.saved[0]?.questionId).toBe('q-1')
    expect(result.totalConfirmedCount).toBe(1)
  })

  it('stores a cleared battery level', async () => {
    const sessions = setup()

    await sessions.saveAnswersBatch('a', [], {
      now: NOW,
      batteryLevel: null,
      isCharging: null,
    })

    const session = sessions.sessions.get('a')
    expect(session?.lastBatteryLevel).toBeNull()
    expect(session?.isCharging).toBeNull()
    expect(session?.lastSeenAt).toEqual(NOW)
  })

  it('saves nothing once the session left IN_PROGRESS', async () => {
    const sessions = setup()
    sessions.sessions.set('a', {
      ...sessions.sessions.get('a')!,
      status: 'SUBMITTED',
    })

    const result = await sessions.saveAnswersBatch('a', batch(2), { now: NOW })

    expect(result.saved).toEqual([])
    expect(result.totalConfirmedCount).toBe(0)
  })

  it('reports the stored answer count after the session closed', async () => {
    const sessions = setup()
    await sessions.saveAnswersBatch('a', batch(3), { now: NOW })
    sessions.sessions.set('a', {
      ...sessions.sessions.get('a')!,
      status: 'SUBMITTED',
    })

    const result = await sessions.saveAnswersBatch('a', batch(1, 'late'), {
      now: NOW,
    })

    expect(result.saved).toEqual([])
    expect(result.totalConfirmedCount).toBe(3)
  })
})
