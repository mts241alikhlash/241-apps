import { buildScheduleSheet } from '../logic/scheduleSheet'
import { scheduleService } from '../services/scheduleService'
import { useScheduleStore } from '../stores/scheduleStore'
import { DAYS } from '../types'
import type { ScheduleLessonMap } from '../types'
import { useAuthSession, useRoleGuard } from '@/features/platform/auth'
import { storeToRefs } from 'pinia'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

export function useSchedule() {
  const route = useRoute()
  const { user } = useAuthSession()
  const store = useScheduleStore()

  const {
    classrooms,
    timeSlots,
    lessons,
    selectedClassroomId,
    isLoadingClassrooms,
    isLoadingSchedule,
  } = storeToRefs(store)

  const { can } = useRoleGuard()

  const hasOwnSchedule = computed(() => can('schedules.read-own'))

  const showingOwnSchedule = ref(false)
  const isAdmin = computed(() => can('schedules.update'))

  const selectedClassroom = computed(() =>
    classrooms.value.find((c) => c.id === selectedClassroomId.value),
  )

  const lessonMap = computed<ScheduleLessonMap>(() => {
    const map: ScheduleLessonMap = {}
    for (const lesson of lessons.value) {
      const tId = lesson.timeSlotId
      if (tId) {
        map[tId] ??= {}
        map[tId][lesson.day] = lesson
      }
    }
    return map
  })

  const sortedTimeSlots = computed(() =>
    [...timeSlots.value].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  )

  const scheduleSheet = computed(() =>
    buildScheduleSheet({
      title: showingOwnSchedule.value ? 'Jadwal Mengajar' : 'Jadwal Pelajaran',
      subtitle: showingOwnSchedule.value
        ? (user.value?.profile?.name ?? user.value?.name ?? '')
        : `Kelas ${
            selectedClassroom.value?.code ?? selectedClassroom.value?.name ?? ''
          }`.trim(),
      days: DAYS,
      timeSlots: sortedTimeSlots.value,
      lessonMap: lessonMap.value,
      isPersonal: showingOwnSchedule.value,
    }),
  )

  const breadcrumbs = computed(() => [
    { title: 'Lihat Jadwal', href: '/schedule' },
    ...(selectedClassroom.value
      ? [
          {
            title:
              selectedClassroom.value.code ??
              selectedClassroom.value.name ??
              selectedClassroom.value.displayName ??
              '',
            href: '#',
          },
        ]
      : []),
    ...(showingOwnSchedule.value ? [{ title: 'Jadwal Saya', href: '#' }] : []),
  ])

  async function fetchClassrooms() {
    const queryClassroomId = route.query.classroomId as string | undefined
    const res = await scheduleService.fetchClassroomsForAdmin(queryClassroomId)
    if (res.success && selectedClassroomId.value) {
      await fetchSchedule()
    }
  }

  async function fetchSchedule() {
    await scheduleService.fetchSchedule({
      isEmployee: false,
      selectedClassroomId: selectedClassroomId.value,
    })
  }

  async function init() {
    const mayBrowseClassrooms = isAdmin.value || can('schedules.read')

    if (hasOwnSchedule.value) {
      await scheduleService.fetchMySchedule()
      if (lessons.value.length > 0 || !mayBrowseClassrooms) {
        showingOwnSchedule.value = true
        return
      }
    }

    showingOwnSchedule.value = false
    if (mayBrowseClassrooms) {
      await fetchClassrooms()
    }
  }

  async function onClassroomChange(val: unknown) {
    if (typeof val === 'string' && val) {
      selectedClassroomId.value = val
      await fetchSchedule()
    }
  }

  return {
    classrooms,
    timeSlots,
    lessons,
    selectedClassroomId,
    isLoadingClassrooms,
    isLoadingSchedule,
    hasOwnSchedule,
    isPersonal: computed(() => showingOwnSchedule.value),
    isAdmin,
    user,
    DAYS,
    selectedClassroom,
    lessonMap,
    sortedTimeSlots,
    scheduleSheet,
    breadcrumbs,
    init,
    onClassroomChange,
  }
}
