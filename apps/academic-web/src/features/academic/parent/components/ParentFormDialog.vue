<script setup lang="ts">
import { computed, toRefs, ref } from 'vue'
import { Alert, AlertDescription, AlertTitle } from '@mts241alikhlash/ui/alert'
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
import { FormControl, FormField, FloatingField } from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { AppCombobox } from '@mts241alikhlash/ui'
import { AlertCircle } from '@lucide/vue'
import type { Parent, ParentSavePayload } from '../types'
import type { ReferenceListItem as Occupation } from '@/features/academic/reference-list'
import { useParentForm } from '../composables/useParentForm'

const props = defineProps<{
  open: boolean
  formError: string | null
  isSaving: boolean
  editData?: Parent | null
  occupations: Occupation[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: ParentSavePayload]
}>()

const { editData, occupations } = toRefs(props)
const showConfirmAlert = ref(false)
const pendingPayload = ref<ParentSavePayload | null>(null)

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) parentForm.resetForm()
    emit('update:open', value)
  },
})

const parentForm = useParentForm({
  open,
  editData,
  occupations,
  onSave: (payload) => {
    if (parentForm.isEditing.value) {
      pendingPayload.value = payload
      showConfirmAlert.value = true
    } else {
      emit('save', payload)
    }
  },
})

function confirmSave() {
  showConfirmAlert.value = false
  if (pendingPayload.value) {
    emit('save', pendingPayload.value)
    pendingPayload.value = null
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{
            parentForm.isEditing.value
              ? 'Edit Data Orang Tua'
              : 'Tambah Data Orang Tua'
          }}
        </DialogTitle>
        <DialogDescription>
          {{
            parentForm.isEditing.value
              ? 'Perbarui informasi data orang tua siswa.'
              : 'Masukkan informasi data orang tua baru.'
          }}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea class="flex-1 min-h-0">
        <form
          id="parent-form"
          class="space-y-4 px-6 py-4"
          @submit.prevent="parentForm.onSubmit"
        >
          <Alert
            v-if="formError"
            variant="destructive"
          >
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Gagal Menyimpan</AlertTitle>
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>

          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama Lengkap"
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
            name="nik"
            label="NIK"
            required
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  maxlength="16"
                />
              </FormControl>
            </div>
          </FloatingField>

          <div class="grid grid-cols-2 gap-3">
            <FloatingField
              v-slot="{ componentField }"
              name="birthPlace"
              label="Tempat Lahir"
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
              name="birthDate"
              label="Tanggal Lahir"
              required
            >
              <div class="content-start">
                <FormControl>
                  <Input
                    type="date"
                    v-bind="componentField"
                  />
                </FormControl>
              </div>
            </FloatingField>
          </div>

          <FormField
            v-slot="{ componentField }"
            name="occupationId"
          >
            <FormItem>
              <FormLabel>
                Pekerjaan <span class="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <AppCombobox
                  v-bind="componentField"
                  :options="parentForm.occupationOptions.value"
                  placeholder="Pilih Pekerjaan"
                  search-placeholder="Cari pekerjaan..."
                  empty-text="Pekerjaan tidak ditemukan."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="income"
            label="Penghasilan Bulanan"
          >
            <div class="content-start">
              <FormControl>
                <Select
                  :model-value="value"
                  @update:model-value="handleChange"
                >
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih Penghasilan (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in parentForm.incomeOptions"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="phone"
            label="No. Telepon"
          >
            <div class="content-start">
              <FormControl>
                <Input v-bind="componentField" />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="email"
            label="Email"
          >
            <div class="content-start">
              <FormControl>
                <Input
                  type="email"
                  v-bind="componentField"
                />
              </FormControl>
            </div>
          </FloatingField>
        </form>
      </ScrollArea>

      <DialogFooter
        class="p-6 border-t bg-muted/10 flex items-center justify-end gap-2 shrink-0"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSaving"
          @click="open = false"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="parent-form"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <AlertDialog v-model:open="showConfirmAlert">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Konfirmasi Perubahan</AlertDialogTitle>
        <AlertDialogDescription>
          Apakah Anda yakin ingin menyimpan perubahan data orang tua ini?
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Batal</AlertDialogCancel>
        <AlertDialogAction @click="confirmSave">Ya, Simpan</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
