import { UnprocessableEntityException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'
import { FakeExamRoomRepository } from '../../exam-room.repository.fake.js'
import { ManageExamEventsUseCase } from './manage-exam-events.use-case.js'

const startsAt = new Date('2026-11-10T01:00:00Z')
const endsAt = new Date('2026-11-10T03:00:00Z')

describe('ManageExamEventsUseCase', () => {
  it('refuses to create an exam event with a non-exam type', async () => {
    const useCase = new ManageExamEventsUseCase(new FakeExamRoomRepository())

    await expect(
      useCase.create(
        { id: 'admin-1' },
        {
          semesterId: 'sem-1',
          name: 'Harian salah tempat',
          type: 'DAILY',
          startsAt,
          endsAt,
        },
      ),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('creates an exam event with MIDTERM or FINAL type', async () => {
    const useCase = new ManageExamEventsUseCase(new FakeExamRoomRepository())

    const event = await useCase.create(
      { id: 'admin-1' },
      {
        semesterId: 'sem-1',
        name: 'PTS Ganjil',
        type: 'MIDTERM',
        startsAt,
        endsAt,
      },
    )

    expect(event.type).toBe('MIDTERM')
  })

  it('refuses to update an exam event to a non-exam type', async () => {
    const repo = new FakeExamRoomRepository()
    const useCase = new ManageExamEventsUseCase(repo)
    const event = await useCase.create(
      { id: 'admin-1' },
      {
        semesterId: 'sem-1',
        name: 'PTS Ganjil',
        type: 'MIDTERM',
        startsAt,
        endsAt,
      },
    )

    await expect(
      useCase.update(event.id, { type: 'DAILY' }),
    ).rejects.toThrow(UnprocessableEntityException)
  })
})
