import { describe, expect, it } from 'vitest'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { IssueSemesterParticipantNumbersUseCase } from './issue-semester-participant-numbers.use-case.js'

class FakeParticipants extends IParticipantNumberPort {
  readonly issued: string[] = []

  findNumber() {
    return Promise.resolve(null)
  }

  findNumbers() {
    return Promise.resolve(new Map<string, string>())
  }

  issueNumbers(semesterId: string) {
    this.issued.push(semesterId)
    return Promise.resolve({ issued: 3, skipped: ['stu-9'] })
  }
}

describe('IssueSemesterParticipantNumbersUseCase', () => {
  it('issues the semester numbers and answers the registry result', async () => {
    const participants = new FakeParticipants()

    await expect(
      new IssueSemesterParticipantNumbersUseCase(participants).execute('sem-1'),
    ).resolves.toEqual({ issued: 3, skipped: ['stu-9'] })
    expect(participants.issued).toEqual(['sem-1'])
  })
})
