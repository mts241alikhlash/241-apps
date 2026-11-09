import { Injectable } from '@nestjs/common'
import { ExamActivityRepository } from '../../../../exam-activity/domain/repositories/exam-activity.repository.js'
import { IExamPackageRepository } from '../../../../exam-package/domain/repositories/exam-package.repository.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { IStudentIdentityReadPort } from '../../../../platform/student-identity/student-identity.port.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import type {
  ExamSchedule,
  ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { loadSittings } from '../../../../exam-schedule/application/student-sittings.js'
import { assessMakeupEligibility } from '../../../../exam-schedule/domain/policies/makeup-eligibility.policy.js'
import type { MyExamStatus } from '../../../domain/entities/exam-session.entity.js'
import {
  scheduleLifecycle,
  type ExamActivityStatus,
  type ExamLifecycle,
} from '../../../domain/policies/exam-lifecycle.policy.js'
import { myExamStatus } from '../../../domain/policies/my-exam-status.policy.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

export interface MyExam {
  id: string
  title: string
  subjectId: string
  subjectName: string | null
  type: ExamType
  startsAt: Date
  endsAt: Date
  durationMinutes: number
  minSubmitMinutes: number
  status: MyExamStatus
  sessionId: string | null
  activityId: string | null
  activityStatus: ExamActivityStatus | null
  eventId: string | null
  eventName: string | null
  lifecycle: ExamLifecycle
  roomName: string | null
  seatNumber: number | null
  participantNumber: string | null
  makeup: boolean
}

const RANK: Record<MyExamStatus, number> = {
  IN_PROGRESS: 0,
  OPEN: 1,
  UPCOMING: 2,
  FINISHED: 3,
}

@Injectable()
export class ListMyExamsUseCase {
  constructor(
    private readonly students: IStudentIdentityReadPort,
    private readonly enrollments: IEnrollmentLookupPort,
    private readonly schedules: IExamScheduleRepository,
    private readonly packages: IExamPackageRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly academic: IAcademicLookupPort,
    private readonly activities: ExamActivityRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly participants: IParticipantNumberPort,
  ) {}

  async execute(
    user: { id: string },
    now: Date = new Date(),
  ): Promise<MyExam[]> {
    const studentId = await this.students.findStudentIdByUserId(user.id)
    if (studentId === null) return []
    const enrollment = await this.enrollments.findActiveByStudent(studentId)
    if (enrollment === null) return []

    const regular = await this.schedules.findForClassroom(
      enrollment.classroomId,
      enrollment.semesterId,
    )
    const makeups = await this.schedules.findMakeupsForStudent(
      studentId,
      enrollment.semesterId,
    )
    const schedules = [...regular, ...makeups]
    if (schedules.length === 0) return []

    const sessions = await this.sessions.listByStudentAndSchedules(
      studentId,
      schedules.map((schedule) => schedule.id),
    )
    const sessionOf = new Map(sessions.map((s) => [s.scheduleId, s]))

    const eventNames = new Map<string, Promise<string | null>>()
    const eventName = (eventId: string): Promise<string | null> => {
      const cached = eventNames.get(eventId)
      if (cached !== undefined) return cached
      const name = this.rooms
        .findEventById(eventId)
        .then((event) => event?.name ?? null)
      eventNames.set(eventId, name)
      return name
    }
    let participantNumber: Promise<string | null> | null = null
    const number = (): Promise<string | null> => {
      participantNumber ??= this.participants
        .findNumber(studentId, enrollment.semesterId)
        .catch(() => null)
      return participantNumber
    }

    const rows: MyExam[] = []
    for (const schedule of schedules) {
      const original =
        schedule.kind === 'MAKEUP' && schedule.makeupOfId !== null
          ? await this.schedules.findById(schedule.makeupOfId)
          : null
      if (
        schedule.kind === 'MAKEUP' &&
        !(await this.canSitMakeup(schedule, original, studentId))
      ) {
        continue
      }
      const pkg = await this.packages.findById(schedule.packageId)
      if (pkg === null) continue
      const session = sessionOf.get(schedule.id) ?? null
      const source = original ?? schedule
      const activity = source.activityId
        ? await this.activities.findById(source.activityId)
        : null
      const eventId = activity?.eventId ?? source.eventId
      const lifecycle = scheduleLifecycle(schedule, activity, now)
      const seat =
        lifecycle === 'OPEN' && eventId !== null
          ? await this.rooms.findSeatForStudent(eventId, studentId)
          : null
      rows.push({
        id: schedule.id,
        title:
          schedule.kind === 'MAKEUP'
            ? `${schedule.packageTitle} (Susulan)`
            : schedule.packageTitle,
        subjectId: pkg.subjectId,
        subjectName: null,
        type: schedule.type,
        startsAt: schedule.startsAt,
        endsAt: schedule.endsAt,
        durationMinutes: schedule.durationMinutes,
        minSubmitMinutes: schedule.minSubmitMinutes,
        status: myExamStatus(schedule, session, now),
        sessionId: session?.id ?? null,
        activityId: activity?.id ?? null,
        activityStatus: activity?.status ?? null,
        eventId,
        eventName: eventId === null ? null : await eventName(eventId),
        lifecycle,
        roomName: seat?.roomName ?? null,
        seatNumber: seat?.seatNumber ?? null,
        participantNumber: await number(),
        makeup: schedule.kind === 'MAKEUP',
      })
    }
    const names = await this.subjectNames(rows.map((row) => row.subjectId))
    for (const row of rows) row.subjectName = names.get(row.subjectId) ?? null

    return rows.sort(
      (a, b) =>
        RANK[a.status] - RANK[b.status] ||
        (a.status === 'FINISHED'
          ? b.endsAt.getTime() - a.endsAt.getTime()
          : a.startsAt.getTime() - b.startsAt.getTime()),
    )
  }

  private async canSitMakeup(
    makeup: ExamSchedule,
    original: ExamSchedule | null,
    studentId: string,
  ): Promise<boolean> {
    if (original?.status !== 'SCHEDULED') return false
    const sittings = await loadSittings(
      this.schedules,
      this.sessions,
      original.id,
      studentId,
      makeup.id,
    )
    return assessMakeupEligibility({ sittings, onLiveMakeup: false }).eligible
  }

  private async subjectNames(ids: string[]): Promise<Map<string, string>> {
    try {
      const subjects = await this.academic.subjectsByIds([...new Set(ids)])
      return new Map(subjects.map((subject) => [subject.id, subject.name]))
    } catch {
      return new Map()
    }
  }
}
