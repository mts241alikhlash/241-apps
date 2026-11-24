import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { examEventService } from '../services/examEventService'
import type { ExamEvent, ExamRoom } from '../types'

const STORAGE_KEY = 'exam-web.event'

function readStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    return
  }
}

export function useEventWorkspace() {
  const route = useRoute()
  const router = useRouter()
  const { hasPermission, user } = useAuthSession()

  const events = ref<ExamEvent[]>([])
  const event = ref<ExamEvent | null>(null)
  const rooms = ref<ExamRoom[]>([])
  const loading = ref(false)
  const loadFailed = ref(false)
  const supervisedRoomIds = ref<Set<string>>(new Set())

  const canManage = computed(() => hasPermission('exam-events.manage'))
  const canReadEvents = computed(() => hasPermission('exam-events.read'))
  const canManageAll = computed(() => hasPermission('exam-rooms.manage-all'))
  const canSupervise = computed(
    () => hasPermission('exam-rooms.supervise') || canManageAll.value,
  )
  const userId = computed(() => user.value?.id ?? '')

  const canActOnRoom = (room: ExamRoom) =>
    canManageAll.value ||
    (hasPermission('exam-rooms.technician') &&
      room.technicianUserId === userId.value)

  const visibleRooms = computed(() => {
    if (canReadEvents.value) return rooms.value
    return rooms.value.filter(
      (room) => supervisedRoomIds.value.has(room.id) || canActOnRoom(room),
    )
  })

  const paramEventId = () =>
    typeof route.params.id === 'string' ? route.params.id : ''

  const queryEventId = () => {
    const value = route.query.event
    return typeof value === 'string' ? value : ''
  }

  function pickEventId() {
    const known = (id: string) =>
      id !== '' &&
      (events.value.length === 0 || events.value.some((e) => e.id === id))
    const fromQuery = paramEventId() || queryEventId()
    if (known(fromQuery)) return fromQuery
    const stored = readStored()
    if (known(stored)) return stored
    const active = events.value.find((item) => item.status === 'ACTIVE')
    return (active ?? events.value[0])?.id ?? ''
  }

  async function loadSupervisedRooms() {
    const found = new Set<string>()
    const now = Date.now()
    await Promise.all(
      rooms.value.map(async (room) => {
        const result = await examEventService.loadSupervisors(room.id)
        if (!result.success) return
        const onDuty = result.data.some(
          (slot) =>
            slot.actualUserId === userId.value &&
            new Date(slot.startsAt).getTime() <= now &&
            new Date(slot.endsAt).getTime() > now,
        )
        if (onDuty) found.add(room.id)
      }),
    )
    supervisedRoomIds.value = found
  }

  async function load() {
    loading.value = true
    loadFailed.value = false
    if (events.value.length === 0) {
      const list = await examEventService.loadEvents({ limit: 100 })
      events.value = list.success ? list.data : []
    }
    const id = pickEventId()
    if (!id) {
      event.value = null
      rooms.value = []
      loading.value = false
      return
    }
    const [detail, list] = await Promise.all([
      examEventService.loadEvent(id),
      examEventService.loadRooms(id),
    ])
    loadFailed.value = !detail.success
    event.value = detail.success ? detail.data : null
    rooms.value = list.success ? list.data : []
    if (detail.success) {
      writeStored(id)
      if (!paramEventId() && queryEventId() !== id) {
        await router.replace({ query: { ...route.query, event: id } })
      }
    }
    if (!canReadEvents.value) await loadSupervisedRooms()
    loading.value = false
  }

  function select(id: string) {
    if (id && id !== event.value?.id) {
      void router.replace({ query: { ...route.query, event: id } })
    }
  }

  watch(
    () => route.query.event,
    (next) => {
      if (typeof next === 'string' && next !== event.value?.id) void load()
    },
  )

  onMounted(load)

  return {
    events,
    event,
    rooms,
    visibleRooms,
    loading,
    loadFailed,
    canManage,
    canReadEvents,
    canSupervise,
    canManageAll,
    canActOnRoom,
    load,
    select,
  }
}
