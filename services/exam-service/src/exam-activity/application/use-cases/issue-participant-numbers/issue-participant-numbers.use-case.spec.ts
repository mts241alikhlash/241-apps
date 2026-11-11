import { Logger, NotFoundException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import type { ExamActivity } from '../../../domain/entities/exam-activity.entity.js'
import type { ExamActivityRepository } from '../../../domain/repositories/exam-activity.repository.js'
import { DEFAULT_POLICIES } from '../../../domain/policies/exam-policy.policy.js'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { IssueParticipantNumbersUseCase } from './issue-participant-numbers.use-case.js'

const activity: ExamActivity = {
  id: 'activity-1',
  semesterId: 'sem-1',
  eventId: null,
  gradeId: 'grade-9',
  subjectId: 'subject-inf',
  packageId: 'package-1',
  type: 'DAILY',
  tokenMode: 'ROTATING',
  tokenRotation: 0,
  presetId: null,
  policy: { ...DEFAULT_POLICIES.DAILY },
  startsAt: new Date('2026-11-10T01:00:00Z'),
  endsAt: new Date('2026-11-10T04:00:00Z'),
  durationMinutes: 90,
  status: 'SCHEDULED',
  createdById: 'admin-1',
}

class FakeActivityRepository {
  stored: ExamActivity | null = activity

  findById(id: string) {
    return Promise.resolve(id === this.stored?.id ? this.stored : null)
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

const build = (participants = new FakeParticipants()) =>
  new IssueParticipantNumbersUseCase(
    new FakeActivityRepository() as unknown as ExamActivityRepository,
    participants,
  )

describe('IssueParticipantNumbersUseCase', () => {
  it('issues the numbers of the activity semester', async () => {
    const participants = new FakeParticipants()

    await expect(build(participants).execute('activity-1')).resolves.toEqual({
      issued: true,
    })
    expect(participants.issued).toEqual(['sem-1'])
  })

  it('reports a registry failure without throwing', async () => {
    const participants = new FakeParticipants()
    participants.failure = new Error('registry down')
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {
      return undefined
    })

    await expect(build(participants).execute('activity-1')).resolves.toEqual({
      issued: false,
    })
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining('sem-1'),
    )
    warn.mockRestore()
  })

  it('refuses an unknown activity', async () => {
    await expect(build().execute('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
