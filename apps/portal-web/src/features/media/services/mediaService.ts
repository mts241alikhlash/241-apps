import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { mediaApi } from '../api/mediaApi'
import type { MediaLibraryItem, MediaUsage } from '../types'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const mediaService = {
  async library(): Promise<MediaLibraryItem[]> {
    try {
      const { data } = await mediaApi.library()
      return data.data ?? []
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat galeri media.'),
      )
      return []
    }
  },

  async upload(file: File): Promise<MediaLibraryItem | null> {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error('Ukuran gambar melebihi batas maksimal 5 MB.')
      return null
    }
    try {
      const { data } = await mediaApi.upload(file)
      const uploaded = data.data
      toast.success('Gambar diunggah.')
      return {
        id: uploaded.id,
        filename: file.name,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        createdAt: new Date().toISOString(),
        previewUrl: uploaded.url,
        publicUrl: `/portal/public/media/${uploaded.id}`,
      }
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal mengunggah gambar.'))
      return null
    }
  },

  async usage(fileId: string): Promise<MediaUsage | null> {
    try {
      const { data } = await mediaApi.usage(fileId)
      return data.data
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat penggunaan berkas.'),
      )
      return null
    }
  },
}
