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
  ExamDeliveryMode,
  ExamOfflineKind,
} from '../../../../exam-activity/domain/entities/exam-activity.entity.js'
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
import { effectiveMinSubmit } from '../../../domain/policies/effective-min-submit.policy.js'
import { myExamStatus } from '../../../domain/policies/my-exam-status.policy.js'
import {
  DEFAULT_POLICIES,
  tryParsePolicy,
} from '../../../../exam-activity/domain/policies/exam-policy.policy.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'

function runsOnPastEnd(
  lifecycle: ExamLifecycle,
  session: { status: string; finalizeAt: Date } | null,
  now: Date,
): ExamLifecycle {
  if (
    lifecycle === 'FINISHED' &&
    session !== null &&
    session.status === 'IN_PROGRESS' &&
    now.getTime() < session.finalizeAt.getTime()
  ) {
    return 'OPEN'
  }
  return lifecycle
}

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
  deliveryMode: ExamDeliveryMode
  hasPackage: boolean
  offlineKind: ExamOfflineKind | null
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

    const [regular, makeups] = await Promise.all([
      this.schedules.findForClassroom(
        enrollment.classroomId,
        enrollment.semesterId,
      ),
      this.schedules.findMakeupsForStudent(studentId, enrollment.semesterId),
    ])
    const schedules = [...regular, ...makeups]
    if (schedules.length === 0) return []

    const originIds = [
      ...new Set(
        schedules.flatMap((schedule) =>
          schedule.kind === 'MAKEUP' && schedule.makeupOfId !== null
            ? [schedule.makeupOfId]
            : [],
        ),
      ),
    ]
    const [sessions, originals] = await Promise.all([
      this.sessions.listByStudentAndSchedules(
        studentId,
        schedules.map((schedule) => schedule.id),
      ),
      this.schedules.findByIds(originIds),
    ])
    const sessionOf = new Map(sessions.map((s) => [s.scheduleId, s]))
    const originOf = new Map(originals.map((s) => [s.id, s]))
    const originFor = (schedule: ExamSchedule): ExamSchedule | null =>
      schedule.kind === 'MAKEUP' && schedule.makeupOfId !== null
        ? (originOf.get(schedule.makeupOfId) ?? null)
        : null

    const eligible = await Promise.all(
      schedules.map((schedule) =>
        schedule.kind === 'MAKEUP'
          ? this.canSitMakeup(schedule, originFor(schedule), studentId)
          : Promise.resolve(true),
      ),
    )
    const candidates = schedules.filter((_, index) => eligible[index])

    const packageIds = [
      ...new Set(
        candidates.flatMap((schedule) =>
          schedule.packageId === null ? [] : [schedule.packageId],
        ),
      ),
    ]
    const activityIds = [
      ...new Set(
        candidates.flatMap((schedule) => {
          const activityId = (originFor(schedule) ?? schedule).activityId
          return activityId ? [activityId] : []
        }),
      ),
    ]
    const [packageRows, activityRows] = await Promise.all([
      this.packages.findByIds(packageIds),
      this.activities.findByIds(activityIds),
    ])
    const packageOf = new Map(packageRows.map((p) => [p.id, p]))
    const activityOf = new Map(activityRows.map((a) => [a.id, a]))

    const planned = candidates.flatMap((schedule) => {
      const pkg =
        schedule.packageId === null
          ? null
          : (packageOf.get(schedule.packageId) ?? null)
      if (schedule.packageId !== null && pkg === null) return []
      const source = originFor(schedule) ?? schedule
      const activity = source.activityId
        ? (activityOf.get(source.activityId) ?? null)
        : null
      if (schedule.kind === 'REGULAR' && activity?.status === 'DRAFT') return []
      const session = sessionOf.get(schedule.id) ?? null
      const eventId = activity?.eventId ?? source.eventId
      const lifecycle = runsOnPastEnd(
        scheduleLifecycle(schedule, activity, now),
        session,
        now,
      )
      return [{ schedule, pkg, activity, session, eventId, lifecycle }]
    })

    const seatEventIds = [
      ...new Set(
        planned.flatMap((row) =>
          row.lifecycle === 'OPEN' && row.eventId !== null ? [row.eventId] : [],
        ),
      ),
    ]
    const eventIds = [
      ...new Set(
        planned.flatMap((row) => (row.eventId === null ? [] : [row.eventId])),
      ),
    ]
    const [seats, events, participantNumber] = await Promise.all([
      Promise.all(
        seatEventIds.map((eventId) =>
          this.rooms.findSeatForStudent(eventId, studentId),
        ),
      ),
      Promise.all(eventIds.map((eventId) => this.rooms.findEventById(eventId))),
      planned.length === 0
        ? Promise.resolve(null)
        : this.participants
            .findNumber(studentId, enrollment.semesterId)
            .catch(() => null),
    ])
    const seatOf = new Map(seatEventIds.map((id, index) => [id, seats[index]]))
    const eventNameOf = new Map(
      eventIds.map((id, index) => [id, events[index]?.name ?? null]),
    )

    const rows: MyExam[] = planned.map(
      ({ schedule, pkg, activity, session, eventId, lifecycle }) => {
        const seat =
          lifecycle === 'OPEN' && eventId !== null
            ? (seatOf.get(eventId) ?? null)
            : null
        return {
          id: schedule.id,
          title: schedule.packageTitle ?? pkg?.title ?? '',
          subjectId: pkg?.subjectId ?? schedule.subjectId,
          subjectName: null,
          type: schedule.type,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          durationMinutes: schedule.durationMinutes,
          minSubmitMinutes: effectiveMinSubmit(
            tryParsePolicy(schedule.activityPolicy) ?? DEFAULT_POLICIES.MIDTERM,
            schedule.minSubmitMinutes,
          ),
          status: myExamStatus(schedule, session, now, lifecycle),
          sessionId: session?.id ?? null,
          activityId: activity?.id ?? null,
          activityStatus: activity?.status ?? null,
          eventId,
          eventName:
            eventId === null ? null : (eventNameOf.get(eventId) ?? null),
          lifecycle,
          roomName: seat?.roomName ?? null,
          seatNumber: seat?.seatNumber ?? null,
          participantNumber,
          makeup: schedule.kind === 'MAKEUP',
          deliveryMode: schedule.deliveryMode,
          hasPackage: schedule.packageId !== null,
          offlineKind: activity?.offlineKind ?? null,
        }
      },
    )
    const names = await this.subjectNames(rows.map((row) => row.subjectId))
    for (const row of rows) {
      row.subjectName = names.get(row.subjectId) ?? null
      row.title ||= row.subjectName ?? ''
      if (row.makeup) row.title = `${row.title} (Susulan)`
    }

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
