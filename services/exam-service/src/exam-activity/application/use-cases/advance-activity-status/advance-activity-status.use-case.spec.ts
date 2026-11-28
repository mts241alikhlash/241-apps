import { Logger } from '@nestjs/common'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CloseActivitySessionsUseCase } from '../../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import type { IExamSessionRepository } from '../../../../exam-session/domain/repositories/exam-session.repository.js'
import type {
  ActivityStatus,
  ExamActivity,
} from '../../../domain/entities/exam-activity.entity.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { SYSTEM_ACTOR_ID } from '../../../domain/system-actor.js'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { AdvanceActivityStatusUseCase } from './advance-activity-status.use-case.js'

const STARTS = new Date('2026-11-10T01:00:00Z')
const ENDS = new Date('2026-11-10T03:00:00Z')
const minutes = (base: Date, value: number) =>
  new Date(base.getTime() + value * 60_000)

function activity(
  id: string,
  status: ActivityStatus,
  overrides: Partial<ExamActivity> = {},
): ExamActivity {
  return {
    id,
    semesterId: 'semester-1',
    eventId: null,
    gradeId: 'grade-1',
    subjectId: 'subject-1',
    packageId: 'package-1',
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: null,
    policy: {
      ...DEFAULT_POLICIES.DAILY,
      autoOpenLeadMinutes: 5,
      autoCloseGraceMinutes: 15,
    },
    startsAt: STARTS,
    endsAt: ENDS,
    durationMinutes: 90,
    status,
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
    ...overrides,
  }
}

function build(...activities: ExamActivity[]) {
  const repo = new FakeExamActivityRepository()
  for (const row of activities) repo.activities.set(row.id, row)
  const inProgress = new Map<string, string[]>()
  const sessions = {
    findInProgressIdsByActivity: (id: string) =>
      Promise.resolve(inProgress.get(id) ?? []),
  } as unknown as IExamSessionRepository
  const closeSessions = { execute: vi.fn().mockResolvedValue(0) }
  const useCase = new AdvanceActivityStatusUseCase(
    repo,
    sessions,
    closeSessions as unknown as CloseActivitySessionsUseCase,
  )
  return { repo, useCase, closeSessions, inProgress }
}

