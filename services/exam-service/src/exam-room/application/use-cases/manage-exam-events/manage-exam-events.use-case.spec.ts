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
        name: 'UTS Ganjil',
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
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        startsAt,
        endsAt,
      },
    )

    await expect(useCase.update(event.id, { type: 'DAILY' })).rejects.toThrow(
      UnprocessableEntityException,
    )
  })

  const periodWith = async (repo: FakeExamRoomRepository) => {
    const useCase = new ManageExamEventsUseCase(repo)
    const event = await useCase.create(
      { id: 'admin-1' },
      {
        semesterId: 'sem-1',
        name: 'UTS Ganjil',
        type: 'MIDTERM',
        startsAt,
        endsAt,
      },
    )
    return { useCase, event }
  }

  it('refuses to change the type of a period that has activities or schedules', async () => {
    const repo = new FakeExamRoomRepository()
    const { useCase, event } = await periodWith(repo)
    repo.linkedEventIds.add(event.id)

    await expect(
      useCase.update(event.id, { type: 'FINAL' }),
    ).rejects.toMatchObject({ response: { code: 'EVENT_TYPE_LINKED' } })
    expect((await repo.findEventById(event.id))?.type).toBe('MIDTERM')
  })

  it('changes the type of a period nothing is linked to', async () => {
    const repo = new FakeExamRoomRepository()
    const { useCase, event } = await periodWith(repo)

    const updated = await useCase.update(event.id, { type: 'FINAL' })

    expect(updated.type).toBe('FINAL')
  })

  it('keeps editing a linked period when the type stays the same', async () => {
    const repo = new FakeExamRoomRepository()
    const { useCase, event } = await periodWith(repo)
    repo.linkedEventIds.add(event.id)

    const updated = await useCase.update(event.id, {
      type: 'MIDTERM',
      name: 'UTS Ganjil 2026',
    })

    expect(updated.name).toBe('UTS Ganjil 2026')
  })
})
