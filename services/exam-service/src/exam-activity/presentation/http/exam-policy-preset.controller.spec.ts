import { BadRequestException } from '@nestjs/common'
import { PERMISSIONS_KEY } from '@mts241alikhlash/nest-core/access-control'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_POLICIES } from '../../domain/policies/exam-policy.policy.js'
import type { ManagePresetsUseCase } from '../../application/use-cases/manage-presets/manage-presets.use-case.js'
import { ExamPolicyPresetController } from './exam-policy-preset.controller.js'

describe('ExamPolicyPresetController', () => {
  it('requires exam-schedules.read on list and exam-schedules.manage-all on update', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ExamPolicyPresetController.prototype.list,
      ),
    ).toEqual(['exam-schedules.read'])
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        ExamPolicyPresetController.prototype.update,
      ),
    ).toEqual(['exam-schedules.manage-all'])
  })

  it('maps presets to ExamPolicyPresetDto with category and rejects unknown type', async () => {
    const now = new Date('2026-11-10T01:00:00.000Z')
    const list = vi.fn().mockResolvedValue([
      {
        type: 'MIDTERM',
        policy: { ...DEFAULT_POLICIES.MIDTERM },
        updatedAt: now,
      },
    ])
    const update = vi.fn().mockResolvedValue({
      type: 'DAILY',
      policy: { ...DEFAULT_POLICIES.DAILY, violationLimit: 5 },
      updatedAt: now,
    })
    const controller = new ExamPolicyPresetController({
      list,
      update,
    } as unknown as ManagePresetsUseCase)

    const items = await controller.list()
    expect(items[0]).toMatchObject({
      type: 'MIDTERM',
      category: 'EXAM',
      updatedAt: '2026-11-10T01:00:00.000Z',
    })

    const patched = await controller.update({ id: 'admin-1' }, 'DAILY', {
      violationLimit: 5,
    })
    expect(patched).toMatchObject({
      type: 'DAILY',
      category: 'NON_EXAM',
      policy: { ...DEFAULT_POLICIES.DAILY, violationLimit: 5 },
    })

    await expect(
      controller.update({ id: 'admin-1' }, 'QUIZ' as never, {
        violationLimit: 5,
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
