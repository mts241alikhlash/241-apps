// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import PostFormView from './PostFormView.vue'

const { create, routeState } = vi.hoisted(() => ({
  create: vi.fn(),
  routeState: {
    params: { type: 'artikel' },
    meta: {},
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}))

vi.mock('@/features/taxonomy', () => ({
  categoryService: { list: vi.fn().mockResolvedValue([]) },
}))

vi.mock('../services/postService', () => ({
  postService: {
    create,
    fetchOne: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    transition: vi.fn(),
  },
}))

beforeEach(() => {
  setActivePinia(createPinia())
  create.mockReset().mockResolvedValue({ id: 'post-1' })
})

it('creates the content type the list opened the form for', async () => {
  const wrapper = mount(PostFormView, {
    global: {
      stubs: {
        RichTextEditor: true,
        CoverImagePicker: true,
        MediaLibraryDialog: true,
        DatePicker: true,
      },
    },
  })
  await flushPromises()

  expect(wrapper.text()).toContain('Tulis Artikel')
  await wrapper.get('input#title').setValue('Judul artikel')
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('Simpan draf'))!
    .trigger('click')
  await flushPromises()

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'ARTIKEL' }),
  )
})
