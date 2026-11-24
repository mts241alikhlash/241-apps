import { computed, ref, watch, type Ref } from 'vue'
import { examEventService } from '@/features/exam-event/services/examEventService'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import type { ExamSessionStatus } from '@/features/exam-schedule/types'
import type { ExamCategory } from '@/features/exam-shared/examType'
import { examGradingApi } from '../api/examGradingApi'
import type { GradingSchedule, GradingSessionRow } from '../types'

export function useGradingSchedules(
  page: Ref<number>,
  pageSize: Ref<number>,
  category?: Ref<ExamCategory | undefined>,
  semesterId?: Ref<string>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-grading', 'schedules'],
    filters: { category, semesterId },
    fetchPage: (current, limit) =>
      examGradingApi.getSchedules({
        page: current,
        limit,
        category: category?.value,
        semesterId: semesterId?.value || undefined,
      }),
    errorMessage: 'Gagal memuat daftar ujian.',
  })
  return { ...list, schedules: list.items }
}

export function useGradingSessions(
  scheduleId: Ref<string>,
  status: Ref<string>,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-grading', 'sessions'],
    filters: { scheduleId, status },
    fetchPage: (current, limit) =>
      examGradingApi.getSessions(scheduleId.value, {
        page: current,
        limit,
        status:
          status.value === 'ALL'
            ? undefined
            : (status.value as ExamSessionStatus),
      }),
    errorMessage: 'Gagal memuat daftar siswa.',
  })
  return { ...list, sessions: list.items }
}

export interface GradingEventOption {
  id: string
  name: string
  startsAt: string
  endsAt: string
}

const EVENT_PAGE_LIMIT = 100

export function useEventGradingSchedules(
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const events = ref<GradingEventOption[]>([])
  const eventId = ref('')
  const all = ref<GradingSchedule[]>([])
  const loading = ref(false)
  const listError = ref<string | null>(null)

  const inEvent = computed(() => {
    const event = events.value.find((item) => item.id === eventId.value)
    if (event === undefined) return []
    return all.value.filter(
      (item) =>
        item.startsAt >= event.startsAt && item.startsAt <= event.endsAt,
    )
  })
  const schedules = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return inEvent.value.slice(start, start + pageSize.value)
  })

  async function refresh() {
    loading.value = true
    listError.value = null
    try {
      const loaded = await examEventService.loadEvents({ limit: 200 })
      if (!loaded.success) throw new Error(loaded.error)
      events.value = loaded.data.map((event) => ({
        id: event.id,
        name: event.name,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
      }))
      if (eventId.value === '') {
        const active = loaded.data.find((event) => event.status === 'ACTIVE')
        eventId.value = active?.id ?? loaded.data[0]?.id ?? ''
      }
      const rows: GradingSchedule[] = []
      for (let current = 1; ; current += 1) {
        const result = await examGradingApi.getSchedules({
          page: current,
          limit: EVENT_PAGE_LIMIT,
          category: 'EXAM',
        })
        rows.push(...result.data)
        if (result.data.length === 0 || rows.length >= result.meta.total) break
      }
      all.value = rows
    } catch {
      listError.value = 'Gagal memuat daftar ujian.'
    } finally {
      loading.value = false
    }
  }

  watch(eventId, () => (page.value = 1))

  function schedulesOf(id: string): GradingSchedule[] {
    const event = events.value.find((item) => item.id === id)
    if (event === undefined) return []
    return all.value.filter(
      (item) =>
        item.kind !== 'MAKEUP' &&
        item.startsAt >= event.startsAt &&
        item.startsAt <= event.endsAt,
    )
  }

  return {
    schedulesOf,
    events,
    eventId,
    schedules,
    totalItems: computed(() => inEvent.value.length),
    loading,
    listError,
    refresh,
  }
}

const SESSION_LIMIT = 100

export { compareClassroom } from '@/features/exam-shared/classroomName'

export function useSortedGradingSessions(
  scheduleId: Ref<string>,
  status: Ref<string>,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const all = ref<GradingSessionRow[]>([])
  const loading = ref(false)
  const listError = ref<string | null>(null)

  const sessions = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return all.value.slice(start, start + pageSize.value)
  })

  async function refresh() {
    if (scheduleId.value === '') return
    loading.value = true
    listError.value = null
    try {
      const rows: GradingSessionRow[] = []
      for (let current = 1; ; current += 1) {
        const result = await examGradingApi.getSessions(scheduleId.value, {
          page: current,
          limit: SESSION_LIMIT,
          status:
            status.value === 'ALL'
              ? undefined
              : (status.value as ExamSessionStatus),
        })
        rows.push(...result.data)
        if (result.data.length === 0 || rows.length >= result.meta.total) break
      }
      all.value = rows.sort((left, right) =>
        (left.studentName ?? '').localeCompare(right.studentName ?? '', 'id'),
      )
    } catch {
      listError.value = 'Gagal memuat daftar siswa.'
    } finally {
      loading.value = false
    }
  }

  watch([scheduleId, status], () => void refresh(), { immediate: true })

  return {
    sessions,
    totalItems: computed(() => all.value.length),
    loading,
    listError,
    refresh,
  }
}
