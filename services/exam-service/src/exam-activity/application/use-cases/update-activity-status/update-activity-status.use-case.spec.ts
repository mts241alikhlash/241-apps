import { NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type {
  ActivityStatus,
  ExamActivity,
} from '../../../domain/entities/exam-activity.entity.js'
import type { CloseActivitySessionsUseCase } from '../../../../exam-session/application/use-cases/close-activity-sessions/close-activity-sessions.use-case.js'
import { UpdateActivityStatusUseCase } from './update-activity-status.use-case.js'

function seeded(status: ActivityStatus): FakeExamActivityRepository {
  const repo = new FakeExamActivityRepository()
  const activity: ExamActivity = {
    id: 'activity-1',
    semesterId: 'sem-1',
    eventId: null,
    gradeId: 'grade-9',
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type: 'UH',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.UJIAN_KETAT },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status,
    createdById: 'admin-1',
  }
  repo.activities.set(activity.id, activity)
  return repo
}

function build(repo: FakeExamActivityRepository) {
  const closeSessions = { execute: vi.fn().mockResolvedValue(0) }
  return {
    useCase: new UpdateActivityStatusUseCase(
      repo,
      closeSessions as unknown as CloseActivitySessionsUseCase,
    ),
    closeSessions,
  }
}

describe('UpdateActivityStatusUseCase', () => {
  it('stores the new status and closes the running sessions once', async () => {
    const repo = seeded('ACTIVE')
    const { useCase, closeSessions } = build(repo)

    const updated = await useCase.execute('admin-1', 'activity-1', 'CLOSED')

    expect(updated.status).toBe('CLOSED')
    expect(repo.activities.get('activity-1')?.status).toBe('CLOSED')
    expect(closeSessions.execute).toHaveBeenCalledExactlyOnceWith(
      'activity-1',
      'admin-1',
    )
  })

  it('keeps the activity ACTIVE when closing the sessions fails', async () => {
    const repo = seeded('ACTIVE')
    const { useCase, closeSessions } = build(repo)
    closeSessions.execute.mockRejectedValueOnce(new Error('finalizer down'))

    await expect(
      useCase.execute('admin-1', 'activity-1', 'CLOSED'),
    ).rejects.toThrow('finalizer down')
    expect(repo.activities.get('activity-1')?.status).toBe('ACTIVE')
  })

  it('leaves the sessions alone when the activity never ran', async () => {
    const repo = seeded('SCHEDULED')
    const { useCase, closeSessions } = build(repo)

    await useCase.execute('admin-1', 'activity-1', 'CLOSED')

    expect(closeSessions.execute).not.toHaveBeenCalled()
  })

  it('refuses an unknown activity', async () => {
    const repo = seeded('SCHEDULED')
    const { useCase, closeSessions } = build(repo)

    await expect(
      useCase.execute('admin-1', 'activity-2', 'CLOSED'),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(closeSessions.execute).not.toHaveBeenCalled()
  })
})
