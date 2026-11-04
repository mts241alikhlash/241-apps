<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useAssessmentItemForm } from '../composables/useAssessmentItemForm'
import type { AssessmentItem } from '../types'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { AlertCircle, Loader2 } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  teachingAssignmentId: string | null
  editData?: AssessmentItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-success': []
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { editData } = toRefs(props)

const assessmentTypeOptions: {
  value: AssessmentItem['type']
  label: string
}[] = [
  { value: 'DAILY', label: 'Harian' },
  { value: 'ASSIGNMENT', label: 'Tugas' },
  { value: 'PRACTICAL', label: 'Praktikum' },
  { value: 'MIDTERM', label: 'UTS' },
  { value: 'FINAL', label: 'UAS' },
]

const itemForm = useAssessmentItemForm({
  teachingAssignmentId: () => props.teachingAssignmentId,
  editData: () => editData.value ?? null,
  isOpen: () => props.open,
  onSuccess: () => {
    emit('save-success')
    open.value = false
  },
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>{{
          itemForm.isEditing.value ? 'Ubah Tugas' : 'Tambah Tugas'
        }}</DialogTitle>
        <DialogDescription class="sr-only">
          {{
            itemForm.isEditing.value
              ? 'Perbarui informasi tugas. Klik simpan untuk menerapkan.'
              : 'Tambahkan tugas/komponen penilaian baru untuk mata pelajaran ini.'
          }}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="assessment-item-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="itemForm.onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="name"
            label="Nama Tugas"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  :model-value="value"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="type"
            label="Tipe"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih tipe" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="opt in assessmentTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <div class="grid gap-4 sm:grid-cols-2">
            <FloatingField
              v-slot="{ value, handleChange }"
              name="weight"
              label="Bobot (%)"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    :model-value="value"
                    @update:model-value="(v) => handleChange(Number(v))"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="maxScore"
              label="Skor Maksimal"
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="1000"
                    :model-value="value"
                    @update:model-value="(v) => handleChange(Number(v))"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>

          <Alert
            v-if="itemForm.formError.value"
            variant="destructive"
            class="mt-2"
          >
            <AlertCircle class="size-4" />
            <AlertTitle>Kesalahan Sistem</AlertTitle>
            <AlertDescription>{{ itemForm.formError.value }}</AlertDescription>
          </Alert>
        </form>
      </ScrollArea>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="itemForm.isSaving.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="assessment-item-form"
          :disabled="itemForm.isSaving.value"
        >
          <Loader2
            v-if="itemForm.isSaving.value"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ itemForm.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
