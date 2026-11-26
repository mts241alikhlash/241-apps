import { ConflictException, ForbiddenException } from '@nestjs/common'
import { FakeExamActivityRepository } from '../../exam-activity/application/exam-activity.repository.fake.js'
import { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { FakeQuestionRepository } from '../../question/application/question.repository.fake.js'
import {
  ENDS,
  NOW,
  STARTS,
  STUDENT_ID,
  activityFor,
  scheduleExam,
} from './exam-session.test-support.js'
import { LifecycleGate } from './lifecycle-gate.service.js'

describe('LifecycleGate.assertOpen', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let activities: FakeExamActivityRepository
  let gate: LifecycleGate
  let schedule: ExamSchedule

  beforeEach(async () => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    activities = new FakeExamActivityRepository()
    gate = new LifecycleGate(schedules, activities)
    schedule = await scheduleExam({
      packages,
      schedules,
      questions: new FakeQuestionRepository(),
    })
  })

  const refusal = (target: string | ExamSchedule, now = NOW) =>
    gate.assertOpen(target, now).then(
      () => null,
      (thrown: unknown) => thrown,
    )

  const update = (changes: Partial<ExamSchedule>) => {
    schedule = { ...schedule, ...changes }
    schedules.schedules.set(schedule.id, schedule)
  }

  const attach = async (overrides: Parameters<typeof activityFor>[2] = {}) => {
    const activity = await activityFor(activities, schedule, overrides)
    update({ activityId: activity.id })
    return activity
  }

  it('opens an online schedule with a package inside its window', async () => {
    await attach()

    expect(await refusal(schedule.id)).toBeNull()
  })

  it('refuses an offline schedule with OFFLINE_NOT_STARTABLE', async () => {
    await attach({ deliveryMode: 'OFFLINE', offlineKind: 'WRITTEN' })
    update({ deliveryMode: 'OFFLINE', packageId: null, packageTitle: null })

    const error = await refusal(schedule.id)

    expect(error).toBeInstanceOf(ConflictException)
    expect(error).toMatchObject({ code: 'OFFLINE_NOT_STARTABLE' })
  })

  it('refuses an online schedule without a package with PACKAGE_MISSING', async () => {
    await attach()
    update({ packageId: null, packageTitle: null })

    expect(await refusal(schedule.id)).toMatchObject({
      code: 'PACKAGE_MISSING',
    })
  })

  it('refuses a scheduled activity inside its window as not opened yet', async () => {
    await attach({ status: 'SCHEDULED' })

    const error = await refusal(schedule.id)

    expect(error).toMatchObject({ code: 'WINDOW_CLOSED' })
    expect((error as Error).message).toBe('Ujian belum dibuka')
  })

  it('gates a regular schedule by the window of its activity, not its own edited window', async () => {
    await attach({
      startsAt: new Date('2026-11-02T03:00:00.000Z'),
      endsAt: new Date('2026-11-02T06:00:00.000Z'),
    })
    update({ startsAt: STARTS, endsAt: ENDS })

    expect(await refusal(schedule.id, NOW)).toMatchObject({
      code: 'WINDOW_CLOSED',
    })
    expect(
      await refusal(schedule.id, new Date('2026-11-02T05:00:00.000Z')),
    ).toBeNull()
  })

  it('refuses a cancelled schedule', async () => {
    await attach()
    update({ status: 'CANCELLED' })

    const refused = await refusal(schedule.id)
    expect(refused).toBeInstanceOf(ForbiddenException)
    expect(refused).toMatchObject({ code: 'SCHEDULE_CANCELLED' })
  })

  it('refuses a cancelled makeup inside its own window', async () => {
    await attach({ status: 'CLOSED' })
    const makeup = await schedules.createMakeup({
      packageId: schedule.packageId!,
      classroomId: schedule.classroomId,
      semesterId: schedule.semesterId,
      startsAt: new Date('2026-11-05T01:00:00.000Z'),
      endsAt: new Date('2026-11-05T04:00:00.000Z'),
      durationMinutes: 90,
      type: schedule.type,
      createdById: schedule.createdById,
      makeupOfId: schedule.id,
      participants: [{ studentId: STUDENT_ID, reason: 'SICK', note: null }],
    })
    const at = new Date('2026-11-05T02:00:00.000Z')

    expect(await refusal(makeup!.id, at)).toBeNull()

    await schedules.cancel(makeup!.id)

    const refused = await refusal(makeup!.id, at)
    expect(refused).toBeInstanceOf(ForbiddenException)
    expect(refused).toMatchObject({ code: 'SCHEDULE_CANCELLED' })
  })
})
