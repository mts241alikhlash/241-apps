<script setup lang="ts">
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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FloatingField,
} from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Switch } from '@mts241alikhlash/ui/switch'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, ref, watch } from 'vue'
import * as z from 'zod'
import { isSaving, leaveTypeService } from '../services/leaveTypeService'
import type { LeaveAppliesTo, LeaveTreatment, LeaveType } from '../types'

const props = defineProps<{ open: boolean; initialData: LeaveType | null }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; success: [] }>()

const isEdit = computed(() => Boolean(props.initialData))

const formSchema = toTypedSchema(
  z
    .object({
      code: z
        .string()
        .min(2, 'Kode wajib diisi.')
        .regex(/^[A-Z][A-Z0-9_]*$/, 'Gunakan HURUF_BESAR_DAN_GARIS_BAWAH.'),
      name: z.string().min(2, 'Nama wajib diisi.'),
      treatment: z.enum(['ON_LEAVE', 'OFFICIAL_DUTY']),
      appliesTo: z.enum(['STUDENT', 'EMPLOYEE']),
      consumesQuota: z.boolean().default(false),
      annualQuota: z.coerce.number().int().min(0).max(365).optional(),
      requiresDocument: z.boolean().default(false),
      isActive: z.boolean().default(true),
    })
    .refine((value) => !value.consumesQuota || Boolean(value.annualQuota), {
      message: 'Jenis yang memakai kuota harus punya kuota tahunan.',
      path: ['annualQuota'],
    })
    .refine((value) => value.consumesQuota || !value.annualQuota, {
      message: 'Kuota tahunan hanya berlaku untuk jenis yang memakai kuota.',
      path: ['annualQuota'],
    }),
)

const { handleSubmit, setValues, setFieldValue, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    code: '',
    name: '',
    treatment: 'ON_LEAVE' as LeaveTreatment,
    appliesTo: 'EMPLOYEE' as LeaveAppliesTo,
    consumesQuota: false,
    annualQuota: undefined,
    requiresDocument: false,
    isActive: true,
  },
})

const lastQuota = ref<number | undefined>(undefined)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.initialData) {
      lastQuota.value = props.initialData.annualQuota ?? undefined
      setValues({
        code: props.initialData.code,
        name: props.initialData.name,
        treatment: props.initialData.treatment,
        appliesTo: props.initialData.appliesTo,
        consumesQuota: props.initialData.consumesQuota,
        annualQuota: props.initialData.annualQuota ?? undefined,
        requiresDocument: props.initialData.requiresDocument,
        isActive: props.initialData.isActive,
      })
    } else {
      lastQuota.value = undefined
      resetForm()
    }
  },
  { immediate: true },
)

function toggleConsumesQuota(currentValue: boolean) {
  const nextValue = !currentValue
  if (!nextValue) {
    if (values.annualQuota !== undefined) {
      lastQuota.value = values.annualQuota
    }
    setFieldValue('annualQuota', undefined)
  } else {
    if (lastQuota.value !== undefined) {
      setFieldValue('annualQuota', lastQuota.value)
    }
  }
  setFieldValue('consumesQuota', nextValue)
}

const onSubmit = handleSubmit(async (form) => {
  const ok = await leaveTypeService.save(props.initialData?.id ?? null, {
    code: form.code,
    name: form.name,
    treatment: form.treatment,
    appliesTo: form.appliesTo,
    consumesQuota: form.consumesQuota,
    annualQuota: form.consumesQuota ? (form.annualQuota ?? null) : null,
    requiresDocument: form.requiresDocument,
    isActive: form.isActive,
  })

  if (ok) {
    emit('success')
    emit('update:open', false)
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent class="sm:max-w-lg flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{ isEdit ? 'Ubah Jenis Izin' : 'Tambah Jenis Izin' }}
        </DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <form
        class="flex flex-col flex-1 overflow-hidden"
        @submit="onSubmit"
      >
        <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <FloatingField
            v-slot="{ componentField }"
            name="code"
            label="Kode"
            required
          >
            <div>
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isEdit"
                />
              </FormControl>
              <FormDescription v-if="isEdit">
                Kode tidak dapat diubah setelah dibuat.
              </FormDescription>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="name"
            label="Nama"
            required
          >
            <div>
              <FormControl>
                <Input v-bind="componentField" />
              </FormControl>
            </div>
          </FloatingField>

          <div class="grid grid-cols-2 gap-3">
            <FloatingField
              v-slot="{ componentField }"
              name="treatment"
              label="Perlakuan"
            >
              <div>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger class="w-full"
                      ><SelectValue
                    /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ON_LEAVE">Izin/Cuti</SelectItem>
                    <SelectItem value="OFFICIAL_DUTY">Dinas Luar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="appliesTo"
              label="Berlaku untuk"
            >
              <div>
                <Select v-bind="componentField">
                  <FormControl>
                    <SelectTrigger class="w-full"
                      ><SelectValue
                    /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Pegawai</SelectItem>
                    <SelectItem value="STUDENT">Siswa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>
          </div>

          <FormField
            v-slot="{ value }"
            name="consumesQuota"
          >
            <FormItem
              class="flex items-center justify-between rounded-lg border p-3 cursor-pointer select-none hover:bg-accent/50 transition-colors"
              @click="toggleConsumesQuota(Boolean(value))"
            >
              <span class="text-sm font-medium">Memakai kuota tahunan</span>
              <FormControl>
                <Switch
                  :model-value="value"
                  class="pointer-events-none"
                />
              </FormControl>
            </FormItem>
          </FormField>

          <FloatingField
            v-if="values.consumesQuota"
            v-slot="{ componentField }"
            name="annualQuota"
            label="Kuota tahunan (hari kerja)"
            required
          >
            <div>
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="number"
                  min="1"
                  max="365"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FormField
            v-slot="{ value, handleChange }"
            name="requiresDocument"
          >
            <FormItem
              class="flex items-center justify-between rounded-lg border p-3 cursor-pointer select-none hover:bg-accent/50 transition-colors"
              @click="handleChange(!value)"
            >
              <span class="text-sm font-medium">Wajib surat pendukung</span>
              <FormControl>
                <Switch
                  :model-value="value"
                  class="pointer-events-none"
                />
              </FormControl>
            </FormItem>
          </FormField>

          <FormField
            v-slot="{ value, handleChange }"
            name="isActive"
          >
            <FormItem
              class="flex items-center justify-between rounded-lg border p-3 cursor-pointer select-none hover:bg-accent/50 transition-colors"
              @click="handleChange(!value)"
            >
              <span class="text-sm font-medium">Aktif</span>
              <FormControl>
                <Switch
                  :model-value="value"
                  class="pointer-events-none"
                />
              </FormControl>
            </FormItem>
          </FormField>
        </div>

        <DialogFooter
          class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2 shrink-0"
        >
          <Button
            type="button"
            variant="outline"
            @click="emit('update:open', false)"
          >
            Batal
          </Button>
          <Button
            type="submit"
            :disabled="isSaving"
          >
            Simpan
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
