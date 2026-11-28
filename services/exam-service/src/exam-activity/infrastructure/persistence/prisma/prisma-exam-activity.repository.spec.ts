import { describe, expect, it, vi } from 'vitest'
import { Prisma } from '../../../../generated/prisma/client.js'
import type { PrismaService } from '../../../../core/database/prisma.service.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { PrismaExamActivityRepository } from './prisma-exam-activity.repository.js'

function build(update: ReturnType<typeof vi.fn>) {
  const findUnique = vi.fn()
  const prisma = {
    examPolicyPreset: { update, findUnique },
  } as unknown as PrismaService
  return { repo: new PrismaExamActivityRepository(prisma), findUnique }
}

describe('PrismaExamActivityRepository.updatePreset', () => {
  it('updates the preset with one query', async () => {
    const update = vi.fn().mockResolvedValue({
      id: 'preset-1',
      name: 'DAILY',
      policy: { ...DEFAULT_POLICIES.DAILY, violationLimit: 5 },
      updatedAt: new Date('2026-11-12T00:00:00.000Z'),
    })
    const { repo, findUnique } = build(update)

    const result = await repo.updatePreset('DAILY', {
      ...DEFAULT_POLICIES.DAILY,
      violationLimit: 5,
    })

    expect(update).toHaveBeenCalledTimes(1)
    expect(findUnique).not.toHaveBeenCalled()
    expect(result?.policy.violationLimit).toBe(5)
  })

  it('returns null when the preset row is gone', async () => {
    const update = vi.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: 'test',
      }),
    )
    const { repo } = build(update)

    await expect(
      repo.updatePreset('DAILY', { ...DEFAULT_POLICIES.DAILY }),
    ).resolves.toBeNull()
  })

  it('rethrows any other database error', async () => {
    const update = vi.fn().mockRejectedValue(new Error('connection lost'))
    const { repo } = build(update)

    await expect(
      repo.updatePreset('DAILY', { ...DEFAULT_POLICIES.DAILY }),
    ).rejects.toThrow('connection lost')
  })
})

const ACTIVITY_ID = '11111111-1111-4111-8111-111111111111'
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222'
const CLASSROOM_ID = '33333333-3333-4333-8333-333333333333'

const LOCK_CALL = {
  where: { id: PACKAGE_ID, status: 'APPROVED', deletedAt: null },
  data: { status: 'LOCKED', lockedAt: expect.any(Date) },
}

function activityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ACTIVITY_ID,
    semesterId: 'semester-1',
    eventId: null,
    gradeId: 'grade-7',
    subjectId: 'subject-inf',
    packageId: null,
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: null,
    policy: DEFAULT_POLICIES.DAILY,
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'DRAFT',
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
    ...overrides,
  }
}

function transaction() {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ id: ACTIVITY_ID }]),
    examActivity: {
      create: vi.fn().mockResolvedValue(activityRow({ packageId: PACKAGE_ID })),
      findUnique: vi.fn().mockResolvedValue(activityRow()),
      update: vi.fn().mockResolvedValue(activityRow({ packageId: PACKAGE_ID })),
    },
    examSchedule: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    examPackage: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    examActivityAuditLog: { create: vi.fn().mockResolvedValue({}) },
  }
}

function repositoryWith(tx: ReturnType<typeof transaction>) {
  const prisma = {
    $transaction: (fn: (client: unknown) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService
  return new PrismaExamActivityRepository(prisma)
}

describe('PrismaExamActivityRepository package locking', () => {
  it('creating an activity with a package locks it before its schedules', async () => {
    const tx = transaction()
    const repo = repositoryWith(tx)

    await repo.create({
      activity: { packageId: PACKAGE_ID, deliveryMode: 'ONLINE' },
      classroomIds: [CLASSROOM_ID],
      actorId: 'admin-1',
    } as never)

    expect(tx.examPackage.updateMany).toHaveBeenCalledWith(LOCK_CALL)
    expect(tx.examSchedule.createMany).toHaveBeenCalled()
    expect(tx.examPackage.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.examSchedule.createMany.mock.invocationCallOrder[0],
    )
  })

  it('creating an activity without a package does not touch packages', async () => {
    const tx = transaction()
    const repo = repositoryWith(tx)

    await repo.create({
      activity: { packageId: null, deliveryMode: 'OFFLINE' },
      classroomIds: [CLASSROOM_ID],
      actorId: 'admin-1',
    } as never)

    expect(tx.examPackage.updateMany).not.toHaveBeenCalled()
  })

  it('attaching a package locks it in the same transaction as its schedules', async () => {
    const tx = transaction()
    const repo = repositoryWith(tx)

    await repo.attachPackage({
      activityId: ACTIVITY_ID,
      packageId: PACKAGE_ID,
      classroomIds: [CLASSROOM_ID],
      actorId: 'admin-1',
    })

    expect(tx.examPackage.updateMany).toHaveBeenCalledWith(LOCK_CALL)
    expect(tx.examSchedule.createMany).toHaveBeenCalled()
  })

  it('assigning classrooms to an activity with a package locks it', async () => {
    const tx = transaction()
    tx.examActivity.findUnique.mockResolvedValue(
      activityRow({ packageId: PACKAGE_ID }),
    )
    const repo = repositoryWith(tx)

    await repo.assignClassrooms({
      activityId: ACTIVITY_ID,
      classroomIds: [CLASSROOM_ID],
    } as never)

    expect(tx.examPackage.updateMany).toHaveBeenCalledWith(LOCK_CALL)
  })
})
