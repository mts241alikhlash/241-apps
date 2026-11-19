import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import type { IExamRoomRepository } from '../domain/repositories/exam-room.repository.js'
import {
  MANAGE_ALL,
  SUPERVISE,
  TECHNICIAN,
  type RoomStaffUser,
} from './room-access.service.js'

export async function visibleRooms(
  rooms: IExamRoomRepository,
  user: RoomStaffUser,
): Promise<ExamRoom[]> {
  if (user.permissions?.includes(MANAGE_ALL)) {
    return rooms.listRoomsByEventStatus('ACTIVE')
  }
  const found = new Map<string, ExamRoom>()
  if (user.permissions?.includes(TECHNICIAN)) {
    for (const room of await rooms.listRoomsByTechnician(user.id)) {
      found.set(room.id, room)
    }
  }
  if (user.permissions?.includes(SUPERVISE)) {
    for (const room of await rooms.listRoomsSupervisedBy(user.id)) {
      found.set(room.id, room)
    }
  }
  return [...found.values()].sort(
    (a, b) =>
      a.eventId.localeCompare(b.eventId) || a.code.localeCompare(b.code),
  )
}
