import { ref, computed, readonly } from 'vue'
import {
  useScheduleStore,
  scheduleService,
  DAYS,
} from '@/features/academic/schedule'
import { academicCalendarApi } from '@/features/academic/academic-calendar'
import { storeToRefs } from 'pinia'
import type { CalendarEventData } from '@/features/academic/academic-calendar'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

const DAY_MAP: Record<string, string> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
}

export function useAcademicInfo() {
  const store = useScheduleStore()
  const { lessons, timeSlots, isLoadingSchedule } = storeToRefs(store)

  const upcomingEvents = ref<CalendarEventData[]>([])
  const isLoadingEvents = ref(false)

  const todayDayName = DAY_MAP[new Date().getDay()]

  const todayLabel = computed(() => {
    const day = DAYS.find((d) => d.value === todayDayName)
    return day?.label ?? ''
  })

  const todayLessons = computed(() => {
    const sorted = [...timeSlots.value].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    )
    return sorted
      .filter((ts) => ts.isLesson)
      .map((ts) => {
        const lesson = lessons.value.find(
          (l) => l.timeSlotId === ts.id && l.day === todayDayName,
        )
        return { timeSlot: ts, lesson: lesson ?? null }
      })
      .filter((row) => row.lesson !== null)
  })

  async function fetchTodaySchedule() {
    await scheduleService.fetchMySchedule()
  }

  async function fetchUpcomingEvents() {
    isLoadingEvents.value = true
    try {
      const now = new Date()
      const end = new Date(now)
      end.setDate(end.getDate() + 30)

      const res = await academicCalendarApi.getCalendars({ limit: 50 })
      const all = res.data?.data ?? []
      upcomingEvents.value = all
        .filter((e) => new Date(e.endDate) >= now)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        )
        .slice(0, 5)
    } catch (err) {
      notifyIfOutage(err)
    } finally {
      isLoadingEvents.value = false
    }
  }

  async function init() {
    await Promise.all([fetchTodaySchedule(), fetchUpcomingEvents()])
  }

  return {
    todayLabel,
    todayLessons,
    upcomingEvents: readonly(upcomingEvents),
    isLoadingSchedule,
    isLoadingEvents: readonly(isLoadingEvents),
    init,
  }
}
