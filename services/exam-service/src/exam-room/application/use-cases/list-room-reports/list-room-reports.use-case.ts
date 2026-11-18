import { Injectable } from '@nestjs/common'
import type { ExamRoom } from '../../../domain/entities/exam-room.entity.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import {
  MANAGE_ALL,
  TECHNICIAN,
  type RoomStaffUser,
} from '../../room-access.service.js'
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
}

@Injectable()
export class ListRoomReportsUseCase {
  constructor(private readonly rooms: IExamRoomRepository) {}

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
    return rows.flat()
  }

  private async roomRows(
    user: RoomStaffUser,
    room: ExamRoom,
  ): Promise<RoomReportSummary[]> {
    const [slots, seats] = await Promise.all([
      this.rooms.listSupervisors(room.id),
      this.rooms.listSeatsByRoom(room.id),
    ])
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
