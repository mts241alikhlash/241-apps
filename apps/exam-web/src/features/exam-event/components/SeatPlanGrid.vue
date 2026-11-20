<script setup lang="ts">
import { computed } from 'vue'
import type { PlannedSeat, SeatGenerateRoom } from '../types'
import { deskPosition, gridColumn } from './seatDeskPosition'

const props = defineProps<{
  rooms: SeatGenerateRoom[]
  seats: PlannedSeat[]
  names: Map<string, string>
}>()

const GENDER_TONE: Partial<Record<string, string>> = {
  FEMALE: 'border-info/30 bg-info/10',
  MALE: 'border-success/30 bg-success/10',
}

const seatAt = computed(
  () =>
    new Map(
      props.seats.map((seat) => [`${seat.roomId}:${seat.desk}`, seat] as const),
    ),
)

function desksOf(room: SeatGenerateRoom) {
  const { lanes } = room.layout
  return Array.from({ length: room.capacity }, (_, index) => {
    const desk = index + 1
    const { row, lane } = deskPosition(desk, lanes, room.capacity)
    return {
      desk,
      row,
      lane,
      column: gridColumn(lane, lanes),
      seat: seatAt.value.get(`${room.roomId}:${desk}`) ?? null,
    }
  })
}

function cellClass(seat: PlannedSeat | null) {
  if (!seat) return 'border-dashed text-muted-foreground'
  return GENDER_TONE[seat.gender ?? ''] ?? 'border-border'
}
</script>

<template>
  <div class="space-y-4">
    <section
      v-for="room in rooms"
      :key="room.roomId"
      class="space-y-2"
    >
      <h3 class="text-control font-medium">
        {{ room.code }} · {{ room.capacity }} kursi
      </h3>
      <div
        :data-room="room.roomId"
        class="grid gap-1 overflow-x-auto"
        :style="{
          gridTemplateColumns: `repeat(${room.layout.lanes}, minmax(0, 1fr)) 1rem repeat(${room.layout.lanes}, minmax(0, 1fr))`,
        }"
      >
        <div
          v-for="desk in desksOf(room)"
          :key="desk.desk"
          :data-desk="desk.desk"
          :data-row="desk.row"
          :data-lane="desk.lane"
          class="min-w-0 rounded-md border p-1 text-control"
          :class="cellClass(desk.seat)"
          :style="{ gridRow: desk.row, gridColumn: desk.column }"
        >
          <span class="tabular-nums text-muted-foreground">
            {{ desk.desk }}
          </span>
          <span class="block truncate">
            {{
              desk.seat
                ? (names.get(desk.seat.studentId) ?? 'Siswa tidak ditemukan')
                : 'Kosong'
            }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
