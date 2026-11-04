import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  AutoDistributeInput,
  AutoDistributeResult,
  ExamRoomSeat,
} from '../../../domain/entities/exam-room-seat.entity.js'
import type { AssignSeatInput } from '../../../domain/repositories/exam-room.repository.js'
import type { ExamSessionAuditLog } from '../../../domain/entities/exam-session-audit-log.entity.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'
import type {
  ExamRoom,
  ExamRoomEdit,
  NewExamRoom,
} from '../../../domain/entities/exam-room.entity.js'
import {
  ExamRoomConflictError,
  SeatAlreadyTakenError,
} from '../../../domain/errors/exam-room.errors.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'

function conflictOf(error: unknown): never {
  if (
    error instanceof SeatAlreadyTakenError ||
    error instanceof ExamRoomConflictError
  ) {
    throw new ConflictException(error.message)
  }
  throw error
}

@Injectable()
export class ManageExamRoomsUseCase {
  constructor(private readonly rooms: IExamRoomRepository) {}

  create(input: NewExamRoom): Promise<ExamRoom> {
    return this.rooms.createRoom(input)
  }

  list(eventId: string): Promise<ExamRoom[]> {
    return this.rooms.listRoomsByEvent(eventId)
  }

  async update(id: string, edit: ExamRoomEdit): Promise<ExamRoom> {
    const updated = await this.rooms.updateRoom(id, edit)
    if (updated === null) {
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    }
    return updated
  }

  async rotateToken(
    id: string,
    actor: RoomStaffUser,
    reason: string,
  ): Promise<ExamRoom> {
    const trimmed = assertRecoveryReason(reason)
    const rotated = await this.rooms.rotateRoomToken(id, {
      roomId: id,
      action: 'ROTATE_ROOM_TOKEN',
      actorId: actor.id,
      reason: trimmed,
    })
    if (rotated === null) {
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    }
    return rotated
  }

  async assignSeat(input: AssignSeatInput): Promise<ExamRoomSeat> {
    try {
      return await this.rooms.assignSeat(input)
    } catch (error) {
      conflictOf(error)
    }
  }

  async assignSeats(inputs: AssignSeatInput[]): Promise<ExamRoomSeat[]> {
    await this.assertCapacity(inputs)
    try {
      return await this.rooms.assignSeats(inputs)
    } catch (error) {
      conflictOf(error)
    }
  }

  private async assertCapacity(inputs: AssignSeatInput[]): Promise<void> {
    const perRoom = new Map<string, number>()
    for (const input of inputs) {
      perRoom.set(input.roomId, (perRoom.get(input.roomId) ?? 0) + 1)
    }
    for (const [roomId, added] of perRoom) {
      const room = await this.rooms.findRoomById(roomId)
      if (room === null) {
        throw new NotFoundException('Ruangan ujian tidak ditemukan')
      }
      const taken = (await this.rooms.listSeatsByRoom(roomId)).length
      if (taken + added > room.capacity) {
        throw new ConflictException(
          `Kapasitas ${room.name} hanya ${room.capacity} kursi`,
        )
      }
    }
  }

  listAuditLogs(roomId: string): Promise<ExamSessionAuditLog[]> {
    return this.rooms.listAuditLogsByRoom(roomId)
  }

  listSeats(roomId: string): Promise<ExamRoomSeat[]> {
    return this.rooms.listSeatsByRoom(roomId)
  }

  async distribute(input: AutoDistributeInput): Promise<AutoDistributeResult> {
    return this.rooms.autoDistributeSeats(input)
  }

  async removeSeat(roomId: string, studentId: string): Promise<void> {
    const removed = await this.rooms.removeSeat(roomId, studentId)
    if (!removed) throw new NotFoundException('Kursi siswa tidak ditemukan')
  }
}
