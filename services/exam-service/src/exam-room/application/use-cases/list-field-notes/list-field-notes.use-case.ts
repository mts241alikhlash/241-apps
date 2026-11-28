import { Injectable } from '@nestjs/common'
import { IStudentDirectoryPort } from '../../../../platform/student-directory/student-directory.port.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { visibleRooms } from '../../room-visibility.js'

export interface RoomFieldNoteRow {
  id: string
  roomId: string
  roomName: string
  slotId: string
  studentId: string
  studentName: string | null
  sessionId: string | null
  category: string
  note: string
  recordedAt: Date
}

@Injectable()
export class ListFieldNotesUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly students: IStudentDirectoryPort,
  ) {}

  async execute(
    user: RoomStaffUser,
    query: { slotIds?: string[] },
    now: Date = new Date(),
  ): Promise<RoomFieldNoteRow[]> {
    const visible = new Map(
      (await visibleRooms(this.rooms, user)).map((room) => [room.id, room]),
    )
    if (visible.size === 0) return []

    const slotIds =
      query.slotIds ??
      (await this.rooms.listSupervisorsAt([...visible.keys()], now)).map(
        (slot) => slot.id,
      )
    const rows = (await this.rooms.listFieldNotesForSlots(slotIds)).filter(
      (row) => visible.has(row.roomId),
    )
    if (rows.length === 0) return []

    const refs = new Map(
      (
        await this.students.refsByIds([
          ...new Set(rows.map((row) => row.studentId)),
        ])
      ).map((ref) => [ref.id, ref]),
    )
    return rows.map((row) => ({
      id: row.id,
      roomId: row.roomId,
      roomName: visible.get(row.roomId)!.name,
      slotId: row.supervisorSlotId,
      studentId: row.studentId,
      studentName: refs.get(row.studentId)?.name ?? null,
      sessionId: row.sessionId,
      category: row.category,
      note: row.note,
      recordedAt: row.createdAt,
    }))
  }
}
