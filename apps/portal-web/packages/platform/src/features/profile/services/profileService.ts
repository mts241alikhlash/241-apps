import { useProfileStore } from '../stores/profileStore'
import { profileApi } from '../api/profileApi'
import { addressApi } from '../../address'
import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { useAuthStore } from '@/features/platform/auth'
import { profileConfig } from '../config'
import type { AuthUser, ProfileUpdatePayload, AddressRecord } from '../types'

const MAX_PHOTO_BYTES = 5 * 1024 * 1024

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function loadAddresses(
  isViewingOther: boolean,
  targetId?: string,
): Promise<AddressRecord[]> {
  try {
    const res =
      isViewingOther && targetId
        ? await addressApi.getAddressesByUserId(targetId)
        : await addressApi.getMyAddresses()
    const data = res.data.data as AddressRecord | AddressRecord[] | null
    if (Array.isArray(data)) return data
    return data ? [data] : []
  } catch {
    return []
  }
}

async function loadSchoolIdentity(context: {
  userId: string
  isOwnProfile: boolean
  roles: string[]
}) {
  const provider = profileConfig.value.schoolIdentityProvider
  if (!provider || !context.userId) return null
  try {
    return await provider(context)
  } catch {
    return null
  }
}

export const profileService = {
  fetchProfileData: async (
    authUser: AuthUser,
    isViewingOther: boolean,
    _targetRole?: string,
    targetId?: string,
  ) => {
    const store = useProfileStore()
    store.loading = true

    try {
      if (!isViewingOther && (!authUser?.id || !authUser?.roles?.length)) {
        toast.error('Sesi tidak valid', { description: 'Silakan login ulang.' })
        return
      }

      const res =
        isViewingOther && targetId
          ? await profileApi.getProfileByUserId(targetId)
          : await profileApi.getMyProfile()

      const profile = res.data.data
      if (!profile?.id) {
        toast.error('Profil tidak ditemukan')
        return
      }

      const addresses = await loadAddresses(isViewingOther, targetId)
      const primaryAddress = addresses.find((a) => a.isPrimary) ?? addresses[0]
      const roles = [...(authUser?.roles ?? [])] as string[]

      store.rawProfile = {
        ...profile,
        roles,
        address: primaryAddress ?? null,
        addresses,
      }

      const schoolIdentity = await loadSchoolIdentity({
        userId: profile.userId ?? profile.id ?? '',
        isOwnProfile: !isViewingOther,
        roles,
      })

      store.profileData = {
        roles,
        schoolIdentity: schoolIdentity ?? undefined,
        avatar: profile.avatarUrl ?? null,
        nik: profile.nik,
        fullName: profile.name,
        birthPlace: profile.birthPlace,
        birthDate: formatDate(profile.birthDate),
        gender: profile.gender,
        email: profile.email,
        phone: profile.phone,
        bloodType: profile.bloodType?.name ?? null,
        religion: profile.religion?.name ?? null,
        maritalStatus: profile.maritalStatus,
        kk: profile.noKk,
        npwp: profile.npwp,
        identifier: profile.identifier,
        address: primaryAddress
          ? {
              street: primaryAddress.street,
              rt: primaryAddress.rt,
              rw: primaryAddress.rw,
              village: primaryAddress.village,
              district: primaryAddress.district,
              city: primaryAddress.city,
              province: primaryAddress.province,
              country: primaryAddress.country ?? 'Indonesia',
              postalCode: primaryAddress.postalCode,
            }
          : null,
      }
    } catch (err: unknown) {
      toast.error('Gagal memuat data profil', {
        description: getIndonesianErrorMessage(
          err,
          'Terjadi kesalahan saat mengambil data.',
        ),
      })
    } finally {
      store.loading = false
    }
  },

  updateProfile: async (payload: ProfileUpdatePayload, userId?: string) => {
    const store = useProfileStore()
    store.isSaving = true
    try {
      if (userId) {
        await profileApi.updateProfileByUserId(userId, payload)
      } else {
        await profileApi.updateMyProfile(payload)
      }

      if (!userId) {
        const authStore = useAuthStore()
        if (authStore.user && payload.name) {
          authStore.setUser({
            ...authStore.user,
            profile: { ...authStore.user.profile, name: payload.name },
          })
        }
      }

      toast.success('Berhasil', {
        description: 'Data diri berhasil diperbarui',
      })
      return { success: true }
    } catch (err: unknown) {
      toast.error('Gagal memperbarui profil', {
        description: getIndonesianErrorMessage(
          err,
          'Terjadi kesalahan saat menyimpan data.',
        ),
      })
      return { success: false }
    } finally {
      store.isSaving = false
    }
  },

  setPhoto: async (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error('Ukuran foto melebihi batas maksimal 5 MB.')
      return { success: false }
    }
    const store = useProfileStore()
    store.isUploadingPhoto = true
    try {
      const res = await profileApi.setMyPhoto(file)
      const avatar = res.data.data?.avatarUrl ?? null

      store.rawProfile = { ...store.rawProfile, avatar }
      store.profileData = { ...store.profileData, avatar }

      const authStore = useAuthStore()
      if (authStore.user) {
        authStore.setUser({
          ...authStore.user,
          profile: { ...authStore.user.profile, avatar },
        })
      }

      toast.success('Berhasil', { description: 'Foto profil diperbarui' })
      return { success: true }
    } catch (err: unknown) {
      toast.error('Gagal mengunggah foto profil', {
        description: getIndonesianErrorMessage(
          err,
          'Terjadi kesalahan saat mengunggah foto.',
        ),
      })
      return { success: false }
    } finally {
      store.isUploadingPhoto = false
    }
  },

  clearPhoto: async () => {
    const store = useProfileStore()
    store.isUploadingPhoto = true
    try {
      await profileApi.clearMyPhoto()

      store.rawProfile = { ...store.rawProfile, avatar: null }
      store.profileData = { ...store.profileData, avatar: null }

      const authStore = useAuthStore()
      if (authStore.user) {
        authStore.setUser({
          ...authStore.user,
          profile: { ...authStore.user.profile, avatar: null },
        })
      }

      toast.success('Berhasil', { description: 'Foto profil dihapus' })
      return { success: true }
    } catch (err: unknown) {
      toast.error('Gagal menghapus foto profil', {
        description: getIndonesianErrorMessage(
          err,
          'Terjadi kesalahan saat menghapus foto.',
        ),
      })
      return { success: false }
    } finally {
      store.isUploadingPhoto = false
    }
  },
}
