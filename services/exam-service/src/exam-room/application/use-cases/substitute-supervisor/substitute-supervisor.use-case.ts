import { Injectable, NotFoundException } from '@nestjs/common'
import {
  MANAGE_ALL,
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'
import type { ExamRoomSupervisor } from '../../../domain/entities/exam-room-supervisor.entity.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import { assertRecoveryReason } from '../../../../exam-session/domain/policies/recovery-reason.policy.js'

export interface SubstituteSupervisorInput {
  roomId: string
  slotId: string
  actualUserId: string
  reason: string
}

@Injectable()
export class SubstituteSupervisorUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    input: SubstituteSupervisorInput,
    now: Date = new Date(),
  ): Promise<ExamRoomSupervisor> {
    const reason = assertRecoveryReason(input.reason)
    if (!user.permissions?.includes(MANAGE_ALL)) {
      await this.access.assertCanActAsTechnician(user, input.roomId)
    }
    const substituted = await this.rooms.substituteSupervisor({
      supervisorId: input.slotId,
      actualUserId: input.actualUserId,
      substitutedByAdminId: user.id,
      reason,
      at: now,
    })
    if (substituted?.roomId !== input.roomId) {
      throw new NotFoundException('Jadwal pengawas tidak ditemukan')
    }
    return substituted
  }
}
