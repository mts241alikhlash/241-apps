import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'vue-sonner'
import { mediaApi } from '../api/mediaApi'
import { mediaService } from './mediaService'

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('../api/mediaApi', () => ({
  mediaApi: { upload: vi.fn(), library: vi.fn(), usage: vi.fn() },
}))

const FIVE_MB = 5 * 1024 * 1024

function imageOfSize(bytes: number): File {
  return new File([new Uint8Array(bytes)], 'banner.png', { type: 'image/png' })
}

describe('mediaService.upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('refuses an image over 5 MB without sending it', async () => {
    const result = await mediaService.upload(imageOfSize(FIVE_MB + 1))

    expect(result).toBeNull()
    expect(mediaApi.upload).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith(
      'Ukuran gambar melebihi batas maksimal 5 MB.',
    )
  })

  it('sends an image of exactly 5 MB', async () => {
    vi.mocked(mediaApi.upload).mockResolvedValue({
      data: { data: { id: 'f-1', url: 'https://cdn/f-1' } },
    } as never)

    const result = await mediaService.upload(imageOfSize(FIVE_MB))

    expect(mediaApi.upload).toHaveBeenCalled()
    expect(result?.id).toBe('f-1')
  })
})
