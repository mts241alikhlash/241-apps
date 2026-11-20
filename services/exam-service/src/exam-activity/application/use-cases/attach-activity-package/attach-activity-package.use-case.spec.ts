import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import { AttachActivityPackageUseCase } from './attach-activity-package.use-case.js'

function seeded(
  overrides: Partial<ExamActivity> = {},
): FakeExamActivityRepository {
  const repo = new FakeExamActivityRepository()
  repo.activities.set('activity-1', {
    id: 'activity-1',
    semesterId: 'sem-1',
    eventId: null,
    gradeId: 'grade-9',
    subjectId: 'subject-inf',
    packageId: null,
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: 'preset-1',
    policy: { ...DEFAULT_POLICIES.DAILY },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'DRAFT',
    createdById: 'admin-1',
    ...overrides,
  })
  return repo
}

const input = {
  actorId: 'admin-1',
  activityId: 'activity-1',
  packageId: 'package-1',
  classroomIds: ['class-9a', 'class-9b'],
}

describe('AttachActivityPackageUseCase', () => {
  it('attaches the package and creates one schedule per classroom', async () => {
    const repo = seeded()
    const updated = await new AttachActivityPackageUseCase(repo).execute(input)

    expect(updated.packageId).toBe('package-1')
    expect(repo.attachments).toEqual([
      {
        activityId: 'activity-1',
        packageId: 'package-1',
        classroomIds: ['class-9a', 'class-9b'],
      },
    ])
  })

  it('refuses a package that is not approved', async () => {
    const repo = seeded()
    repo.packageStatuses.set('package-1', 'SUBMITTED')

    await expect(
      new AttachActivityPackageUseCase(repo).execute(input),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(repo.attachments).toEqual([])
  })

  it('refuses a second attach', async () => {
    const repo = seeded({ packageId: 'package-0' })

    await expect(
      new AttachActivityPackageUseCase(repo).execute(input),
    ).rejects.toMatchObject({
      response: { code: 'ACTIVITY_HAS_PACKAGE' },
    })
    expect(repo.attachments).toEqual([])
  })

  it('refuses an unknown activity', async () => {
    const repo = seeded()
    await expect(
      new AttachActivityPackageUseCase(repo).execute({
        ...input,
        activityId: 'activity-2',
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('refuses a missing package', async () => {
    const repo = seeded()
    repo.missingPackages.add('package-1')
    await expect(
      new AttachActivityPackageUseCase(repo).execute(input),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('refuses an attach without classrooms', async () => {
    const repo = seeded()
    await expect(
      new AttachActivityPackageUseCase(repo).execute({
        ...input,
        classroomIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.attachments).toEqual([])
  })
})
