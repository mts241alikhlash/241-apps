<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useId } from 'vue'
import { DatePicker, FormattedNumberInput } from '@mts241alikhlash/ui'
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
import { EXAM_TYPES, examTypeLabel } from '@/features/exam-schedule/types'
import { useEventForm } from '../composables/useEventForm'
import { EVENT_STATUSES, eventStatusLabel } from '../types'
import type { ExamEvent } from '../types'

const props = defineProps<{
  open: boolean
  semesterId: string
  event?: ExamEvent | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: []
}>()

const isEdit = computed(() => Boolean(props.event))

const form = useEventForm(
  props.event
    ? { mode: 'edit', event: props.event }
    : { mode: 'create', semesterId: props.semesterId },
)

const fieldId = useId()

async function save() {
  const saved = await form.submit()
  if (saved) {
    emit('saved')
    emit('update:open', false)
  }
}

onMounted(() => {
  if (!form.startDate.value)
    form.startDate.value = new Date().toISOString().slice(0, 10)
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>{{
          isEdit ? 'Ubah Kegiatan Ujian' : 'Tambah Kegiatan Ujian'
        }}</DialogTitle>
        <DialogDescription class="sr-only">
          Atur nama, jenis, rentang waktu, dan toleransi kegiatan ujian.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="form.error.value"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--text-control,0.75rem)]"
          role="alert"
        >
          {{ form.error.value }}
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <FloatingLabelField
            label="Nama kegiatan"
            :for="`${fieldId}-name`"
            class="sm:col-span-2"
            floating
          >
            <Input
              :id="`${fieldId}-name`"
              v-model="form.name.value"
              maxlength="150"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Jenis ujian"
            :for="`${fieldId}-type`"
            floating
          >
            <Select v-model="form.type.value">
              <SelectTrigger
                :id="`${fieldId}-type`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih jenis ujian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in EXAM_TYPES"
                  :key="option"
                  :value="option"
                >
                  {{ examTypeLabel(option) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            label="Tanggal mulai"
            :for="`${fieldId}-start-date`"
            floating
          >
            <DatePicker
              :id="`${fieldId}-start-date`"
              v-model="form.startDate.value"
              allow-future-dates
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Jam mulai"
            :for="`${fieldId}-start-time`"
            floating
          >
            <Input
              :id="`${fieldId}-start-time`"
              v-model="form.startTime.value"
              type="time"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Tanggal selesai"
            :for="`${fieldId}-end-date`"
            floating
          >
            <DatePicker
              :id="`${fieldId}-end-date`"
              v-model="form.endDate.value"
              allow-future-dates
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Jam selesai"
            :for="`${fieldId}-end-time`"
            floating
          >
            <Input
              :id="`${fieldId}-end-time`"
              v-model="form.endTime.value"
              type="time"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Toleransi terlambat"
            :for="`${fieldId}-late`"
            floating
          >
            <FormattedNumberInput
              :id="`${fieldId}-late`"
              v-model="form.lateToleranceMinutes.value"
              numeric
              suffix=" menit"
              :max-digits="3"
            />
          </FloatingLabelField>

          <FloatingLabelField
            label="Batas kumpul"
            :for="`${fieldId}-min-submit`"
            floating
          >
            <FormattedNumberInput
              :id="`${fieldId}-min-submit`"
              v-model="form.minSubmitMinutes.value"
              numeric
              suffix=" menit"
              :max-digits="3"
            />
          </FloatingLabelField>

          <FloatingLabelField
            v-if="isEdit"
            label="Status"
            :for="`${fieldId}-status`"
            floating
          >
            <Select v-model="form.status.value">
              <SelectTrigger
                :id="`${fieldId}-status`"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in EVENT_STATUSES"
                  :key="option"
                  :value="option"
                >
                  {{ eventStatusLabel(option) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <label
            class="flex items-center gap-2 self-center text-[length:var(--text-control,0.75rem)] sm:col-span-2"
          >
            <Checkbox
              :model-value="form.requireAndroidApp.value"
              @update:model-value="
                form.requireAndroidApp.value = Boolean($event)
              "
            />
            Wajib aplikasi Android (kecuali diizinkan mode web)
          </label>
        </div>

        <p
          v-if="form.problem.value"
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          {{ form.problem.value }}
        </p>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="button"
          :disabled="form.problem.value !== null || form.saving.value"
          @click="save"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
