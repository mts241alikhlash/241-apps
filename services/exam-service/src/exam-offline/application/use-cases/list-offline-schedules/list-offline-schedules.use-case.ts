import { Injectable } from '@nestjs/common'
import type { ExamActivity } from '../../../../exam-activity/domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../../exam-activity/domain/repositories/exam-activity.repository.js'
import {
  GradingScopeService,
  type GradingUser,
} from '../../../../exam-grading/application/grading-scope.service.js'
import type { ExamRoomSeat } from '../../../../exam-room/domain/entities/exam-room-seat.entity.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import type { ExamSchedule } from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import type {
  OfflineResult,
  OfflineScheduleRow,
} from '../../../domain/entities/offline-result.entity.js'
import { offlineStateOf } from '../../../domain/policies/offline-score.policy.js'
import { IOfflineResultRepository } from '../../../domain/repositories/offline-result.repository.js'
import { seatedStudentIds } from '../../offline-roster.reader.js'

@Injectable()
export class ListOfflineSchedulesUseCase {
  constructor(
    private readonly scope: GradingScopeService,
    private readonly schedules: IExamScheduleRepository,
    private readonly activities: ExamActivityRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly results: IOfflineResultRepository,
    private readonly academic: IAcademicLookupPort,
  ) {}

  async execute(user: GradingUser): Promise<OfflineScheduleRow[]> {
    const semester = await this.academic.activeSemester()
    if (semester === null) return []
    const scope = await this.scope.forRead(user)
    const candidates = await this.schedules.findOfflineBySemester(semester.id)
    const allowed: ExamSchedule[] = []
    for (const schedule of candidates) {
      if (
        await scope.allows(
          schedule.subjectId,
          schedule.classroomId,
          schedule.semesterId,
        )
      ) {
        allowed.push(schedule)
      }
    }
    const withActivity = await this.attachActivities(allowed)
    if (withActivity.length === 0) return []

    const [subjects, classrooms, results, seatsByEvent] = await Promise.all([
      this.academic.subjectsByIds([
        ...new Set(withActivity.map(({ schedule }) => schedule.subjectId)),
      ]),
      this.academic.classroomsByIds([
        ...new Set(withActivity.map(({ schedule }) => schedule.classroomId)),
      ]),
      this.results.listBySchedules(
        withActivity.map(({ schedule }) => schedule.id),
      ),
      this.seatsByEvent(withActivity.map(({ schedule }) => schedule.eventId)),
    ])
    const subjectName = new Map(subjects.map((row) => [row.id, row.name]))
    const classroomName = new Map(classrooms.map((row) => [row.id, row.name]))

    return Promise.all(
      withActivity.map(async ({ schedule, activity }) => {
        const studentIds = seatedStudentIds(
          seatsByEvent.get(schedule.eventId ?? '') ?? [],
          schedule.classroomId,
        )
        const counts = await this.countsOf(schedule.id, studentIds, results)
        return {
          scheduleId: schedule.id,
          activityId: activity.id,
          subjectName: subjectName.get(schedule.subjectId) ?? null,
          classroomName: classroomName.get(schedule.classroomId) ?? null,
          offlineKind: activity.offlineKind ?? 'WRITTEN',
          maxScore: activity.maxScore,
          startsAt: schedule.startsAt,
          endsAt: schedule.endsAt,
          ...counts,
        }
      }),
    )
  }

  private async attachActivities(
    schedules: ExamSchedule[],
  ): Promise<{ schedule: ExamSchedule; activity: ExamActivity }[]> {
    const cache = new Map<string, Promise<ExamActivity | null>>()
    const rows = await Promise.all(
      schedules.map(async (schedule) => {
        const id = schedule.activityId
        if (!id) return null
        if (!cache.has(id)) cache.set(id, this.activities.findById(id))
        const activity = await cache.get(id)
        return activity?.deliveryMode === 'OFFLINE'
          ? { schedule, activity }
          : null
      }),
    )
    return rows.filter((row) => row !== null)
  }

  private async seatsByEvent(
    eventIds: (string | null)[],
  ): Promise<Map<string, ExamRoomSeat[]>> {
    const unique = [
      ...new Set(eventIds.filter((id): id is string => id !== null)),
    ]
    const seats = await Promise.all(
      unique.map((id) => this.rooms.listSeatsByEvent(id)),
    )
    return new Map(unique.map((id, index) => [id, seats[index]]))
  }

  private async countsOf(
    scheduleId: string,
    studentIds: string[],
    results: OfflineResult[],
  ) {
    const absences =
      studentIds.length === 0
        ? []
        : await this.rooms.listAbsencesByScheduleStudents(
            scheduleId,
            studentIds,
          )
    const absent = new Set(absences.map((row) => row.studentId))
    const byStudent = new Map(
      results
        .filter((row) => row.scheduleId === scheduleId)
        .map((row) => [row.studentId, row]),
    )
    const counts = {
      registered: studentIds.length,
      scored: 0,
      absent: 0,
      missing: 0,
      published: 0,
    }
    for (const studentId of studentIds) {
      const result = byStudent.get(studentId)
      const state = offlineStateOf(absent.has(studentId), result)
      if (state === 'ABSENT') counts.absent += 1
      if (state === 'MISSING') counts.missing += 1
      if (state === 'SCORED') counts.scored += 1
      if (state === 'SCORED' && result?.publicationStatus === 'SENT') {
        counts.published += 1
      }
    }
    return counts
  }
}
