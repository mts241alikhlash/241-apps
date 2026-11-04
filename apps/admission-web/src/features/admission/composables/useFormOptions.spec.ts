import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useReferenceList } from '@/features/platform/reference-data'
import { admissionApi } from '../api/admissionApi'
import { useFormOptions } from './useFormOptions'

vi.mock('../api/admissionApi', () => ({
  admissionApi: { getFormOptions: vi.fn() },
}))

const OPTIONS = {
  transportations: [{ id: 't-1', name: 'Ojek' }],
  educations: [],
}

describe('useFormOptions', () => {
  beforeEach(() => {
    useReferenceList().clear()
    vi.clearAllMocks()
    vi.mocked(admissionApi.getFormOptions).mockResolvedValue({
      data: { data: OPTIONS },
    } as never)
  })

  it('names an id from a loaded list', async () => {
    const { load, nameOf } = useFormOptions()

    await load()

    expect(nameOf('transportations', 't-1')).toBe('Ojek')
  })

  it('answers a dash for no id or an unknown id', async () => {
    const { load, nameOf } = useFormOptions()

    await load()

    expect(nameOf('transportations', null)).toBe('-')
    expect(nameOf('transportations', undefined)).toBe('-')
    expect(nameOf('transportations', 'nope')).toBe('-')
  })

  it('answers a dash before the lists have loaded', () => {
    const { options, nameOf } = useFormOptions()
    options.value = null

    expect(nameOf('transportations', 't-1')).toBe('-')
  })

  it('lists the options of a key, empty before the lists have loaded', async () => {
    const { options, load, listOf } = useFormOptions()
    options.value = null

    expect(listOf('transportations')).toEqual([])
    await load()

    expect(listOf('transportations')).toEqual([{ id: 't-1', name: 'Ojek' }])
  })

  it('asks the server once however often it loads', async () => {
    const { load } = useFormOptions()

    await load()
    await load()

    expect(admissionApi.getFormOptions).toHaveBeenCalledTimes(1)
  })
})
