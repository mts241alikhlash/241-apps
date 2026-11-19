import { describe, expect, it } from 'vitest'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'
import { LookupParticipantNumbersUseCase } from './lookup-participant-numbers.use-case.js'

class FakeParticipants extends IParticipantNumberPort {
  calls: { studentIds: string[]; semesterId: string }[] = []

  findNumber() {
    return Promise.resolve(null)
  }

  findNumbers(studentIds: string[], semesterId: string) {
    this.calls.push({ studentIds, semesterId })
    return Promise.resolve(
      new Map([
        ['stu-1', '241-1'],
        ['stu-3', '241-3'],
      ]),
    )
  }

  issueNumbers() {
    return Promise.resolve({ issued: 0, skipped: [] })
  }
}

describe('LookupParticipantNumbersUseCase', () => {
  it('answers only the students that have a number', async () => {
    const participants = new FakeParticipants()

    await expect(
      new LookupParticipantNumbersUseCase(participants).execute('sem-1', [
        'stu-1',
        'stu-2',
        'stu-3',
      ]),
    ).resolves.toEqual({
      items: [
        { studentId: 'stu-1', number: '241-1' },
        { studentId: 'stu-3', number: '241-3' },
      ],
    })
    expect(participants.calls).toEqual([
      { studentIds: ['stu-1', 'stu-2', 'stu-3'], semesterId: 'sem-1' },
    ])
  })
})
