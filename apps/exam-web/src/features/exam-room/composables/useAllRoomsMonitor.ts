import { computed, onScopeDispose, ref, type Ref } from 'vue'
import { examRoomService } from '../services/examRoomService'
import type {
  RoomMonitorMeta,
  RoomMonitorParticipant,
  RoomOverview,
  RoomReport,
} from '../types'

export const ALL_ROOMS_POLL_MS = 10_000
const MONITOR_ALL = 100

export const NOTES_POLL_MS = 30_000

export interface LiveNote {
  id: string
  roomId: string
  roomName: string
  note: RoomReport['fieldNotes'][number]
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
  let notesTimer: ReturnType<typeof setInterval> | null = null
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
    } finally {
      loading.value = false
      running = false
    }
  }

  async function notesOf(room: RoomOverview): Promise<LiveNote[]> {
    let targetSlotId = options.slotByRoomTarget?.value.get(room.id)
    if (!targetSlotId) {
      const slots = await examRoomService.loadSupervisors(room.id)
      const now = Date.now()
      const current = slots.find(
        (slot) =>
          Date.parse(slot.startsAt) <= now && Date.parse(slot.endsAt) > now,
      )
      targetSlotId = current?.slotId
    }
    if (!targetSlotId) return []
    slotByRoom.value.set(room.id, targetSlotId)
    const report = await examRoomService.loadReport(room.id, targetSlotId)
    if (!report.success) return []
    return report.data.fieldNotes.map((note) => ({
      id: `${room.id}-${note.id}`,
      roomId: room.id,
      roomName: room.name,
      note,
    }))
  }

  async function refreshNotes() {
    const loaded = await Promise.all(
      rooms.value.map((live) => notesOf(live.room)),
    )
    notes.value = loaded.flat()
  }

  function start() {
    stop()
    loading.value = true
    void refresh().then(refreshNotes)
    notesTimer = setInterval(() => void refreshNotes(), NOTES_POLL_MS)
    pollTimer = setInterval(() => void refresh(), ALL_ROOMS_POLL_MS)
    clockTimer = setInterval(() => {
      nowMs.value = Date.now()
    }, 1000)
  }

  function stop() {
    if (pollTimer !== null) clearInterval(pollTimer)
    if (clockTimer !== null) clearInterval(clockTimer)
    if (notesTimer !== null) clearInterval(notesTimer)
    notesTimer = null
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
