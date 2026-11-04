import { ref } from 'vue'
import { useReferenceList } from '@/features/platform/reference-data'
import { admissionApi } from '../api/admissionApi'
import type { AdmissionFormOptionKey, AdmissionFormOptions } from '../types'

const options = ref<AdmissionFormOptions | null>(null)

export function useFormOptions() {
  async function load() {
    options.value = await useReferenceList().read(
      'admissionFormOptions',
      async () => (await admissionApi.getFormOptions()).data.data,
    )
  }

  function nameOf(key: AdmissionFormOptionKey, id: string | null | undefined) {
    if (!id) return '-'
    return options.value?.[key].find((option) => option.id === id)?.name ?? '-'
  }

  function listOf(key: AdmissionFormOptionKey) {
    return options.value?.[key] ?? []
  }

  return { options, load, nameOf, listOf }
}
