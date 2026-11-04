import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdmissionAcademicYear } from '../types'

export const useWaveStore = defineStore('admissionWave', () => {
  const academicYears = ref<AdmissionAcademicYear[]>([])
  const isSaving = ref(false)
  const formError = ref<string | null>(null)

  return {
    academicYears,
    isSaving,
    formError,
  }
})
