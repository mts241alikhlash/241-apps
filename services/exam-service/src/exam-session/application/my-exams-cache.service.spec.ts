import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MyExam } from './use-cases/list-my-exams/list-my-exams.use-case.js'
import {
  MY_EXAMS_CACHE_MAX_ENTRIES,
  MY_EXAMS_CACHE_MS,
  MyExamsCacheService,
} from './my-exams-cache.service.js'

const exams = (id: string) => [{ id }] as unknown as MyExam[]

describe('MyExamsCacheService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-28T03:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shares one execution between concurrent calls for the same user', async () => {
    const cache = new MyExamsCacheService()
    const produce = vi.fn(() => Promise.resolve(exams('a')))

    const [first, second] = await Promise.all([
      cache.load('u1', produce),
      cache.load('u1', produce),
    ])

    expect(produce).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('reuses a finished result for 3 seconds, then runs again', async () => {
    const cache = new MyExamsCacheService()
    const produce = vi.fn(() => Promise.resolve(exams('a')))

    await cache.load('u1', produce)
    vi.advanceTimersByTime(MY_EXAMS_CACHE_MS - 1)
    await cache.load('u1', produce)
    expect(produce).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    await cache.load('u1', produce)
    expect(produce).toHaveBeenCalledTimes(2)
  })

  it('never hands one user the result of another', async () => {
    const cache = new MyExamsCacheService()
    await cache.load('u1', () => Promise.resolve(exams('one')))

    const other = await cache.load('u2', () => Promise.resolve(exams('two')))

    expect(other.map((exam) => exam.id)).toEqual(['two'])
  })

  it('drops the cached result and an in-flight run on invalidate', async () => {
    const cache = new MyExamsCacheService()
    const produce = vi.fn(() => Promise.resolve(exams('a')))
    await cache.load('u1', produce)

    cache.invalidate('u1')
    await cache.load('u1', produce)
    expect(produce).toHaveBeenCalledTimes(2)

    let finish: (value: MyExam[]) => void = () => undefined
    const slow = new Promise<MyExam[]>((resolve) => (finish = resolve))
    const pending = cache.load('u2', () => slow)
    cache.invalidate('u2')
    finish(exams('stale'))
    await pending

    const fresh = vi.fn(() => Promise.resolve(exams('fresh')))
    const after = await cache.load('u2', fresh)
    expect(fresh).toHaveBeenCalledTimes(1)
    expect(after.map((exam) => exam.id)).toEqual(['fresh'])
  })

  it('evicts the oldest entry beyond the bound', async () => {
    const cache = new MyExamsCacheService()
    for (let index = 0; index < MY_EXAMS_CACHE_MAX_ENTRIES; index++) {
      await cache.load(`u${index}`, () => Promise.resolve(exams(`${index}`)))
    }
    await cache.load('extra', () => Promise.resolve(exams('extra')))

    const produce = vi.fn(() => Promise.resolve(exams('again')))
    await cache.load('u0', produce)
    expect(produce).toHaveBeenCalledTimes(1)
  })

  it('drops an expired entry when it is read', async () => {
    const cache = new MyExamsCacheService()
    await cache.load('u1', () => Promise.resolve(exams('a')))
    const entries = (cache as unknown as { done: Map<string, unknown> }).done

    vi.advanceTimersByTime(MY_EXAMS_CACHE_MS)
    await cache.load('u1', () => Promise.resolve(exams('b')))

    expect((entries.get('u1') as { value: MyExam[] }).value[0].id).toBe('b')
    vi.advanceTimersByTime(MY_EXAMS_CACHE_MS)
    const produce = vi.fn(() => Promise.resolve(exams('c')))
    await cache.load('u1', produce)
    expect(produce).toHaveBeenCalledTimes(1)
    expect((entries.get('u1') as { value: MyExam[] }).value[0].id).toBe('c')
  })
})
