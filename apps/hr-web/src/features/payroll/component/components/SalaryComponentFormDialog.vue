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
import { computed, watch } from 'vue'
import * as z from 'zod'
import {
  isSaving,
  salaryComponentService,
} from '../services/salaryComponentService'
import { COMPONENT_TYPE_LABEL, DRIVABLE_TYPES, DRIVER_LABEL } from '../types'
import type { SalaryComponent, SalaryComponentType } from '../types'

const props = defineProps<{
  open: boolean
  initialData: SalaryComponent | null
}>()
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
      type: z.enum(['BASE', 'ALLOWANCE', 'ATTENDANCE_DRIVEN', 'DEDUCTION']),
      driver: z
        .enum([
          'PRESENT_DAYS',
          'ABSENT_DAYS',
          'LATE_COUNT',
          'LATE_MINUTES',
          'EARLY_LEAVE_COUNT',
          'LEAVE_DAYS',
          'OFFICIAL_DUTY_DAYS',
        ])
        .optional(),
      isActive: z.boolean().default(true),
    })
    .refine((value) => value.type !== 'ATTENDANCE_DRIVEN' || value.driver, {
      message: 'Komponen berbasis kehadiran harus punya dasar perhitungan.',
      path: ['driver'],
    }),
)

const { handleSubmit, setValues, resetForm, values } = useForm({
  validationSchema: formSchema,
  initialValues: {
    code: '',
    name: '',
    type: 'ALLOWANCE' as SalaryComponentType,
    driver: undefined,
    isActive: true,
  },
})

const canBeDriven = computed(
  () => values.type !== undefined && DRIVABLE_TYPES.includes(values.type),
)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return

    if (props.initialData) {
      setValues({
        code: props.initialData.code,
        name: props.initialData.name,
        type: props.initialData.type,
        driver: props.initialData.driver ?? undefined,
        isActive: props.initialData.isActive,
      })
    } else {
      resetForm()
    }
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (form) => {
  const ok = await salaryComponentService.save(props.initialData?.id ?? null, {
    code: form.code,
    name: form.name,
    type: form.type,
    driver: DRIVABLE_TYPES.includes(form.type) ? (form.driver ?? null) : null,
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
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>
          {{ isEdit ? 'Ubah Komponen Gaji' : 'Tambah Komponen Gaji' }}
        </DialogTitle>
        <DialogDescription class="sr-only" />
      </DialogHeader>

      <form
        class="flex flex-col flex-1 min-h-0"
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

          <FloatingField
            v-slot="{ componentField }"
            name="type"
            label="Jenis"
            required
          >
            <div>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih jenis komponen" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="(label, value) in COMPONENT_TYPE_LABEL"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <FloatingField
            v-if="canBeDriven"
            v-slot="{ componentField }"
            name="driver"
            label="Dasar Perhitungan"
          >
            <div>
              <Select v-bind="componentField">
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih dasar perhitungan" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="(label, value) in DRIVER_LABEL"
                    :key="value"
                    :value="value"
                  >
                    {{ label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Nilainya nanti diisi sebagai tarif per satuan, bukan nominal
                tetap.
              </FormDescription>
            </div>
          </FloatingField>

          <FormField
            v-if="isEdit"
            v-slot="{ value, handleChange }"
            name="isActive"
          >
            <FormItem
              class="flex items-center justify-between rounded-lg border p-3 cursor-pointer select-none"
              @click="handleChange(!value)"
            >
              <FormLabel class="cursor-pointer font-medium">Aktif</FormLabel>
              <FormControl>
                <Switch
                  :model-value="value"
                  @update:model-value="handleChange"
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
