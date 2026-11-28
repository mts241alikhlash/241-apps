import { Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { FakeEnrollment } from '../../../../exam-session/application/exam-session.test-support.js'
import {
  IScorePublisherPort,
  type ExamScorePayload,
  type PublishOutcome,
} from '../../../../platform/score-publisher/score-publisher.port.js'
import {
  CLASSROOM_7A,
  NOW,
  SCHEDULE_ID,
  SEMESTER_ID,
  STUDENTS,
  SUBJECT_ID,
  buildOffline,
  offlineActivity,
  seatAll,
  type OfflineWorld,
} from '../../exam-offline.test-support.js'
import { PublishOfflineScoresUseCase } from './publish-offline-scores.use-case.js'

const T1 = new Date('2026-11-27T06:00:00.000Z')
const minutes = (n: number) => new Date(T1.getTime() + n * 60_000)

class FakePublisher extends IScorePublisherPort {
  readonly sent: ExamScorePayload[] = []
  outcome: () => PublishOutcome = () => ({ result: 'SENT' })
  failure: Error | null = null

  publish(payload: ExamScorePayload) {
    this.sent.push(payload)
    if (this.failure) return Promise.reject(this.failure)
    return Promise.resolve(this.outcome())
  }
}

async function queued(world: OfflineWorld, studentId = STUDENTS.ani) {
  await world.results.save({
    scheduleId: SCHEDULE_ID,
    studentId,
    rawScore: 42.5,
    note: '',
    enteredById: 't',
    enteredAt: NOW,
  })
  await world.results.queue(SCHEDULE_ID, [studentId])
  return world.results.find(SCHEDULE_ID, studentId)!
}

function setup(enrollment = new FakeEnrollment()) {
  const world = buildOffline()
  seatAll(world)
  const publisher = new FakePublisher()
  const useCase = new PublishOfflineScoresUseCase(
    world.results,
    world.schedules,
    world.activities,
    world.rooms,
    enrollment,
    world.academic,
    publisher,
    world.students,
  )
  return { world, publisher, useCase }
}

describe('PublishOfflineScoresUseCase', () => {
  it('sends a queued score with the result id as the key and marks it SENT', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)

    await expect(useCase.execute(T1)).resolves.toBe(1)

    expect(publisher.sent).toEqual([
      {
        examSessionId: row.id,
        enrollmentId: 'enr-1',
        studentId: STUDENTS.ani,
        studentName: 'Ani',
        studentNis: expect.any(String) as string,
        subjectId: SUBJECT_ID,
        gradeId: CLASSROOM_7A.gradeId,
        classroomId: CLASSROOM_7A.id,
        semesterId: SEMESTER_ID,
        examTitle: 'Tafsir (Written)',
        rawScore: 42.5,
        maxScore: 50,
        score: 85,
        gradedAt: NOW.toISOString(),
      },
    ])
    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'SENT',
      sentAt: T1,
    })
  })

  it('names a practical exam and rounds the percentage like online scores', async () => {
    const { world, publisher, useCase } = setup()
    world.activities.activities.set(
      offlineActivity().id,
      offlineActivity({ offlineKind: 'PRACTICAL', maxScore: 30 }),
    )
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 10,
      note: '',
      enteredById: 't',
      enteredAt: NOW,
    })
    await world.results.queue(SCHEDULE_ID, [STUDENTS.ani])

    await useCase.execute(T1)

    expect(publisher.sent[0]).toMatchObject({
      examTitle: 'Tafsir (Practical)',
      maxScore: 30,
      score: 33.33,
    })
  })

  it('ignores scores that are not queued', async () => {
    const { world, publisher, useCase } = setup()
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 40,
      note: '',
      enteredById: 't',
      enteredAt: NOW,
    })

    await expect(useCase.execute(T1)).resolves.toBe(0)
    expect(publisher.sent).toEqual([])
  })

  it('retries after the same backoff as online publishing', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    publisher.outcome = () => ({ result: 'RETRY', reason: 'assessment sibuk' })

    await useCase.execute(T1)
    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 1,
      publicationError: 'assessment sibuk',
    })

    await expect(useCase.execute(minutes(1))).resolves.toBe(0)
    publisher.outcome = () => ({ result: 'SENT' })
    await expect(useCase.execute(minutes(2))).resolves.toBe(1)
    expect(world.results.rows.get(row.id)?.publicationStatus).toBe('SENT')
  })

  it('retries when the publisher throws', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    publisher.failure = new Error('socket hang up')
    const logged = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)

    await useCase.execute(T1)

    expect(logged).toHaveBeenCalledOnce()
    logged.mockRestore()

    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 1,
    })
  })

  it('marks a rejected score FAILED and never picks it again', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    publisher.outcome = () => ({ result: 'REJECTED', reason: 'tidak valid' })

    await useCase.execute(T1)
    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'FAILED',
      publicationError: 'tidak valid',
    })

    await expect(useCase.execute(minutes(120))).resolves.toBe(0)
    expect(publisher.sent).toHaveLength(1)
  })

  it('fails a score whose student has no enrollment', async () => {
    const { world, useCase } = setup(new FakeEnrollment({ enrollment: null }))
    const row = await queued(world)

    await useCase.execute(T1)

    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'FAILED',
      publicationError: 'Pendaftaran siswa di semester ini tidak ditemukan',
    })
  })

  it('fails a score of a student marked absent after it was queued', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    world.markAbsent(STUDENTS.ani)

    await useCase.execute(T1)

    expect(publisher.sent).toEqual([])
    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'FAILED',
      publicationError: 'Siswa tidak hadir',
    })
  })

  it('re-publishes an edited score under the same key', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    await useCase.execute(T1)
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 45,
      note: '',
      enteredById: 't',
      enteredAt: T1,
      publication: { status: 'PENDING' },
    })

    await useCase.execute(minutes(1))

    expect(publisher.sent.map((payload) => payload.examSessionId)).toEqual([
      row.id,
      row.id,
    ])
    expect(publisher.sent[1]).toMatchObject({
      rawScore: 45,
      gradedAt: T1.toISOString(),
    })
    expect(world.results.rows.get(row.id)?.publicationStatus).toBe('SENT')
  })

  it('does not mark SENT a score edited while it was being sent', async () => {
    const { world, publisher, useCase } = setup()
    const row = await queued(world)
    publisher.outcome = () => {
      void world.results.save({
        scheduleId: SCHEDULE_ID,
        studentId: STUDENTS.ani,
        rawScore: 20,
        note: '',
        enteredById: 't',
        enteredAt: T1,
        publication: { status: 'PENDING' },
      })
      return { result: 'SENT' }
    }

    await useCase.execute(T1)

    expect(world.results.rows.get(row.id)).toMatchObject({
      publicationStatus: 'PENDING',
      rawScore: 20,
    })
  })
})
