<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Button } from '@mts241alikhlash/ui/button'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Printer } from '@lucide/vue'
import { examEventService } from '../services/examEventService'
import type { SeatedStudent } from '../services/examEventService'
import type { ExamEvent, ExamRoom } from '../types'

const props = defineProps<{
  event: ExamEvent
  rooms: ExamRoom[]
  semesterId: string
  active: boolean
}>()

const roomId = ref('')
const seats = ref<SeatedStudent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const room = computed(
  () => props.rooms.find((item) => item.id === roomId.value) ?? null,
)

async function load(nextRoomId = roomId.value) {
  roomId.value = nextRoomId
  if (!nextRoomId) {
    seats.value = []
    return
  }
  loading.value = true
  const result = await examEventService.loadSeats(nextRoomId, props.semesterId)
  loading.value = false
  if (result.success) {
    seats.value = result.data
    error.value = null
  } else {
    seats.value = []
    error.value = result.error
  }
}

function print() {
  document.body.classList.add('printing-cards')
  window.print()
  document.body.classList.remove('printing-cards')
}

const started = ref(false)

watch(
  () => props.active,
  (active) => {
    if (!active || started.value) return
    started.value = true
    const first = props.rooms[0]
    if (first) void load(first.id)
  },
  { immediate: true },
)
</script>

<template>
  <div class="exam-cards space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <FloatingLabelField
        label="Ruangan"
        :for="'cards-room'"
        class="w-fit min-w-48"
        floating
      >
        <Select
          :model-value="roomId"
          @update:model-value="load(String($event))"
        >
          <SelectTrigger
            id="cards-room"
            class="w-full"
          >
            <SelectValue placeholder="Pilih ruangan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="item in rooms"
              :key="item.id"
              :value="item.id"
            >
              {{ item.code }} · {{ item.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </FloatingLabelField>
      <Button
        variant="outline"
        :disabled="seats.length === 0"
        @click="print"
      >
        <Printer class="mr-1.5 size-4" />
        Cetak Kartu
      </Button>
    </div>

    <div
      v-if="error"
      class="rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
      role="alert"
    >
      {{ error }}
    </div>

    <p
      v-else-if="!loading && seats.length === 0"
      class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
    >
      Pilih ruangan yang sudah memiliki kursi untuk mencetak kartu.
    </p>

    <div
      v-else
      class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      <article
        v-for="seat in seats"
        :key="seat.studentId"
        class="space-y-1 rounded-md border p-4"
      >
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ event.name }}
        </p>
        <p class="font-medium">
          {{ seat.name ?? 'Siswa tidak ditemukan' }}
        </p>
        <p class="tabular-nums text-[length:var(--text-control,0.75rem)]">
          NIS {{ seat.nis ?? '-' }} · {{ seat.classroomName ?? '-' }}
        </p>
        <div class="flex items-baseline justify-between pt-2">
          <span
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            {{ room?.name ?? '-' }}
          </span>
          <span class="text-xl font-semibold tabular-nums">
            {{ seat.seatNumber }}
          </span>
        </div>
      </article>
    </div>
  </div>
</template>
