import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AdmissionWaveSummary } from '../types'

interface ApplicationListContext {
  ownerId: string | null
  search: string
  status: string
  waveId: string
  page: number
  scrollTop: number
  returning: boolean
}

const emptyListContext = (): ApplicationListContext => ({
  ownerId: null,
  search: '',
  status: 'ALL',
  waveId: 'ALL',
  page: 1,
  scrollTop: 0,
  returning: false,
})

export const useApplicationStore = defineStore('admissionApplication', () => {
  const waves = ref<AdmissionWaveSummary[]>([])
  const listContext = ref(emptyListContext())

  function resetListContext() {
    listContext.value = emptyListContext()
  }

  return { waves, listContext, resetListContext }
})
