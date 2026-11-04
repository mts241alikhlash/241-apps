<script setup lang="ts">
import { computed } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import type {
  Permission,
  CreatePermissionPayload,
  UpdatePermissionPayload,
} from '../types'
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
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
import { FormControl, FloatingField } from '@mts241alikhlash/ui/form'
import { AlertCircle } from '@lucide/vue'

const props = defineProps<{
  open: boolean
  formError: string | null
  isSaving: boolean
  editData?: Permission | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [data: CreatePermissionPayload | UpdatePermissionPayload]
}>()

const isEditing = computed(() => !!props.editData)

const open = computed({
  get: () => props.open,
  set: (value: boolean) => {
    if (!value) resetForm()
    emit('update:open', value)
  },
})

const SEGMENT = /^[a-z0-9-]+$/

const formSchema = toTypedSchema(
  z.object({
    module: z
      .string()
      .min(1, 'Modul wajib diisi.')
      .regex(SEGMENT, 'Huruf kecil, angka, dan tanda hubung saja.'),
    action: z
      .string()
      .min(1, 'Aksi wajib diisi.')
      .regex(SEGMENT, 'Huruf kecil, angka, dan tanda hubung saja.'),
    description: z.string().optional().default(''),
  }),
)

const { handleSubmit, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    module: props.editData?.module ?? '',
    action: props.editData?.action ?? '',
    description: props.editData?.description ?? '',
  },
})

const codePreview = computed(() => {
  const m = values.module?.trim() ?? ''
  const a = values.action?.trim() ?? ''
  return m && a ? `${m}.${a}` : '-'
})

const onSubmit = handleSubmit((formValues) => {
  if (isEditing.value) {
    emit('save', {
      description: formValues.description ?? '',
    } satisfies UpdatePermissionPayload)
  } else {
    emit('save', {
      module: formValues.module,
      action: formValues.action,
      description: formValues.description ?? '',
    } satisfies CreatePermissionPayload)
  }
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{ isEditing ? 'Edit Permission' : 'Tambah Permission' }}
        </DialogTitle>
        <DialogDescription>
          {{
            isEditing
              ? 'Kode permission (modul.aksi) tidak dapat diubah, hanya deskripsi.'
              : 'Kode dibentuk otomatis dari modul.aksi dan harus cocok dengan guard @RequirePermissions di backend.'
          }}
        </DialogDescription>
      </DialogHeader>

      <form
        id="permission-form"
        class="flex-1 space-y-5 overflow-y-auto px-6 py-5"
        @submit.prevent="onSubmit"
      >
        <FloatingField
          v-slot="{ componentField }"
          name="module"
          label="Modul"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input
                v-bind="componentField"
                :disabled="isEditing"
              />
            </FormControl>
          </div>
        </FloatingField>

        <FloatingField
          v-slot="{ componentField }"
          name="action"
          label="Aksi"
          required
        >
          <div class="content-start">
            <FormControl>
              <Input
                v-bind="componentField"
                :disabled="isEditing"
              />
            </FormControl>
          </div>
        </FloatingField>

        <div class="rounded-lg border bg-muted/30 px-4 py-3">
          <p class="text-xs text-muted-foreground">Kode permission</p>
          <p class="font-mono text-sm font-semibold">{{ codePreview }}</p>
        </div>

        <FloatingField
          v-slot="{ componentField }"
          name="description"
          label="Deskripsi"
        >
          <div class="content-start">
            <FormControl>
              <Textarea
                rows="3"
                v-bind="componentField"
              />
            </FormControl>
          </div>
        </FloatingField>

        <Alert
          v-if="formError"
          variant="destructive"
        >
          <AlertCircle class="h-4 w-4" />
          <AlertTitle>Kesalahan</AlertTitle>
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>
      </form>

      <DialogFooter
        class="px-6 py-4 border-t shrink-0 flex sm:justify-between w-full bg-background"
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
          form="permission-form"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
