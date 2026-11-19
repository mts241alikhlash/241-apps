import { beforeEach, describe, expect, it, vi } from 'vitest'

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))

vi.mock('../api/participantNumberApi', () => ({
  participantNumberApi: { lookup },
}))

import { participantNumberService } from './participantNumberService'

beforeEach(() => {
  vi.clearAllMocks()
  lookup.mockImplementation((_semesterId: string, ids: string[]) =>
    Promise.resolve(
      ids.map((studentId) => ({ studentId, number: `N-${studentId}` })),
    ),
  )
})

describe('participantNumberService.loadNumbers', () => {
  it('maps numbers by student id', async () => {
    const numbers = await participantNumberService.loadNumbers('sem1', ['a'])
    expect(numbers.get('a')).toBe('N-a')
    expect(lookup).toHaveBeenCalledWith('sem1', ['a'])
  })

  it('splits lookups into chunks of 500 students', async () => {
    const ids = Array.from({ length: 1200 }, (_, index) => `s${index}`)
    const numbers = await participantNumberService.loadNumbers('sem1', ids)
    expect(lookup.mock.calls.map(([, chunk]) => chunk.length)).toEqual([
      500, 500, 200,
    ])
    expect(numbers.size).toBe(1200)
  })

  it('makes no request for an empty roster', async () => {
    const numbers = await participantNumberService.loadNumbers('sem1', [])
    expect(numbers.size).toBe(0)
    expect(lookup).not.toHaveBeenCalled()
  })
})
