import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdmissionApplication } from '../types'

export const useApplicationDetailStore = defineStore(
  'admissionApplicationDetail',
  () => {
    const application = ref<AdmissionApplication | null>(null)
    const loading = ref(false)
    const acting = ref(false)
    const error = ref<'not-found' | 'load-failed' | null>(null)
    const requestId = ref(0)

    return {
      application,
      loading,
      acting,
      error,
      requestId,
    }
  },
)
