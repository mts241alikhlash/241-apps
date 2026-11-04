import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { HomepageSection, HomepageSectionSetting } from '../types'

export const useHomepageStore = defineStore('portal-homepage', () => {
  const sections = ref<HomepageSection[]>([])
  const settings = ref<HomepageSectionSetting[]>([])

  const loading = ref(false)
  const isSaving = ref(false)

  const unavailable = ref(false)

  return { sections, settings, loading, isSaving, unavailable }
})
