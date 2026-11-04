import { Injectable, NotFoundException } from '@nestjs/common'
import type { ExamSession } from '../../../../exam-session/domain/entities/exam-session.entity.js'
import { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import { IExamRoomRepository } from '../../../domain/repositories/exam-room.repository.js'
import {
  RoomAccessService,
  type RoomStaffUser,
} from '../../room-access.service.js'

export type TimelineKind = 'EVENT' | 'AUDIT'

export interface SessionTimelineEntry {
  id: string
  kind: TimelineKind
  occurredAt: string
  type: string | null
  action: string | null
  isViolation: boolean
  detail: string | null
  actorId: string | null
  reason: string | null
  metadata: Record<string, unknown>
}

@Injectable()
export class GetSessionTimelineUseCase {
  constructor(
    private readonly rooms: IExamRoomRepository,
    private readonly sessions: IExamSessionRepository,
    private readonly access: RoomAccessService,
  ) {}

  async execute(
    user: RoomStaffUser,
    sessionId: string,
  ): Promise<SessionTimelineEntry[]> {
    const session = await this.sessions.findById(sessionId)
    if (session === null) {
      throw new NotFoundException('Sesi ujian tidak ditemukan')
    }
    await this.authorize(user, session)
    const [events, audits] = await Promise.all([
      this.rooms.listSessionEvents(sessionId),
      this.rooms.listAuditLogs(sessionId),
    ])
    const rows: SessionTimelineEntry[] = [
      ...events.map((event) => ({
        id: event.id,
        kind: 'EVENT' as const,
        occurredAt: event.occurredAt.toISOString(),
        type: event.type,
        action: null,
        isViolation: event.isViolation,
        detail: event.detail,
        actorId: null,
        reason: null,
        metadata: {},
      })),
      ...audits.map((audit) => ({
        id: audit.id,
        kind: 'AUDIT' as const,
        occurredAt: audit.createdAt.toISOString(),
        type: null,
        action: audit.action,
        isViolation: false,
        detail: null,
        actorId: audit.actorId,
        reason: audit.reason,
        metadata: audit.metadata,
      })),
    ]
    return rows.sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) || a.id.localeCompare(b.id),
    )
  }

  private async authorize(
    user: RoomStaffUser,
    session: ExamSession,
  ): Promise<void> {
    if (session.roomId === null) {
      await this.access.assertCanActWithoutRoom(user)
      return
    }
    await this.access.assertCanView(user, session.roomId)
  }
}
