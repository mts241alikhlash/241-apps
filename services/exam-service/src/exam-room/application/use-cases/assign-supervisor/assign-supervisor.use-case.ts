import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { RoomStaffUser } from '../../room-access.service.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'

export interface AssignSupervisorInput {
  roomId: string
  scheduledUserId: string
  startsAt: Date
  endsAt: Date
  reason: string
}

@Injectable()
export class AssignSupervisorUseCase {
  constructor(private readonly rooms: IExamRoomRepository) {}

  async execute(
    user: RoomStaffUser,
    input: AssignSupervisorInput,
  ): Promise<ExamRoomSupervisor> {
    const reason = assertRecoveryReason(input.reason)
    const room = await this.rooms.findRoomById(input.roomId)
    if (room === null) {
      throw new NotFoundException('Ruangan ujian tidak ditemukan')
    }
    if (input.startsAt.getTime() >= input.endsAt.getTime()) {
      throw new ConflictException(
        'Waktu mulai pengawas harus sebelum waktu selesai',
      )
    }
    const slot = await this.rooms.assignSupervisor({
      roomId: room.id,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      scheduledUserId: input.scheduledUserId,
    })
    await this.rooms.writeAuditLog({
      roomId: room.id,
      action: 'ASSIGN_SUPERVISOR',
      actorId: user.id,
      reason,
      metadata: {
        slotId: slot.id,
        scheduledUserId: input.scheduledUserId,
        startsAt: input.startsAt.toISOString(),
        endsAt: input.endsAt.toISOString(),
      },
    })
    return slot
  }
}
