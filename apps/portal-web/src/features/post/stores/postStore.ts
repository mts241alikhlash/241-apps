import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PostAdminDetail, PostAdminSummary, PostType } from '../types'

export const usePostStore = defineStore('portal-post', () => {
  const posts = ref<PostAdminSummary[]>([])
  const current = ref<PostAdminDetail | null>(null)

  const total = ref(0)
  const page = ref(1)
  const limit = ref(10)

  const activeType = ref<PostType>('BERITA')
  const search = ref('')
  const showDeleted = ref(false)

  const loading = ref(false)
  const isSaving = ref(false)

  const conflict = ref<string | null>(null)

  const missingFields = ref<string[]>([])

  function reset() {
    current.value = null
    conflict.value = null
    missingFields.value = []
  }

  return {
    posts,
    current,
    total,
    page,
    limit,
    activeType,
    search,
    showDeleted,
    loading,
    isSaving,
    conflict,
    missingFields,
    reset,
  }
})
