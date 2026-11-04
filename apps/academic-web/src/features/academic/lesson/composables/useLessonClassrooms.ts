import { ref } from 'vue'
import { lessonService } from '../services/lessonService'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import type { LessonClassItem } from '../types'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

export function useLessonClassrooms() {
  const classrooms = ref<LessonClassItem[]>([])
  const loading = ref(false)

  async function fetchClassrooms() {
    loading.value = true
    try {
      const res = await lessonService.getClassrooms({
        limit: PAGINATION.REFERENCE_LIMIT,
        isActive: true,
      })
      classrooms.value = res.data.data
    } catch (err) {
      notifyIfOutage(err)
      classrooms.value = []
    } finally {
      loading.value = false
    }
  }

  return { classrooms, loading, fetchClassrooms }
}
