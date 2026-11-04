<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useAcademicYearForm } from '../composables/useAcademicYearForm'
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
import { Switch } from '@mts241alikhlash/ui/switch'
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
import { FormControl, FormField, FloatingField } from '@mts241alikhlash/ui/form'
import type { AcademicYear } from '../types'

const props = defineProps<{
  open: boolean
  editData?: AcademicYear | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save-success': []
}>()

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    emit('update:open', value)
  },
})

const { editData } = toRefs(props)

const academicYearForm = useAcademicYearForm({
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
            academicYearForm.isEditing.value
              ? 'Edit Tahun Ajaran'
              : 'Tambah Tahun Ajaran'
          }}
        </DialogTitle>
        <DialogDescription class="sr-only"> </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="academic-year-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="academicYearForm.onSubmit"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama Tahun Ajaran"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input v-bind="componentField" />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="startYear"
            label="Tahun Dimulai"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  type="number"
                  min="1900"
                  max="2999"
                  v-bind="componentField"
                  @input="
                    componentField.onChange(
                      Number(($event.target as HTMLInputElement).value),
                    )
                  "
                />
              </FormControl>
            </div>
          </FloatingField>

          <FormField
            v-slot="{ value, handleChange }"
            name="isActive"
          >
            <FormItem>
              <FormLabel
                >Status <span class="text-destructive">*</span></FormLabel
              >
              <FormControl>
                <div
                  role="button"
                  tabindex="0"
                  class="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors hover:bg-accent/50 cursor-pointer select-none"
                  :class="{
                    'opacity-50 pointer-events-none':
                      academicYearForm.isSaving.value,
                  }"
                  @click="handleChange(!value)"
                  @keydown.enter.prevent="handleChange(!value)"
                  @keydown.space.prevent="handleChange(!value)"
                >
                  <span class="text-sm font-medium">
                    {{ value ? 'Aktif' : 'Tidak Aktif' }}
                  </span>
                  <Switch
                    :model-value="Boolean(value)"
                    :disabled="academicYearForm.isSaving.value"
                    class="pointer-events-none"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Alert
            v-if="academicYearForm.formError.value"
            variant="destructive"
            class="mt-2"
          >
            <AlertCircle class="h-4 w-4" />
            <AlertDescription>{{
              academicYearForm.formError.value
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
          :disabled="academicYearForm.isSaving.value"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="academic-year-form"
          variant="default"
          :disabled="academicYearForm.isSaving.value"
        >
          <Loader2
            v-if="academicYearForm.isSaving.value"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ academicYearForm.isSaving.value ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="academicYearForm.showConfirmAlert.value">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Simpan Perubahan?</AlertDialogTitle>
        <AlertDialogDescription>
          Apakah Anda yakin ingin menyimpan perubahan pada data ini?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          :disabled="academicYearForm.isSaving.value"
          @click="academicYearForm.showConfirmAlert.value = false"
        >
          Batal
        </AlertDialogCancel>
        <AlertDialogAction
          :disabled="academicYearForm.isSaving.value"
          @click="academicYearForm.confirmSave"
        >
          Simpan
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
