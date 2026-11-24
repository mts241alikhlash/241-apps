import { Injectable } from '@nestjs/common'
import { IAcademicLookupPort } from '../../../../platform/academic-lookup/academic-lookup.port.js'
import { IAuthorLookupPort } from '../../../../platform/author-lookup/author-lookup.port.js'
import { IEmployeeIdentityReadPort } from '../../../../platform/employee-identity/employee-identity.port.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import type { ExamRoom } from '../../../domain/entities/exam-room.entity.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import {
  MANAGE_ALL,
  READ_ALL,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../room-access.service.js'
import { staffNames } from '../../room-staff-names.js'
import { visibleRooms } from '../../room-visibility.js'

export interface RoomReportListQuery {
  eventId?: string
}

export interface RoomReportSummary {
  roomId: string
  roomCode: string
  roomName: string
  slotId: string
  startsAt: string
  endsAt: string
  status: string
  registeredCount: number
  reportId: string | null
  hasAttachment: boolean
  attachmentName: string | null
  subjectNames: string[]
  supervisorName: string | null
}

interface SlotRow extends RoomReportSummary {
  classroomIds: Set<string>
  gradeIds: Set<string>
  actualUserId: string | null
  eventId: string
}

@Injectable()
export class ListRoomReportsUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly academic: IAcademicLookupPort,
    private readonly authors: IAuthorLookupPort,
    private readonly employees: IEmployeeIdentityReadPort,
  ) {}

  async execute(
    user: RoomStaffUser,
    query: RoomReportListQuery,
  ): Promise<RoomReportSummary[]> {
    const rooms = await visibleRooms(this.rooms, user)
    const scoped =
      query.eventId === undefined
        ? rooms
        : rooms.filter((room) => room.eventId === query.eventId)
    const rows = await Promise.all(
      scoped.map((room) => this.roomRows(user, room)),
    )
    return this.enrich(rows.flat())
  }

  private async enrich(rows: SlotRow[]): Promise<RoomReportSummary[]> {
    const eventIds = [...new Set(rows.map((row) => row.eventId))]
    const schedulesByEvent = new Map(
      await Promise.all(
        eventIds.map(async (eventId) => {
          const own = rows.filter((row) => row.eventId === eventId)
          const from = Math.min(...own.map((row) => Date.parse(row.startsAt)))
          const to = Math.max(...own.map((row) => Date.parse(row.endsAt)))
          return [
            eventId,
            await this.schedules.listSchedulesForEventWindow(
              eventId,
              new Date(from),
              new Date(to),
            ),
          ] as const
        }),
      ),
    )
    const activitiesByEvent = new Map(
      await Promise.all(
        eventIds.map(
          async (eventId) =>
            [eventId, await this.rooms.listActivitiesByEvent(eventId)] as const,
        ),
      ),
    )
    const subjectIds = [
      ...new Set([
        ...[...schedulesByEvent.values()].flat().map((row) => row.subjectId),
        ...[...activitiesByEvent.values()].flat().map((row) => row.subjectId),
      ]),
    ]
    const subjectName = new Map(
      subjectIds.length === 0
        ? []
        : (await this.academic.subjectsByIds(subjectIds)).map((row) => [
            row.id,
            row.name,
          ]),
    )
    const userNames = new Map<string, string | null>()
    for (const userId of new Set(
      rows
        .map((row) => row.actualUserId)
        .filter((id): id is string => id !== null),
    )) {
      const names = await staffNames(this.authors, this.employees, {
        technicianUserId: null,
        currentSupervisorUserId: userId,
        scheduledSupervisorUserId: null,
      })
      userNames.set(userId, names.currentSupervisorName)
    }
    return rows.map(
      ({ classroomIds, gradeIds, actualUserId, eventId, ...summary }) => {
        const start = Date.parse(summary.startsAt)
        const end = Date.parse(summary.endsAt)
        const matching = (schedulesByEvent.get(eventId) ?? [])
          .filter(
            (row) =>
              classroomIds.has(row.classroomId) &&
              row.startsAt.getTime() >= start &&
              row.startsAt.getTime() < end,
          )
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
        const derived = (activitiesByEvent.get(eventId) ?? []).filter(
          (row) =>
            gradeIds.has(row.gradeId) &&
            row.startsAt.getTime() < end &&
            row.endsAt.getTime() > start,
        )
        const names = [
          ...matching.map((row) => row.subjectId),
          ...derived.map((row) => row.subjectId),
        ]
          .map((subjectId) => subjectName.get(subjectId))
          .filter((name): name is string => name !== undefined)
        return {
          ...summary,
          subjectNames: [...new Set(names)],
          supervisorName:
            actualUserId === null
              ? null
              : (userNames.get(actualUserId) ?? null),
        }
      },
    )
  }

  private async roomRows(
    user: RoomStaffUser,
    room: ExamRoom,
  ): Promise<SlotRow[]> {
    const [slots, seats] = await Promise.all([
      this.rooms.listSupervisors(room.id),
      this.rooms.listSeatsByRoom(room.id),
    ])
    const classroomIds = new Set(seats.map((seat) => seat.classroomId))
    const classrooms = await this.academic.classroomsByIds([...classroomIds])
    const gradeIds = new Set(classrooms.map((row) => row.gradeId))
    const visible = this.visibleSlots(user, room, slots)
    return Promise.all(
      visible.map(async (slot) => {
        const report = await this.rooms.findReportBySlot(room.id, slot.id)
        return {
          roomId: room.id,
          roomCode: room.code,
          roomName: room.name,
          slotId: slot.id,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
          status: report?.status ?? 'DRAFT',
          registeredCount: seats.length,
          reportId: report?.id ?? null,
          hasAttachment: report?.attachment != null,
          attachmentName: report?.attachment?.originalName ?? null,
          subjectNames: [],
          supervisorName: null,
          classroomIds,
          gradeIds,
          actualUserId: slot.actualUserId,
          eventId: room.eventId,
        }
      }),
    )
  }

  private visibleSlots(
    user: RoomStaffUser,
    room: ExamRoom,
    slots: ExamRoomSupervisor[],
  ): ExamRoomSupervisor[] {
    const everySlot =
      user.permissions?.includes(MANAGE_ALL) === true ||
      user.permissions?.includes(READ_ALL) === true ||
      (user.permissions?.includes(TECHNICIAN) === true &&
        room.technicianUserId === user.id)
    return [...slots]
      .filter(
        (slot) =>
          everySlot ||
          slot.actualUserId === user.id ||
          slot.scheduledUserId === user.id,
      )
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
  }
}
