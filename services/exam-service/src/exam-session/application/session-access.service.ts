import { Injectable } from '@nestjs/common'
import {
  ApiConflictException,
  ApiForbiddenException,
  ApiNotFoundException,
} from '../../core/filters/api-exception.js'
import type { ExamSession } from '../domain/entities/exam-session.entity.js'
import { IExamSessionRepository } from '../domain/repositories/exam-session.repository.js'
import { ISessionFinalizer } from '../domain/repositories/session-finalizer.port.js'
import { LifecycleGate } from './lifecycle-gate.service.js'

export interface SessionActor {
  id: string
  deviceId: string
}

@Injectable()
export class SessionAccessService {
  constructor(
    private readonly sessions: IExamSessionRepository,
    private readonly finalizer: ISessionFinalizer,
    private readonly lifecycle: LifecycleGate,
  ) {}

  async loadOwned(
    actor: SessionActor,
    sessionId: string,
    now: Date,
  ): Promise<ExamSession> {
    const session = await this.sessions.findById(sessionId)
    if (session?.userId !== actor.id) {
      throw new ApiNotFoundException(
        'SESSION_LOST',
        'Sesi ujian tidak ditemukan',
      )
    }
    const current = await this.finalizer.finalizeIfDue(session, now)
    await this.lifecycle.assertOpen(current.scheduleId, now)
    if (
      current.status === 'IN_PROGRESS' &&
      current.deviceId !== actor.deviceId
    ) {
      throw new ApiConflictException(
        'SESSION_LOST',
        current.deviceId === null
          ? 'Sesi dilepas. Mulai ujian lagi'
          : 'Sesi aktif di perangkat lain. Minta pengawas melepas sesi',
      )
    }
    return current
  }

  async loadWritable(
    actor: SessionActor,
    sessionId: string,
    now: Date,
  ): Promise<ExamSession> {
    const session = await this.loadOwned(actor, sessionId, now)
    this.assertNotGated(session)
    return session
  }

  async loadReadable(
    actor: SessionActor,
    sessionId: string,
    now: Date,
  ): Promise<ExamSession> {
    const session = await this.loadWritable(actor, sessionId, now)
    if (now.getTime() >= session.finalizeAt.getTime()) {
      throw new ApiConflictException(
        'SESSION_LOST',
        'Waktu ujian sudah berakhir',
      )
    }
    return session
  }

  private assertNotGated(session: ExamSession): void {
    if (session.lockedByViolation) {
      throw new ApiForbiddenException(
        'SESSION_LOCKED_BY_VIOLATION',
        'Sesi terkunci karena pelanggaran. Hubungi Teknisi Ruangan',
      )
    }
    if (session.requiresTokenReentry) {
      throw new ApiForbiddenException(
        'TOKEN_REENTRY_REQUIRED',
        'Masukkan token ujian untuk melanjutkan',
      )
    }
  }
}
