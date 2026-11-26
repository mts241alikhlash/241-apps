import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import type { ActivityEventRef } from '../../../domain/policies/activity-rules.policy.js'
import {
  DEFAULT_POLICIES,
  type ExamPresetName,
} from '../../../domain/policies/exam-policy.policy.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import {
  UpdateActivityPolicyRequestDto,
  UpdateActivityStatusRequestDto,
} from '../../../presentation/http/dto/exam-activity.dto.js'
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
    deliveryMode: 'ONLINE',
    offlineKind: null,
    maxScore: 100,
    autoStatus: true,
    createdById: 'admin-1',
    ...overrides,
  }
}

class FakeActivityRepository implements ExamActivityRepository {
  readonly created: { classroomIds: string[]; activityId: string }[] = []
  readonly audits: string[] = []
  readonly events = new Map<string, ActivityEventRef>()
  readonly presets = new Set<ExamPresetName>(['DAILY', 'MIDTERM', 'FINAL'])
  lastCreatedActivity:
    Parameters<ExamActivityRepository['create']>[0]['activity'] | null = null
  stored = activity()

  findPreset(name: string) {
    if (!this.presets.has(name as ExamPresetName)) return Promise.resolve(null)
    return Promise.resolve({
      id: `preset-${name}`,
      policy: DEFAULT_POLICIES[name as ExamPresetName],
    })
  }

  listPresets() {
    return Promise.resolve([])
  }

  updatePreset() {
    return Promise.resolve(null)
  }

  findEventRef(eventId: string) {
    return Promise.resolve(this.events.get(eventId) ?? null)
  }

  packageStatus: string | null = 'APPROVED'

  findPackageStatus() {
    return Promise.resolve(this.packageStatus)
  }

  create(input: Parameters<ExamActivityRepository['create']>[0]) {
    this.lastCreatedActivity = input.activity
    this.created.push({
      classroomIds: input.classroomIds,
      activityId: this.stored.id,
    })
    this.audits.push('CREATE_ACTIVITY')
    return Promise.resolve(this.stored)
  }

  attachPackage() {
    return Promise.resolve(null)
  }

  assignClassrooms() {
    return Promise.resolve(null)
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

  findDueForAdvance() {
    return Promise.resolve([])
  }

  updateAutoStatus() {
    return Promise.resolve(null)
  }

  updateStatusIf() {
    return Promise.resolve(false)
  }

  listSchedules() {
    return Promise.resolve([
      {
        id: 'schedule-1',
        classroomId: 'class-7a',
        startsAt: this.stored.startsAt,
        endsAt: this.stored.endsAt,
      },
    ])
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

  findNumbers() {
    return Promise.resolve(new Map<string, string>())
  }

  issueNumbers(semesterId: string) {
    this.issued.push(semesterId)
    return this.failure === null
      ? Promise.resolve({ issued: 0, skipped: [] })
      : Promise.reject(this.failure)
  }
}

const command = {
  actorId: 'admin-1',
  manageAll: true,
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

  it('defaults presetName to type when teacher creates DAILY without presetName', async () => {
    const repo = new FakeActivityRepository()
    const { presetName: _omitted, ...withoutPreset } = command
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute({
      ...withoutPreset,
      manageAll: false,
      type: 'DAILY',
    })

    expect(repo.lastCreatedActivity?.presetId).toBe('preset-DAILY')
    expect(repo.lastCreatedActivity?.policy).toEqual(DEFAULT_POLICIES.DAILY)
  })

  it('refuses teacher without exam-events.manage creating MIDTERM even inside an active MIDTERM event', async () => {
    const repo = new FakeActivityRepository()
    repo.events.set('event-pts', {
      semesterId: 'sem-1',
      type: 'MIDTERM',
      status: 'ACTIVE',
      startsAt: new Date('2026-11-10T00:00:00Z'),
      endsAt: new Date('2026-11-10T06:00:00Z'),
    })
    const { presetName: _omitted, ...withoutPreset } = command
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...withoutPreset,
        manageAll: false,
        canManageEvents: false,
        type: 'MIDTERM',
        eventId: 'event-pts',
        tokenMode: 'ROTATING',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.created).toEqual([])
  })

  it('allows curriculum staff with canManageEvents to create MIDTERM inside an active MIDTERM event', async () => {
    const repo = new FakeActivityRepository()
    repo.events.set('event-pts', {
      semesterId: 'sem-1',
      type: 'MIDTERM',
      status: 'ACTIVE',
      startsAt: new Date('2026-11-10T00:00:00Z'),
      endsAt: new Date('2026-11-10T06:00:00Z'),
    })
    const { presetName: _omitted, ...withoutPreset } = command
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute({
      ...withoutPreset,
      manageAll: false,
      canManageEvents: true,
      type: 'MIDTERM',
      eventId: 'event-pts',
      tokenMode: 'ROTATING',
    })

    expect(repo.lastCreatedActivity?.presetId).toBe('preset-MIDTERM')
    expect(repo.created).toHaveLength(1)
  })

  it('propagates policy errors without creating the activity', async () => {
    const repo = new FakeActivityRepository()
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        manageAll: false,
        type: 'FINAL',
        presetName: 'FINAL',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repo.created).toEqual([])

    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        manageAll: true,
        type: 'MIDTERM',
        presetName: 'DAILY',
        eventId: 'event-pts',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(repo.created).toEqual([])
  })

