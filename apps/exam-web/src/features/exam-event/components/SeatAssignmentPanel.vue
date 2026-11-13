<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { buildSeatColumns } from './seatColumns'
import { useSeatAssignment } from '../composables/useSeatAssignment'
import type { ExamRoom } from '../types'
import type { SeatedStudent } from '../services/examEventService'
import { examEventService } from '../services/examEventService'

const props = defineProps<{
  rooms: ExamRoom[]
  semesterId: string
  canSupervise: boolean
  canAssign: boolean
  canActOnRoom: (room: ExamRoom) => boolean
}>()

const seat = useSeatAssignment(
  () => props.rooms,
  () => props.semesterId,
)

const picked = ref<Set<string>>(new Set())
const interleave = ref(true)
const flagTarget = ref<SeatedStudent | null>(null)
const flagReason = ref('')
const flagSaving = ref(false)
const flagError = ref<string | null>(null)

const selectedRoom = computed(
  () => props.rooms.find((room) => room.id === seat.roomId.value) ?? null,
)

const canPickRoom = computed(
  () => props.canSupervise || props.rooms.some(props.canActOnRoom),
)

const columns = buildSeatColumns({
  canFlag: () =>
    selectedRoom.value !== null && props.canActOnRoom(selectedRoom.value),
  onFlag: (row) => {
    flagTarget.value = row
    flagReason.value = ''
    flagError.value = null
  },
})

async function submitFlag() {
  const row = flagTarget.value
  if (!row || flagReason.value.trim().length < 5) return
  flagSaving.value = true
  const reason = flagReason.value.trim()
  const result = await examEventService.allowLate(
    seat.roomId.value,
    row.studentId,
    reason,
  )
  flagSaving.value = false
  if (result.success) {
    flagTarget.value = null
    await seat.load()
  } else {
    flagError.value = result.error
  }
}

const chosenRoom = computed(
  () => props.rooms.find((room) => room.id === seat.roomId.value) ?? null,
)

function toggle(studentId: string) {
  const next = new Set(picked.value)
  if (next.has(studentId)) next.delete(studentId)
  else next.add(studentId)
  picked.value = next
}

async function distributeAll() {
  const done = await seat.distribute(
    props.rooms.map((room) => room.id),
    interleave.value,
  )
  if (done) picked.value = new Set()
}

async function assignPicked() {
  const chosen = seat.available.value.filter((row) =>
    picked.value.has(row.studentId),
  )
  let number = seat.nextSeatNumber.value
  const payload = chosen.map((row) => ({
    studentId: row.studentId,
    classroomId: row.classroomId,
    seatNumber: number++,
  }))
  const done = await seat.assign(payload)
  if (done) picked.value = new Set()
}

onMounted(() => {
  const first = props.canSupervise
    ? props.rooms[0]
    : props.rooms.find(props.canActOnRoom)
  if (first) void seat.load(first.id)
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-end gap-3">
      <FloatingLabelField
        v-if="canPickRoom"
        label="Ruangan"
        :for="'seat-room'"
        class="w-fit min-w-48"
        floating
      >
        <Select
          :model-value="seat.roomId.value"
          @update:model-value="seat.load(String($event))"
        >
          <SelectTrigger
            id="seat-room"
            class="w-full"
          >
            <SelectValue placeholder="Pilih ruangan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="room in rooms"
              :key="room.id"
              :value="room.id"
            >
              {{ room.code }} · {{ room.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </FloatingLabelField>
      <p
        v-if="chosenRoom"
        class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
      >
        {{ seat.seats.value.length }} dari {{ chosenRoom.capacity }} kursi
        terisi
      </p>
    </div>

    <div
      v-if="seat.error.value"
      class="space-y-3 rounded-md border p-3 text-[length:var(--text-control,0.75rem)]"
      role="alert"
    >
      <p>{{ seat.error.value }}</p>
      <Button
        variant="outline"
        @click="seat.load()"
      >
        Coba lagi
      </Button>
    </div>

    <DataTable
      v-else
      mobile="cards"
      hide-pagination
      :columns="columns"
      :data="seat.seats.value"
      :is-loading="seat.loading.value"
      item-label="kursi"
    >
      <template #empty>
        <p>
          {{
            seat.roomId.value
              ? 'Belum ada siswa yang duduk di ruangan ini.'
              : 'Pilih ruangan untuk melihat kursi.'
          }}
        </p>
      </template>
    </DataTable>

    <div
      v-if="canAssign && rooms.length > 0"
      class="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4"
    >
      <label
        class="flex items-center gap-2 text-[length:var(--text-control,0.75rem)]"
      >
        <Checkbox
          :model-value="interleave"
          aria-label="Sebar bergiliran per kelas"
          @update:model-value="interleave = Boolean($event)"
        />
        Sebar bergiliran per kelas
      </label>
      <Button
        :disabled="seat.saving.value"
        @click="distributeAll"
      >
        Bagi Kursi Otomatis
      </Button>
    </div>

    <div
      v-if="canAssign && seat.roomId.value"
      class="space-y-3 rounded-md border p-4"
    >
      <p class="text-[length:var(--text-control,0.75rem)] font-medium">
        Siswa belum berkursi
      </p>
      <p
        v-if="seat.available.value.length === 0"
        class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
      >
        Semua siswa semester ini sudah mendapat kursi.
      </p>
      <template v-else>
        <ul class="max-h-64 divide-y overflow-y-auto rounded-md border">
          <li
            v-for="row in seat.available.value"
            :key="row.studentId"
            class="flex items-center gap-3 p-3 text-[length:var(--text-control,0.75rem)]"
          >
            <Checkbox
              :model-value="picked.has(row.studentId)"
              :aria-label="`Pilih ${row.name ?? row.nis ?? 'siswa'}`"
              @update:model-value="toggle(row.studentId)"
            />
            <span class="min-w-0 flex-1">
              {{ row.name ?? 'Siswa tidak ditemukan' }}
              <span
                v-if="row.nis"
                class="tabular-nums text-muted-foreground"
              >
                · {{ row.nis }}
              </span>
            </span>
            <span class="text-muted-foreground">
              {{ row.classroomName ?? '-' }}
            </span>
          </li>
        </ul>
        <div class="flex items-center justify-between gap-2">
          <span
            class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
          >
            {{ picked.size }} siswa dipilih
          </span>
          <Button
            :disabled="picked.size === 0 || seat.saving.value"
            @click="assignPicked"
          >
            Beri Kursi
          </Button>
        </div>
      </template>
    </div>

    <Dialog
      :open="flagTarget !== null"
      @update:open="(value: boolean) => !value && (flagTarget = null)"
    >
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Izinkan Masuk Terlambat</DialogTitle>
          <DialogDescription>
            {{ flagTarget?.name ?? 'Siswa' }} ·
            {{ flagTarget?.classroomName ?? '-' }}
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <div
            v-if="flagError"
            class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
            role="alert"
          >
            {{ flagError }}
          </div>
          <FloatingLabelField
            label="Alasan"
            :for="'seat-flag-reason'"
            floating
          >
            <Textarea
              id="seat-flag-reason"
              v-model="flagReason"
              maxlength="300"
              rows="3"
            />
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="flagTarget = null"
          >
            Batal
          </Button>
          <Button
            :disabled="flagSaving || flagReason.trim().length < 5"
            @click="submitFlag"
          >
            Izinkan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
