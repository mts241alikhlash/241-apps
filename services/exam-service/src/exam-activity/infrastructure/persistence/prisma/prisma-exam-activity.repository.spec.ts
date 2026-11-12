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
