import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_7A,
  CLASSROOM_7B,
  SUBJECT_ID,
  NOW,
  OTHER_SUBJECT,
  SCHEDULE_ID,
  STAFF,
  STUDENTS,
  TEACHER,
  buildOffline,
  offlineSchedule,
  seatAll,
} from '../../exam-offline.test-support.js'
import { SaveOfflineScoreUseCase } from './save-offline-score.use-case.js'

const LATER = new Date('2026-11-27T06:00:00.000Z')

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  return {
    world,
    useCase: new SaveOfflineScoreUseCase(world.reader, world.results),
  }
}

const save = (
  useCase: SaveOfflineScoreUseCase,
  rawScore: number | null,
  studentId = STUDENTS.ani,
  at = NOW,
  note?: string,
) =>
  useCase.execute(
    TEACHER,
    { scheduleId: SCHEDULE_ID, studentId, rawScore, note },
    at,
  )

describe('SaveOfflineScoreUseCase', () => {
  it('stores a score with who entered it and when', async () => {
    const { world, useCase } = setup()

    const row = await save(useCase, 42.5, STUDENTS.ani, NOW, '  rapi ')

    expect(row).toMatchObject({
      studentId: STUDENTS.ani,
      state: 'SCORED',
      rawScore: 42.5,
      note: 'rapi',
      publication: null,
    })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      rawScore: 42.5,
      enteredById: TEACHER.id,
      enteredAt: NOW,
      publicationStatus: null,
    })
  })

  it.each([0, 50, 12.25])('accepts %s inside 0 to the maximum', async (raw) => {
    const { useCase } = setup()
    await expect(save(useCase, raw)).resolves.toMatchObject({ rawScore: raw })
  })

  it.each([-1, 50.5, Number.NaN, Number.POSITIVE_INFINITY, 10.125])(
    'refuses %s',
    async (raw) => {
      const { world, useCase } = setup()
      await expect(save(useCase, raw)).rejects.toBeInstanceOf(
        BadRequestException,
      )
      expect(world.results.rows.size).toBe(0)
    },
  )

  it('refuses an absent student even when a score was stored before', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40, STUDENTS.budi)
    world.markAbsent(STUDENTS.budi)

    await expect(save(useCase, 45, STUDENTS.budi)).rejects.toBeInstanceOf(
      ConflictException,
    )
    expect(world.results.find(SCHEDULE_ID, STUDENTS.budi)?.rawScore).toBe(40)
  })

  it('refuses a student who is not in the roster', async () => {
    const { useCase } = setup()
    await expect(save(useCase, 40, STUDENTS.dodi)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('refuses an online schedule', async () => {
    const { world, useCase } = setup()
    world.schedules.schedules.set(
      SCHEDULE_ID,
      offlineSchedule({ deliveryMode: 'ONLINE', packageId: 'pkg' }),
    )
    await expect(save(useCase, 40)).rejects.toMatchObject({
      code: 'SCHEDULE_NOT_OFFLINE',
    })
  })

  it('refuses a cancelled schedule', async () => {
    const { world, useCase } = setup()
    world.schedules.schedules.set(
      SCHEDULE_ID,
      offlineSchedule({ status: 'CANCELLED' }),
    )
    await expect(save(useCase, 40)).rejects.toBeInstanceOf(ConflictException)
  })

  it('refuses a teacher of another subject and a reader without grade permission', async () => {
    const other = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })
    await expect(save(other.useCase, 40)).rejects.toBeInstanceOf(
      NotFoundException,
    )

    const { useCase } = setup()
    await expect(
      useCase.execute(
        { ...TEACHER, permissions: ['exam-grading.read'] },
        { scheduleId: SCHEDULE_ID, studentId: STUDENTS.ani, rawScore: 40 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('lets staff with manage-all write without a teaching assignment', async () => {
    const { useCase } = setup({ taught: [] })
    await expect(
      useCase.execute(STAFF, {
        scheduleId: SCHEDULE_ID,
        studentId: STUDENTS.ani,
        rawScore: 40,
      }),
    ).resolves.toMatchObject({ state: 'SCORED' })
  })

  it('puts a published score back to PENDING with the same result id when it changes', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40)
    const first = world.results.find(SCHEDULE_ID, STUDENTS.ani)!
    world.results.rows.set(first.id, {
      ...first,
      publicationStatus: 'SENT',
      sentAt: NOW,
      publicationAttempts: 2,
    })

    const row = await save(useCase, 45, STUDENTS.ani, LATER)

    const stored = world.results.find(SCHEDULE_ID, STUDENTS.ani)!
    expect(stored.id).toBe(first.id)
    expect(stored).toMatchObject({
      publicationStatus: 'PENDING',
      publicationAttempts: 0,
      enteredAt: LATER,
    })
    expect(row.publication).toBe('PENDING')
  })

  it('keeps a published score SENT when only the note changes', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40)
    const first = world.results.find(SCHEDULE_ID, STUDENTS.ani)!
    world.results.rows.set(first.id, { ...first, publicationStatus: 'SENT' })

    await save(useCase, 40, STUDENTS.ani, LATER, 'catatan')

    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      publicationStatus: 'SENT',
      note: 'catatan',
    })
  })

  it('clears a score and takes it out of publication', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40)
    const first = world.results.find(SCHEDULE_ID, STUDENTS.ani)!
    world.results.rows.set(first.id, { ...first, publicationStatus: 'PENDING' })

    const row = await save(useCase, null, STUDENTS.ani, LATER)

    expect(row).toMatchObject({ state: 'MISSING', rawScore: null })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)).toMatchObject({
      rawScore: null,
      publicationStatus: null,
    })
  })

  it('refuses to clear a score that was already sent', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40)
    const first = world.results.find(SCHEDULE_ID, STUDENTS.ani)!
    world.results.rows.set(first.id, { ...first, publicationStatus: 'SENT' })

    await expect(
      save(useCase, null, STUDENTS.ani, LATER),
    ).rejects.toMatchObject({
      code: 'OFFLINE_SCORE_PUBLISHED',
      message: 'Nilai sudah terkirim; ganti dengan nilai baru',
    })
    expect(world.results.rows.get(first.id)).toMatchObject({
      rawScore: 40,
      publicationStatus: 'SENT',
    })
  })

  it('keeps the note when it is omitted and clears it on null or empty', async () => {
    const { world, useCase } = setup()
    await save(useCase, 40, STUDENTS.ani, NOW, 'pertama')

    await save(useCase, 41, STUDENTS.ani, LATER)
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.note).toBe('pertama')

    await useCase.execute(TEACHER, {
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 41,
      note: null,
    })
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.note).toBe('')

    await save(useCase, 41, STUDENTS.ani, LATER, 'kedua')
    await save(useCase, 41, STUDENTS.ani, LATER, '')
    expect(world.results.find(SCHEDULE_ID, STUDENTS.ani)?.note).toBe('')
  })

  it('refuses a teacher of the same subject in another classroom', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: SUBJECT_ID, classroomId: CLASSROOM_7B.id }],
    })
    await expect(save(useCase, 40)).rejects.toBeInstanceOf(NotFoundException)
  })
})
