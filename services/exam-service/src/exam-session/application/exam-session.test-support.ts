import type { ExamType } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { ServiceUnavailableException } from '@nestjs/common'
import { FakeExamActivityRepository } from '../../exam-activity/application/exam-activity.repository.fake.js'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import { DEFAULT_POLICIES } from '../../exam-activity/domain/policies/exam-policy.policy.js'
import type { FakeExamPackageRepository } from '../../exam-package/application/exam-package.repository.fake.js'
import { FakeExamRoomRepository } from '../../exam-room/application/exam-room.repository.fake.js'
import { CreateExamScheduleUseCase } from '../../exam-schedule/application/use-cases/create-exam-schedule/create-exam-schedule.use-case.js'
import type { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import {
  CLASSROOM_7A,
  FakeAcademicLookup,
  SEMESTER_ID,
  USER,
  approvedPackage,
} from '../../exam-schedule/application/exam-schedule.test-support.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import {
  IEnrollmentLookupPort,
  type ActiveEnrollment,
} from '../../platform/enrollment-lookup/enrollment-lookup.port.js'
import { IParticipantNumberPort } from '../../platform/participant-number/participant-number.port.js'
import { IStudentDirectoryPort } from '../../platform/student-directory/student-directory.port.js'
import { IStudentIdentityReadPort } from '../../platform/student-identity/student-identity.port.js'
import { seedPackage } from '../../exam-package/application/exam-package.test-support.js'
import type { FakeQuestionRepository } from '../../question/application/question.repository.fake.js'
import type {
  ChoiceKey,
  QuestionContent,
  QuestionType,
} from '../../question/domain/value-objects/question-content.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import type { FakeExamSessionRepository } from './exam-session.repository.fake.js'
import type { ISessionFinalizer } from '../domain/repositories/session-finalizer.port.js'
import { LifecycleGate } from './lifecycle-gate.service.js'
import { SessionAccessService } from './session-access.service.js'

export const STUDENT_USER = {
  id: '10101010-1010-4010-8010-101010101010',
  deviceId: 'device-1',
}
export const STUDENT_ID = '20202020-2020-4020-8020-202020202020'
export const NOW = new Date('2026-11-02T02:00:00.000Z')
export const STARTS = new Date('2026-11-02T01:00:00.000Z')
export const ENDS = new Date('2026-11-02T04:00:00.000Z')

export class FakeStudentIdentity extends IStudentIdentityReadPort {
  constructor(
    private readonly options: {
      studentId?: string | null
      failWith?: Error
    } = {},
  ) {
    super()
  }

  findStudentIdByUserId() {
    if (this.options.failWith) return Promise.reject(this.options.failWith)
    return Promise.resolve(
      this.options.studentId === undefined
        ? STUDENT_ID
        : this.options.studentId,
    )
  }
}

export class FakeEnrollment extends IEnrollmentLookupPort {
  constructor(
    private readonly options: {
      enrollment?: ActiveEnrollment | null
      roster?: ActiveEnrollment[]
      failWith?: Error
    } = {},
  ) {
    super()
  }

  listActiveByClassroom() {
    if (this.options.failWith) return Promise.reject(this.options.failWith)
    return Promise.resolve(this.options.roster ?? [])
  }

  findActiveByStudent() {
    if (this.options.failWith) return Promise.reject(this.options.failWith)
    return Promise.resolve(
      this.options.enrollment === undefined
        ? {
            id: 'enr-1',
            studentId: STUDENT_ID,
            classroomId: CLASSROOM_7A.id,
            semesterId: SEMESTER_ID,
          }
        : this.options.enrollment,
    )
  }
}

export const down = () =>
  new ServiceUnavailableException('student-service down')

export function sessionAccess(
  sessions: FakeExamSessionRepository,
  finalizer: ISessionFinalizer,
  schedules: FakeExamScheduleRepository,
  activities = new FakeExamActivityRepository(),
): SessionAccessService {
  return new SessionAccessService(
    sessions,
    finalizer,
    new LifecycleGate(schedules, activities),
  )
}

export async function activityFor(
  activities: FakeExamActivityRepository,
  schedule: ExamSchedule,
  overrides: Partial<ExamActivity> = {},
): Promise<ExamActivity> {
  const activity = await activities.create({
    activity: {
      semesterId: schedule.semesterId,
      eventId: null,
      gradeId: CLASSROOM_7A.gradeId,
      subjectId: schedule.subjectId,
      packageId: schedule.packageId,
      type: schedule.type,
      tokenMode: 'STATIC',
      presetId: null,
      policy: DEFAULT_POLICIES.DAILY,
      startsAt: STARTS,
      endsAt: ENDS,
      durationMinutes: 90,
      createdById: USER.id,
    },
    classroomIds: [],
    actorId: USER.id,
  })
  const seeded = { ...activity, status: 'ACTIVE' as const, ...overrides }
  activities.activities.set(seeded.id, seeded)
  return seeded
}

export class FakeParticipantNumber extends IParticipantNumberPort {
  constructor(
    private readonly options: {
      number?: string | null
      failWith?: Error
    } = {},
  ) {
    super()
  }

