import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common'
import { FakeExamPackageRepository } from '../../../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamRoomRepository } from '../../../../exam-room/application/exam-room.repository.fake.js'
import { FakeQuestionRepository } from '../../../../question/application/question.repository.fake.js'
import { FakeExamScheduleRepository } from '../../exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  END,
  FakeAcademicLookup,
  SEMESTER_ID,
  START,
  USER,
  approvedPackage,
} from '../../exam-schedule.test-support.js'
import { ExamScheduleDto } from '../../../presentation/http/dto/response/exam-schedule-response.dto.js'
import { MyExamDto } from '../../../../exam-session/presentation/http/dto/student-exam-response.dto.js'
import { CreateExamScheduleUseCase } from './create-exam-schedule.use-case.js'

describe('CreateExamScheduleUseCase', () => {
  let packages: FakeExamPackageRepository
  let schedules: FakeExamScheduleRepository
  let packageId: string

  const NOW = new Date('2026-10-30T00:00:00.000Z')

  const build = (
    academic = new FakeAcademicLookup(),
    rooms = new FakeExamRoomRepository(),
  ) => {
    const useCase = new CreateExamScheduleUseCase(
      schedules,
      packages,
      academic,
      rooms,
    )
    return {
      execute: (
        user: { id: string; manageAll?: boolean },
        body: ReturnType<typeof input>,
        now: Date = NOW,
      ) => useCase.execute(user, body, now),
    }
  }

  const input = (overrides: Record<string, unknown> = {}) => ({
    packageId,
    classroomId: CLASSROOM_7A.id,
    startsAt: START,
    endsAt: END,
    durationMinutes: 90,
    type: 'DAILY' as const,
    ...overrides,
  })

  beforeEach(async () => {
    packages = new FakeExamPackageRepository()
    schedules = new FakeExamScheduleRepository(packages)
    packageId = (await approvedPackage(packages, new FakeQuestionRepository()))
      .id
  })

  it('creates the schedule and locks the package', async () => {
    const created = await build().execute(USER, input())

    expect(created.status).toBe('SCHEDULED')
    expect(created.semesterId).toBe(SEMESTER_ID)
    expect(created.createdById).toBe(USER.id)
    expect((await packages.findById(packageId))?.status).toBe('LOCKED')
  })

  it('persists the minimum submit time and hands it to both clients', async () => {
    const created = await build().execute(USER, input({ minSubmitMinutes: 20 }))
    const stored = await schedules.findById(created.id)

    expect(stored?.minSubmitMinutes).toBe(20)
    expect(
      ExamScheduleDto.fromDomain({ ...created, hasSessions: false })
        .minSubmitMinutes,
    ).toBe(20)
    expect(
      MyExamDto.fromDomain({
        id: created.id,
        title: created.packageTitle,
        subjectId: created.subjectId,
        subjectName: null,
        type: created.type,
        startsAt: created.startsAt,
        endsAt: created.endsAt,
        durationMinutes: created.durationMinutes,
        minSubmitMinutes: created.minSubmitMinutes,
        status: 'OPEN',
        sessionId: null,
        activityId: null,
        activityStatus: null,
        eventId: null,
        eventName: null,
        lifecycle: 'OPEN',
        roomName: null,
        seatNumber: null,
        participantNumber: null,
        makeup: false,
      }).minSubmitMinutes,
    ).toBe(20)
  })

  const activeEvent = async (
    rooms: FakeExamRoomRepository,
    type: 'MIDTERM' | 'FINAL',
  ) => {
    const event = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: type === 'FINAL' ? 'UAS Ganjil' : 'UTS Ganjil',
      type,
      startsAt: START,
      endsAt: END,
      createdById: 'admin-1',
    })
    return (await rooms.updateEvent(event.id, { status: 'ACTIVE' }))!
  }

  it('keeps the exam type it was given', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await activeEvent(rooms, 'FINAL')

    const created = await build(new FakeAcademicLookup(), rooms).execute(
      { ...USER, manageAll: true },
      input({ type: 'FINAL', eventId: event.id }),
    )

    expect(created.type).toBe('FINAL')
    expect((await schedules.findById(created.id))?.type).toBe('FINAL')
  })

  it('refuses a final schedule from a teacher without manage-all', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await activeEvent(rooms, 'FINAL')

    await expect(
      build(new FakeAcademicLookup(), rooms).execute(
        USER,
        input({ type: 'FINAL', eventId: event.id }),
      ),
    ).rejects.toMatchObject({ response: { code: 'FINAL_ADMIN_ONLY' } })
  })

  it('refuses a final schedule without an event even for an admin', async () => {
    await expect(
      build().execute({ ...USER, manageAll: true }, input({ type: 'FINAL' })),
    ).rejects.toMatchObject({ response: { code: 'EVENT_REQUIRED' } })
  })

  it('refuses a midterm schedule from a teacher outside an active midterm event', async () => {
    const rooms = new FakeExamRoomRepository()
    const draft = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: START,
      endsAt: END,
      createdById: 'admin-1',
    })

    await expect(
      build(new FakeAcademicLookup(), rooms).execute(
        USER,
        input({ type: 'MIDTERM', eventId: draft.id }),
      ),
    ).rejects.toMatchObject({ response: { code: 'MIDTERM_OUTSIDE_EVENT' } })
  })

  it('lets a teacher schedule a midterm inside an active midterm event', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await activeEvent(rooms, 'MIDTERM')

    const created = await build(new FakeAcademicLookup(), rooms).execute(
      USER,
      input({ type: 'MIDTERM', eventId: event.id }),
    )

    expect(created.eventId).toBe(event.id)
  })

  it('refuses a classroom of another grade', async () => {
    const academic = new FakeAcademicLookup({
      classrooms: [
        { ...CLASSROOM_7A, gradeId: '44444444-4444-4444-8444-444444444444' },
      ],
    })

    await expect(build(academic).execute(USER, input())).rejects.toThrow(
      'Tingkat kelas tidak sama dengan tingkat paket',
    )
    expect(schedules.schedules.size).toBe(0)
  })

  it('refuses an unknown classroom', async () => {
    await expect(
      build().execute(
        USER,
        input({ classroomId: '00000000-0000-4000-8000-000000000000' }),
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('refuses an unknown package', async () => {
    await expect(
      build().execute(
        USER,
        input({ packageId: '00000000-0000-4000-8000-000000000000' }),
      ),
    ).rejects.toThrow('Paket tidak ditemukan')
  })

  it('refuses an inverted window', async () => {
    await expect(
      build().execute(USER, input({ startsAt: END, endsAt: START })),
    ).rejects.toThrow(BadRequestException)
    expect((await packages.findById(packageId))?.status).toBe('APPROVED')
  })

  it('fails with 409 when there is no active semester', async () => {
    await expect(
      build(new FakeAcademicLookup({ semesterId: null })).execute(
        USER,
        input(),
      ),
    ).rejects.toThrow(ConflictException)
  })

  it('propagates a 503 from the academic service', async () => {
    const academic = new FakeAcademicLookup({
      failWith: new ServiceUnavailableException('academic down'),
    })

    await expect(build(academic).execute(USER, input())).rejects.toThrow(
      ServiceUnavailableException,
    )
    expect(schedules.schedules.size).toBe(0)
  })

  it('refuses a package deleted while the schedule is being created', async () => {
    class DeletesPackageMidway extends FakeAcademicLookup {
      override async activeSemester() {
        const row = packages.packages.get(packageId)!
        packages.packages.set(packageId, { ...row, deletedAt: new Date() })
        return super.activeSemester()
      }
    }

    await expect(
      build(new DeletesPackageMidway()).execute(USER, input()),
    ).rejects.toThrow('Paket tidak ditemukan')
    expect(schedules.schedules.size).toBe(0)
  })

  it('refuses a window that has already ended', async () => {
    await expect(
      build().execute(USER, input(), new Date('2026-11-03T00:00:00.000Z')),
    ).rejects.toThrow('Jendela ujian sudah lewat')
    expect((await packages.findById(packageId))?.status).toBe('APPROVED')
  })

  it('refuses a classroom of another academic year', async () => {
    const academic = new FakeAcademicLookup({
      classrooms: [
        {
          ...CLASSROOM_7A,
          academicYearId: '34343434-3434-4343-8343-343434343434',
        },
      ],
    })

    await expect(build(academic).execute(USER, input())).rejects.toThrow(
      'Kelas bukan kelas tahun ajaran aktif',
    )
    expect(schedules.schedules.size).toBe(0)
  })

  it('refuses a package that is not approved', async () => {
    const { execute } = build()

    for (const status of ['DRAFT', 'SUBMITTED', 'RETURNED'] as const) {
      const row = packages.packages.get(packageId)!
      packages.packages.set(packageId, { ...row, status })
      await expect(execute({ id: 'u1' }, input())).rejects.toThrow(
        ConflictException,
      )
    }
  })

  it('schedules a package that is already locked for another classroom', async () => {
    const { execute } = build()
    await execute({ id: 'u1' }, input())

    const second = await execute({ id: 'u1' }, input())

    expect(second.packageId).toBe(packageId)
  })

  it('stores the exam event it belongs to', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: 'UTS Ganjil',
      type: 'MIDTERM',
      startsAt: START,
      endsAt: END,
      createdById: 'admin-1',
    })

    const created = await build(new FakeAcademicLookup(), rooms).execute(
      { ...USER, manageAll: true },
      input({ type: 'MIDTERM', eventId: event.id }),
    )

    expect(created.eventId).toBe(event.id)
    expect((await schedules.findById(created.id))?.eventId).toBe(event.id)
  })

  it('refuses an event id on a daily schedule', async () => {
    const rooms = new FakeExamRoomRepository()
    const event = await activeEvent(rooms, 'MIDTERM')

    await expect(
      build(new FakeAcademicLookup(), rooms).execute(
        USER,
        input({ type: 'DAILY', eventId: event.id }),
      ),
    ).rejects.toMatchObject({ response: { code: 'EVENT_NOT_ALLOWED' } })
  })

  it('refuses an exam event that does not exist', async () => {
    await expect(
      build().execute(
        USER,
        input({ eventId: '11111111-1111-4111-8111-111111111111' }),
      ),
    ).rejects.toThrow(NotFoundException)
  })

  it('leaves the event empty when none is given', async () => {
    const created = await build().execute(USER, input())

    expect(created.eventId).toBeNull()
  })
})
