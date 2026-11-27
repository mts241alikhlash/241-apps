import { ref } from 'vue'
import { examOfflineService } from '../services/examOfflineService'
import type { OfflineSchedule } from '../types'

export function useOfflineSchedules() {
  const schedules = ref<OfflineSchedule[]>([])
  const loading = ref(false)
  const listError = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    const result = await examOfflineService.loadSchedules()
    loading.value = false
    if (!result.success) {
      listError.value = result.error
      return
    }
    listError.value = null
    schedules.value = [...result.data].sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        (left.subjectName ?? '').localeCompare(right.subjectName ?? '', 'id') ||
        (left.classroomName ?? '').localeCompare(
          right.classroomName ?? '',
          'id',
          { numeric: true },
        ),
    )
  }

  void refresh()

  return { schedules, loading, listError, refresh }
}
