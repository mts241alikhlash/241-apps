<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useCurriculumForm } from '../composables/useCurriculumForm'
import type { AcademicYearRef, Curriculum } from '../types'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { Loader2, AlertCircle } from '@lucide/vue'
import { Input } from '@mts241alikhlash/ui/input'
import { ScrollArea } from '@mts241alikhlash/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'

const props = defineProps<{
  open: boolean
  academicYears: AcademicYearRef[]
  editData?: Curriculum | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-success': []
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const { editData, academicYears } = toRefs(props)

const curriculumForm = useCurriculumForm({
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
        <DialogTitle>
          {{
            curriculumForm.isEditing.value
              ? 'Edit Kurikulum'
              : 'Tambah Kurikulum Baru'
          }}
        </DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="curriculum-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="curriculumForm.onSubmit"
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
                disabled
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih tahun ajaran" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="opt in curriculumForm.academicYearOptions.value"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama Kurikulum"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input v-bind="componentField" />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="isActive"
            label="Status"
            required
          >
            <div class="content-start">
              <Select
                :model-value="String(value)"
                @update:model-value="handleChange($event === 'true')"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="true"> Aktif </SelectItem>
                  <SelectItem value="false"> Tidak Aktif </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <Alert
            v-if="curriculumForm.formError.value"
            variant="destructive"
            class="mt-2"
          >
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>{{
              curriculumForm.formError.value
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
          :disabled="curriculumForm.isSaving.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="curriculum-form"
          variant="default"
          :disabled="curriculumForm.isSaving.value"
        >
          <Loader2
            v-if="curriculumForm.isSaving.value"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ curriculumForm.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="curriculumForm.showConfirmAlert.value">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Simpan Perubahan?</AlertDialogTitle>
        <AlertDialogDescription>
          Apakah Anda yakin ingin menyimpan perubahan pada data kurikulum ini?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          :disabled="curriculumForm.isSaving.value"
          @click="curriculumForm.showConfirmAlert.value = false"
        >
          Batal
        </AlertDialogCancel>
        <AlertDialogAction
          :disabled="curriculumForm.isSaving.value"
          @click="curriculumForm.confirmSave"
        >
          Simpan
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