  findNumber() {
    if (this.options.failWith) return Promise.reject(this.options.failWith)
    return Promise.resolve(this.options.number ?? null)
  }

  issueNumbers() {
    return Promise.resolve()
  }
}

export async function scheduleExam(
  fixtures: {
    packages: FakeExamPackageRepository
    schedules: FakeExamScheduleRepository
    questions: FakeQuestionRepository
  },
  overrides: {
    startsAt?: Date
    endsAt?: Date
    durationMinutes?: number
    type?: ExamType
  } = {},
): Promise<ExamSchedule> {
  const pkg = await approvedPackage(fixtures.packages, fixtures.questions)
  const rooms = new FakeExamRoomRepository()
  const type = overrides.type ?? 'DAILY'
  const startsAt = overrides.startsAt ?? STARTS
  const endsAt = overrides.endsAt ?? ENDS
  let eventId: string | undefined
  if (type === 'MIDTERM' || type === 'FINAL') {
    const event = await rooms.createEvent({
      semesterId: SEMESTER_ID,
      name: type,
      type,
      startsAt,
      endsAt,
      createdById: USER.id,
    })
    eventId = event.id
    await rooms.updateEvent(event.id, { status: 'ACTIVE' })
  }
  return new CreateExamScheduleUseCase(
    fixtures.schedules,
    fixtures.packages,
    new FakeAcademicLookup(),
    rooms,
  ).execute(
    { ...USER, manageAll: true },
    {
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      startsAt,
      endsAt,
      durationMinutes: overrides.durationMinutes ?? 90,
      type,
      eventId,
    },
    new Date('2026-10-30T00:00:00.000Z'),
  )
}

export function sessionFor(
  schedule: ExamSchedule,
  overrides: Partial<ExamSession> = {},
): ExamSession {
  return {
    id: 'ses-1',
    scheduleId: schedule.id,
    studentId: STUDENT_ID,
    userId: STUDENT_USER.id,
    deviceId: 'device-1',
    enrollmentId: 'enr-1',
    shuffleSeed: 'seed-1',
    startedAt: NOW,
    deadline: new Date('2026-11-02T03:30:00.000Z'),
    finalizeAt: new Date('2026-11-02T03:40:00.000Z'),
    status: 'IN_PROGRESS',
    submittedAt: null,
    rawScore: null,
    maxScore: null,
    releasedAt: null,
    releasedById: null,
    gradedAt: null,
    violationCount: 0,
    lastSeenAt: null,
    absentSince: null,
    roomId: null,
    seatNumber: null,
    requiresTokenReentry: false,
    lockedByViolation: false,
    allowWebClient: false,
    allowLateEntry: false,
    extraMinutes: 0,
    kioskMode: 'PINNED',
    syncedAnswerCount: 0,
    unsyncedCount: 0,
    lastBatteryLevel: null,
    isCharging: null,
    dndGranted: null,
    lockTaskActive: null,
    batteryUnrestricted: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

export const CHOICES = (['A', 'B', 'C', 'D', 'E'] as ChoiceKey[]).map(
  (key) => ({
    key,
    html: `<p>Pilihan ${key}</p>`,
  }),
)

export interface PaperQuestionSpec {
  type: QuestionType
  content: QuestionContent
  bodyHtml?: string
  points?: number
}

export const choiceSpec = (
  key: ChoiceKey = 'B',
  bodyHtml?: string,
): PaperQuestionSpec => ({
  type: 'MULTIPLE_CHOICE',
  content: { choices: CHOICES, answer: { key } },
  bodyHtml,
})

export async function schedulePaper(
  fixtures: {
    packages: FakeExamPackageRepository
    schedules: FakeExamScheduleRepository
    questions: FakeQuestionRepository
  },
  specs: PaperQuestionSpec[],
): Promise<{ schedule: ExamSchedule; questionIds: string[] }> {
  const pkg = await seedPackage(
    fixtures.packages,
    fixtures.questions,
    specs.map((spec, index) => ({
      type: spec.type,
      content: spec.content,
      bodyHtml: spec.bodyHtml ?? `<p>Soal ${index + 1}</p>`,
      points: spec.points ?? 2,
    })),
  )
  const ids = pkg.items.map((item) => item.questionId)
  const schedule = await new CreateExamScheduleUseCase(
    fixtures.schedules,
    fixtures.packages,
    new FakeAcademicLookup(),
    new FakeExamRoomRepository(),
  ).execute(
    USER,
    {
      packageId: pkg.id,
      classroomId: CLASSROOM_7A.id,
      startsAt: STARTS,
      endsAt: ENDS,
      durationMinutes: 90,
      type: 'DAILY',
    },
    new Date('2026-10-30T00:00:00.000Z'),
  )
  return { schedule, questionIds: ids }
}

export class FakeStudentDirectory extends IStudentDirectoryPort {
  constructor(
    private readonly refs: {
      id: string
      nis: string
      name: string | null
    }[] = [{ id: STUDENT_ID, nis: '2024001', name: 'Ahmad Fauzi' }],
  ) {
    super()
  }

  refsByIds(ids: string[]) {
    return Promise.resolve(this.refs.filter((ref) => ids.includes(ref.id)))
  }
}
