<script setup lang="ts">
import { computed, toRefs, watch } from 'vue'
import { useSemesterForm } from '../composables/useSemesterForm'
import { useSemesterList } from '../composables/useSemesterList'
import type { Semester } from '../types'
import { DatePicker } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { AlertCircle, Loader2 } from '@lucide/vue'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'

const props = defineProps<{
  open: boolean
  editData?: Semester | null
}>()

const { academicYears, fetchAcademicYears } = useSemesterList()

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen && academicYears.value.length === 0) void fetchAcademicYears()
  },
  { immediate: true },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-success': []
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { editData } = toRefs(props)

const semesterForm = useSemesterForm({
  academicYears: () => academicYears.value,
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
          semesterForm.isEditing.value ? 'Edit Semester' : 'Tambah Semester'
        }}</DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="semester-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="semesterForm.onSubmit"
        >
          <FloatingField
            v-slot="{ value, handleChange }"
            name="academicYearId"
            label="Tahun Ajaran"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                :disabled="
                  semesterForm.isSaving.value || semesterForm.isEditing.value
                "
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih tahun ajaran" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="ay in academicYears"
                    :key="ay.id"
                    :value="ay.id"
                  >
                    {{ ay.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="typeId"
            label="Tipe Semester"
            required
          >
            <div class="content-start">
              <Select
                :model-value="value"
                :disabled="semesterForm.isSaving.value"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih tipe semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="type in semesterForm.semesterTypes.value"
                    :key="type.id"
                    :value="type.id"
                  >
                    {{
                      type.name === 'ODD'
                        ? 'Ganjil'
                        : type.name === 'EVEN'
                          ? 'Genap'
                          : type.name
                    }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <div class="grid grid-cols-2 gap-4">
            <FloatingField
              v-slot="{ value, handleChange }"
              name="startDate"
              label="Tanggal Mulai"
              required
            >
              <div class="content-start">
                <FormControl>
                  <DatePicker
                    :model-value="value ?? ''"
                    placeholder="Pilih tanggal mulai"
                    :allow-future-dates="true"
                    @update:model-value="handleChange"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="endDate"
              label="Tanggal Selesai"
              required
            >
              <div class="content-start">
                <FormControl>
                  <DatePicker
                    :model-value="value ?? ''"
                    placeholder="Pilih tanggal selesai"
                    :allow-future-dates="true"
                    :min-date="semesterForm.form.values.startDate"
                    @update:model-value="handleChange"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>

          <Alert
            v-if="semesterForm.formError.value"
            variant="destructive"
            class="mt-2"
          >
            <AlertCircle class="size-4" />
            <AlertDescription>{{
              semesterForm.formError.value
            }}</AlertDescription>
          </Alert>
        </form>
      </ScrollArea>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background mt-auto"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="semesterForm.isSaving.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="semester-form"
          :disabled="semesterForm.isSaving.value"
        >
          <Loader2
            v-if="semesterForm.isSaving.value"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ semesterForm.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