  it('refuses an event id on a daily activity even when the id is unknown', async () => {
    const repo = new FakeActivityRepository()

    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        type: 'DAILY',
        presetName: 'DAILY',
        eventId: 'no-such-event',
      }),
    ).rejects.toMatchObject({ response: { code: 'EVENT_NOT_ALLOWED' } })
    expect(repo.created).toEqual([])
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

  it.each(['DRAFT', 'SUBMITTED', 'RETURNED'])(
    'refuses a package that is %s',
    async (status) => {
      const repo = new FakeActivityRepository()
      repo.packageStatus = status
      await expect(
        new CreateActivityUseCase(repo, new FakeParticipants()).execute(
          command,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException)
      expect(repo.created).toEqual([])
    },
  )

  it('refuses a package that does not exist', async () => {
    const repo = new FakeActivityRepository()
    repo.packageStatus = null
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute(command),
    ).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.created).toEqual([])
  })

  it('accepts a locked package', async () => {
    const repo = new FakeActivityRepository()
    repo.packageStatus = 'LOCKED'
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute(
      command,
    )
    expect(repo.created).toHaveLength(1)
  })

  it('creates a draft activity with no package and no schedules', async () => {
    const repo = new FakeActivityRepository()
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute({
      ...command,
      packageId: null,
      classroomIds: [],
    })

    expect(repo.lastCreatedActivity?.packageId).toBeNull()
    expect(repo.created).toEqual([
      { classroomIds: [], activityId: 'activity-1' },
    ])
    expect(repo.audits).toEqual(['CREATE_ACTIVITY'])
  })

  it('still refuses an unapproved package when one is given', async () => {
    const repo = new FakeActivityRepository()
    repo.packageStatus = 'SUBMITTED'
    await expect(
      new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...command,
        packageId: 'package-1',
      }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException)
    expect(repo.created).toEqual([])
  })

  describe('offline', () => {
    const offline = {
      ...command,
      packageId: null,
      classroomIds: [],
      deliveryMode: 'OFFLINE' as const,
      offlineKind: 'WRITTEN' as const,
    }

    function run(overrides: Record<string, unknown> = {}) {
      const repo = new FakeActivityRepository()
      const result = new CreateActivityUseCase(
        repo,
        new FakeParticipants(),
      ).execute({ ...offline, ...overrides })
      return { repo, result }
    }

    it('stores the kind, forces the static token and defaults the max score', async () => {
      const { repo, result } = run()
      await result

      expect(repo.lastCreatedActivity).toMatchObject({
        deliveryMode: 'OFFLINE',
        offlineKind: 'WRITTEN',
        tokenMode: 'STATIC',
        maxScore: 100,
        packageId: null,
      })
    })

    it('keeps an explicit max score and auto status', async () => {
      const { repo, result } = run({
        offlineKind: 'PRACTICAL',
        maxScore: 40,
        autoStatus: false,
      })
      await result

      expect(repo.lastCreatedActivity).toMatchObject({
        offlineKind: 'PRACTICAL',
        maxScore: 40,
        autoStatus: false,
      })
    })

    it('accepts an offline exam type asking for a rotating token', async () => {
      const repo = new FakeActivityRepository()
      repo.events.set('event-pts', {
        semesterId: 'sem-1',
        type: 'MIDTERM',
        status: 'ACTIVE',
        startsAt: new Date('2026-11-10T00:00:00Z'),
        endsAt: new Date('2026-11-10T06:00:00Z'),
      })
      await new CreateActivityUseCase(repo, new FakeParticipants()).execute({
        ...offline,
        type: 'MIDTERM',
        presetName: 'MIDTERM',
        eventId: 'event-pts',
      })

      expect(repo.lastCreatedActivity?.tokenMode).toBe('STATIC')
    })

    it('requires the offline kind', async () => {
      const { repo, result } = run({ offlineKind: undefined })
      await expect(result).rejects.toBeInstanceOf(BadRequestException)
      expect(repo.created).toEqual([])
    })

    it('forbids a package', async () => {
      const { repo, result } = run({ packageId: 'package-1' })
      await expect(result).rejects.toBeInstanceOf(BadRequestException)
      expect(repo.created).toEqual([])
    })

    it.each([0, 1001, 10.5])('rejects a max score of %s', async (maxScore) => {
      const { repo, result } = run({ maxScore })
      await expect(result).rejects.toBeInstanceOf(BadRequestException)
      expect(repo.created).toEqual([])
    })
  })

  it('creates an online activity as ONLINE and keeps its token mode', async () => {
    const repo = new FakeActivityRepository()
    await new CreateActivityUseCase(repo, new FakeParticipants()).execute(
      command,
    )

    expect(repo.lastCreatedActivity?.deliveryMode).toBe('ONLINE')
    expect(repo.lastCreatedActivity?.offlineKind).toBeNull()
    expect(repo.lastCreatedActivity?.tokenMode).toBe('ROTATING')
  })

  it('does not let the status endpoint change the delivery mode', async () => {
    const pipe = new ValidationPipe({ whitelist: true })
    const body = await pipe.transform(
      { status: 'ACTIVE', deliveryMode: 'OFFLINE' },
      { type: 'body', metatype: UpdateActivityStatusRequestDto },
    )

    expect(body).toEqual({ status: 'ACTIVE' })
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

describe('Activity patch DTO immutability', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  })

  it('rejects type, presetId, and tokenMode on UpdateActivityStatusRequestDto', async () => {
    await expect(
      pipe.transform(
        { status: 'SCHEDULED', type: 'FINAL' },
        { type: 'body', metatype: UpdateActivityStatusRequestDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('rejects type, presetId, and tokenMode on UpdateActivityPolicyRequestDto', async () => {
    await expect(
      pipe.transform(
        {
          violationLimit: 5,
          type: 'FINAL',
          presetId: 'p-1',
          tokenMode: 'STATIC',
        },
        { type: 'body', metatype: UpdateActivityPolicyRequestDto },
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
  })
})
