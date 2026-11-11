import { ServiceUnavailableException } from '@nestjs/common'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { CreateExamScheduleUseCase } from '../create-exam-schedule/create-exam-schedule.use-case.js'
import { FakeScheduleSessionGuard } from '../../schedule-session-guard.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  END,
  FakeAcademicLookup,
  START,
  USER,
  approvedPackage,
} from '../../exam-schedule.test-support.js'
import { GetExamScheduleUseCase } from '../get-exam-schedule/get-exam-schedule.use-case.js'
import { ListExamSchedulesUseCase } from './list-exam-schedules.use-case.js'

describe('List and get exam schedules', () => {
  let schedules: FakeExamScheduleRepository
  let guard: FakeScheduleSessionGuard
  let scheduleId: string

  beforeEach(async () => {
    guard = new FakeScheduleSessionGuard()
    const packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    const pkg = await approvedPackage(packages, new FakeQuestionRepository())
    scheduleId = (
      await new CreateExamScheduleUseCase(
        schedules,
        packages,
        new FakeAcademicLookup(),
        new FakeExamRoomRepository(),
      ).execute(USER, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: START,
        endsAt: END,
        durationMinutes: 90,
        type: 'DAILY',
      })
    ).id
  })

  it('labels each row with its classroom name', async () => {
    const page = await new ListExamSchedulesUseCase(
      schedules,
      new FakeAcademicLookup(),
      guard,
    ).execute({})

    expect(page.total).toBe(1)
    expect(page.data[0].classroomName).toBe('VII A')
  })

  it('keeps a row whose classroom is gone and leaves the label empty', async () => {
    const page = await new ListExamSchedulesUseCase(
      schedules,
      new FakeAcademicLookup({ classrooms: [] }),
      guard,
    ).execute({})

    expect(page.data[0].classroomName).toBeNull()
  })

  it('fails closed when the academic service is down', async () => {
    await expect(
      new ListExamSchedulesUseCase(
        schedules,
        new FakeAcademicLookup({
          failWith: new ServiceUnavailableException('down'),
        }),
        guard,
      ).execute({}),
    ).rejects.toThrow(ServiceUnavailableException)
  })

  it('gets one schedule with its classroom name', async () => {
    const view = await new GetExamScheduleUseCase(
      schedules,
      new FakeAcademicLookup(),
      guard,
    ).execute(scheduleId)

    expect(view.id).toBe(scheduleId)
    expect(view.classroomName).toBe('VII A')
  })

  it('marks the schedules that already have sessions', async () => {
    guard.withSessions.add(scheduleId)

    const page = await new ListExamSchedulesUseCase(
      schedules,
      new FakeAcademicLookup(),
      guard,
    ).execute({})
    const one = await new GetExamScheduleUseCase(
      schedules,
      new FakeAcademicLookup(),
      guard,
    ).execute(scheduleId)

    expect(page.data.map((row) => row.hasSessions)).toEqual([true])
    expect(one.hasSessions).toBe(true)
  })

  it('says false for a schedule nobody started', async () => {
    const page = await new ListExamSchedulesUseCase(
      schedules,
      new FakeAcademicLookup(),
      guard,
    ).execute({})

    expect(page.data[0].hasSessions).toBe(false)
  })

  it('filters schedules by category when requested', async () => {
    const packages = new FakeExamPackageRepository()
    const repo = new FakeExamScheduleRepository(packages)
    const pkg = await approvedPackage(packages, new FakeQuestionRepository())
    const creator = new CreateExamScheduleUseCase(
      repo,
      packages,
      new FakeAcademicLookup(),
      new FakeExamRoomRepository(),
    )
    for (let i = 0; i < 3; i += 1) {
      await creator.execute(USER, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: START,
        endsAt: END,
        durationMinutes: 90,
        type: 'DAILY',
      })
    }
    for (let i = 0; i < 2; i += 1) {
      await creator.execute(USER, {
        packageId: pkg.id,
        classroomId: CLASSROOM_7A.id,
        startsAt: START,
        endsAt: END,
        durationMinutes: 90,
        type: 'MIDTERM',
      })
    }

    const examPage = await new ListExamSchedulesUseCase(
      repo,
      new FakeAcademicLookup(),
      guard,
    ).execute({ category: 'EXAM' })

    expect(examPage.total).toBe(2)
    expect(examPage.data.every((row) => row.type === 'MIDTERM')).toBe(true)
  })
})
