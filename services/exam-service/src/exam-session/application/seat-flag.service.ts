import { Injectable, NotFoundException } from '@nestjs/common'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../exam-room/application/room-access.service.js'
import { IExamRoomRepository } from '../../exam-room/domain/repositories/exam-room.repository.js'
import type { SessionAuditAction } from '../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import { assertRecoveryReason } from '../domain/policies/recovery-reason.policy.js'
import { IExamSessionRepository } from '../domain/repositories/exam-session.repository.js'
import { ISessionRecoveryRepository } from '../domain/repositories/session-recovery.port.js'

export type SeatFlagAction = Extract<SessionAuditAction, 'ALLOW_LATE_ENTRY'>

export interface SeatFlagRequest {
  roomId: string
  studentId: string
  reason: string
}

export interface SeatFlagResult {
  studentId: string
  allowLateEntry: boolean
}

@Injectable()
export class SeatFlagService {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly recovery: ISessionRecoveryRepository,
    private readonly access: RoomAccessService,
  ) {}

  async allow(
    user: RoomStaffUser,
    action: SeatFlagAction,
    request: SeatFlagRequest,
  ): Promise<SeatFlagResult> {
    const reason = assertRecoveryReason(request.reason)
    const room = await this.access.assertCanActAsTechnician(
      user,
      request.roomId,
    )
    const seat = await this.rooms.findSeat(room.eventId, request.studentId)
    if (seat?.roomId !== room.id) {
      throw new NotFoundException('Siswa tidak terdaftar di ruangan ini')
    }
    const patch = { allowLateEntry: true }
    const session = (await this.sessions.listByRoom(room.id)).find(
      (row) => row.studentId === request.studentId,
    )
    if (session === undefined) {
      const flagged = await this.rooms.setSeatFlagsWithAudit(
        room.eventId,
        request.studentId,
        patch,
        {
          roomId: room.id,
          action,
          actorId: user.id,
          reason,
          metadata: {
            roomId: room.id,
            seatNumber: seat.seatNumber,
            sessionStarted: false,
          },
        },
      )
      return {
        studentId: request.studentId,
        allowLateEntry: flagged?.allowLateEntry ?? seat.allowLateEntry,
      }
    }
    await this.recovery.recoverOne(session.id, () => patch, {
      action,
      actorId: user.id,
      reason,
      metadata: { roomId: room.id, seatNumber: seat.seatNumber },
    })
    const flagged = await this.rooms.setSeatFlags(
      room.eventId,
      request.studentId,
      patch,
    )
    return {
      studentId: request.studentId,
      allowLateEntry: flagged?.allowLateEntry ?? seat.allowLateEntry,
    }
  }
}
