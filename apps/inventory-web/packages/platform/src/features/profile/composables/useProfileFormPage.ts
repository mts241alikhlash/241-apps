import { useForm } from 'vee-validate'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { useAuthSession } from '@/features/platform/auth'
import { profileFormSchema } from './profileFormSchema'
import { useProfile } from './useProfile'
import type {
  ProfileUpdatePayload,
  RawProfileData,
  MaritalStatus,
} from '../types'

export function useProfileFormPage() {
  const route = useRoute()
  const router = useRouter()
  const { user: authUser } = useAuthSession()

  const { loading, rawProfile, isSaving, fetchProfileData, updateProfile } =
    useProfile()

  const routeRole = computed(() => route.params.role as string | undefined)
  const routeId = computed(() => route.params.id as string | undefined)
  const isViewingOther = computed(() => !!routeRole.value && !!routeId.value)

  const activeTab = ref('utama')

  const form = useForm({
    validationSchema: profileFormSchema,
    initialValues: {
      name: '',
      nik: '',
      gender: undefined as 'MALE' | 'FEMALE' | undefined,
      birthPlace: '',
      birthDate: '',
      email: '',
      phone: '',
      bloodTypeId: undefined as string | undefined,
      religionId: undefined as string | undefined,
      maritalStatus: undefined as MaritalStatus | undefined,
      kk: '',
      npwp: '',
    },
  })

  function populate(data: RawProfileData | null) {
    form.resetForm({
      values: {
        name: data?.name ?? '',
        nik: data?.nik ?? '',
        gender: data?.gender ?? undefined,
        birthPlace: data?.birthPlace ?? '',
        birthDate: data?.birthDate
          ? String(data.birthDate).substring(0, 10)
          : '',
        email: data?.email ?? '',
        phone: data?.phone ?? '',
        bloodTypeId: data?.bloodTypeId ?? data?.bloodType?.id ?? undefined,
        religionId: data?.religionId ?? data?.religion?.id ?? undefined,
        maritalStatus: data?.maritalStatus ?? undefined,
        kk: data?.noKk ?? '',
        npwp: data?.npwp ?? '',
      },
    })
  }

  onMounted(async () => {
    if (!authUser.value) return
    await fetchProfileData(
      authUser.value,
      isViewingOther.value,
      routeRole.value,
      routeId.value,
    )
    populate(rawProfile.value)
  })

  function back() {
    if (isViewingOther.value) {
      void router.push({
        name: 'profile-other-view',
        params: { role: routeRole.value, id: routeId.value },
      })
    } else {
      void router.push({ name: 'profile-view' })
    }
  }

  const onSubmit = form.handleSubmit(
    async (values) => {
      const payload: ProfileUpdatePayload = {
        name: values.name,
        nik: values.nik,
        gender: values.gender,
        birthPlace: values.birthPlace,
        birthDate: values.birthDate,
        email: values.email === '' ? null : values.email,
        phone: values.phone === '' ? null : values.phone,
        bloodTypeId:
          !values.bloodTypeId || values.bloodTypeId === 'none'
            ? null
            : values.bloodTypeId,
        religionId:
          !values.religionId || values.religionId === 'none'
            ? null
            : values.religionId,
        maritalStatus:
          !values.maritalStatus || values.maritalStatus === 'none'
            ? null
            : values.maritalStatus,
        noKk: values.kk === '' ? null : values.kk,
        npwp: values.npwp === '' ? null : values.npwp,
      }

      const targetUserId = isViewingOther.value
        ? (rawProfile.value?.userId ?? rawProfile.value?.id)
        : undefined

      const { success } = await updateProfile(payload, targetUserId)
      if (success) back()
    },
    () => {
      toast.error('Gagal Menyimpan', {
        description:
          'Ada input yang belum valid atau masih kosong di tab sebelumnya.',
      })
    },
  )

  async function handleNext() {
    const result = await form.validate()
    if (result.valid) activeTab.value = 'lanjutan'
  }

  function handleBack() {
    if (activeTab.value === 'lanjutan') {
      activeTab.value = 'utama'
    } else {
      back()
    }
  }

  return {
    loading,
    isSaving,
    activeTab,
    form,
    onSubmit,
    handleNext,
    handleBack,
  }
}
