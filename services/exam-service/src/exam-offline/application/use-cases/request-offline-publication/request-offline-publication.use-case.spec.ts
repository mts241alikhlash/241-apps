import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_7A,
  NOW,
  OTHER_SUBJECT,
  SCHEDULE_ID,
  STUDENTS,
  TEACHER,
  buildOffline,
  seatAll,
} from '../../exam-offline.test-support.js'
import { RequestOfflinePublicationUseCase } from './request-offline-publication.use-case.js'

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  const score = (studentId: string, rawScore: number | null) =>
    world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId,
      rawScore,
      note: '',
      enteredById: 't',
      enteredAt: NOW,
    })
  return {
    world,
    score,
    useCase: new RequestOfflinePublicationUseCase(world.reader, world.results),
  }
}

describe('RequestOfflinePublicationUseCase', () => {
  it('asks for confirmation and names the students still missing', async () => {
    const { world, score, useCase } = setup()
    await score(STUDENTS.ani, 40)

    const failure = await useCase
      .execute(TEACHER, SCHEDULE_ID, { confirmMissing: false })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ConflictException)
    expect(failure).toMatchObject({ code: 'OFFLINE_SCORES_MISSING' })
    expect((failure as ConflictException).message).toContain('Budi, Citra')
    expect(
      world.results.find(SCHEDULE_ID, STUDENTS.ani)?.publicationStatus,
    ).toBeNull()
  })

  it('queues the scored students once confirmed and leaves absent ones out', async () => {
    const { world, score, useCase } = setup()
    await score(STUDENTS.ani, 40)
    await score(STUDENTS.budi, 30)
    world.markAbsent(STUDENTS.budi)

    const counts = await useCase.execute(TEACHER, SCHEDULE_ID, {
      confirmMissing: true,
    })

    expect(counts).toEqual({ queued: 1, missing: 1, absent: 1 })
    expect(
      world.results.find(SCHEDULE_ID, STUDENTS.ani)?.publicationStatus,
    ).toBe('PENDING')
    expect(
      world.results.find(SCHEDULE_ID, STUDENTS.budi)?.publicationStatus,
    ).toBeNull()
  })

  it('queues without confirmation when nobody is missing, and re-queues a FAILED score but not a SENT one', async () => {
    const { world, score, useCase } = setup()
    const failed = await score(STUDENTS.ani, 40)
    const sent = await score(STUDENTS.budi, 30)
    await score(STUDENTS.citra, 20)
    world.results.rows.set(failed.id, {
      ...failed,
      publicationStatus: 'FAILED',
      publicationAttempts: 3,
      publicationError: 'ditolak',
    })
    world.results.rows.set(sent.id, { ...sent, publicationStatus: 'SENT' })

    const counts = await useCase.execute(TEACHER, SCHEDULE_ID, {
      confirmMissing: false,
    })

    expect(counts).toEqual({ queued: 2, missing: 0, absent: 0 })
    expect(world.results.rows.get(failed.id)).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 0,
      publicationError: null,
    })
    expect(world.results.rows.get(sent.id)?.publicationStatus).toBe('SENT')
  })

  it('refuses a teacher of another subject', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })
    await expect(
      useCase.execute(TEACHER, SCHEDULE_ID, { confirmMissing: true }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})
