import { BadRequestException, Injectable } from '@nestjs/common'
import { SchoolTimeService } from '@mts241alikhlash/nest-core/time'
import type { ScheduleAccessUser } from '../../../../exam-schedule/application/schedule-scope.service.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import type { ExamRoom } from '../../../../exam-room/domain/entities/exam-room.entity.js'
import type { ExamRoomSeat } from '../../../../exam-room/domain/entities/exam-room-seat.entity.js'
import type { ExamRoomSupervisor } from '../../../../exam-room/domain/entities/exam-room-supervisor.entity.js'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IEnrollmentLookupPort } from '../../../../platform/enrollment-lookup/enrollment-lookup.port.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import type { ExamDeliveryMode } from '../../../domain/entities/exam-activity.entity.js'
import { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import {
  ListActivitiesUseCase,
  type NamedActivity,
} from '../list-activities/list-activities.use-case.js'

export const READINESS_KEYS = [
  'PACKAGE',
  'SCHEDULES',
  'SEATS',
  'NUMBERS',
  'SUPERVISORS',
  'TECHNICIANS',
  'LATE_TOLERANCE',
] as const
export type ReadinessKey = (typeof READINESS_KEYS)[number]

export interface ReadinessCheck {
  key: ReadinessKey
  ok: boolean
  detail: string
}

export interface ActivityReadiness {
  activityId: string
  subjectName: string | null
  gradeName: string | null
  startsAt: Date
  deliveryMode: ExamDeliveryMode
  checks: ReadinessCheck[]
}

interface EventRooms {
  rooms: ExamRoom[]
  seats: ExamRoomSeat[]
  supervisors: Map<string, ExamRoomSupervisor[]>
}

@Injectable()
export class GetActivityReadinessUseCase {
  constructor(
    private readonly list: ListActivitiesUseCase,
    private readonly activities: ExamActivityRepository,
    private readonly academic: IAcademicLookupPort,
    private readonly rooms: IExamRoomRepository,
    private readonly enrollment: IEnrollmentLookupPort,
    private readonly numbers: IParticipantNumberPort,
    private readonly schoolTime: SchoolTimeService,
  ) {}

  async execute(
    user: ScheduleAccessUser,
    query: { eventId?: string; date: string },
  ): Promise<ActivityReadiness[]> {
    const day = new Date(`${query.date}T00:00:00.000Z`)
    if (
      Number.isNaN(day.getTime()) ||
      day.toISOString().slice(0, 10) !== query.date
    ) {
      throw new BadRequestException('Tanggal tidak valid')
    }
    const { from, to } = this.schoolTime.dayRange(day)
    const rows = (await this.list.listNamed(user)).filter(
      (row) =>
        row.activity.startsAt >= from &&
        row.activity.startsAt <= to &&
        (query.eventId === undefined || row.activity.eventId === query.eventId),
    )
    if (rows.length === 0) return []
    const semester = await this.academic.activeSemester()
    if (semester === null) return []
    const classrooms = await this.academic.classroomsOfYear(
      semester.academicYearId,
    )
    const rosters = new Map<string, Promise<string[]>>()
    const rosterOf = (classroomId: string) => {
      let roster = rosters.get(classroomId)
      if (roster === undefined) {
        roster = this.enrollment
          .listActiveByClassroom(classroomId, semester.id)
          .then((list) => list.map((row) => row.studentId))
        rosters.set(classroomId, roster)
      }
      return roster
    }
    const events = new Map<string, Promise<EventRooms>>()
    const eventOf = (eventId: string) => {
      let loaded = events.get(eventId)
      if (loaded === undefined) {
        loaded = this.loadEvent(eventId)
        events.set(eventId, loaded)
      }
      return loaded
    }
    const result: ActivityReadiness[] = []
    for (const row of rows) {
      const gradeClassrooms = classrooms
        .filter((room) => room.gradeId === row.activity.gradeId)
        .map((room) => room.id)
      const students = new Set(
        (await Promise.all(gradeClassrooms.map(rosterOf))).flat(),
      )
      result.push({
        activityId: row.activity.id,
        subjectName: row.subjectName,
        gradeName: row.gradeName,
        startsAt: row.activity.startsAt,
        deliveryMode: row.activity.deliveryMode,
        checks: await this.checks(
          row,
          semester.id,
          gradeClassrooms,
          students,
          eventOf,
        ),
      })
    }
    return result
  }

  private async loadEvent(eventId: string): Promise<EventRooms> {
    const [rooms, seats] = await Promise.all([
      this.rooms.listRoomsByEvent(eventId),
      this.rooms.listSeatsByEvent(eventId),
    ])
    const slots = await Promise.all(
      rooms.map((room) => this.rooms.listSupervisors(room.id)),
    )
    return {
      rooms,
      seats,
      supervisors: new Map(rooms.map((room, i) => [room.id, slots[i]])),
    }
  }

  private async checks(
    { activity }: NamedActivity,
    semesterId: string,
    gradeClassrooms: string[],
    students: Set<string>,
    eventOf: (eventId: string) => Promise<EventRooms>,
  ): Promise<ReadinessCheck[]> {
    const checks: ReadinessCheck[] = []
    if (activity.deliveryMode === 'ONLINE') {
      checks.push(await this.packageCheck(activity.packageId))
    }
    const scheduled = new Set(
      (await this.activities.listSchedules(activity.id)).map(
        (row) => row.classroomId,
      ),
    )
    const unscheduled = gradeClassrooms.filter((id) => !scheduled.has(id))
    checks.push({
      key: 'SCHEDULES',
      ok: unscheduled.length === 0,
      detail:
        unscheduled.length === 0
          ? 'Semua kelas sudah punya jadwal'
          : `${unscheduled.length} kelas belum punya jadwal`,
    })
    if (activity.eventId !== null) {
      checks.push(
        ...(await this.roomChecks(
          activity.startsAt,
          semesterId,
          new Set(gradeClassrooms),
          students,
          await eventOf(activity.eventId),
        )),
      )
    }
    checks.push({
      key: 'LATE_TOLERANCE',
      ok: true,
      detail: `Toleransi terlambat ${activity.policy.lateToleranceMinutes} menit`,
    })
    return checks
  }

  private async packageCheck(packageId: string | null) {
    const status =
      packageId === null
        ? null
        : await this.activities.findPackageStatus(packageId)
    const missing = status === null
    const ok = status === 'APPROVED' || status === 'LOCKED'
    return {
      key: 'PACKAGE' as const,
      ok,
      detail: ok
        ? 'Paket soal siap'
        : missing
          ? 'Paket soal belum dipasang'
          : 'Paket belum disetujui',
    }
  }

  private async roomChecks(
    startsAt: Date,
    semesterId: string,
    classroomIds: Set<string>,
    students: Set<string>,
    event: EventRooms,
  ): Promise<ReadinessCheck[]> {
    const seats = event.seats.filter((seat) =>
      classroomIds.has(seat.classroomId),
    )
    const seated = new Set(seats.map((seat) => seat.studentId))
    const unseated = [...students].filter((id) => !seated.has(id)).length
    const used = event.rooms.filter((room) =>
      seats.some((seat) => seat.roomId === room.id),
    )
    const at = startsAt.getTime()
    const unsupervised = used.filter(
      (room) =>
        !(event.supervisors.get(room.id) ?? []).some(
          (slot) =>
            slot.startsAt.getTime() <= at &&
            at < slot.endsAt.getTime() &&
            (slot.actualUserId ?? slot.scheduledUserId) !== null,
        ),
    )
    const untended = used.filter((room) => room.technicianUserId === null)
    const names = (list: ExamRoom[]) => list.map((room) => room.name).join(', ')
    return [
      {
        key: 'SEATS',
        ok: unseated === 0,
        detail:
          unseated === 0
            ? 'Semua siswa sudah punya kursi'
            : `${unseated} siswa belum punya kursi`,
      },
      await this.numberCheck([...seated], semesterId),
      {
        key: 'SUPERVISORS',
        ok: unsupervised.length === 0,
        detail:
          unsupervised.length === 0
            ? 'Semua ruang punya pengawas'
            : `Ruang tanpa pengawas: ${names(unsupervised)}`,
      },
      {
        key: 'TECHNICIANS',
        ok: untended.length === 0,
        detail:
          untended.length === 0
            ? 'Semua ruang punya teknisi'
            : `Ruang tanpa teknisi: ${names(untended)}`,
      },
    ]
  }

  private async numberCheck(
    studentIds: string[],
    semesterId: string,
  ): Promise<ReadinessCheck> {
    try {
      const found = await this.numbers.findNumbers(studentIds, semesterId)
      const missing = studentIds.filter((id) => !found.has(id)).length
      return {
        key: 'NUMBERS',
        ok: missing === 0,
        detail:
          missing === 0
            ? 'Semua siswa sudah punya nomor peserta'
            : `${missing} siswa belum punya nomor peserta`,
      }
    } catch {
      return {
        key: 'NUMBERS',
        ok: false,
        detail: 'Nomor peserta tidak dapat dimuat',
      }
    }
  }
}
