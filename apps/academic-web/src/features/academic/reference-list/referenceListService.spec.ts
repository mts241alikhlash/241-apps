import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { REFERENCE_LISTS } from './lists'
import { referenceListService } from './referenceListService'

const http = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@mts241alikhlash/web-shared/utils/api', () => ({ default: http }))

vi.mock('vue-sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const TRANSPORTATIONS = REFERENCE_LISTS.find(
  (l) => l.path === 'transportations',
)!

describe('referenceListService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the whole list from the path the list names', async () => {
    http.get.mockResolvedValue({
      data: { data: [{ id: 'a', name: 'Ojek', sortOrder: 1, isActive: true }] },
    })

    const rows = await referenceListService.list(TRANSPORTATIONS)

    expect(http.get).toHaveBeenCalledWith('/transportations', {
      params: { limit: PAGINATION.REFERENCE_LIMIT },
    })
    expect(rows).toEqual([
      { id: 'a', name: 'Ojek', sortOrder: 1, isActive: true },
    ])
  })

  it('creates, updates and deletes on the same path', async () => {
    http.post.mockResolvedValue({})
    http.patch.mockResolvedValue({})
    http.delete.mockResolvedValue({})

    await referenceListService.create(TRANSPORTATIONS, {
      name: 'Ojek',
      sortOrder: 1,
    })
    await referenceListService.update(TRANSPORTATIONS, 'a', { isActive: false })
    await referenceListService.remove(TRANSPORTATIONS, 'a')

    expect(http.post).toHaveBeenCalledWith('/transportations', {
      name: 'Ojek',
      sortOrder: 1,
    })
    expect(http.patch).toHaveBeenCalledWith('/transportations/a', {
      isActive: false,
    })
    expect(http.delete).toHaveBeenCalledWith('/transportations/a')
  })
})
