import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICIES } from '../../../../exam-activity/domain/policies/exam-policy.policy.js'
import type { ExamSession } from '../../../domain/entities/exam-session.entity.js'
import { CheckAbsenceGapUseCase } from './check-absence-gap.use-case.js'

const now = new Date('2026-11-10T02:10:00Z')

function session(overrides: Partial<ExamSession> = {}): ExamSession {
  return {
    id: 'session-1',
    scheduleId: 'schedule-1',
    studentId: 'student-1',
    userId: 'user-1',
    deviceId: 'device-1',
    enrollmentId: 'enrollment-1',
    shuffleSeed: 'seed',
    startedAt: new Date('2026-11-10T01:00:00Z'),
    deadline: new Date('2026-11-10T03:00:00Z'),
    finalizeAt: new Date('2026-11-10T03:10:00Z'),
    status: 'IN_PROGRESS',
    submittedAt: null,
    rawScore: null,
    maxScore: null,
    releasedAt: null,
    releasedById: null,
    gradedAt: null,
    violationCount: 0,
    lastSeenAt: new Date('2026-11-10T02:09:30Z'),
    absentSince: null,
    lastSnapshotAt: null,
    snapshotCount: 0,
    cameraBlocked: null,
    roomId: null,
    seatNumber: null,
    requiresTokenReentry: false,
    lockedByViolation: false,
    allowWebClient: false,
    allowLateEntry: false,
    extraMinutes: 0,
    kioskMode: null,
    syncedAnswerCount: 0,
    unsyncedCount: 0,
    lastBatteryLevel: null,
    isCharging: null,
    policy: { ...DEFAULT_POLICIES.MIDTERM },
    ...overrides,
  } as ExamSession
}

class FakeSessions {
  patches: Record<string, unknown>[] = []

  applyRecovery(_id: string, patch: Record<string, unknown>) {
    this.patches.push(patch)
    return Promise.resolve(null)
  }
}

class FakeRooms {
  written: unknown[] = []
  existing: { type: string }[] = []

  listSessionEvents() {
    return Promise.resolve(this.existing)
  }

  recordSessionEvents(_sessionId: string, events: unknown[]) {
    this.written.push(...events)
    return Promise.resolve(events)
  }
}

const build = () => {
  const sessions = new FakeSessions()
  const rooms = new FakeRooms()
  const useCase = new CheckAbsenceGapUseCase(sessions as never, rooms as never)
  return { sessions, rooms, useCase }
}

describe('CheckAbsenceGapUseCase', () => {
  it('writes nothing when the gap is short', async () => {
    const { sessions, rooms, useCase } = build()
    await useCase.execute(session(), now)
    expect(rooms.written).toEqual([])
    expect(sessions.patches).toEqual([])
  })

  it('records a long gap and demands the token', async () => {
    const { sessions, rooms, useCase } = build()
    await useCase.execute(
      session({ lastSeenAt: new Date('2026-11-10T02:00:00Z') }),
      now,
    )

    expect(rooms.written).toHaveLength(1)
    expect(rooms.written[0]).toMatchObject({
      type: 'ABSENCE_GAP',
      isViolation: false,
      detail: 'Hilang 600 detik',
    })
    expect(sessions.patches[0]).toMatchObject({
      requiresTokenReentry: true,
      violationCount: 0,
    })
  })

  it('counts the second long gap as a violation', async () => {
    const { sessions, rooms, useCase } = build()
    rooms.existing = [{ type: 'ABSENCE_GAP' }]
    await useCase.execute(
      session({ lastSeenAt: new Date('2026-11-10T02:00:00Z') }),
      now,
    )

    expect(rooms.written[0]).toMatchObject({ isViolation: true })
    expect(sessions.patches[0]).toMatchObject({ violationCount: 1 })
  })

  it('ignores a session that already finished', async () => {
    const { rooms, useCase } = build()
    await useCase.execute(
      session({
        status: 'SUBMITTED',
        lastSeenAt: new Date('2026-11-10T02:00:00Z'),
      }),
      now,
    )
    expect(rooms.written).toEqual([])
  })
})
