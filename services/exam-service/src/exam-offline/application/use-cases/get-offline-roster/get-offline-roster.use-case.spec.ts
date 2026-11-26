import { ConflictException, NotFoundException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import {
  CLASSROOM_7A,
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
import { GetOfflineRosterUseCase } from './get-offline-roster.use-case.js'

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  return { world, useCase: new GetOfflineRosterUseCase(world.reader) }
}

describe('GetOfflineRosterUseCase', () => {
  it('lists the seated students of the classroom sorted by participant number', async () => {
    const { useCase } = setup()

    const rows = await useCase.execute(TEACHER, SCHEDULE_ID)

    expect(rows.map((row) => [row.participantNumber, row.name])).toEqual([
      ['7-001', 'Ani'],
      ['7-002', 'Budi'],
      ['7-003', 'Citra'],
    ])
    expect(rows.every((row) => row.state === 'MISSING')).toBe(true)
  })

  it('marks scored and absent students, and absence wins over a stored score', async () => {
    const { world, useCase } = setup()
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 42.5,
      note: 'rapi',
      enteredById: 'teacher-user',
      enteredAt: NOW,
    })
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.budi,
      rawScore: 30,
      note: '',
      enteredById: 'teacher-user',
      enteredAt: NOW,
    })
    world.markAbsent(STUDENTS.budi)

    const rows = await useCase.execute(TEACHER, SCHEDULE_ID)

    expect(rows[0]).toEqual({
      studentId: STUDENTS.ani,
      participantNumber: '7-001',
      name: 'Ani',
      state: 'SCORED',
      rawScore: 42.5,
      note: 'rapi',
      publication: null,
    })
    expect(rows[1]).toMatchObject({
      studentId: STUDENTS.budi,
      state: 'ABSENT',
      rawScore: null,
      publication: null,
    })
    expect(rows[2]).toMatchObject({ state: 'MISSING', note: null })
  })

  it('gives null numbers when the participant number lookup fails and sorts by name', async () => {
    const { world, useCase } = setup()
    world.numbers.failure = new Error('student-service down')

    const rows = await useCase.execute(TEACHER, SCHEDULE_ID)

    expect(rows.map((row) => [row.participantNumber, row.name])).toEqual([
      [null, 'Ani'],
      [null, 'Budi'],
      [null, 'Citra'],
    ])
  })

  it('hides the schedule from a teacher of another subject', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })

    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })

  it('lets staff read every offline schedule', async () => {
    const { useCase } = setup({ taught: [] })

    await expect(useCase.execute(STAFF, SCHEDULE_ID)).resolves.toHaveLength(3)
  })

  it('refuses an online schedule', async () => {
    const { world, useCase } = setup()
    world.schedules.schedules.set(
      SCHEDULE_ID,
      offlineSchedule({ deliveryMode: 'ONLINE', packageId: 'pkg' }),
    )

    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).rejects.toMatchObject({
      code: 'SCHEDULE_NOT_OFFLINE',
    })
    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).rejects.toBeInstanceOf(
      ConflictException,
    )
  })

  it('answers 404 for an unknown schedule', async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute(STAFF, '00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('renders an empty roster when nobody of the classroom is seated', async () => {
    const world = buildOffline()
    const useCase = new GetOfflineRosterUseCase(world.reader)

    await expect(useCase.execute(TEACHER, SCHEDULE_ID)).resolves.toEqual([])
  })
})
