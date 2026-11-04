// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, ref } from 'vue'
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import { flushPromises } from '@vue/test-utils'
import { usePagedList } from './usePagedList'

function setup(fetchPage: (page: number, limit: number) => Promise<unknown>) {
  const page = ref(1)
  const pageSize = ref(10)
  const search = ref('')
  let list!: ReturnType<typeof usePagedList<{ id: string }>>
  const app = createApp(
    defineComponent({
      setup() {
        list = usePagedList<{ id: string }>({
          scope: ['test', 'paged'],
          filters: { search },
          page,
          pageSize,
          fetchPage: fetchPage as never,
          errorMessage: 'Gagal memuat.',
        })
        return () => h('div')
      },
    }),
  )
  app.use(VueQueryPlugin, {
    queryClient: new QueryClient({
      defaultOptions: { queries: { retry: false } },
    }),
  })
  app.mount(document.createElement('div'))
  return { list, page, pageSize, search }
}

it('fetches the requested page and exposes only that page', async () => {
  const fetchPage = vi.fn((page: number) =>
    Promise.resolve({ data: [{ id: `row${page}` }], meta: { total: 25 } }),
  )
  const { list } = setup(fetchPage)
  await flushPromises()

  expect(fetchPage).toHaveBeenCalledWith(1, 10)
  expect(list.items.value).toEqual([{ id: 'row1' }])
  expect(list.totalItems.value).toBe(25)
})

it('replaces the rows when the page changes', async () => {
  const fetchPage = vi.fn((page: number) =>
    Promise.resolve({ data: [{ id: `row${page}` }], meta: { total: 25 } }),
  )
  const { list, page } = setup(fetchPage)
  await flushPromises()

  page.value = 2
  await flushPromises()

  expect(fetchPage).toHaveBeenLastCalledWith(2, 10)
  expect(list.items.value).toEqual([{ id: 'row2' }])
})

it('asks again with the new page size', async () => {
  const fetchPage = vi.fn(() =>
    Promise.resolve({ data: [], meta: { total: 0 } }),
  )
  const { pageSize } = setup(fetchPage)
  await flushPromises()

  pageSize.value = 25
  await flushPromises()

  expect(fetchPage).toHaveBeenLastCalledWith(1, 25)
})

it('keeps the previous rows while the next page loads', async () => {
  let release: (value: unknown) => void = () => undefined
  const fetchPage = vi
    .fn()
    .mockResolvedValueOnce({ data: [{ id: 'row1' }], meta: { total: 25 } })
    .mockReturnValueOnce(new Promise((resolve) => (release = resolve)))
  const { list, page } = setup(fetchPage)
  await flushPromises()

  page.value = 2
  await flushPromises()

  expect(list.items.value).toEqual([{ id: 'row1' }])
  expect(list.isPlaceholderData.value).toBe(true)
  release({ data: [{ id: 'row2' }], meta: { total: 25 } })
  await flushPromises()
  expect(list.items.value).toEqual([{ id: 'row2' }])
})

it('reports a readable error', async () => {
  const { list } = setup(() => Promise.reject(new Error('boom')))
  await flushPromises()

  expect(list.listError.value).toBeTruthy()
  expect(list.items.value).toEqual([])
})
