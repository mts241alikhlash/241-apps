// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import QuestionHtml from './QuestionHtml.vue'
import { resetExamImageCache } from '../composables/useExamImage'

const { getImage } = vi.hoisted(() => ({
  getImage: vi.fn(),
}))
vi.mock('../api/examBankApi', () => ({ examBankApi: { getImage } }))

describe('QuestionHtml', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetExamImageCache()
    URL.createObjectURL = vi.fn(() => 'blob:gambar-1')
  })

  it('shows Arabic text with harakat inside an element that sets its own direction', () => {
    const arabic = 'مَا مَعْنَى كِتَابٌ؟'
    const wrapper = mount(QuestionHtml, {
      props: { html: `<p>${arabic}</p>` },
    })

    const holder = wrapper.get('[dir="auto"]')
    expect(holder.text()).toContain(arabic)
  })

  it('renders a formula as KaTeX', () => {
    const wrapper = mount(QuestionHtml, {
      props: {
        html: '<p><span data-latex="\\frac{1}{2}">\\frac{1}{2}</span></p>',
      },
    })

    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('data-latex')
  })

  it('loads each picture through the exam files API', async () => {
    getImage.mockResolvedValue({ data: new Blob(['x'], { type: 'image/png' }) })
    const wrapper = mount(QuestionHtml, {
      props: {
        html: '<p><img data-file-id="3d2a9b2e-0000-4000-8000-000000000001"></p>',
      },
    })
    await flushPromises()

    expect(getImage).toHaveBeenCalledWith(
      '3d2a9b2e-0000-4000-8000-000000000001',
    )
    expect(wrapper.get('img').attributes('src')).toBe('blob:gambar-1')
  })

  it('asks for the same picture only once', async () => {
    getImage.mockResolvedValue({ data: new Blob(['x']) })
    mount(QuestionHtml, {
      props: {
        html: '<p><img data-file-id="3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e"><img data-file-id="3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e"></p>',
      },
    })
    mount(QuestionHtml, {
      props: {
        html: '<p><img data-file-id="3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e"></p>',
      },
    })
    await flushPromises()

    expect(getImage).toHaveBeenCalledTimes(1)
  })

  it('says so when a picture cannot be loaded', async () => {
    getImage.mockRejectedValue(new Error('403'))
    const wrapper = mount(QuestionHtml, {
      props: {
        html: '<p><img data-file-id="3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e"></p>',
      },
    })
    await flushPromises()

    expect(wrapper.get('img').attributes('alt')).toBe(
      'Gambar tidak bisa dimuat',
    )
  })

  it('never asks the API for a file id that is not a UUID', async () => {
    const wrapper = mount(QuestionHtml, {
      props: { html: '<p>x<img data-file-id="../../users/me"></p>' },
    })
    await flushPromises()

    expect(getImage).not.toHaveBeenCalled()
    expect(wrapper.find('img').exists()).toBe(false)
  })
})
