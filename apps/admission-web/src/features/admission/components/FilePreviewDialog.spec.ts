// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { AxiosError } from 'axios'
import { admissionApi } from '../api/admissionApi'
import FilePreviewDialog from './FilePreviewDialog.vue'

vi.mock('../api/admissionApi', () => ({
  admissionApi: { getFile: vi.fn() },
}))
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

const passthrough = { template: '<div><slot /></div>' }
const pdf = { id: 'f1', originalName: 'kk.pdf', mimeType: 'application/pdf' }
const image = { id: 'f2', originalName: 'foto.png', mimeType: 'image/png' }
const sheet = {
  id: 'f3',
  originalName: 'data.xlsx',
  mimeType: 'application/vnd.ms-excel',
}

function mountDialog(file: typeof pdf | null, open = true) {
  return mount(FilePreviewDialog, {
    props: { open, file },
    global: {
      stubs: {
        Dialog: passthrough,
        DialogContent: passthrough,
        DialogHeader: passthrough,
        DialogTitle: passthrough,
        DialogDescription: passthrough,
        DialogFooter: passthrough,
      },
    },
  })
}

const reply = () => ({ data: new Blob(['x']) }) as never

const revokeObjectURL = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  let counter = 0
  URL.createObjectURL = vi.fn(() => `blob:preview-${++counter}`)
  URL.revokeObjectURL = revokeObjectURL
  vi.mocked(admissionApi.getFile).mockResolvedValue(reply())
})

describe('FilePreviewDialog', () => {
  it('shows a PDF in an iframe loaded through the authenticated client', async () => {
    const wrapper = mountDialog(pdf)
    await flushPromises()

    expect(admissionApi.getFile).toHaveBeenCalledWith('f1')
    expect(wrapper.get('iframe').attributes('src')).toBe('blob:preview-1')
    expect(wrapper.get('iframe').attributes('title')).toBe('kk.pdf')
    expect(wrapper.text()).toContain('kk.pdf')
  })

  it('shows an image in an img', async () => {
    const wrapper = mountDialog(image)
    await flushPromises()

    expect(wrapper.get('img').attributes('src')).toBe('blob:preview-1')
    expect(wrapper.get('img').attributes('alt')).toBe('foto.png')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('offers only the download for a type it cannot show', async () => {
    const wrapper = mountDialog(sheet)
    await flushPromises()

    expect(admissionApi.getFile).not.toHaveBeenCalled()
    expect(wrapper.find('iframe').exists()).toBe(false)
    expect(wrapper.text()).toContain('Pratinjau tidak tersedia')
    expect(wrapper.text()).toContain('Unduh')
  })

  it('shows an error with a retry and recovers', async () => {
    vi.mocked(admissionApi.getFile).mockRejectedValueOnce(new Error('offline'))
    const wrapper = mountDialog(pdf)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Gagal memuat berkas.',
    )

    await wrapper.get('[role="alert"]').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.find('iframe').exists()).toBe(true)
  })

  it('releases the object URL when it closes and when another file opens', async () => {
    const wrapper = mountDialog(pdf)
    await flushPromises()

    await wrapper.setProps({ file: image })
    await flushPromises()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    expect(wrapper.get('img').attributes('src')).toBe('blob:preview-2')

    await wrapper.setProps({ open: false })
    await flushPromises()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-2')
  })

  it('never lets a slow answer for the previous file replace the current one', async () => {
    let resolveFirst: (value: unknown) => void = vi.fn()
    vi.mocked(admissionApi.getFile)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve
        }) as never,
      )
      .mockResolvedValueOnce(reply())
    const wrapper = mountDialog(pdf)
    await wrapper.setProps({ file: image })
    await flushPromises()

    resolveFirst(reply())
    await flushPromises()

    expect(wrapper.get('img').attributes('src')).toBe('blob:preview-1')
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('downloads through the same client', async () => {
    const wrapper = mountDialog(pdf)
    await flushPromises()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(vi.fn())

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Unduh'))!
      .trigger('click')
    await flushPromises()

    expect(admissionApi.getFile).toHaveBeenLastCalledWith('f1', true)
    expect(click).toHaveBeenCalledTimes(1)
  })
  it('shows the server message when the error body is a blob', async () => {
    const body = new Blob([
      JSON.stringify({ message: 'Berkas tidak ditemukan di penyimpanan' }),
    ])
    vi.mocked(admissionApi.getFile).mockRejectedValueOnce(
      new AxiosError('failed', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as never,
        data: body,
      }),
    )
    const wrapper = mountDialog(pdf)
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain(
      'Berkas tidak ditemukan di penyimpanan',
    )
  })

  it('does not stay loading when a file that needs no preview opens after a closed slow one', async () => {
    let resolveSlow: (value: unknown) => void = vi.fn()
    vi.mocked(admissionApi.getFile).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSlow = resolve
      }) as never,
    )
    const wrapper = mountDialog(pdf)
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ file: sheet, open: true })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Memuat berkas')
    expect(wrapper.text()).toContain('Pratinjau tidak tersedia')

    resolveSlow(reply())
    await flushPromises()
    expect(wrapper.find('iframe').exists()).toBe(false)
  })

  it('revokes the download URL only after the click had its turn', async () => {
    const wrapper = mountDialog(pdf)
    await flushPromises()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(vi.fn())
    vi.useFakeTimers({ toFake: ['setTimeout'] })

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Unduh'))!
      .trigger('click')
    await flushPromises()

    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:preview-2')
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-2')
    vi.useRealTimers()
  })
})
