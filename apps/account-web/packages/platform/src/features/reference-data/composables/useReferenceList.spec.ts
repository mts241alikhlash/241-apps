import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReferenceList } from './useReferenceList'
import { queryClient, referenceQueryKey } from '../client'
import { REFERENCE_EXPIRY_MS } from '../constants'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'

function countingFetcher(items: string[] = ['a', 'b']) {
  return vi.fn(() => Promise.resolve(items))
}

describe('useReferenceList', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.useRealTimers()
  })

  it('serves a second read inside the expiry window without requesting', async () => {
    const { read } = useReferenceList()
    const fetcher = countingFetcher()

    await read('classrooms', fetcher)
    const second = await read('classrooms', fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(second).toEqual(['a', 'b'])
  })

  it('issues exactly one request for two simultaneous reads of a cold list', async () => {
    const { read } = useReferenceList()
    let resolve!: (items: string[]) => void
    const fetcher = vi.fn(
      () =>
        new Promise<string[]>((r) => {
          resolve = r
        }),
    )

    const first = read('teachers', fetcher)
    const second = read('teachers', fetcher)
    resolve(['ahmad'])

    expect(await first).toEqual(['ahmad'])
    expect(await second).toEqual(['ahmad'])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('requests again once the expiry window has passed', async () => {
    vi.useFakeTimers()
    const { read } = useReferenceList()
    const fetcher = countingFetcher()

    await read('classrooms', fetcher)
    vi.setSystemTime(Date.now() + REFERENCE_EXPIRY_MS.classrooms + 1)
    await read('classrooms', fetcher)

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('never expires a list whose expiry is the session', async () => {
    vi.useFakeTimers()
    const { read } = useReferenceList()
    const fetcher = countingFetcher()

    await read('religions', fetcher)
    vi.setSystemTime(Date.now() + 30 * 24 * 60 * 60_000)
    await read('religions', fetcher)

    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('refetches after an invalidation, and empties on clear', async () => {
    const { read, invalidate, clear } = useReferenceList()
    const fetcher = countingFetcher()

    await read('subjects', fetcher)
    invalidate('subjects')
    await read('subjects', fetcher)

    expect(fetcher).toHaveBeenCalledTimes(2)

    clear()
    expect(
      queryClient.getQueryData(referenceQueryKey('subjects')),
    ).toBeUndefined()
    await read('subjects', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('keeps the previous values while a list is invalid', async () => {
    const { read, invalidate } = useReferenceList()

    await read('grades', countingFetcher(['VII']))
    invalidate('grades')

    expect(queryClient.getQueryData(referenceQueryKey('grades'))).toEqual([
      'VII',
    ])
  })

  it('rejects on failure and lets the next read retry', async () => {
    const { read, statusOf } = useReferenceList()
    const failing = vi.fn(() => Promise.reject(new Error('offline')))

    await expect(read('positions', failing)).rejects.toThrow('offline')
    expect(statusOf('positions')).toBe('failed')

    const succeeding = countingFetcher(['Kepala Sekolah'])
    await expect(read('positions', succeeding)).resolves.toEqual([
      'Kepala Sekolah',
    ])
    expect(succeeding).toHaveBeenCalledTimes(1)
  })

  it('reports a list nobody has asked for as idle', () => {
    expect(useReferenceList().statusOf('occupations')).toBe('idle')
  })

  it('states an expiry for every list it can hold', () => {
    const entries = Object.values(REFERENCE_EXPIRY_MS)
    expect(entries.length).toBeGreaterThan(0)
    expect(entries.every((ms) => ms > 0)).toBe(true)
  })

  it('warns when a list comes back at the request limit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const full = Array.from({ length: PAGINATION.REFERENCE_LIMIT }, (_, i) => i)

    await useReferenceList().read('students', () => Promise.resolve(full))

    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn.mock.calls[0]?.[0]).toContain('students')
    expect(warn.mock.calls[0]?.[0]).toContain('truncated')
    warn.mockRestore()
  })

  it('says nothing about a list comfortably under the limit', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await useReferenceList().read('grades', () => Promise.resolve([1, 2, 3]))

    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('namespaces its keys', () => {
    expect(referenceQueryKey('teachers')).toEqual(['reference', 'teachers'])
  })
})
