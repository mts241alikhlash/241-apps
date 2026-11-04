import { computed, onScopeDispose, ref, watch, type Ref } from 'vue'
import { examRoomService } from '../services/examRoomService'
import type {
  MonitorStatus,
  RoomMonitorMeta,
  RoomMonitorParticipant,
} from '../types'

export const POLL_INTERVAL_MS = 5000
export const STALE_WARNING_SECONDS = 15
export const STALE_DANGER_SECONDS = 45
export const MONITOR_DEFAULT_LIMIT = 25

export type StalenessTone = 'fresh' | 'warning' | 'danger'

export interface RoomMonitorOptions {
  roomId: Ref<string>
  slotId?: Ref<string>
}

export function useRoomMonitor(options: RoomMonitorOptions) {
  const page = ref(1)
  const pageSize = ref(MONITOR_DEFAULT_LIMIT)
  const search = ref('')
  const status = ref<MonitorStatus>('ALL')
  const classroomId = ref('')
  const slotId = options.slotId ?? ref('')

  const participants = ref<RoomMonitorParticipant[]>([])
  const meta = ref<RoomMonitorMeta | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  const error = ref<string | null>(null)
  const lastUpdatedServerTime = ref<string | null>(null)
  const lastSuccessAt = ref<number | null>(null)
  const secondsSinceLastSuccess = ref(0)
  const nowMs = ref(Date.now())

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let clockTimer: ReturnType<typeof setInterval> | null = null
  let inFlight = false
  let queued = false

  const query = computed(() => ({
    page: page.value,
    limit: pageSize.value,
    search: search.value.trim() === '' ? undefined : search.value.trim(),
    status: status.value === 'ALL' ? undefined : status.value,
    classroomId: classroomId.value === '' ? undefined : classroomId.value,
    slotId: slotId.value === '' ? undefined : slotId.value,
  }))

  const summary = computed(() => meta.value?.summary ?? null)
  const totalItems = computed(() => meta.value?.total ?? 0)
  const room = computed(() => meta.value?.room ?? null)
  const token = computed(() => meta.value?.token ?? null)
  const staleness = computed<StalenessTone>(() => {
    if (lastSuccessAt.value === null && failed.value) return 'danger'
    if (secondsSinceLastSuccess.value >= STALE_DANGER_SECONDS) return 'danger'
    if (secondsSinceLastSuccess.value >= STALE_WARNING_SECONDS) return 'warning'
    return 'fresh'
  })

  async function refresh() {
    if (options.roomId.value === '') return
    if (inFlight) {
      queued = true
      return
    }
    inFlight = true
    loading.value = true
    try {
      const result = await examRoomService.loadMonitor(
        options.roomId.value,
        query.value,
      )
      participants.value = result.data
      meta.value = result.meta
      lastUpdatedServerTime.value = result.meta?.serverTime ?? null
      lastSuccessAt.value = Date.now()
      nowMs.value = lastSuccessAt.value
      secondsSinceLastSuccess.value = 0
      failed.value = false
      error.value = null
      ensureClock()
    } catch {
      failed.value = true
      error.value = 'Koneksi terputus — menampilkan data terakhir.'
    } finally {
      inFlight = false
      loading.value = false
      if (queued) {
        queued = false
        void refresh()
      }
    }
  }

  function tick() {
    nowMs.value = Date.now()
    secondsSinceLastSuccess.value =
      lastSuccessAt.value === null
        ? 0
        : Math.floor((nowMs.value - lastSuccessAt.value) / 1000)
  }

  function ensureClock() {
    if (clockTimer !== null) return
    clockTimer = setInterval(tick, 1000)
  }

  function start() {
    stop()
    ensureClock()
    pollTimer = setInterval(() => void refresh(), POLL_INTERVAL_MS)
  }

  function stop() {
    clearInterval(pollTimer ?? undefined)
    clearInterval(clockTimer ?? undefined)
    pollTimer = null
    clockTimer = null
  }

  watch([search, status, classroomId, slotId], () => {
    page.value = 1
    void refresh()
  })

  watch([page, pageSize], () => void refresh())

  watch(
    () => options.roomId.value,
    () => {
      participants.value = []
      meta.value = null
      page.value = 1
      lastSuccessAt.value = null
      secondsSinceLastSuccess.value = 0
      void refresh()
    },
    { immediate: true },
  )

  onScopeDispose(stop)

  return {
    page,
    pageSize,
    search,
    status,
    classroomId,
    slotId,
    participants,
    meta,
    room,
    token,
    summary,
    totalItems,
    loading,
    failed,
    error,
    lastUpdatedServerTime,
    secondsSinceLastSuccess,
    nowMs,
    staleness,
    refresh,
    start,
    stop,
  }
}
