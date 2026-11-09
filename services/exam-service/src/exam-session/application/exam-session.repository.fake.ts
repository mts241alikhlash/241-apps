import { randomUUID } from 'node:crypto'
import type { FakeExamScheduleRepository } from '../../exam-schedule/application/exam-schedule.repository.fake.js'
import type { ExamSessionAuditLog } from '../../exam-room/domain/entities/exam-session-audit-log.entity.js'
import type {
  ExamAnswerRecord,
  ExamSession,
  ExamSessionStatus,
} from '../domain/entities/exam-session.entity.js'
import {
  IExamSessionRepository,
  type GradeAnswerInput,
  type GradeRecompute,
  type NewExamSession,
  type SaveAnswerBatchItem,
  type SaveAnswerInput,
  type ScheduleSessionCounts,
  type SessionClosure,
  type SessionCloseAudit,
  type SessionRecoveryPatch,
  type SessionTelemetryUpdate,
  type SkippedAnswerBatchItem,
} from '../domain/repositories/exam-session.repository.js'

export class FakeExamSessionRepository extends IExamSessionRepository {
  readonly sessions = new Map<string, ExamSession>()
  readonly auditLogs: ExamSessionAuditLog[] = []
  auditFailure: Error | null = null

  private readonly schedules: FakeExamScheduleRepository | undefined

  constructor(schedules?: FakeExamScheduleRepository) {
    super()
    this.schedules = schedules
  }

  findById(id: string) {
    return Promise.resolve(this.sessions.get(id) ?? null)
  }

  findByScheduleAndStudent(scheduleId: string, studentId: string) {
    const found = [...this.sessions.values()].find(
      (session) =>
        session.scheduleId === scheduleId && session.studentId === studentId,
    )
    return Promise.resolve(found ?? null)
  }

  createInitial(input: NewExamSession) {
    const existing = [...this.sessions.values()].find(
      (session) =>
        session.scheduleId === input.scheduleId &&
        session.studentId === input.studentId,
    )
    if (existing) return Promise.resolve(null)
    const now = new Date()
    const session: ExamSession = {
      id: randomUUID(),
      ...input,
      status: 'IN_PROGRESS',
      submittedAt: null,
      rawScore: null,
      maxScore: null,
      releasedAt: null,
      releasedById: null,
      gradedAt: null,
      violationCount: 0,
      lastSeenAt: null,
      absentSince: null,
      lastSnapshotAt: null,
      snapshotCount: 0,
      cameraBlocked: null,
      roomId: input.roomId ?? null,
      seatNumber: input.seatNumber ?? null,
      requiresTokenReentry: false,
      lockedByViolation: false,
      allowWebClient: input.allowWebClient ?? false,
      allowLateEntry: input.allowLateEntry ?? false,
      extraMinutes: 0,
      kioskMode: 'PINNED',
      syncedAnswerCount: 0,
      unsyncedCount: 0,
      lastBatteryLevel: null,
      isCharging: null,
      dndGranted: null,
      lockTaskActive: null,
      batteryUnrestricted: null,
      createdAt: now,
      updatedAt: now,
    }
    this.sessions.set(session.id, session)
    return Promise.resolve(session)
  }

  bindDevice(id: string, deviceId: string) {
    const session = this.sessions.get(id)
    if (!session) return Promise.resolve(null)
    const updated = { ...session, deviceId }
    this.sessions.set(id, updated)
    return Promise.resolve(updated)
  }

  readonly answers = new Map<string, ExamAnswerRecord>()
  readonly publications = new Map<string, 'PENDING' | 'SENT'>()

  findAnswerByClientId(sessionId: string, clientId: string) {
    const found = [...this.answers.values()].find(
      (answer) =>
        answer.sessionId === sessionId && answer.clientId === clientId,
    )
    return Promise.resolve(found ?? null)
  }

  upsertAnswer(input: SaveAnswerInput) {
    if (this.sessions.get(input.sessionId)?.status !== 'IN_PROGRESS') {
      return Promise.resolve(null)
    }
    const holder = [...this.answers.values()].find(
      (answer) =>
        answer.sessionId === input.sessionId &&
        answer.clientId === input.clientId,
    )
    if (holder !== undefined && holder.questionId !== input.questionId) {
      return Promise.resolve(holder)
    }
    return Promise.resolve(this.storeAnswer(input))
  }

  private storeAnswer(
    input: SaveAnswerInput,
    now: Date = new Date(),
  ): ExamAnswerRecord | null {
    const holder = [...this.answers.values()].find(
      (answer) =>
        answer.sessionId === input.sessionId &&
        answer.clientId === input.clientId,
    )
    if (holder !== undefined && holder.questionId !== input.questionId) {
      return null
    }
    const existing = [...this.answers.values()].find(
      (answer) =>
        answer.sessionId === input.sessionId &&
        answer.questionId === input.questionId,
    )
    const record: ExamAnswerRecord = {
      id: existing?.id ?? randomUUID(),
      score: null,
      gradedById: null,
      gradedAt: null,
      gradeNote: null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...input,
    }
    this.answers.set(record.id, record)
    return record
  }