describe('AdvanceActivityStatusUseCase', () => {
  afterEach(() => vi.restoreAllMocks())

  it('opens a scheduled online activity at the lead and audits it', async () => {
    const { repo, useCase } = build(activity('a1', 'SCHEDULED'))

    const result = await useCase.execute(minutes(STARTS, -5))

    expect(result).toEqual({ opened: ['a1'], closed: [], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('ACTIVE')
    expect(repo.autoAudits).toEqual([
      {
        activityId: 'a1',
        actorId: SYSTEM_ACTOR_ID,
        before: 'SCHEDULED',
        after: 'ACTIVE',
        reason: 'AUTO_OPEN',
      },
    ])
  })

  it('does not open before the lead', async () => {
    const { repo, useCase } = build(activity('a1', 'SCHEDULED'))

    const result = await useCase.execute(minutes(STARTS, -6))

    expect(result).toEqual({ opened: [], closed: [], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('SCHEDULED')
  })

  it('does not open at or after endsAt', async () => {
    const { repo, useCase } = build(activity('a1', 'SCHEDULED'))

    const result = await useCase.execute(ENDS)

    expect(result.opened).toEqual([])
    expect(result.blocked).toEqual([])
    expect(repo.activities.get('a1')?.status).toBe('SCHEDULED')
  })

  it('reports blocked and keeps scheduled when there is no package', async () => {
    const { repo, useCase } = build(
      activity('a1', 'SCHEDULED', { packageId: null }),
    )

    const result = await useCase.execute(STARTS)

    expect(result).toEqual({ opened: [], closed: [], blocked: ['a1'] })
    expect(repo.activities.get('a1')?.status).toBe('SCHEDULED')
  })

  it('reports blocked when the package is not approved', async () => {
    const { repo, useCase } = build(activity('a1', 'SCHEDULED'))
    repo.packageStatuses.set('package-1', 'DRAFT')

    const result = await useCase.execute(STARTS)

    expect(result.blocked).toEqual(['a1'])
    expect(result.opened).toEqual([])
  })

  it('opens with a locked package', async () => {
    const { repo, useCase } = build(activity('a1', 'SCHEDULED'))
    repo.packageStatuses.set('package-1', 'LOCKED')

    const result = await useCase.execute(STARTS)

    expect(result.opened).toEqual(['a1'])
  })

  it('does not report blocked before the lead', async () => {
    const { useCase } = build(activity('a1', 'SCHEDULED', { packageId: null }))

    const result = await useCase.execute(minutes(STARTS, -30))

    expect(result.blocked).toEqual([])
  })

  it('skips activities with autoStatus off', async () => {
    const { repo, useCase } = build(
      activity('a1', 'SCHEDULED', { autoStatus: false }),
      activity('a2', 'ACTIVE', { autoStatus: false }),
    )

    const result = await useCase.execute(minutes(ENDS, 600))

    expect(result).toEqual({ opened: [], closed: [], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('SCHEDULED')
    expect(repo.activities.get('a2')?.status).toBe('ACTIVE')
  })

  it('never touches draft or closed activities', async () => {
    const { repo, useCase } = build(
      activity('a1', 'DRAFT'),
      activity('a2', 'CLOSED'),
    )

    const result = await useCase.execute(minutes(ENDS, 600))

    expect(result).toEqual({ opened: [], closed: [], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('DRAFT')
    expect(repo.activities.get('a2')?.status).toBe('CLOSED')
  })

  it('keeps an active activity open while a session is in progress past the grace', async () => {
    const { repo, useCase, inProgress, closeSessions } = build(
      activity('a1', 'ACTIVE'),
    )
    inProgress.set('a1', ['session-1'])

    const result = await useCase.execute(minutes(ENDS, 60))

    expect(result.closed).toEqual([])
    expect(repo.activities.get('a1')?.status).toBe('ACTIVE')
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('keeps an active activity open before the grace elapsed', async () => {
    const { repo, useCase } = build(activity('a1', 'ACTIVE'))

    const result = await useCase.execute(minutes(ENDS, 14))

    expect(result.closed).toEqual([])
    expect(repo.activities.get('a1')?.status).toBe('ACTIVE')
  })

  it('closes an active online activity after the grace with no sessions', async () => {
    const { repo, useCase, closeSessions } = build(activity('a1', 'ACTIVE'))

    const result = await useCase.execute(minutes(ENDS, 15))

    expect(result).toEqual({ opened: [], closed: ['a1'], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('CLOSED')
    expect(closeSessions.execute).toHaveBeenCalledWith('a1', SYSTEM_ACTOR_ID)
    expect(repo.autoAudits[0]).toMatchObject({
      actorId: SYSTEM_ACTOR_ID,
      before: 'ACTIVE',
      after: 'CLOSED',
      reason: 'AUTO_CLOSE',
    })
  })

  it('closes offline activities after the grace regardless of sessions', async () => {
    const offline = { deliveryMode: 'OFFLINE' as const, packageId: null }
    const { repo, useCase, inProgress, closeSessions } = build(
      activity('a1', 'SCHEDULED', offline),
      activity('a2', 'ACTIVE', offline),
    )
    inProgress.set('a2', ['session-1'])

    const early = await useCase.execute(minutes(ENDS, 14))
    const result = await useCase.execute(minutes(ENDS, 15))

    expect(early.closed).toEqual([])
    expect(result.closed.sort()).toEqual(['a1', 'a2'])
    expect(result.blocked).toEqual([])
    expect(repo.activities.get('a1')?.status).toBe('CLOSED')
    expect(repo.activities.get('a2')?.status).toBe('CLOSED')
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('closes a never-opened online activity after the grace without closing sessions', async () => {
    const { repo, useCase, closeSessions } = build(
      activity('a1', 'SCHEDULED'),
      activity('a2', 'SCHEDULED', { packageId: null }),
      activity('a3', 'SCHEDULED', { autoStatus: false }),
    )

    const early = await useCase.execute(minutes(ENDS, 14))
    const result = await useCase.execute(minutes(ENDS, 15))

    expect(early.closed).toEqual([])
    expect(early.blocked).toEqual([])
    expect(result.closed.sort()).toEqual(['a1', 'a2'])
    expect(result.blocked).toEqual([])
    expect(repo.activities.get('a3')?.status).toBe('SCHEDULED')
    expect(repo.autoAudits[0]).toMatchObject({
      before: 'SCHEDULED',
      after: 'CLOSED',
      reason: 'AUTO_CLOSE',
    })
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('does not open offline activities', async () => {
    const { repo, useCase } = build(
      activity('a1', 'SCHEDULED', {
        deliveryMode: 'OFFLINE',
        packageId: null,
      }),
    )

    const result = await useCase.execute(STARTS)

    expect(result).toEqual({ opened: [], closed: [], blocked: [] })
    expect(repo.activities.get('a1')?.status).toBe('SCHEDULED')
  })

  it('uses the per-activity policy lead', async () => {
    const { useCase } = build(
      activity('a1', 'SCHEDULED', {
        policy: {
          ...DEFAULT_POLICIES.DAILY,
          autoOpenLeadMinutes: 30,
          autoCloseGraceMinutes: 0,
        },
      }),
    )

    const result = await useCase.execute(minutes(STARTS, -30))

    expect(result.opened).toEqual(['a1'])
  })

  it('continues when one activity fails and logs the id', async () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined)
    const { repo, useCase } = build(
      activity('a1', 'SCHEDULED'),
      activity('a2', 'SCHEDULED'),
    )
    const original = repo.updateStatusIf.bind(repo)
    vi.spyOn(repo, 'updateStatusIf').mockImplementation(
      (id, expected, next, actorId, reason) =>
        id === 'a1'
          ? Promise.reject(new Error('boom'))
          : original(id, expected, next, actorId, reason),
    )

    const result = await useCase.execute(STARTS)

    expect(result.opened).toEqual(['a2'])
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('a1'),
      expect.anything(),
    )
  })

  it('changes an activity once when two runs overlap', async () => {
    const { repo, useCase, closeSessions } = build(
      activity('a1', 'SCHEDULED'),
      activity('a2', 'ACTIVE', {
        startsAt: minutes(STARTS, -600),
        endsAt: minutes(ENDS, -600),
      }),
    )

    const [first, second] = await Promise.all([
      useCase.execute(STARTS),
      useCase.execute(STARTS),
    ])

    expect(first.opened.length + second.opened.length).toBe(1)
    expect(first.closed.length + second.closed.length).toBe(1)
    expect(repo.autoAudits).toHaveLength(2)
    expect(closeSessions.execute).toHaveBeenCalledTimes(1)
  })
})
