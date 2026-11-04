<script setup lang="ts">
import { FormattedNumberInput } from '@mts241alikhlash/ui'
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { FormControl } from '@mts241alikhlash/ui/form'
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
import FloatingField from './AdmissionField.vue'
import { documentTypeSchema } from '../schemas/applicationFormSchemas'
import type {
  AdmissionDocumentTypeAdmin,
  DocumentTypeSavePayload,
} from '../types'

const props = defineProps<{
  open: boolean
  documentType: AdmissionDocumentTypeAdmin | null
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', payload: DocumentTypeSavePayload): void
}>()

const isEdit = computed(() => !!props.documentType)

const { handleSubmit, resetForm, values } = useForm({
  validationSchema: toTypedSchema(documentTypeSchema),
})

function closeDialog() {
  resetForm()
  emit('update:open', false)
}

watch(
  () => [props.open, props.documentType],
  () => {
    if (!props.open) return
    if (props.documentType) {
      resetForm({
        values: {
          name: props.documentType.name,
          requirement: props.documentType.requirement,
          lateDueMonths: props.documentType.lateDueMonths,
          isActive: props.documentType.isActive,
        },
      })
    } else {
      resetForm({
        values: {
          name: '',
          requirement: 'REQUIRED' as const,
          lateDueMonths: null,
          isActive: true,
        },
      })
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit((formValues) => {
  emit('save', {
    name: formValues.name.trim(),
    requirement: formValues.requirement,
    lateDueMonths: formValues.lateDueMonths,
    isActive: formValues.isActive,
  })
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="(val) => (val ? emit('update:open', true) : closeDialog())"
  >
    <DialogContent size="md">
      <DialogHeader standard>
        <DialogTitle>
          {{ isEdit ? 'Ubah Jenis Berkas' : 'Tambah Jenis Berkas' }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          Berkas yang diunggah pendaftar saat mengisi formulir.
        </DialogDescription>
      </DialogHeader>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <form
          id="document-type-form"
          class="space-y-4 dialog-body"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama Jenis Berkas"
            required
          >
            <FormControl>
              <Input
                v-bind="componentField"
                maxlength="100"
                :disabled="isSaving"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="requirement"
            label="Sifat Berkas"
            required
          >
            <Select
              :model-value="value"
              :disabled="isSaving"
              @update:model-value="handleChange"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="REQUIRED"> Wajib </SelectItem>
                <SelectItem value="LATER"> Susulan </SelectItem>
                <SelectItem value="OPTIONAL"> Opsional </SelectItem>
              </SelectContent>
            </Select>
          </FloatingField>

          <FloatingField
            v-if="values.requirement === 'LATER'"
            v-slot="{ value, setValue }"
            name="lateDueMonths"
            label="Batas sejak awal tahun ajaran"
            required
          >
            <FormControl>
              <FormattedNumberInput
                name="lateDueMonths"
                :model-value="value"
                suffix=" bulan"
                numeric
                :max-digits="2"
                :disabled="isSaving"
                @update:model-value="setValue"
              />
            </FormControl>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="isActive"
            label="Status"
            required
          >
            <Select
              :model-value="String(value)"
              :disabled="isSaving"
              @update:model-value="handleChange($event === 'true')"
            >
              <FormControl>
                <SelectTrigger class="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="true"> Aktif </SelectItem>
                <SelectItem value="false"> Nonaktif </SelectItem>
              </SelectContent>
            </Select>
          </FloatingField>

          <p
            v-if="documentType && documentType.documentCount > 0"
            class="text-xs text-muted-foreground"
          >
            Sudah diunggah {{ documentType.documentCount }} kali. Nonaktifkan
            bila tidak dipakai lagi; berkas lama tetap tersimpan.
          </p>
        </form>
      </div>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          :disabled="isSaving"
          @click="closeDialog"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="document-type-form"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
