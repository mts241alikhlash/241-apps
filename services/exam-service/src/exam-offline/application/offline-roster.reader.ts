import { Injectable, NotFoundException } from '@nestjs/common'
import type { ExamActivity } from '../../exam-activity/domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../exam-activity/domain/repositories/exam-activity.repository.js'
import {
  GradingScopeService,
  type GradingUser,
} from '../../exam-grading/application/grading-scope.service.js'
import type { ExamRoomSeat } from '../../exam-room/domain/entities/exam-room-seat.entity.js'
import { IExamRoomRepository } from '../../exam-room/domain/repositories/exam-room.repository.js'
import type { ExamSchedule } from '../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { IExamScheduleRepository } from '../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import { ApiConflictException } from '../../core/filters/api-exception.js'
import { IParticipantNumberPort } from '../../platform/participant-number/participant-number.port.js'
import { IStudentDirectoryPort } from '../../platform/student-directory/student-directory.port.js'
import type {
  OfflineResult,
  OfflineRosterRow,
} from '../domain/entities/offline-result.entity.js'
import { offlineStateOf } from '../domain/policies/offline-score.policy.js'
import { IOfflineResultRepository } from '../domain/repositories/offline-result.repository.js'

export type OfflineAccess = 'read' | 'write'

export interface OfflineRoster {
  schedule: ExamSchedule
  activity: ExamActivity
  rows: OfflineRosterRow[]
  results: Map<string, OfflineResult>
}

export function seatedStudentIds(
  seats: ExamRoomSeat[],
  classroomId: string,
): string[] {
  return [
    ...new Set(
      seats
        .filter((seat) => seat.classroomId === classroomId)
        .map((seat) => seat.studentId),
    ),
  ]
}

function compareRows(a: OfflineRosterRow, b: OfflineRosterRow): number {
  if (a.participantNumber !== b.participantNumber) {
    if (a.participantNumber === null) return 1
    if (b.participantNumber === null) return -1
    return a.participantNumber.localeCompare(b.participantNumber, 'id', {
      numeric: true,
    })
  }
  return (
    (a.name ?? '').localeCompare(b.name ?? '', 'id') ||
    a.studentId.localeCompare(b.studentId)
  )
}

@Injectable()
export class OfflineRosterReader {
  constructor(
    private readonly scope: GradingScopeService,
    private readonly schedules: IExamScheduleRepository,
    private readonly activities: ExamActivityRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly results: IOfflineResultRepository,
    private readonly students: IStudentDirectoryPort,
    private readonly numbers: IParticipantNumberPort,
  ) {}

  async authorize(
    user: GradingUser,
    scheduleId: string,
    access: OfflineAccess,
  ): Promise<{ schedule: ExamSchedule; activity: ExamActivity }> {
    const schedule = await this.schedules.findById(scheduleId)
    const scope =
      access === 'write'
        ? await this.scope.forWrite(user)
        : await this.scope.forRead(user)
    if (
      schedule === null ||
      !(await scope.allows(
        schedule.subjectId,
        schedule.classroomId,
        schedule.semesterId,
      ))
    ) {
      throw new NotFoundException('Jadwal tidak ditemukan')
    }
    if (schedule.deliveryMode !== 'OFFLINE') {
      throw new ApiConflictException(
        'SCHEDULE_NOT_OFFLINE',
        'Jadwal ini bukan ujian offline',
      )
    }
    if (access === 'write' && schedule.status === 'CANCELLED') {
      throw new ApiConflictException(
        'SCHEDULE_CANCELLED',
        'Jadwal ujian sudah dibatalkan',
      )
    }
    const activity = schedule.activityId
      ? await this.activities.findById(schedule.activityId)
      : null
    if (activity === null) {
      throw new NotFoundException('Kegiatan ujian tidak ditemukan')
    }
    return { schedule, activity }
  }

  async load(
    user: GradingUser,
    scheduleId: string,
    access: OfflineAccess,
  ): Promise<OfflineRoster> {
    const { schedule, activity } = await this.authorize(
      user,
      scheduleId,
      access,
    )
    const seats =
      schedule.eventId === null
        ? []
        : await this.rooms.listSeatsByEvent(schedule.eventId)
    const studentIds = seatedStudentIds(seats, schedule.classroomId)
    if (studentIds.length === 0) {
      return { schedule, activity, rows: [], results: new Map() }
    }
    const [refs, numbers, absences, stored] = await Promise.all([
      this.students.refsByIds(studentIds),
      this.numbersOf(studentIds, schedule.semesterId),
      this.rooms.listAbsencesByScheduleStudents(schedule.id, studentIds),
      this.results.listBySchedules([schedule.id]),
    ])
    const nameOf = new Map(refs.map((ref) => [ref.id, ref.name]))
    const absent = new Set(absences.map((row) => row.studentId))
    const results = new Map(stored.map((row) => [row.studentId, row]))
    const rows = studentIds.map((studentId): OfflineRosterRow => {
      const result = results.get(studentId)
      const state = offlineStateOf(absent.has(studentId), result)
      return {
        studentId,
        participantNumber: numbers.get(studentId) ?? null,
        name: nameOf.get(studentId) ?? null,
        state,
        rawScore: state === 'ABSENT' ? null : (result?.rawScore ?? null),
        note: state === 'ABSENT' || !result?.note ? null : result.note,
        publication:
          state === 'ABSENT' ? null : (result?.publicationStatus ?? null),
      }
    })
    return { schedule, activity, rows: rows.sort(compareRows), results }
  }

  private async numbersOf(
    studentIds: string[],
    semesterId: string,
  ): Promise<Map<string, string>> {
    try {
      return await this.numbers.findNumbers(studentIds, semesterId)
    } catch {
      return new Map()
    }
  }
}
