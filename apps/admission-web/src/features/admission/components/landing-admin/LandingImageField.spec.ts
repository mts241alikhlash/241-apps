// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LandingImageField from './LandingImageField.vue'

const service = vi.hoisted(() => ({ uploadImage: vi.fn() }))
vi.mock('../../services/landingService', () => ({ landingService: service }))
vi.mock('../../api/admissionApi', () => ({
  admissionApi: {
    landingImageUrl: (id: string) => `/admissions/landing/images/${id}`,
  },
}))

const png = (name = 'a.png', size = 100) => {
  const file = new File(['x'], name, { type: 'image/png' })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

async function pick(wrapper: ReturnType<typeof mountField>, file: File) {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
  await flushPromises()
}

const mountField = (props: Record<string, unknown> = {}) =>
  mount(LandingImageField, {
    props: { modelValue: null, purpose: 'photo', label: 'Foto', ...props },
  })

beforeEach(() => vi.clearAllMocks())

describe('LandingImageField', () => {
  it('shows an empty state with an upload button', () => {
    const wrapper = mountField()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Belum ada foto')
    expect(wrapper.text()).toContain('Unggah foto')
  })

  it('previews an uploaded image and a built-in photo', () => {
    expect(
      mountField({ modelValue: { imageId: 'abc' } })
        .get('img')
        .attributes('src'),
    ).toBe('/admissions/landing/images/abc')
    expect(
      mountField({ modelValue: { src: '/hero/baiat.webp' } })
        .get('img')
        .attributes('src'),
    ).toBe('/hero/baiat.webp')
  })

  it('uploads the picked file and emits the new reference', async () => {
    service.uploadImage.mockResolvedValue({ id: 'new1', width: 10, height: 10 })
    const wrapper = mountField({ purpose: 'poster' })
    const file = png()

    await pick(wrapper, file)

    expect(service.uploadImage).toHaveBeenCalledWith(file, 'poster')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      { imageId: 'new1' },
    ])
  })

  it('refuses a wrong type or a big file before uploading', async () => {
    const wrapper = mountField()
    await pick(wrapper, new File(['x'], 'a.pdf', { type: 'application/pdf' }))
    expect(wrapper.text()).toContain('Gambar harus JPG, PNG, atau WebP.')
    await pick(wrapper, png('big.png', 6 * 1024 * 1024))
    expect(wrapper.text()).toContain('Ukuran gambar maksimal 5 MB.')
    expect(service.uploadImage).not.toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps the previous image when the upload fails', async () => {
    service.uploadImage.mockResolvedValue({ error: 'Gagal mengunggah gambar.' })
    const wrapper = mountField({ modelValue: { imageId: 'old' } })
    await pick(wrapper, png())
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('img').attributes('src')).toBe(
      '/admissions/landing/images/old',
    )
  })

  it('offers the built-in photo only where one exists', async () => {
    expect(mountField().text()).not.toContain('Pakai foto bawaan')
    const wrapper = mountField({
      modelValue: { imageId: 'abc' },
      builtIn: '/hero/baiat.webp',
    })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Pakai foto bawaan')!
      .trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      { src: '/hero/baiat.webp' },
    ])
  })

  it('offers removal only for an optional image', async () => {
    expect(mountField({ modelValue: { imageId: 'abc' } }).text()).not.toContain(
      'Hapus foto',
    )
    const wrapper = mountField({
      modelValue: { imageId: 'abc' },
      optional: true,
    })
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Hapus foto')!
      .trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([null])
  })

  it('disables every control when disabled and shows an error', () => {
    const wrapper = mountField({
      disabled: true,
      error: 'Pilih foto.',
      modelValue: { imageId: 'abc' },
    })
    expect(
      wrapper
        .findAll('button')
        .every((b) => b.attributes('disabled') !== undefined),
    ).toBe(true)
    expect(
      wrapper.get('input[type="file"]').attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.text()).toContain('Pilih foto.')
  })

  it('names every button after the image it belongs to and keeps the hidden file input out of the tab order', () => {
    const wrapper = mountField({
      label: 'Poster (potret 9:16)',
      modelValue: { imageId: 'abc' },
      builtIn: '/hero/baiat.webp',
      optional: true,
    })
    expect(
      wrapper.findAll('button').map((b) => b.attributes('aria-label')),
    ).toEqual([
      'Ganti foto: Poster (potret 9:16)',
      'Pakai foto bawaan: Poster (potret 9:16)',
      'Hapus foto: Poster (potret 9:16)',
    ])
    expect(wrapper.get('input[type="file"]').attributes('tabindex')).toBe('-1')
  })

  it('names the upload button after the image when empty', () => {
    const wrapper = mountField({ label: 'Foto besar' })
    expect(wrapper.get('button').attributes('aria-label')).toBe(
      'Unggah foto: Foto besar',
    )
  })
})