  saveAnswersBatch(
    sessionId: string,
    items: SaveAnswerBatchItem[],
    telemetry: SessionTelemetryUpdate,
  ) {
    const session = this.sessions.get(sessionId)
    const confirmed = () =>
      [...this.answers.values()].filter(
        (answer) => answer.sessionId === sessionId,
      )
    if (session?.status !== 'IN_PROGRESS') {
      return Promise.resolve({
        saved: [],
        skipped: [],
        totalConfirmedCount: confirmed().length,
      })
    }

    const latest = new Map<string, SaveAnswerBatchItem>()
    for (const item of items) latest.set(item.questionId, item)

    const skipped: SkippedAnswerBatchItem[] = []
    const saved = [...latest.values()]
      .map((item) => {
        const answer = this.storeAnswer({ sessionId, ...item }, telemetry.now)
        if (answer === null) {
          skipped.push({ questionId: item.questionId, clientId: item.clientId })
        }
        return answer
      })
      .filter((answer): answer is ExamAnswerRecord => answer !== null)
    const total = confirmed().length
    this.sessions.set(sessionId, {
      ...session,
      syncedAnswerCount: total,
      unsyncedCount: telemetry.unsyncedCount ?? session.unsyncedCount,
      lastBatteryLevel:
        telemetry.batteryLevel === undefined
          ? session.lastBatteryLevel
          : telemetry.batteryLevel,
      isCharging:
        telemetry.isCharging === undefined
          ? session.isCharging
          : telemetry.isCharging,
      dndGranted:
        telemetry.dndGranted === undefined
          ? session.dndGranted
          : telemetry.dndGranted,
      lockTaskActive:
        telemetry.lockTaskActive === undefined
          ? session.lockTaskActive
          : telemetry.lockTaskActive,
      batteryUnrestricted:
        telemetry.batteryUnrestricted === undefined
          ? session.batteryUnrestricted
          : telemetry.batteryUnrestricted,
      lastSeenAt: telemetry.now,
      absentSince: session.absentSince,
      updatedAt: telemetry.now,
    })
    return Promise.resolve({
      saved,
      skipped,
      totalConfirmedCount: total,
    })
  }

  close(
    id: string,
    build: (answers: ExamAnswerRecord[]) => SessionClosure,
    audit?: SessionCloseAudit,
  ) {
    const session = this.sessions.get(id)
    if (session?.status !== 'IN_PROGRESS') return Promise.resolve(null)
    if (audit !== undefined && this.auditFailure !== null) {
      return Promise.reject(this.auditFailure)
    }
    const closure = build(
      [...this.answers.values()].filter((answer) => answer.sessionId === id),
    )
    const closed: ExamSession = {
      ...session,
      status: closure.status,
      submittedAt: closure.submittedAt,
      gradedAt: closure.gradedAt,
      rawScore: closure.rawScore,
      maxScore: closure.maxScore,
    }
    this.sessions.set(id, closed)
    if (audit !== undefined) {
      this.auditLogs.push({
        id: randomUUID(),
        sessionId: id,
        roomId: session.roomId,
        scheduleId: session.scheduleId,
        action: audit.action,
        actorId: audit.actorId,
        reason: audit.reason,
        metadata: audit.metadata ?? {},
        createdAt: new Date(),
      })
    }
    if (closure.status === 'GRADED' && closure.publish !== false) {
      this.publications.set(id, 'PENDING')
    }
    for (const { answerId, score } of closure.scores) {
      const answer = this.answers.get(answerId)
      if (answer) this.answers.set(answerId, { ...answer, score })
    }
    return Promise.resolve(closed)
  }

  applyGrade(
    input: GradeAnswerInput,
    recompute: (answers: ExamAnswerRecord[]) => GradeRecompute,
  ) {
    const session = this.sessions.get(input.sessionId)
    const existing = [...this.answers.values()].find(
      (row) =>
        row.sessionId === input.sessionId &&
        row.questionId === input.questionId,
    )
    if (!session || !existing) return Promise.resolve(null)

    const answer: ExamAnswerRecord = {
      ...existing,
      score: input.score,
      gradeNote: input.note,
      gradedById: input.gradedById,
      gradedAt: input.at,
    }
    this.answers.set(answer.id, answer)

    const result = recompute(
      [...this.answers.values()].filter((row) => row.sessionId === session.id),
    )
    const graded = result.pendingManual === 0
    const updated: ExamSession = {
      ...session,
      rawScore: result.rawScore,
      maxScore: result.maxScore,
      status: graded ? 'GRADED' : session.status,
      gradedAt: graded ? input.at : null,
    }
    this.sessions.set(session.id, updated)
    if (graded) this.publications.set(session.id, 'PENDING')
    return Promise.resolve({ answer, session: updated })
  }

