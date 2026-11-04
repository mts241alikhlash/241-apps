import { computed, ref, type Ref, type ComputedRef, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthSession, useRoleGuard } from '@/features/platform/auth'
import { useProfile } from './useProfile'
import { useProfileDialogs } from './useProfileDialogs'
import { PencilLine } from '@lucide/vue'
import type {
  ProfileUpdatePayload,
  RawProfileData,
  ProfileStoreData,
} from '../types'
import { profileConfig } from '../config'
import { toast } from 'vue-sonner'

export interface ProfileViewReturn {
  activeTab: Ref<string>
  showEditAddress: Ref<boolean>
  loading: Ref<boolean>
  profileData: Ref<ProfileStoreData | null>
  rawProfile: Ref<RawProfileData | null>
  isSaving: Ref<boolean>
  isUploadingPhoto: Ref<boolean>
  isAdmin: ComputedRef<boolean>
  isEditable: ComputedRef<boolean>
  isOwnProfile: ComputedRef<boolean>
  initials: ComputedRef<string>
  profileSubtitle: ComputedRef<string>
  avatarUrl: ComputedRef<string | null>
  getUserId: ComputedRef<string>
  actionConfig: ComputedRef<{ text: string; icon: Component }>
  reloadProfile: () => void
  handleActionClick: (tabId: string) => void
  handlePhotoChange: (file: File) => Promise<void>
  handlePhotoDelete: () => Promise<void>
  handleUpdateProfile: (payload: ProfileUpdatePayload) => Promise<void>
}

export function useProfileView(): ProfileViewReturn {
  const route = useRoute()
  const router = useRouter()
  const activeTab = ref('personal')
  const { user: authUser } = useAuthSession()

  const { can } = useRoleGuard()
  const routeRole = computed(() => route.params.role as string | undefined)
  const routeId = computed(() => route.params.id as string | undefined)
  const isViewingOther = computed(() => !!routeRole.value && !!routeId.value)
  const isAdmin = computed(() => can('profiles.update'))

  const dialogs = useProfileDialogs()

  const {
    loading,
    profileData,
    rawProfile,
    isSaving,
    isUploadingPhoto,
    fetchProfileData,
    updateProfile,
    setPhoto,
    clearPhoto,
  } = useProfile()

  const isOwnProfile = computed(() => !isViewingOther.value)

  const editRoute = computed(() =>
    isViewingOther.value
      ? {
          name: 'profile-other-edit',
          params: { role: routeRole.value, id: routeId.value },
        }
      : { name: 'profile-edit' },
  )

  const reloadProfile = () => {
    if (!authUser.value) return
    void fetchProfileData(
      authUser.value,
      isViewingOther.value,
      routeRole.value,
      routeId.value,
    )
  }

  const handleUpdateProfile = async (payload: ProfileUpdatePayload) => {
    const targetUserId = isViewingOther.value ? getUserId.value : undefined
    const { success } = await updateProfile(payload, targetUserId)
    if (success) reloadProfile()
  }

  const isEditable = computed(() => {
    if (activeTab.value === 'personal') return isAdmin.value
    if (activeTab.value === 'address') return isAdmin.value
    const extraTab = profileConfig.value.extraTabs.find(
      (t) => t.value === activeTab.value,
    )
    if (extraTab) {
      if (extraTab.value === 'positions' || extraTab.value === 'identity') {
        return isAdmin.value
      }
      return extraTab.isEditable ?? false
    }
    return false
  })

  const actionConfig = computed(() => {
    const extraTab = profileConfig.value.extraTabs.find(
      (t) => t.value === activeTab.value,
    )
    if (extraTab?.actionConfig) {
      return extraTab.actionConfig
    }
    switch (activeTab.value) {
      case 'personal':
        return { text: 'Ubah Data Diri', icon: PencilLine }
      case 'address':
        return { text: 'Ubah Alamat', icon: PencilLine }
      default:
        return { text: 'Ubah Data', icon: PencilLine }
    }
  })

  const handleActionClick = (tabId: string) => {
    const extraTab = profileConfig.value.extraTabs.find(
      (t) => t.value === tabId,
    )
    if (extraTab?.onActionClick) {
      extraTab.onActionClick({
        rawProfile: rawProfile.value,
        profileData: profileData.value,
        getUserId: getUserId.value,
        reloadProfile,
      })
      return
    }
    if (tabId === 'personal') {
      void router.push(editRoute.value)
    } else if (tabId === 'address') {
      dialogs.showEditAddress.value = true
    } else {
      toast.info(`Fitur edit untuk tab ${tabId} akan segera hadir`)
    }
  }

  const initials = computed(() => {
    const name = profileData.value?.fullName ?? ''
    return (
      name
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase() || '?'
    )
  })

  const profileSubtitle = computed(() => {
    const identity = profileData.value?.schoolIdentity
    if (identity?.className && !identity.primaryPosition) {
      return `Siswa Kelas ${identity.className}`
    }
    return identity?.primaryPosition ?? '-'
  })

  const getUserId = computed(() => {
    return (
      rawProfile.value?.userId ??
      rawProfile.value?.id ??
      authUser.value?.id ??
      ''
    )
  })

  const avatarUrl = computed(() => profileData.value?.avatar ?? null)

  const handlePhotoChange = async (file: File) => {
    const { success } = await setPhoto(file)
    if (success) reloadProfile()
  }

  const handlePhotoDelete = async () => {
    const { success } = await clearPhoto()
    if (success) reloadProfile()
  }

  return {
    activeTab,
    ...dialogs,
    loading,
    profileData,
    rawProfile,
    isSaving,
    isUploadingPhoto,
    isAdmin,
    isEditable,
    isOwnProfile,
    initials,
    profileSubtitle,
    avatarUrl,
    getUserId,
    actionConfig,
    reloadProfile,
    handleActionClick,
    handleUpdateProfile,
    handlePhotoChange,
    handlePhotoDelete,
  }
}
