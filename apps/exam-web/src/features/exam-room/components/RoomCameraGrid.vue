<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { examRoomService } from '../services/examRoomService'
import { latestSnapshotPath } from '../api/examRoomApi'
import type { RoomCameraSeat } from '../types'
import { cameraBlockedLabel } from '../types'
import { classifySeat } from '../logic/seatStatus'
import type { SeatStatus } from '../logic/seatStatus'
import SessionSnapshotGalleryDialog from './SessionSnapshotGalleryDialog.vue'

const props = defineProps<{
  seats: RoomCameraSeat[]
  serverTime: string | null
}>()

const images = ref<Record<string, string>>({})
const target = ref<RoomCameraSeat | null>(null)
const now = ref(Date.now())
const clockOffset = ref(0)
let disposed = false

const inFlight = new Map<string, number>()

const clock = setInterval(() => {
  now.value = Date.now() + clockOffset.value
}, 5_000)

watch(
  () => props.serverTime,
  (serverTime) => {
    if (serverTime === null) return
    const parsed = new Date(serverTime).getTime()
    if (Number.isNaN(parsed)) return
    clockOffset.value = parsed - Date.now()
    now.value = parsed
  },
  { immediate: true },
)

const BORDER: Record<SeatStatus, string> = {
  live: 'border-emerald-500',
  stale: 'border-amber-500',
  blocked: 'border-red-600',
  offline: 'border-red-600',
}

const STATUS_LABEL: Record<SeatStatus, string> = {
  live: 'Terkini',
  stale: 'Terlambat',
  blocked: 'Kamera terblokir',
  offline: 'Tidak ada foto',
}

function statusOf(seat: RoomCameraSeat): SeatStatus {
  return classifySeat(seat, now.value)
}

function nameOf(seat: RoomCameraSeat): string {
  return seat.studentName ?? seat.nis ?? seat.sessionId
}

function dropImage(sessionId: string) {
  const url = images.value[sessionId]
  if (url === undefined) return
  URL.revokeObjectURL(url)
  const next = { ...images.value }
  delete next[sessionId]
  images.value = next
}

const stamps = new Map<string, string | null>()
const failures = new Map<string, { stamp: string | null; count: number }>()
const MAX_FAILURES = 3

function failureCount(sessionId: string, stamp: string | null): number {
  const failure = failures.get(sessionId)
  if (failure?.stamp !== stamp) return 0
  return failure.count
}

function recordFailure(sessionId: string, stamp: string | null) {
  failures.set(sessionId, {
    stamp,
    count: failureCount(sessionId, stamp) + 1,
  })
}

async function refreshImage(seat: RoomCameraSeat) {
  const sessionId = seat.sessionId
  if (seat.lastSnapshotAt === null) {
    inFlight.set(sessionId, (inFlight.get(sessionId) ?? 0) + 1)
    dropImage(sessionId)
    return
  }
  const ticket = (inFlight.get(sessionId) ?? 0) + 1
  inFlight.set(sessionId, ticket)
  const path = seat.latestSnapshotUrl ?? latestSnapshotPath(sessionId)
  const blob = await examRoomService.loadSnapshot(path)
  if (inFlight.get(sessionId) !== ticket) {
    return
  }
  inFlight.delete(sessionId)
  const previous = images.value[sessionId]
  if (blob === null) {
    stamps.delete(sessionId)
    recordFailure(sessionId, seat.lastSnapshotAt)
    if (previous !== undefined) dropImage(sessionId)
    return
  }
  failures.delete(sessionId)
  const url = URL.createObjectURL(blob)
  if (disposed) {
    URL.revokeObjectURL(url)
    return
  }
  stamps.set(sessionId, seat.lastSnapshotAt)
  if (previous !== undefined) URL.revokeObjectURL(previous)
  images.value = { ...images.value, [sessionId]: url }
}

watch(
  () => props.seats,
  (seats) => {
    const alive = new Set(seats.map((seat) => seat.sessionId))
    for (const sessionId of Object.keys(images.value)) {
      if (!alive.has(sessionId)) dropImage(sessionId)
    }
    for (const seat of seats) {
      const previous = stamps.get(seat.sessionId)
      if (previous === seat.lastSnapshotAt) continue
      if (failureCount(seat.sessionId, seat.lastSnapshotAt) >= MAX_FAILURES) {
        continue
      }
      void refreshImage(seat)
    }
    for (const sessionId of [...stamps.keys()]) {
      if (!alive.has(sessionId)) stamps.delete(sessionId)
    }
    for (const sessionId of [...failures.keys()]) {
      if (!alive.has(sessionId)) failures.delete(sessionId)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  disposed = true
  clearInterval(clock)
  for (const sessionId of Object.keys(images.value)) dropImage(sessionId)
})
</script>

<template>
  <div
    v-if="seats.length === 0"
    class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
  >
    Belum ada siswa yang memulai ujian ini.
  </div>
  <div
    v-else
    class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
  >
    <article
      v-for="seat in seats"
      :key="seat.sessionId"
      role="button"
      tabindex="0"
      class="cursor-pointer overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      :class="BORDER[statusOf(seat)]"
      :data-status="statusOf(seat)"
      data-testid="seat-card"
      :aria-label="`Galeri bukti ${nameOf(seat)}`"
      @click="target = seat"
      @keydown.enter.prevent="target = seat"
      @keydown.space.prevent="target = seat"
    >
      <div class="relative aspect-video bg-muted">
        <img
          v-if="images[seat.sessionId]"
          :src="images[seat.sessionId]"
          :alt="`Foto pengawas ${nameOf(seat)}`"
          class="h-full w-full object-cover"
          data-testid="seat-image"
        />
        <p
          v-else
          class="flex h-full items-center justify-center text-center text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          data-testid="seat-no-image"
        >
          Belum ada foto
        </p>
      </div>
      <div class="space-y-1 p-2 text-[length:var(--text-control,0.75rem)]">
        <p class="font-medium">{{ nameOf(seat) }}</p>
        <p v-if="seat.nis">{{ seat.nis }}</p>
        <p
          v-if="statusOf(seat) === 'blocked' && seat.cameraBlocked"
          class="text-red-600"
        >
          {{ cameraBlockedLabel(seat.cameraBlocked) }}
        </p>
        <p
          v-else
          class="text-muted-foreground"
        >
          {{ STATUS_LABEL[statusOf(seat)] }}
        </p>
      </div>
    </article>

    <SessionSnapshotGalleryDialog
      :open="target !== null"
      :session-id="target?.sessionId ?? null"
      :student-name="target?.studentName ?? null"
      @update:open="(value: boolean) => value || (target = null)"
    />
  </div>
</template>
