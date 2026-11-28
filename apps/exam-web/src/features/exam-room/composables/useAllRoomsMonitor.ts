import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { examRoomService } from '../services/examRoomService'
import type {
  RoomFieldNote,
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomOverview,
} from '../types'

export const ALL_ROOMS_POLL_MS = 30_000
const MONITOR_ALL = 100

export interface LiveNote {
  id: string
  roomId: string
  roomName: string
  note: RoomFieldNote
}

export interface LiveRoom {
  room: RoomOverview
  meta: RoomMonitorMeta | null
  participants: RoomMonitorParticipant[]
  failed: boolean
}

export interface AllRoomsMonitorOptions {
  eventId?: Ref<string>
  slotByRoomTarget?: Ref<Map<string, string>>
}

export function useAllRoomsMonitor(options: AllRoomsMonitorOptions = {}) {
  const rooms = ref<LiveRoom[]>([])
  const notes = ref<LiveNote[]>([])
  const slotByRoom = ref(new Map<string, string>())
  const loading = ref(true)
  const error = ref<string | null>(null)
  const lastUpdatedAt = ref<number | null>(null)
  const nowMs = ref(Date.now())

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let clockTimer: ReturnType<typeof setInterval> | null = null
  let running = false

  async function loadRoom(room: RoomOverview): Promise<LiveRoom> {
    const slotId = options.slotByRoomTarget?.value.get(room.id)
    try {
      const page = await examRoomService.loadMonitor(room.id, {
        page: 1,
        limit: MONITOR_ALL,
        ...(slotId ? { slotId } : {}),
      })
      return { room, meta: page.meta, participants: page.data, failed: false }
    } catch {
      return { room, meta: null, participants: [], failed: true }
    }
  }

  async function refresh() {
    if (running) return
    running = true
    try {
      const eventId = options.eventId?.value || undefined
      const overview = await examRoomService.loadOverview(eventId)
      if (!overview.success) {
        error.value = overview.error
        return
      }
      error.value = null
      const targets = options.slotByRoomTarget?.value
      const scoped =
        targets !== undefined && targets.size > 0
          ? overview.data.filter((room) => targets.has(room.id))
          : overview.data
      const loaded = await Promise.all(scoped.map(loadRoom))
      rooms.value = loaded.sort((left, right) =>
        left.room.code.localeCompare(right.room.code, 'id', { numeric: true }),
      )
      lastUpdatedAt.value = Date.now()
      await refreshNotes()
    } finally {
      loading.value = false
      running = false
    }
  }

  async function refreshNotes() {
    const targets = options.slotByRoomTarget?.value
    const targeted = rooms.value.flatMap((live) => {
      const target = targets?.get(live.room.id)
      return target === undefined ? [] : [target]
    })
    const slotIds =
      targets !== undefined && targeted.length === rooms.value.length
        ? targeted
        : undefined
    for (const live of rooms.value) {
      const target = targets?.get(live.room.id)
      if (target) slotByRoom.value.set(live.room.id, target)
    }
    const result = await examRoomService.loadFieldNotes(slotIds)
    if (!result.success) return
    notes.value = result.data.map((row) => ({
      id: `${row.roomId}-${row.id}`,
      roomId: row.roomId,
      roomName: row.roomName,
      note: row,
    }))
  }

  function poll() {
    if (running || document.visibilityState === 'hidden') return
    void refresh()
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') void refresh()
  }

  function start() {
    stop()
    loading.value = true
    void refresh()
    pollTimer = setInterval(poll, ALL_ROOMS_POLL_MS)
    clockTimer = setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  function stop() {
    if (pollTimer !== null) clearInterval(pollTimer)
    if (clockTimer !== null) clearInterval(clockTimer)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    pollTimer = null
    clockTimer = null
  }

  onScopeDispose(stop)

  const totals = computed(() => {
    const sum = {
      registered: 0,
      notStarted: 0,
      inProgress: 0,
      finished: 0,
      absent: 0,
      attention: 0,
    }
    for (const live of rooms.value) {
      const summary = live.meta?.summary
      if (summary === undefined) continue
      sum.registered += summary.totalRegistered
      sum.notStarted += summary.notStartedCount
      sum.inProgress += summary.inProgressCount
      sum.finished += summary.finishedCount
      sum.absent += summary.absentMarkedCount
    }
    return sum
  })

  return {
    rooms,
    notes,
    slotByRoom,
    refreshNotes,
    loading,
    error,
    lastUpdatedAt,
    nowMs,
    totals,
    start,
    stop,
    refresh,
  }
}
