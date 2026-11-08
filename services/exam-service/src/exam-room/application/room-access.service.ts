import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ExamRoom } from '../domain/entities/exam-room.entity.js'
import type { ExamRoomSupervisor } from '../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../domain/repositories/exam-room.repository.js'

export const MANAGE_ALL = 'exam-rooms.manage-all'
export const SUPERVISE = 'exam-rooms.supervise'
export const TECHNICIAN = 'exam-rooms.technician'

export interface RoomStaffUser {
  id: string
  permissions?: string[]
}

function denied(): ForbiddenException {
  return new ForbiddenException({
    code: 'ROOM_FORBIDDEN',
    message: 'Anda tidak berwenang pada ruangan ini',
  })
}

@Injectable()
export class RoomAccessService {
  constructor(private readonly rooms: IExamRoomRepository) {}

  async assertCanSupervise(
    user: RoomStaffUser,
    roomId: string,
    now: Date,
  ): Promise<ExamRoom> {
    const room = await this.loadRoom(roomId)
    if (user.permissions?.includes(MANAGE_ALL)) return room
    if (!user.permissions?.includes(SUPERVISE)) throw denied()
    const slot = await this.rooms.findSupervisorSlotForUser(
      roomId,
      user.id,
      now,
    )
    if (slot === null) throw denied()
    return room
  }

  async assertCanView(user: RoomStaffUser, roomId: string): Promise<ExamRoom> {
    const room = await this.loadRoom(roomId)
    if (user.permissions?.includes(MANAGE_ALL)) return room
    if (this.runsRoom(user, room)) return room
    if (!user.permissions?.includes(SUPERVISE)) throw denied()
    if ((await this.ownSlots(user, roomId)).length === 0) throw denied()
    return room
  }

  async assertCanViewSlot(
    user: RoomStaffUser,
    roomId: string,
    slot: ExamRoomSupervisor,
  ): Promise<ExamRoom> {
    const room = await this.assertCanView(user, roomId)
    if (user.permissions?.includes(MANAGE_ALL) || this.runsRoom(user, room)) {
      return room
    }
    if (slot.actualUserId !== user.id && slot.scheduledUserId !== user.id) {
      throw denied()
    }
    return room
  }

  async assertCanWriteSlot(
    user: RoomStaffUser,
    roomId: string,
    slot: ExamRoomSupervisor,
    now: Date,
  ): Promise<ExamRoom> {
    const room = await this.loadRoom(roomId)
    if (user.permissions?.includes(MANAGE_ALL)) return room
    if (this.runsRoom(user, room)) return room
    if (!user.permissions?.includes(SUPERVISE)) throw denied()
    const onDuty = await this.rooms.findSupervisorSlotForUser(
      roomId,
      user.id,
      now,
    )
    const owns =
      slot.actualUserId === user.id || slot.scheduledUserId === user.id
    if (onDuty?.id !== slot.id && !owns) throw denied()
    return room
  }

  async assertCanActAsTechnician(
    user: RoomStaffUser,
    roomId: string,
  ): Promise<ExamRoom> {
    const room = await this.loadRoom(roomId)
    if (user.permissions?.includes(MANAGE_ALL)) return room
    if (!user.permissions?.includes(TECHNICIAN)) throw denied()
    if (room.technicianUserId !== user.id) throw denied()
    return room
  }

  async assertCanRelease(
    user: RoomStaffUser,
    roomId: string,
    now: Date,
  ): Promise<ExamRoom> {
    if (user.permissions?.includes(MANAGE_ALL)) return this.loadRoom(roomId)
    const room = await this.loadRoom(roomId)
    if (this.runsRoom(user, room)) return room
    if (!user.permissions?.includes(SUPERVISE)) throw denied()
    const slot = await this.rooms.findSupervisorSlotForUser(
      roomId,
      user.id,
      now,
    )
    if (slot === null) throw denied()
    return room
  }

  assertCanActWithoutRoom(user: RoomStaffUser): Promise<void> {
    if (
      !user.permissions?.includes(MANAGE_ALL) &&
      !user.permissions?.includes(SUPERVISE)
    ) {
      return Promise.reject(denied())
    }
    return Promise.resolve()
  }

  private runsRoom(user: RoomStaffUser, room: ExamRoom): boolean {
    return (
      user.permissions?.includes(TECHNICIAN) === true &&
      room.technicianUserId === user.id
    )
  }

  private async ownSlots(
    user: RoomStaffUser,
    roomId: string,
  ): Promise<ExamRoomSupervisor[]> {
    const slots = await this.rooms.listSupervisors(roomId)
    return slots.filter(
      (slot) =>
        slot.actualUserId === user.id || slot.scheduledUserId === user.id,
    )
  }

  private async loadRoom(roomId: string): Promise<ExamRoom> {
    const room = await this.rooms.findRoomById(roomId)
    if (room === null) {
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    }
    return room
  }
}
