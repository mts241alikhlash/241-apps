<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from 'vue-sonner'
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { AcceptableValue } from '@mts241alikhlash/ui/select'
import SeatPlanGrid from './SeatPlanGrid.vue'
import { examEventService } from '../services/examEventService'
import type {
  SeatCandidate,
  SeatGenerateBody,
  SeatGenerateResult,
  SeatGenerateRules,
} from '../types'

const props = defineProps<{
  eventId: string
  students: SeatCandidate[]
  open: boolean
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const order = ref<SeatGenerateRules['order']>('alphabetical')
const separateGender = ref(true)
const spreadGrades = ref(true)
const spreadClassrooms = ref(true)
const lanesPerSide = ref(4)
const preview = ref<SeatGenerateResult | null>(null)
const error = ref<string | null>(null)
const confirming = ref(false)
const busy = ref(false)

const names = computed(
  () => new Map(props.students.map((row) => [row.studentId, row.name ?? ''])),
)

function body(mode: SeatGenerateBody['mode']): SeatGenerateBody {
  return {
    mode,
    students: props.students.map(({ studentId, classroomId }) => ({
      studentId,
      classroomId,
    })),
    rules: {
      order: order.value,
      separateGender: separateGender.value,
      spreadGrades: spreadGrades.value,
      spreadClassrooms: spreadClassrooms.value,
      lanesPerSide: lanesPerSide.value,
    },
  }
}

async function runPreview() {
  error.value = null
  busy.value = true
  const result = await examEventService.generateSeats(
    props.eventId,
    body('preview'),
  )
  busy.value = false
  if (result.success) preview.value = result.data
  else error.value = result.error
}

async function apply(replaceExisting: boolean) {
  error.value = null
  busy.value = true
  const payload = body('apply')
  const result = await examEventService.generateSeats(
    props.eventId,
    replaceExisting ? { ...payload, replaceExisting: true } : payload,
  )
  busy.value = false
  if (result.success) {
    toast.success('Kursi berhasil dibuat.')
    emit('saved')
    close()
    return
  }
  if (!replaceExisting && result.code === 'SEATS_EXIST') {
    confirming.value = true
    return
  }
  confirming.value = false
  error.value = result.error
}

function close() {
  preview.value = null
  error.value = null
  confirming.value = false
  emit('update:open', false)
}

function setOrder(value: AcceptableValue) {
  order.value = value === 'random' ? 'random' : 'alphabetical'
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(value: boolean) => !value && close()"
  >
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Generate Kursi</DialogTitle>
        <DialogDescription>
          Atur aturan penempatan kursi lalu pratinjau sebelum diterapkan.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="error"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control"
          role="alert"
        >
          {{ error }}
        </div>
        <div
          v-if="confirming"
          class="space-y-3 rounded-md border p-3 text-control"
          role="alert"
        >
          <p>Kursi periode ini sudah ada. Timpa kursi yang lama?</p>
          <Button
            :disabled="busy"
            @click="apply(true)"
          >
            Timpa Kursi
          </Button>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <FloatingLabelField
            label="Urutan"
            :for="'seat-generate-order'"
            floating
          >
            <Select
              :model-value="order"
              @update:model-value="setOrder"
            >
              <SelectTrigger
                id="seat-generate-order"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="alphabetical">Abjad</SelectItem>
                <SelectItem value="random">Acak</SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
          <FloatingLabelField
            label="Lajur per sisi"
            :for="'seat-generate-lanes'"
            floating
          >
            <Input
              id="seat-generate-lanes"
              v-model.number="lanesPerSide"
              type="number"
              min="1"
            />
          </FloatingLabelField>
        </div>
        <div class="space-y-2">
          <label class="flex items-center gap-2 text-control">
            <Checkbox
              :model-value="separateGender"
              @update:model-value="separateGender = Boolean($event)"
            />
            Pisahkan laki-laki dan perempuan
          </label>
          <label class="flex items-center gap-2 text-control">
            <Checkbox
              :model-value="spreadGrades"
              @update:model-value="spreadGrades = Boolean($event)"
            />
            Selang-seling tingkat
          </label>
          <label class="flex items-center gap-2 text-control">
            <Checkbox
              :model-value="spreadClassrooms"
              @update:model-value="spreadClassrooms = Boolean($event)"
            />
            Selang-seling rombel
          </label>
        </div>

        <template v-if="preview">
          <p class="text-control text-muted-foreground">
            {{ preview.seats.length }} siswa berkursi ·
            {{ preview.unseated.length }} belum berkursi
          </p>
          <SeatPlanGrid
            :rooms="preview.rooms"
            :seats="preview.seats"
            :names="names"
          />
        </template>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          variant="outline"
          @click="close"
        >
          Batal
        </Button>
        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            :disabled="busy"
            @click="runPreview"
          >
            Pratinjau
          </Button>
          <Button
            :disabled="busy"
            @click="apply(false)"
          >
            Terapkan
          </Button>
        </div>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
