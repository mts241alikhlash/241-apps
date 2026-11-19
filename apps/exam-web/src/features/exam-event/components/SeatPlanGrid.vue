<script setup lang="ts">
import { computed } from 'vue'
import type { PlannedSeat, SeatGenerateRoom } from '../types'

const props = defineProps<{
  rooms: SeatGenerateRoom[]
  seats: PlannedSeat[]
  names: Map<string, string>
}>()

const GRADE_TONE: Partial<Record<number, string>> = {
  7: 'border-info/30 bg-info/10 text-info',
  8: 'border-success/30 bg-success/10 text-success',
  9: 'border-warning/30 bg-warning/10 text-warning',
}

const seatAt = computed(
  () =>
    new Map(
      props.seats.map((seat) => [`${seat.roomId}:${seat.desk}`, seat] as const),
    ),
)

function desksOf(room: SeatGenerateRoom, from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => {
    const number = from + index
    return {
      number,
      seat: seatAt.value.get(`${room.roomId}:${number}`) ?? null,
    }
  })
}

function blocksOf(room: SeatGenerateRoom) {
  const { left, right } = room.layout
  return [
    { side: 'LEFT', desks: desksOf(room, 1, left) },
    { side: 'RIGHT', desks: desksOf(room, left + 1, left + right) },
  ]
}

function cellClass(seat: PlannedSeat | null) {
  if (!seat) return 'border-dashed text-muted-foreground'
  return GRADE_TONE[seat.gradeLevel] ?? 'border-border'
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
      <div class="grid gap-4 sm:grid-cols-2">
        <div
          v-for="block in blocksOf(room)"
          :key="block.side"
          :data-side="block.side"
          class="grid gap-1"
          :style="{
            gridTemplateColumns: `repeat(${room.layout.lanes}, minmax(0, 1fr))`,
          }"
        >
          <div
            v-for="desk in block.desks"
            :key="desk.number"
            :data-desk="desk.number"
            class="min-w-0 rounded-md border p-1 text-control"
            :class="cellClass(desk.seat)"
          >
            <span class="tabular-nums text-muted-foreground">
              {{ desk.number }}
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
      </div>
    </section>
  </div>
</template>
