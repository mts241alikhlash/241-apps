import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
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
    type: 'DAILY',
    tokenMode: 'ROTATING',
    tokenRotation: 0,
    presetId: PRESET_ID,
    policy: { ...DEFAULT_POLICIES.DAILY },
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

  findPreset(name: string) {
    return Promise.resolve(
      name === 'DAILY'
        ? { id: PRESET_ID, policy: DEFAULT_POLICIES.DAILY }
        : null,
    )
  }

  create(input: Parameters<ExamActivityRepository['create']>[0]) {
    this.created.push({
      classroomIds: input.classroomIds,
      activityId: this.stored.id,
    })
    this.audits.push('CREATE_ACTIVITY')
    return Promise.resolve(this.stored)
  }

  findById(id: string) {
    return Promise.resolve(id === this.stored.id ? this.stored : null)
  }

  updatePolicy(id: string, policy: ExamActivity['policy']) {
    if (id !== this.stored.id) return Promise.resolve(null)
    this.audits.push('UPDATE_POLICY')
    this.stored = { ...this.stored, policy }
    return Promise.resolve(this.stored)
  }

  rotateToken(id: string) {
    if (id !== this.stored.id) return Promise.resolve(null)
    this.audits.push('ROTATE_TOKEN')
    return Promise.resolve(this.stored)
  }

  listSchedules() {
    return Promise.resolve([{ id: 'schedule-1', classroomId: 'class-7a' }])
  }

  listBySemester(semesterId: string) {
    return Promise.resolve(
      this.stored.semesterId === semesterId ? [this.stored] : [],
    )
  }

  updateStatus(id: string, status: ExamActivity['status']) {
    if (id !== this.stored.id) return Promise.resolve(null)
    this.audits.push('UPDATE_STATUS')
    this.stored = { ...this.stored, status }
    return Promise.resolve(this.stored)
  }
}

class FakeParticipants extends IParticipantNumberPort {
  readonly issued: string[] = []
  failure: Error | null = null

  findNumber() {
    return Promise.resolve(null)
  }

  issueNumbers(semesterId: string) {
    this.issued.push(semesterId)
    return this.failure === null
      ? Promise.resolve()
      : Promise.reject(this.failure)
  }
}

const command = {
  actorId: 'admin-1',
  semesterId: 'sem-1',
  gradeId: 'grade-9',
  subjectId: 'subject-inf',
  packageId: 'package-1',
  type: 'DAILY' as const,
  classroomIds: ['class-9a', 'class-9b'],
  presetName: 'DAILY' as const,
  tokenMode: 'ROTATING' as const,
  startsAt: new Date('2026-11-10T01:00:00Z'),
  endsAt: new Date('2026-11-10T04:00:00Z'),
  durationMinutes: 90,
}

describe('CreateActivityUseCase', () => {
  it('creates the activity with one schedule per chosen classroom', async () => {
    const repo = new FakeActivityRepository()
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute(
      command,
    )

    expect(repo.created).toEqual([
      { classroomIds: ['class-9a', 'class-9b'], activityId: 'activity-1' },
    ])
    expect(repo.audits).toEqual(['CREATE_ACTIVITY'])
  })

  it('asks the registry to issue the semester’s participant numbers', async () => {
    const repo = new FakeActivityRepository()
    const participants = new FakeParticipants()

    await new CreateActivityUseCase(repo, participants).execute(command)

    expect(participants.issued).toEqual(['sem-1'])
  })

  it('keeps the activity and logs when the registry cannot issue', async () => {
    const repo = new FakeActivityRepository()
    const participants = new FakeParticipants()
    participants.failure = new Error('registry down')
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined
    })

    await expect(
      new CreateActivityUseCase(repo, participants).execute(command),
    ).resolves.toMatchObject({ id: 'activity-1' })
    expect(repo.created).toHaveLength(1)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('sem-1'),
    )
    warn.mockRestore()
  })

  it('refuses an activity without classrooms', async () => {
    const repo = new FakeActivityRepository()
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        classroomIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repo.created).toEqual([])
  })

  it('refuses an unknown preset', async () => {
    const repo = new FakeActivityRepository()
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        presetName: 'ASSIGNMENT',
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
