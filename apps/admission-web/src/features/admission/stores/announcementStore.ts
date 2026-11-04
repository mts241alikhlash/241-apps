import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdmissionWaveSummary } from '../types'

export const useAnnouncementStore = defineStore('admissionAnnouncement', () => {
  const waves = ref<AdmissionWaveSummary[]>([])
  const isSaving = ref(false)
  const formError = ref<string | null>(null)

  return { waves, isSaving, formError }
})
