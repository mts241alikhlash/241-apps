import { Injectable } from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import {
  MAX_TOTAL_EXTRA_MINUTES,
  shiftBy,
} from '../extend-session-time/extend-session-time.use-case.js'
import {
  SessionAccessService,
  type SessionActor,
} from '../../session-access.service.js'

export const CALL_SUSPENSION_REASONS = ['CALL'] as const

export type CallSuspensionReason = (typeof CALL_SUSPENSION_REASONS)[number]

export const MIN_SUSPENSION_SECONDS = 1
export const MAX_SUSPENSION_SECONDS = 900

const SECONDS_PER_MINUTE = 60

export interface CallSuspensionInput {
  reason: CallSuspensionReason
  seconds: number
  clientId: string
}

export interface CallSuspensionWindow {
  deadline: Date
  finalizeAt: Date
  extraMinutes: number
  suspendedSeconds: number
}

@Injectable()
export class SuspendSessionUseCase {
  constructor(
    private readonly access: SessionAccessService,
    private readonly sessions: IExamSessionRepository,
    private readonly rooms: IExamRoomRepository,
  ) {}

  async execute(
    actor: SessionActor,
    sessionId: string,
    input: CallSuspensionInput,
    now: Date = new Date(),
  ): Promise<CallSuspensionWindow> {
    const session = await this.access.loadOwned(actor, sessionId, now)
    if (session.status !== 'IN_PROGRESS') {
      throw new ApiConflictException(
        'WINDOW_CLOSED',
        'Sesi ujian tidak sedang berjalan',
      )
    }

    const reported = (await this.rooms.listSessionEvents(session.id)).some(
      (row) => row.clientId === input.clientId,
    )
    if (reported) {
      return {
        deadline: session.deadline,
        finalizeAt: session.finalizeAt,
        extraMinutes: 0,
        suspendedSeconds: input.seconds,
      }
    }

    await this.rooms.recordSessionEvents(session.id, [
      {
        clientId: input.clientId,
        type: 'CALL_SUSPENDED',
        isViolation: false,
        detail: `Ujian dijeda karena panggilan (${input.seconds} detik)`,
        occurredAt: now,
      },
    ])

    const allowance = Math.max(
      0,
      MAX_TOTAL_EXTRA_MINUTES - session.extraMinutes,
    )
    const minutes = Math.min(
      Math.ceil(input.seconds / SECONDS_PER_MINUTE),
      allowance,
    )
    if (minutes === 0) {
      return {
        deadline: session.deadline,
        finalizeAt: session.finalizeAt,
        extraMinutes: 0,
        suspendedSeconds: input.seconds,
      }
    }

    const patched =
      (await this.sessions.applyRecovery(
        session.id,
        shiftBy(session, minutes),
      )) ?? session
    return {
      deadline: patched.deadline,
      finalizeAt: patched.finalizeAt,
      extraMinutes: minutes,
      suspendedSeconds: input.seconds,
    }
  }
}
