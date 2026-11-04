import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { NavItem, PortalPage, PublicNavItem, PublicPage } from '../types'

export const usePageStore = defineStore('portal-page', () => {
  const pages = ref<PortalPage[]>([])
  const current = ref<PortalPage | null>(null)

  const navItems = ref<NavItem[]>([])

  const publicNav = ref<PublicNavItem[]>([])

  const publicPage = ref<PublicPage | null>(null)
  const notFound = ref(false)
  const unavailable = ref(false)

  const loading = ref(false)
  const isSaving = ref(false)

  const conflict = ref<string | null>(null)

  function reset() {
    current.value = null
    conflict.value = null
  }

  function resetPublic() {
    publicPage.value = null
    notFound.value = false
    unavailable.value = false
  }

  return {
    pages,
    current,
    navItems,
    publicNav,
    publicPage,
    notFound,
    unavailable,
    loading,
    isSaving,
    conflict,
    reset,
    resetPublic,
  }
})
