import { codeScopeOf } from '../../../../exam-schedule/domain/policies/access-code-scope.policy.js'
import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { AccessCodeService } from '../../../../exam-schedule/application/access-code.service.js'
import { IExamScheduleRepository } from '../../../../exam-schedule/domain/repositories/exam-schedule.repository.js'
import {
  ApiConflictException,
  ApiNotFoundException,
} from '../../../../core/filters/api-exception.js'
import { RoomAccessCodeService } from '../../../../exam-room/application/room-access-code.service.js'
import { IExamRoomRepository } from '../../../../exam-room/domain/repositories/exam-room.repository.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import {
  assertWebClientAllowed,
  type ClientPlatform,
} from '../../../domain/policies/client-gate.policy.js'
import { ISessionFinalizer } from '../../../domain/repositories/session-finalizer.port.js'
import { IExamSessionRepository } from '../../../domain/repositories/exam-session.repository.js'
import { ABSENCE_LOCK_MS } from '../record-session-events/record-session-events.use-case.js'
import { LifecycleGate } from '../../lifecycle-gate.service.js'

export interface ResumeExamSessionInput {
  accessCode: string
  deviceId: string
  platform?: ClientPlatform
}

export interface ResumedSession {
  session: ExamSession
  serverTime: Date
}

@Injectable()
export class ResumeExamSessionUseCase {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly schedules: IExamScheduleRepository,
    private readonly rooms: IExamRoomRepository,
    private readonly codes: AccessCodeService,
    private readonly roomCodes: RoomAccessCodeService,
    private readonly finalizer: ISessionFinalizer,
    private readonly lifecycle: LifecycleGate,
  ) {}

  async execute(
    user: { id: string },
    sessionId: string,
    input: ResumeExamSessionInput,
    now: Date = new Date(),
  ): Promise<ResumedSession> {
    const found = await this.sessions.findById(sessionId)
    if (found?.userId !== user.id) {
      throw new ApiNotFoundException(
        'SESSION_LOST',
        'Sesi ujian tidak ditemukan',
      )
    }
    await this.lifecycle.assertOpen(found.scheduleId, now)
    const session = await this.finalizer.finalizeIfDue(found, now)
    if (session.lockedByViolation) {
      throw new ForbiddenException({
        code: 'SESSION_LOCKED_BY_VIOLATION',
        message: 'Sesi terkunci karena pelanggaran. Hubungi Teknisi Ruangan',
      })
    }
    if (
      session.absentSince !== null &&
      now.getTime() - session.absentSince.getTime() >= ABSENCE_LOCK_MS
    ) {
      await this.sessions.applyRecovery(session.id, { lockedByViolation: true })
      throw new ForbiddenException({
        code: 'SESSION_LOCKED_BY_ABSENCE',
        message:
          'Sesi terkunci karena meninggalkan ujian lebih dari 5 menit. Hubungi Teknisi Ruangan',
      })
    }
    if (session.status !== 'IN_PROGRESS') {
      throw new ConflictException('Sesi ujian sudah dikumpulkan')
    }
    if (session.deviceId !== null && session.deviceId !== input.deviceId) {
      throw new ApiConflictException(
        'REBIND',
        'Sesi aktif di perangkat lain. Minta pengawas melepas sesi',
      )
    }
    await this.assertClientGate(session, input.platform, now)
    if (!(await this.codeMatches(session, input.accessCode, now))) {
      throw new ForbiddenException({
        code: 'TOKEN_REENTRY_REQUIRED',
        message: 'Token ujian salah',
      })
    }

    const resumed = await this.sessions.applyRecovery(session.id, {
      requiresTokenReentry: false,
      absentSince: null,
      lastSeenAt: now,
    })
    return { session: resumed ?? session, serverTime: now }
  }

  private async assertClientGate(
    session: ExamSession,
    platform: ClientPlatform | undefined,
    now: Date,
  ): Promise<void> {
    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule?.eventId == null) return
    const event = await this.rooms.findEventById(schedule.eventId)
    if (event === null) return
    assertWebClientAllowed({
      platform: platform ?? 'native',
      requireAndroidApp: event.requireAndroidApp,
      allowWebClient: session.allowWebClient,
      now,
      eventStartsAt: event.startsAt,
      lateToleranceMinutes: event.lateToleranceMinutes,
      allowLateEntry: session.allowLateEntry,
      startedAt: session.startedAt,
    })
  }

  private async codeMatches(
    session: ExamSession,
    given: string,
    now: Date,
  ): Promise<boolean> {
    if (session.roomId !== null) {
      const room = await this.rooms.findRoomById(session.roomId)
      if (room !== null) {
        return this.roomCodes.matches(
          room.id,
          room.tokenRotation,
          given,
          now,
          true,
        )
      }
    }
    const schedule = await this.schedules.findById(session.scheduleId)
    if (schedule === null) {
      throw new ApiNotFoundException(
        'SCHEDULE_GONE',
        'Jadwal ujian tidak ditemukan',
      )
    }
    const codeScope = codeScopeOf(schedule, now)
    return this.codes.matches(
      codeScope.scope,
      codeScope.rotation,
      given,
      codeScope.at,
      codeScope.allowPreviousSlotGrace,
    )
  }
}