  findDueIds(now: Date, limit: number, excludeIds: string[]) {
    return Promise.resolve(
      [...this.sessions.values()]
        .filter(
          (session) =>
            session.status === 'IN_PROGRESS' &&
            !excludeIds.includes(session.id) &&
            session.finalizeAt.getTime() <= now.getTime(),
        )
        .slice(0, limit)
        .map((session) => session.id),
    )
  }

  async findInProgressIdsByActivity(activityId: string) {
    const ids: string[] = []
    for (const session of this.sessions.values()) {
      if (session.status !== 'IN_PROGRESS') continue
      const schedule = await this.schedules?.findById(session.scheduleId)
      const owner =
        schedule?.activityId == null && schedule?.makeupOfId != null
          ? await this.schedules?.findById(schedule.makeupOfId)
          : schedule
      if (owner?.activityId === activityId) ids.push(session.id)
    }
    return ids
  }

  recordViolations(id: string, count: number) {
    const session = this.sessions.get(id)
    if (session?.status === 'IN_PROGRESS' && session.violationCount < count) {
      this.sessions.set(id, { ...session, violationCount: count })
    }
    return Promise.resolve()
  }

  recordSnapshot(id: string, at: Date) {
    const session = this.sessions.get(id)
    if (session?.status === 'IN_PROGRESS') {
      this.sessions.set(id, {
        ...session,
        lastSeenAt: at,
        absentSince: session.absentSince,
        lastSnapshotAt: at,
        cameraBlocked: null,
        snapshotCount: session.snapshotCount + 1,
      })
    }
    return Promise.resolve()
  }

  clearLastSnapshotAt(ids: string[]) {
    for (const id of ids) {
      const session = this.sessions.get(id)
      if (session) this.sessions.set(id, { ...session, lastSnapshotAt: null })
    }
    return Promise.resolve()
  }

  setCameraBlocked(id: string, reason: string) {
    const session = this.sessions.get(id)
    if (session?.status === 'IN_PROGRESS' && session.cameraBlocked === null) {
      this.sessions.set(id, { ...session, cameraBlocked: reason })
    }
    return Promise.resolve()
  }

  countsBySchedule(scheduleIds: string[]) {
    const counts = new Map<string, ScheduleSessionCounts>()
    for (const session of this.sessions.values()) {
      if (!scheduleIds.includes(session.scheduleId)) continue
      const entry = counts.get(session.scheduleId) ?? {
        sessions: 0,
        awaitingGrading: 0,
        graded: 0,
      }
      entry.sessions += 1
      if (session.status === 'GRADED') entry.graded += 1
      if (session.status === 'SUBMITTED' || session.status === 'EXPIRED') {
        entry.awaitingGrading += 1
      }
      counts.set(session.scheduleId, entry)
    }
    return Promise.resolve(counts)
  }

  publicationStatuses(sessionIds: string[]) {
    return Promise.resolve(
      new Map([...this.publications].filter(([id]) => sessionIds.includes(id))),
    )
  }

  findPageBySchedule(
    scheduleId: string,
    page: number,
    limit: number,
    status?: ExamSessionStatus,
  ) {
    const rows = [...this.sessions.values()]
      .filter((session) => session.scheduleId === scheduleId)
      .filter((session) => !status || session.status === status)
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    return Promise.resolve({
      data: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
    })
  }

  countAnswers(sessionId: string) {
    return Promise.resolve(
      [...this.answers.values()].filter(
        (answer) => answer.sessionId === sessionId,
      ).length,
    )
  }

  listAnswers(sessionId: string) {
    return Promise.resolve(
      [...this.answers.values()].filter(
        (answer) => answer.sessionId === sessionId,
      ),
    )
  }

  listByStudentAndSchedules(studentId: string, scheduleIds: string[]) {
    return Promise.resolve(
      [...this.sessions.values()].filter(
        (session) =>
          session.studentId === studentId &&
          scheduleIds.includes(session.scheduleId),
      ),
    )
  }

  applyRecovery(id: string, patch: SessionRecoveryPatch) {
    const session = this.sessions.get(id)
    if (!session) return Promise.resolve(null)
    const updated: ExamSession = {
      ...session,
      ...patch,
      updatedAt: new Date(),
    }
    this.sessions.set(id, updated)
    return Promise.resolve(updated)
  }

  seatSession(id: string, roomId: string, seatNumber: number) {
    const session = this.sessions.get(id)
    if (!session) return Promise.resolve(null)
    const updated: ExamSession = {
      ...session,
      roomId,
      seatNumber,
      updatedAt: new Date(),
    }
    this.sessions.set(id, updated)
    return Promise.resolve(updated)
  }

  listByRoom(roomId: string) {
    return Promise.resolve(
      [...this.sessions.values()]
        .filter((session) => session.roomId === roomId)
        .sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)),
    )
  }

  listByScheduleStatuses(scheduleId: string, statuses: ExamSessionStatus[]) {
    return Promise.resolve(
      [...this.sessions.values()].filter(
        (session) =>
          session.scheduleId === scheduleId &&
          statuses.includes(session.status),
      ),
    )
  }
}
