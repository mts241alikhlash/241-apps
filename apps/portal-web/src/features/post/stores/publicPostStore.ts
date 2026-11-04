import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PostDetail, PostSummary } from '../types'

export const usePublicPostStore = defineStore('portal-public-post', () => {
  const items = ref<PostSummary[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(9)

  const current = ref<PostDetail | null>(null)
  const related = ref<PostSummary[]>([])

  const loading = ref(false)

  const notFound = ref(false)

  const unavailable = ref(false)

  function resetDetail() {
    current.value = null
    related.value = []
    notFound.value = false
    unavailable.value = false
  }

  return {
    items,
    total,
    page,
    limit,
    current,
    related,
    loading,
    notFound,
    unavailable,
    resetDetail,
  }
})
