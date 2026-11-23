import { computed, onMounted, onScopeDispose, ref, watch } from 'vue'
import { examEventService } from '@/features/exam-event/services/examEventService'
import { examPrintService } from '../services/examPrintService'
import type { PrintPack, PrintSchedule } from '../types'

export const ALL_ROOMS = 'all'

function warnBeforeLeave(event: BeforeUnloadEvent) {
  event.preventDefault()
}

export function usePrintPack(options: { withSchedules: boolean }) {
  const events = ref<{ id: string; name: string }[]>([])
  const eventId = ref('')
  const roomId = ref(ALL_ROOMS)
  const pack = ref<PrintPack | null>(null)
  const schedules = ref<PrintSchedule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const roomOptions = computed(() =>
    (pack.value?.rooms ?? []).map((room) => ({
      id: room.id,
      label: `${room.code} · ${room.name}`,
    })),
  )
  const visibleRooms = computed(() =>
    (pack.value?.rooms ?? []).filter(
      (room) => roomId.value === ALL_ROOMS || room.id === roomId.value,
    ),
  )
  const warnings = computed(() => pack.value?.warnings ?? [])
  const credentialsHeld = computed(() =>
    (pack.value?.rooms ?? []).some((room) =>
      room.students.some((student) => student.credential != null),
    ),
  )
  const resetting = ref(false)

  watch(credentialsHeld, (held) => {
    if (held) window.addEventListener('beforeunload', warnBeforeLeave)
    else window.removeEventListener('beforeunload', warnBeforeLeave)
  })
  onScopeDispose(() =>
    window.removeEventListener('beforeunload', warnBeforeLeave),
  )
  const hasContent = computed(() =>
    options.withSchedules
      ? schedules.value.length > 0
      : visibleRooms.value.some((room) => room.students.length > 0),
  )

  async function loadPack() {
    pack.value = null
    schedules.value = []
    roomId.value = ALL_ROOMS
    if (eventId.value === '') return
    loading.value = true
    error.value = null
    const packResult = await examPrintService.loadPack(eventId.value)
    if (!packResult.success) {
      error.value = packResult.error
      loading.value = false
      return
    }
    pack.value = packResult.data
    if (options.withSchedules) {
      const scheduleResult = await examPrintService.loadActivitySchedules(
        packResult.data.event,
      )
      if (!scheduleResult.success) error.value = scheduleResult.error
      else schedules.value = scheduleResult.data
    }
    loading.value = false
  }

  async function resetCredentials() {
    const current = pack.value
    if (eventId.value === '' || current === null) return
    resetting.value = true
    const result = await examPrintService.resetCredentials(
      eventId.value,
      roomId.value === ALL_ROOMS ? undefined : roomId.value,
    )
    resetting.value = false
    if (!result.success) {
      error.value = result.error
      return
    }
    const issued = new Map(
      result.data.items.map((item) => [
        item.studentId,
        { identifier: item.identifier, password: item.password },
      ]),
    )
    pack.value = {
      ...current,
      rooms: current.rooms.map((room) => ({
        ...room,
        students: room.students.map((student) => ({
          ...student,
          credential:
            issued.get(student.studentId) ?? student.credential ?? null,
        })),
      })),
    }
  }

  async function loadEvents() {
    loading.value = true
    const result = await examEventService.loadEvents({ limit: 200 })
    if (!result.success) {
      error.value = result.error
      loading.value = false
      return
    }
    events.value = result.data.map((event) => ({
      id: event.id,
      name: event.name,
    }))
    const active = result.data.find((event) => event.status === 'ACTIVE')
    eventId.value = active?.id ?? result.data[0]?.id ?? ''
    loading.value = false
  }

  async function changeEvent(value: string) {
    eventId.value = value
    await loadPack()
  }

  function changeRoom(value: string) {
    roomId.value = value
  }

  onMounted(async () => {
    await loadEvents()
    await loadPack()
  })

  return {
    events,
    eventId,
    roomId,
    pack,
    schedules,
    roomOptions,
    visibleRooms,
    warnings,
    hasContent,
    loading,
    resetting,
    error,
    changeEvent,
    changeRoom,
    loadPack,
    resetCredentials,
  }
}
