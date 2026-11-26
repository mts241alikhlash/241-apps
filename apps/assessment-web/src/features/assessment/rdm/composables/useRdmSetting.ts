import { computed, nextTick, ref } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import type { AssessmentType } from '@/features/assessment/assessment-item'
import { ASSESSMENT_TYPE_ORDER } from '@/features/assessment/assessment-item/constants/category'
import { extractRdmErrorMessage, rdmService } from '../services/rdmService'
import type { RdmSetting } from '../types'

const ORDERED_ASSESSMENT_TYPES = (
  Object.keys(ASSESSMENT_TYPE_ORDER) as AssessmentType[]
).sort((a, b) => ASSESSMENT_TYPE_ORDER[a] - ASSESSMENT_TYPE_ORDER[b])

const assessmentTypeSchema = z.enum([
  'DAILY',
  'ASSIGNMENT',
  'PRACTICAL',
  'MIDTERM',
  'FINAL',
])

export const rdmSettingSchema = z
  .object({
    sumatifTypes: z
      .array(assessmentTypeSchema)
      .min(1, 'Pilih minimal satu jenis penilaian untuk Sumatif'),
    sasType: assessmentTypeSchema,
  })
  .refine((data) => !data.sumatifTypes.includes(data.sasType), {
    message: 'Jenis penilaian SAS tidak boleh juga dipakai untuk Sumatif',
    path: ['sumatifTypes'],
  })

interface RdmSettingFormValues {
  sumatifTypes: AssessmentType[]
  sasType: AssessmentType | undefined
}

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
  const loading = ref(false)
  const saving = ref(false)
  const loadError = ref<string | null>(null)
  const saveError = ref<string | null>(null)

  const form = useForm<RdmSettingFormValues>({
    validationSchema: toTypedSchema(rdmSettingSchema),
    initialValues: {
      sumatifTypes: [],
      sasType: undefined,
    },
  })

  form.defineField('sumatifTypes')
  form.defineField('sasType')

  const sumatifTypes = computed(() => form.values.sumatifTypes ?? [])
  const sasType = computed(() => form.values.sasType ?? null)

  const isValid = computed(
    () =>
      rdmSettingSchema.safeParse({
        sumatifTypes: sumatifTypes.value,
        sasType: sasType.value,
      }).success,
  )

  async function load(): Promise<void> {
    loading.value = true
    loadError.value = null
    saveError.value = null
    try {
      const setting = await rdmService.getSettings()
      form.resetForm({
        values: {
          sumatifTypes: normalizeSumatifTypes(
            setting.sumatifTypes,
            setting.sasType,
          ),
          sasType: setting.sasType,
        },
      })
      await nextTick()
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
    form.setFieldValue(
      'sumatifTypes',
      normalizeSumatifTypes(next, sasType.value),
    )
  }

  function setSasType(type: AssessmentType): void {
    saveError.value = null
    form.setFieldValue('sasType', type)
    form.setFieldValue(
      'sumatifTypes',
      normalizeSumatifTypes(sumatifTypes.value, type),
    )
  }

  let lastSaveSucceeded = false

  const onSubmit = form.handleSubmit(async (values) => {
    lastSaveSucceeded = false
    if (saving.value || !values.sasType) return

    saving.value = true
    saveError.value = null
    const payload: RdmSetting = {
      sumatifTypes: [...values.sumatifTypes],
      sasType: values.sasType,
    }
    try {
      const updated = await rdmService.updateSettings(payload)
      form.resetForm({
        values: {
          sumatifTypes: normalizeSumatifTypes(
            updated.sumatifTypes,
            updated.sasType,
          ),
          sasType: updated.sasType,
        },
      })
      toast.success('Pengaturan RDM berhasil disimpan.')
      lastSaveSucceeded = true
    } catch (err: unknown) {
      saveError.value = await extractRdmErrorMessage(
        err,
        'Gagal menyimpan pengaturan RDM.',
      )
    } finally {
      saving.value = false
    }
  })

  async function save(): Promise<boolean> {
    lastSaveSucceeded = false
    await onSubmit()
    return lastSaveSucceeded
  }

  return {
    form,
    assessmentTypes: ORDERED_ASSESSMENT_TYPES,
    sumatifTypes,
    sasType,
    loading,
    saving,
    loadError,
    saveError,
    isValid,
    load,
    toggleSumatif,
    setSasType,
    onSubmit,
    save,
  }
}
