import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { landingService } from './landingService'

const api = vi.hoisted(() => ({
  getLandingDraft: vi.fn(),
  saveLandingSection: vi.fn(),
  uploadLandingImage: vi.fn(),
  publishLanding: vi.fn(),
  discardLanding: vi.fn(),
}))
vi.mock('../api/admissionApi', () => ({ admissionApi: api }))

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('vue-sonner', () => ({ toast }))

const overview = {
  sections: {},
  hasUnpublishedChanges: true,
  publishedAt: null,
}

beforeEach(() => vi.clearAllMocks())

describe('landingService', () => {
  it('fetches the draft overview', async () => {
    api.getLandingDraft.mockResolvedValue({ data: { data: overview } })
    await expect(landingService.fetchDraft()).resolves.toEqual({ overview })
  })

  it('reports a fetch failure as an error message without a toast', async () => {
    api.getLandingDraft.mockRejectedValue(new Error('down'))
    const result = await landingService.fetchDraft()
    expect(result).toHaveProperty('error')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('saves a section and toasts', async () => {
    api.saveLandingSection.mockResolvedValue({ data: { data: overview } })
    await expect(landingService.saveSection('hero', { a: 1 })).resolves.toEqual(
      { overview },
    )
    expect(api.saveLandingSection).toHaveBeenCalledWith('hero', { a: 1 })
    expect(toast.success).toHaveBeenCalledWith('Draf disimpan.')
  })

  it('toasts the server message when saving fails', async () => {
    api.saveLandingSection.mockRejectedValue({
      response: { data: { message: 'Isi tidak valid di eyebrow: ...' } },
    })
    const result = await landingService.saveSection('hero', {})
    expect(result).toHaveProperty('error')
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('uploads an image and returns its id and size', async () => {
    api.uploadLandingImage.mockResolvedValue({
      data: { data: { id: 'i1', width: 1080, height: 1920, sizeBytes: 9 } },
    })
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    await expect(landingService.uploadImage(file, 'poster')).resolves.toEqual({
      id: 'i1',
      width: 1080,
      height: 1920,
    })
    expect(api.uploadLandingImage).toHaveBeenCalledWith(file, 'poster')
  })

  it('toasts and reports an upload failure', async () => {
    api.uploadLandingImage.mockRejectedValue(new Error('boom'))
    const result = await landingService.uploadImage(
      new File(['x'], 'a.png'),
      'photo',
    )
    expect(result).toHaveProperty('error')
    expect(toast.error).toHaveBeenCalledTimes(1)
  })

  it('publishes and discards, returning the new overview', async () => {
    api.publishLanding.mockResolvedValue({ data: { data: overview } })
    api.discardLanding.mockResolvedValue({ data: { data: overview } })
    await expect(landingService.publish()).resolves.toEqual({ overview })
    expect(toast.success).toHaveBeenLastCalledWith('Halaman depan diterbitkan.')
    await expect(landingService.discard()).resolves.toEqual({ overview })
    expect(toast.success).toHaveBeenLastCalledWith('Perubahan draf dibuang.')
  })

  it('reports a publish with nothing to publish', async () => {
    api.publishLanding.mockRejectedValue(
      new AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: 'Tidak ada perubahan untuk diterbitkan' },
      }),
    )
    const result = await landingService.publish()
    expect(result).toEqual({ error: 'Tidak ada perubahan untuk diterbitkan' })
  })
})
