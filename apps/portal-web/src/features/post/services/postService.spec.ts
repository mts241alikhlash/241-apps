import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { postService } from './postService'
import { usePublicPostStore } from '../stores/publicPostStore'

type ApiCall = (...args: never[]) => Promise<unknown>

const { list, getBySlug, getRelated } = vi.hoisted(() => ({
  list: vi.fn<ApiCall>(),
  getBySlug: vi.fn<ApiCall>(),
  getRelated: vi.fn<ApiCall>(),
}))

vi.mock('../api/publicPostApi', () => ({
  publicPostApi: { list, getBySlug, getRelated },
}))

vi.mock('../api/postApi', () => ({ postApi: {} }))

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

function httpError(status: number) {
  return { response: { status } }
}

const summary = {
  id: 'post-1',
  type: 'BERITA' as const,
  title: 'Juara 1 Olimpiade',
  slug: 'juara-1-olimpiade',
  summary: 'Ringkasan',
  coverImageUrl: '/portal/public/media/abc',
  coverAltText: 'Piala',
  category: null,
  authorName: 'Humas',
  publishedAt: '2026-08-01T00:00:00.000Z',
  isPinned: false,
}

const detail = {
  ...summary,
  body: '<p>Isi</p>',
  updatedAt: '2026-08-01T00:00:00.000Z',
  expiresAt: null,
  attachmentUrl: null,
  metaTitle: 'Juara 1 Olimpiade',
  metaDescription: 'Ringkasan',
}

describe('postService, the public reading surface', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    getRelated.mockResolvedValue({ data: { data: [] } })
  })

  describe('fetchPublicDetail', () => {
    it('loads a published item and its related list', async () => {
      getBySlug.mockResolvedValue({ data: { data: detail } })
      getRelated.mockResolvedValue({ data: { data: [summary] } })

      await postService.fetchPublicDetail('BERITA', 'juara-1-olimpiade')

      const store = usePublicPostStore()
      expect(store.current?.title).toBe('Juara 1 Olimpiade')
      expect(store.related).toHaveLength(1)
      expect(store.notFound).toBe(false)
    })

    it('maps the content type to its public address segment', async () => {
      getBySlug.mockResolvedValue({ data: { data: detail } })

      await postService.fetchPublicDetail('ARTIKEL', 'kenapa-menulis')

      expect(getBySlug).toHaveBeenCalledWith('artikel', 'kenapa-menulis')
    })

    it('treats a draft slug and an unknown slug identically', async () => {
      getBySlug.mockRejectedValue(httpError(404))

      await postService.fetchPublicDetail('BERITA', 'masih-draft')
      const afterDraft = { ...usePublicPostStore().$state }

      setActivePinia(createPinia())
      await postService.fetchPublicDetail('BERITA', 'tidak-pernah-ada')
      const afterUnknown = { ...usePublicPostStore().$state }

      expect(afterDraft.notFound).toBe(true)
      expect(afterDraft.notFound).toBe(afterUnknown.notFound)
      expect(afterDraft.current).toBeNull()
      expect(afterUnknown.current).toBeNull()
    })

    it('never asks for related items for something a visitor cannot see', async () => {
      getBySlug.mockRejectedValue(httpError(404))

      await postService.fetchPublicDetail('BERITA', 'masih-draft')

      expect(getRelated).not.toHaveBeenCalled()
    })

    it('separates a server failure from a not-found', async () => {
      getBySlug.mockRejectedValue(httpError(500))

      await postService.fetchPublicDetail('BERITA', 'juara-1-olimpiade')

      const store = usePublicPostStore()
      expect(store.notFound).toBe(false)
      expect(store.unavailable).toBe(true)
    })

    it('keeps the article readable when only the related call fails', async () => {
      getBySlug.mockResolvedValue({ data: { data: detail } })
      getRelated.mockRejectedValue(httpError(500))

      await postService.fetchPublicDetail('BERITA', 'juara-1-olimpiade')

      const store = usePublicPostStore()
      expect(store.current?.title).toBe('Juara 1 Olimpiade')
      expect(store.related).toEqual([])
      expect(store.unavailable).toBe(false)
    })

    it('clears the previous article before loading the next one', async () => {
      getBySlug.mockResolvedValue({ data: { data: detail } })
      await postService.fetchPublicDetail('BERITA', 'juara-1-olimpiade')

      getBySlug.mockRejectedValue(httpError(404))
      await postService.fetchPublicDetail('BERITA', 'masih-draft')

      expect(usePublicPostStore().current).toBeNull()
    })
  })

  describe('fetchPublicList', () => {
    it('stores the page the API actually served, not the one requested', async () => {
      list.mockResolvedValue({
        data: { data: [summary], meta: { total: 42, page: 3, limit: 9 } },
      })

      await postService.fetchPublicList({ type: 'BERITA', page: 3 })

      const store = usePublicPostStore()
      expect(store.items).toHaveLength(1)
      expect(store.total).toBe(42)
      expect(store.page).toBe(3)
    })

    it('empties the listing and flags it rather than throwing at a visitor', async () => {
      list.mockRejectedValue(httpError(500))

      await postService.fetchPublicList({ type: 'BERITA' })

      const store = usePublicPostStore()
      expect(store.items).toEqual([])
      expect(store.total).toBe(0)
      expect(store.unavailable).toBe(true)
    })
  })
})
