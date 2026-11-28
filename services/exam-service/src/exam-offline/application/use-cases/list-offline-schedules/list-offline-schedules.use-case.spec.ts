import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_ID,
  CLASSROOM_7A,
  CLASSROOM_7B,
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
import { ListOfflineSchedulesUseCase } from './list-offline-schedules.use-case.js'

const SCHEDULE_7B = '66666666-6666-4666-8666-666666666667'

function setup(options: Parameters<typeof buildOffline>[0] = {}) {
  const world = buildOffline(options)
  seatAll(world)
  world.schedules.schedules.set(
    SCHEDULE_7B,
    offlineSchedule({ id: SCHEDULE_7B, classroomId: CLASSROOM_7B.id }),
  )
  world.schedules.schedules.set(
    'online',
    offlineSchedule({ id: 'online', deliveryMode: 'ONLINE', packageId: 'p' }),
  )
  world.schedules.schedules.set(
    'cancelled',
    offlineSchedule({ id: 'cancelled', status: 'CANCELLED' }),
  )
  world.schedules.schedules.set(
    'makeup',
    offlineSchedule({ id: 'makeup', kind: 'MAKEUP' }),
  )
  world.schedules.schedules.set(
    'other-semester',
    offlineSchedule({ id: 'other-semester', semesterId: 'old' }),
  )
  return {
    world,
    useCase: new ListOfflineSchedulesUseCase(
      world.scope,
      world.schedules,
      world.activities,
      world.rooms,
      world.results,
      world.academic,
    ),
  }
}

describe('ListOfflineSchedulesUseCase', () => {
  it('lists only the offline regular schedules a teacher grades, with counts', async () => {
    const { world, useCase } = setup()
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.ani,
      rawScore: 40,
      note: '',
      enteredById: 't',
      enteredAt: NOW,
    })
    await world.results.save({
      scheduleId: SCHEDULE_ID,
      studentId: STUDENTS.budi,
      rawScore: 35,
      note: '',
      enteredById: 't',
      enteredAt: NOW,
    })
    const sent = world.results.find(SCHEDULE_ID, STUDENTS.budi)!
    world.results.rows.set(sent.id, { ...sent, publicationStatus: 'SENT' })
    world.markAbsent(STUDENTS.citra)

    const rows = await useCase.execute(TEACHER)

    expect(rows).toEqual([
      {
        scheduleId: SCHEDULE_ID,
        activityId: ACTIVITY_ID,
        subjectName: 'Tafsir',
        classroomName: CLASSROOM_7A.name,
        offlineKind: 'WRITTEN',
        maxScore: 50,
        startsAt: offlineSchedule().startsAt,
        endsAt: offlineSchedule().endsAt,
        registered: 3,
        scored: 2,
        absent: 1,
        missing: 0,
        published: 1,
      },
    ])
  })

  it('lists every offline schedule for staff', async () => {
    const { useCase } = setup({ taught: [] })

    const rows = await useCase.execute(STAFF)

    expect(rows.map((row) => row.scheduleId).sort()).toEqual(
      [SCHEDULE_ID, SCHEDULE_7B].sort(),
    )
    expect(rows.find((row) => row.scheduleId === SCHEDULE_7B)).toMatchObject({
      registered: 1,
      missing: 1,
      scored: 0,
    })
  })

  it('lists nothing for a teacher of another subject', async () => {
    const { useCase } = setup({
      taught: [{ subjectId: OTHER_SUBJECT, classroomId: CLASSROOM_7A.id }],
    })

    await expect(useCase.execute(TEACHER)).resolves.toEqual([])
  })

  it('lists nothing without a grading permission', async () => {
    const { useCase } = setup()

    await expect(
      useCase.execute({ ...TEACHER, permissions: [] }),
    ).resolves.toEqual([])
  })
})
