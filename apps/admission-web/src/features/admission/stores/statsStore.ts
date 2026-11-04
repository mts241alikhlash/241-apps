import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdmissionStats } from '../types'

export const useStatsStore = defineStore('admissionStats', () => {
  const stats = ref<AdmissionStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  return {
    stats,
    loading,
    error,
  }
})
