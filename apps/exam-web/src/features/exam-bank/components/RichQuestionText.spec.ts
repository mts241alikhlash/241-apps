// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import RichQuestionText from './RichQuestionText.vue'

const { uploadImage, getImage, toastError } = vi.hoisted(() => ({
  uploadImage: vi.fn(),
  getImage: vi.fn(),
  toastError: vi.fn(),
}))
vi.mock('../api/examBankApi', () => ({
  examBankApi: { uploadImage, getImage },
}))
vi.mock('vue-sonner', () => ({
  toast: { error: toastError, success: vi.fn() },
}))

interface Exposed {
  insertMath: (latex: string) => void
  uploadImage: (file: File) => Promise<void>
}

function mountEditor(initial = '<p>Soal</p>') {
  const wrapper = mount(RichQuestionText, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: string) =>
        wrapper.setProps({ modelValue: value }),
      label: 'Soal',
    },
  })
  return wrapper
}

describe('RichQuestionText', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    URL.createObjectURL = vi.fn(() => 'blob:x')
  })

  it('writes a formula as a data-latex span', async () => {
    const wrapper = mountEditor()
    await flushPromises()

    ;(wrapper.vm as unknown as Exposed).insertMath('\\frac{1}{2}')
    await flushPromises()

    expect(wrapper.props('modelValue')).toContain(
      '<span data-latex="\\frac{1}{2}">\\frac{1}{2}</span>',
    )
    expect(wrapper.find('.katex').exists()).toBe(true)
  })

  it('writes an uploaded picture as an img with the file id only', async () => {
    uploadImage.mockResolvedValue({
      data: {
        data: {
          id: '3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e',
          mimeType: 'image/png',
          sizeBytes: 10,
        },
      },
    })
    getImage.mockResolvedValue({ data: new Blob(['x']) })
    const wrapper = mountEditor()
    await flushPromises()

    await (wrapper.vm as unknown as Exposed).uploadImage(
      new File(['x'], 'grafik.png', { type: 'image/png' }),
    )
    await flushPromises()

    const html = String(wrapper.props('modelValue'))
    expect(html).toContain(
      '<img data-file-id="3d2a9b2e-6a4f-4b1c-9d0e-1f2a3b4c5d6e">',
    )
    expect(html).not.toContain('src=')
  })

  it('refuses a picture of the wrong type or over 2 MB before uploading', async () => {
    const wrapper = mountEditor()
    await flushPromises()
    const exposed = wrapper.vm as unknown as Exposed

    await exposed.uploadImage(new File(['x'], 'a.gif', { type: 'image/gif' }))
    await exposed.uploadImage(
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'b.png', {
        type: 'image/png',
      }),
    )

    expect(uploadImage).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith('Gambar harus JPG, PNG, atau WebP.')
    expect(toastError).toHaveBeenCalledWith('Ukuran gambar maksimal 2 MB.')
  })

  it('keeps Arabic text with harakat and gives each block its own direction', async () => {
    const arabic = 'مَا مَعْنَى كِتَابٌ؟'
    const wrapper = mountEditor(`<p>${arabic}</p>`)
    await flushPromises()

    ;(wrapper.vm as unknown as Exposed).insertMath('x')
    await flushPromises()

    const html = String(wrapper.props('modelValue'))
    expect(html).toContain(arabic)
    expect(html).toContain('<p dir="auto">')
  })
})
