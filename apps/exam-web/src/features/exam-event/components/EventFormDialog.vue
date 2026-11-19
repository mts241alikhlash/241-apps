<script setup lang="ts">
import { computed } from 'vue'
import { DatePicker } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { examTypeLabel, typesFor } from '@/features/exam-shared/examType'
import { useEventForm } from '../composables/useEventForm'
import { EVENT_STATUSES, eventStatusLabel } from '../types'
import type { ExamEvent } from '../types'

const EVENT_EXAM_TYPES = typesFor('EXAM', true, true)

const props = defineProps<{
  open: boolean
  semesterId: string
  event?: ExamEvent | null
}>()

const emit = defineEmits<{ 'update:open': [value: boolean]; saved: [] }>()

const isEdit = computed(() => Boolean(props.event))

const { onSubmit, isSubmitting, saveError, resetForm } = useEventForm(
  props.event
    ? { mode: 'edit', event: props.event }
    : { mode: 'create', semesterId: props.semesterId },
)

async function save() {
  const saved = await onSubmit()
  if (saved === true) {
    emit('saved')
    emit('update:open', false)
  }
}

function close() {
  resetForm()
  emit('update:open', false)
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>{{
          isEdit ? 'Ubah Periode Ujian' : 'Tambah Periode Ujian'
        }}</DialogTitle>
        <DialogDescription>
          Atur nama, jenis, dan rentang tanggal periode ujian.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <div
          v-if="saveError"
          class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-control"
          role="alert"
        >
          {{ saveError }}
        </div>

        <form
          id="event-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="save"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama kegiatan"
            class="sm:col-span-2"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="150"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="type"
            label="Jenis ujian"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="option in EVENT_EXAM_TYPES"
                    :key="option"
                    :value="option"
                  >
                    {{ examTypeLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="startDate"
            label="Tanggal mulai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="endDate"
            label="Tanggal selesai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-if="isEdit"
            v-slot="{ value, handleChange }"
            name="status"
            label="Status"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
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
            </div>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="close"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="event-form"
          :disabled="isSubmitting"
        >
          Simpan
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
