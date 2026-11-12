import { BadRequestException, Logger } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { FakeExamActivityRepository } from '../../exam-activity.repository.fake.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { ManagePresetsUseCase } from './manage-presets.use-case.js'

describe('ManagePresetsUseCase', () => {
  it('lists all four presets in DAILY, ASSIGNMENT, MIDTERM, FINAL order', async () => {
    const repo = new FakeExamActivityRepository()
    const useCase = new ManagePresetsUseCase(repo)

    const presets = await useCase.list()

    expect(presets.map((p) => p.type)).toEqual([
      'DAILY',
      'ASSIGNMENT',
      'MIDTERM',
      'FINAL',
    ])
  })

  it('patches a preset policy and logs the change without modifying existing ACTIVE activities', async () => {
    const repo = new FakeExamActivityRepository()
    const useCase = new ManagePresetsUseCase(repo)
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {
      return undefined
    })

    const created = await repo.create({
      activity: {
        semesterId: 'sem-1',
        eventId: null,
        gradeId: 'grade-7',
        subjectId: 'sub-1',
        packageId: 'pkg-1',
        type: 'DAILY',
        tokenMode: 'ROTATING',
        presetId: 'preset-DAILY',
        policy: { ...DEFAULT_POLICIES.DAILY },
        startsAt: new Date('2026-11-10T01:00:00Z'),
        endsAt: new Date('2026-11-10T03:00:00Z'),
        durationMinutes: 60,
        createdById: 'admin-1',
      },
      classroomIds: ['class-7a'],
      actorId: 'admin-1',
    })
    await repo.updateStatus(created.id, 'ACTIVE', 'admin-1')

    const updated = await useCase.update('admin-1', 'DAILY', {
      violationLimit: 5,
    })

    expect(updated.policy.violationLimit).toBe(5)
    expect((await repo.findById(created.id))?.policy.violationLimit).toBe(3)
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })

  it('rejects a type outside EXAM_TYPES with 400 BadRequestException', async () => {
    const repo = new FakeExamActivityRepository()
    const useCase = new ManagePresetsUseCase(repo)

    await expect(
      useCase.update('admin-1', 'QUIZ', { violationLimit: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
