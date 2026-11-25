import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
import type { AssessmentType } from '@/features/assessment/assessment-item'
import { ASSESSMENT_TYPE_ORDER } from '@/features/assessment/assessment-item/constants/category'
import { extractRdmErrorMessage, rdmService } from '../services/rdmService'
import type { RdmSetting } from '../types'

const ORDERED_ASSESSMENT_TYPES = (
  Object.keys(ASSESSMENT_TYPE_ORDER) as AssessmentType[]
).sort((a, b) => ASSESSMENT_TYPE_ORDER[a] - ASSESSMENT_TYPE_ORDER[b])

export function isAssessmentType(value: string): value is AssessmentType {
  return value in ASSESSMENT_TYPE_ORDER
}

function normalizeSumatifTypes(
  types: AssessmentType[],
  sasType: AssessmentType | null,
): AssessmentType[] {
  const unique = new Set(types)
  if (sasType) unique.delete(sasType)
  return ORDERED_ASSESSMENT_TYPES.filter((type) => unique.has(type))
}

export function useRdmSetting() {
  const sumatifTypes = ref<AssessmentType[]>([])
  const sasType = ref<AssessmentType | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref<string | null>(null)
  const saveError = ref<string | null>(null)

  const hasEmptySumatif = computed(
    () => sasType.value !== null && sumatifTypes.value.length === 0,
  )

  const isValid = computed(
    () => sasType.value !== null && sumatifTypes.value.length > 0,
  )

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = null
    saveError.value = null
    try {
      const setting = await rdmService.getSettings()
      sasType.value = setting.sasType
      sumatifTypes.value = normalizeSumatifTypes(
        setting.sumatifTypes,
        setting.sasType,
      )
    } catch (err: unknown) {
      loadError.value = await extractRdmErrorMessage(
        err,
        'Gagal memuat pengaturan RDM.',
      )
    } finally {
      loading.value = false
    }
  }

  function toggleSumatif(type: AssessmentType, checked: boolean): void {
    if (type === sasType.value) return
    saveError.value = null
    const next = checked
      ? [...sumatifTypes.value, type]
      : sumatifTypes.value.filter((item) => item !== type)
    sumatifTypes.value = normalizeSumatifTypes(next, sasType.value)
  }

  function setSasType(type: AssessmentType): void {
    saveError.value = null
    sasType.value = type
    sumatifTypes.value = normalizeSumatifTypes(sumatifTypes.value, type)
  }

  async function save(): Promise<boolean> {
    if (!isValid.value || saving.value || sasType.value === null) return false

    saving.value = true
    saveError.value = null
    const payload: RdmSetting = {
      sumatifTypes: [...sumatifTypes.value],
      sasType: sasType.value,
    }
    try {
      const updated = await rdmService.updateSettings(payload)
      sasType.value = updated.sasType
      sumatifTypes.value = normalizeSumatifTypes(
        updated.sumatifTypes,
        updated.sasType,
      )
      toast.success('Pengaturan RDM berhasil disimpan.')
      return true
    } catch (err: unknown) {
      saveError.value = await extractRdmErrorMessage(
        err,
        'Gagal menyimpan pengaturan RDM.',
      )
      return false
    } finally {
      saving.value = false
    }
  }

  return {
    assessmentTypes: ORDERED_ASSESSMENT_TYPES,
    sumatifTypes,
    sasType,
    loading,
    saving,
    loadError,
    saveError,
    hasEmptySumatif,
    isValid,
    load,
    toggleSumatif,
    setSasType,
    save,
  }
}
