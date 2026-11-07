import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { CreateActivityUseCase } from './create-activity.use-case.js'
import {
  RotateActivityTokenUseCase,
  UpdateActivityPolicyUseCase,
} from '../update-activity-policy/update-activity-policy.use-case.js'

const PRESET_ID = 'preset-1'

function activity(overrides: Partial<ExamActivity> = {}): ExamActivity {
  return {
    id: 'activity-1',
    semesterId: 'sem-1',
    eventId: null,
    gradeId: 'grade-9',
    subjectId: 'subject-inf',
    packageId: 'package-1',
    type: 'UH',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: PRESET_ID,
    policy: { ...DEFAULT_POLICIES.UJIAN_KETAT },
    startsAt: new Date('2026-11-10T01:00:00Z'),
    endsAt: new Date('2026-11-10T04:00:00Z'),
    durationMinutes: 90,
    status: 'SCHEDULED',
    createdById: 'admin-1',
    ...overrides,
  }
}

class FakeActivityRepository implements ExamActivityRepository {
  readonly created: { classroomIds: string[]; activityId: string }[] = []
  readonly audits: string[] = []
  stored = activity()

  async findPreset(name: string) {
    return name === 'UJIAN_KETAT'
      ? { id: PRESET_ID, policy: DEFAULT_POLICIES.UJIAN_KETAT }
      : null
  }

  async create(input: Parameters<ExamActivityRepository['create']>[0]) {
    this.created.push({
      classroomIds: input.classroomIds,
      activityId: this.stored.id,
    })
    this.audits.push('CREATE_ACTIVITY')
    return this.stored
  }

  async findById(id: string) {
    return id === this.stored.id ? this.stored : null
  }

  async updatePolicy(id: string, policy: ExamActivity['policy']) {
    if (id !== this.stored.id) return null
    this.audits.push('UPDATE_POLICY')
    this.stored = { ...this.stored, policy }
    return this.stored
  }

  async rotateToken(id: string) {
    if (id !== this.stored.id) return null
    this.audits.push('ROTATE_TOKEN')
    return this.stored
  }

  async listSchedules() {
    return [{ id: 'schedule-1', classroomId: 'class-7a' }]
  }
}

const command = {
  actorId: 'admin-1',
  semesterId: 'sem-1',
  gradeId: 'grade-9',
  subjectId: 'subject-inf',
  packageId: 'package-1',
  type: 'UH' as const,
  classroomIds: ['class-9a', 'class-9b'],
  presetName: 'UJIAN_KETAT' as const,
  tokenMode: 'ROTATING' as const,
  startsAt: new Date('2026-11-10T01:00:00Z'),
  endsAt: new Date('2026-11-10T04:00:00Z'),
  durationMinutes: 90,
}

describe('CreateActivityUseCase', () => {
  it('creates the activity with one schedule per chosen classroom', async () => {
    const repo = new FakeActivityRepository()
    await new CreateActivityUseCase(repo).execute(command)

    expect(repo.created).toEqual([
      { classroomIds: ['class-9a', 'class-9b'], activityId: 'activity-1' },
    ])
    expect(repo.audits).toEqual(['CREATE_ACTIVITY'])
  })

  it('refuses an activity without classrooms', async () => {
    const repo = new FakeActivityRepository()
    await expect(
      new CreateActivityUseCase(repo).execute({
        ...command,
        classroomIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.created).toEqual([])
  })

  it('refuses an unknown preset', async () => {
    const repo = new FakeActivityRepository()
    await expect(
      new CreateActivityUseCase(repo).execute({
        ...command,
        presetName: 'TUGAS' as never,
      }),
    ).rejects.toBeInstanceOf(NotFoundException)
  })
})

describe('UpdateActivityPolicyUseCase', () => {
  it('updates the policy while the activity is not running', async () => {
    const repo = new FakeActivityRepository()
    const updated = await new UpdateActivityPolicyUseCase(repo).execute(
      'admin-1',
      'activity-1',
      { violationLimit: 5 },
    )

    expect(updated.policy.violationLimit).toBe(5)
    expect(repo.audits).toEqual(['UPDATE_POLICY'])
  })

  it('refuses to change a running activity', async () => {
    const repo = new FakeActivityRepository()
    repo.stored = activity({ status: 'ACTIVE' })

    await expect(
      new UpdateActivityPolicyUseCase(repo).execute('admin-1', 'activity-1', {
        violationLimit: 5,
      }),
    ).rejects.toBeInstanceOf(ConflictException)
    expect(repo.audits).toEqual([])
  })
})

describe('RotateActivityTokenUseCase', () => {
  it('records the rotation', async () => {
    const repo = new FakeActivityRepository()
    await new RotateActivityTokenUseCase(repo).execute('admin-1', 'activity-1')
    expect(repo.audits).toEqual(['ROTATE_TOKEN'])
  })
})
