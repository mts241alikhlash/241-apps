import { toast } from 'vue-sonner'
import { admissionApi } from '../api/admissionApi'
import type {
  LandingDraftOverview,
  LandingImagePurpose,
  LandingSectionKey,
} from '../types/landing'
import { admissionErrorMessage } from '../utils'

type OverviewResult = { overview: LandingDraftOverview } | { error: string }

async function overviewCall(
  call: () => Promise<{ data: { data: LandingDraftOverview } }>,
  success: string | null,
  failure: string,
): Promise<OverviewResult> {
  try {
    const overview = (await call()).data.data
    if (success) toast.success(success)
    return { overview }
  } catch (error: unknown) {
    const message = admissionErrorMessage(error, failure)
    toast.error(message)
    return { error: message }
  }
}

export const landingService = {
  fetchDraft: async (): Promise<OverviewResult> => {
    try {
      return { overview: (await admissionApi.getLandingDraft()).data.data }
    } catch (error: unknown) {
      return {
        error: admissionErrorMessage(
          error,
          'Gagal memuat pengaturan halaman depan.',
        ),
      }
    }
  },

  saveSection: (key: LandingSectionKey, content: unknown) =>
    overviewCall(
      () => admissionApi.saveLandingSection(key, content),
      'Draf disimpan.',
      'Gagal menyimpan draf.',
    ),

  uploadImage: async (
    file: File,
    purpose: LandingImagePurpose,
  ): Promise<
    { id: string; width: number; height: number } | { error: string }
  > => {
    try {
      const { id, width, height } = (
        await admissionApi.uploadLandingImage(file, purpose)
      ).data.data
      return { id, width, height }
    } catch (error: unknown) {
      const message = admissionErrorMessage(error, 'Gagal mengunggah gambar.')
      toast.error(message)
      return { error: message }
    }
  },

  publish: () =>
    overviewCall(
      () => admissionApi.publishLanding(),
      'Halaman depan diterbitkan.',
      'Gagal menerbitkan.',
    ),

  discard: () =>
    overviewCall(
      () => admissionApi.discardLanding(),
      'Perubahan draf dibuang.',
      'Gagal membuang perubahan.',
    ),
}
