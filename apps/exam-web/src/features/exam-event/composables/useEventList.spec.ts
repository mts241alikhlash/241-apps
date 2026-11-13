import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref, type Ref } from 'vue'
import { useEventList } from './useEventList'
import type { ExamEvent, EventQueryParams } from '../types'

interface Page<T> {
  data?: T[]
  meta?: { total?: number }
}

interface PagedOptions {
  scope: string[]
  filters: Record<string, Ref<unknown>>
  page: Ref<number>
  pageSize: Ref<number>
  fetchPage: (page: number, limit: number) => Promise<Page<ExamEvent>>
  errorMessage: string
}

const { usePagedList, getEvents } = vi.hoisted(() => ({
  usePagedList: vi.fn<(options: PagedOptions) => unknown>(),
  getEvents: vi.fn<(params?: EventQueryParams) => Promise<unknown>>(),
}))
vi.mock('@/features/exam-bank/composables/usePagedList', () => ({
  usePagedList,
}))
vi.mock('../api/examEventApi', () => ({ examEventApi: { getEvents } }))

const event: ExamEvent = {
  id: 'e1',
  semesterId: 'sem-1',
  name: 'UTS Ganjil',
  type: 'MIDTERM',
  category: 'EXAM',
  startsAt: '2026-11-02T01:00:00.000Z',
  endsAt: '2026-11-06T09:00:00.000Z',
  lateToleranceMinutes: 30,
  minSubmitMinutes: 20,
  status: 'ACTIVE',
}

const items = ref<ExamEvent[]>([event])
const total = ref(42)

function harness(status = 'ALL', semesterId = 'sem-1') {
  const page = ref(1)
  const pageSize = ref(10)
  const list = useEventList(
    { status: ref(status), semesterId: ref(semesterId) },
    page,
    pageSize,
  )
  const options = usePagedList.mock.calls.at(-1)?.[0]
  if (!options) throw new Error('usePagedList was not called')
  return { list, options }
}

describe('useEventList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePagedList.mockReturnValue({
      items,
      totalItems: total,
      listError: ref(null),
      loading: ref(false),
      isFetching: ref(false),
      isPlaceholderData: ref(false),
      refresh: vi.fn(),
    })
    getEvents.mockResolvedValue({
      data: [event],
      meta: { total: 42, page: 2, limit: 25 },
    })
  })

  it('fetches one server page with the active filters', async () => {
    const { options } = harness('DRAFT')

    await options.fetchPage(2, 25)

    expect(getEvents).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      status: 'DRAFT',
      semesterId: 'sem-1',
    })
    expect(options.scope).toEqual(['exam-event', 'events'])
  })

  it('drops the ALL sentinel and an empty semester', async () => {
    const { options } = harness('ALL', '')

    await options.fetchPage(1, 10)

    expect(getEvents).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      status: undefined,
      semesterId: undefined,
    })
  })

  it('exposes the rows, the server total and the pending flag', () => {
    const { list } = harness()

    expect(list.events.value).toEqual([event])
    expect(list.totalItems.value).toBe(42)
    expect(list.filtersPending.value).toBe(false)
  })
})
