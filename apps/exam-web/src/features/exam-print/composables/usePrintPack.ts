import { computed, onMounted, ref } from 'vue'
import { examEventService } from '@/features/exam-event/services/examEventService'
import { examRoomService } from '@/features/exam-room/services/examRoomService'
import type { Letterhead } from '@/features/exam-room/types'
import { examPrintService } from '../services/examPrintService'
import type { PrintPack, PrintSchedule } from '../types'

export const ALL_ROOMS = 'all'

export function usePrintPack(options: { withSchedules: boolean }) {
  const events = ref<{ id: string; name: string }[]>([])
  const eventId = ref('')
  const roomId = ref(ALL_ROOMS)
  const pack = ref<PrintPack | null>(null)
  const schedules = ref<PrintSchedule[]>([])
  const letterhead = ref<Letterhead | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const schoolName = computed(() => letterhead.value?.name ?? '')
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
    const [packResult, scheduleResult] = await Promise.all([
      examPrintService.loadPack(eventId.value),
      options.withSchedules
        ? examPrintService.loadSchedules(eventId.value)
        : Promise.resolve(null),
    ])
    if (!packResult.success) error.value = packResult.error
    else pack.value = packResult.data
    if (scheduleResult) {
      if (!scheduleResult.success) error.value ??= scheduleResult.error
      else schedules.value = scheduleResult.data
    }
    loading.value = false
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

  function print() {
    document.body.classList.add('printing-stack')
    window.print()
    document.body.classList.remove('printing-stack')
  }

  onMounted(async () => {
    letterhead.value = await examRoomService.loadLetterhead()
    await loadEvents()
    await loadPack()
  })

  return {
    events,
    eventId,
    roomId,
    pack,
    schedules,
    schoolName,
    roomOptions,
    visibleRooms,
    warnings,
    hasContent,
    loading,
    error,
    changeEvent,
    changeRoom,
    loadPack,
    print,
  }
}
