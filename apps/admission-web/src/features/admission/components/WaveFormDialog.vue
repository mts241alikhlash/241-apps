<script setup lang="ts">
import { FormattedNumberInput, DateRangePicker } from '@mts241alikhlash/ui'
import { computed, watch } from 'vue'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toTypedSchema } from '@vee-validate/zod'
import { Checkbox } from '@mts241alikhlash/ui/checkbox'
import { Button } from '@mts241alikhlash/ui/button'
import { Input } from '@mts241alikhlash/ui/input'
import { Textarea } from '@mts241alikhlash/ui/textarea'
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
import { FormControl } from '@mts241alikhlash/ui/form'
import FloatingField from './AdmissionField.vue'
import { Loader2 } from '@lucide/vue'
import type {
  AdmissionAcademicYear,
  AdmissionWaveSummary,
  WaveSavePayload,
} from '../types'

const props = defineProps<{
  open: boolean
  wave: AdmissionWaveSummary | null
  isSaving: boolean
  academicYears: AdmissionAcademicYear[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'save', payload: WaveSavePayload): void
}>()

const isEdit = computed(() => !!props.wave)

const formSchema = toTypedSchema(
  z
    .object({
      name: z.string().min(1, 'Nama gelombang wajib diisi'),
      code: z.string().min(1, 'Kode wajib diisi'),
      academicYearId: z.string().min(1, 'Tahun ajaran wajib dipilih'),
      startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
      endDate: z.string(),
      quota: z.coerce.number().min(1, 'Kuota minimal 1'),
      registrationFee: z.coerce.number().min(0, 'Biaya tidak boleh negatif'),
      description: z.string().optional().default(''),
      isActive: z.boolean().default(true),
    })
    .refine((data) => !!data.endDate, {
      message: 'Tanggal selesai wajib diisi',
      path: ['startDate'],
    })
    .refine(
      (data) =>
        !data.startDate || !data.endDate || data.endDate > data.startDate,
      {
        message: 'Tanggal selesai harus setelah tanggal mulai.',
        path: ['startDate'],
      },
    ),
)

interface WaveFormValues {
  name: string
  code: string
  academicYearId: string
  startDate: string
  endDate: string
  quota: number
  registrationFee: number
  description: string
  isActive: boolean
}

const { handleSubmit, resetForm, values, setFieldValue } =
  useForm<WaveFormValues>({
    validationSchema: formSchema,
  })

function closeDialog() {
  resetForm()
  emit('update:open', false)
}

interface DateRangeValue {
  start: string
  end: string
}

function handleRangeUpdate(range: DateRangeValue) {
  setFieldValue('startDate', range.start)
  setFieldValue('endDate', range.end)
}

function resolveAcademicYearId(wave: AdmissionWaveSummary | null): string {
  if (wave) {
    if (typeof wave.academicYear === 'object' && wave.academicYear) {
      return wave.academicYear.id
    }
    if (typeof wave.academicYear === 'string' && wave.academicYear) {
      return wave.academicYear
    }
  }
  return props.academicYears.find((y) => y.isActive)?.id ?? ''
}

watch(
  () => [props.open, props.wave],
  () => {
    if (!props.open) return
    if (props.wave) {
      resetForm({
        values: {
          name: props.wave.name,
          code: props.wave.code,
          academicYearId: resolveAcademicYearId(props.wave),
          startDate: props.wave.startDate.slice(0, 10),
          endDate: props.wave.endDate.slice(0, 10),
          quota: Number(props.wave.quota),
          registrationFee: Number(props.wave.registrationFee),
          description: props.wave.description ?? '',
          isActive: props.wave.isActive ?? true,
        },
      })
    } else {
      resetForm({
        values: {
          name: '',
          code: '',
          academicYearId: resolveAcademicYearId(null),
          startDate: '',
          endDate: '',
          quota: 100,
          registrationFee: 250000,
          description: '',
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
    code: formValues.code.trim(),
    academicYearId: formValues.academicYearId,
    startDate: formValues.startDate,
    endDate: formValues.endDate,
    quota: formValues.quota,
    registrationFee: formValues.registrationFee,
    description: formValues.description || undefined,
    isActive: formValues.isActive,
  })
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (value) => (value ? emit('update:open', true) : closeDialog())
    "
  >
    <DialogContent size="xl">
      <DialogHeader standard>
        <DialogTitle>
          {{ isEdit ? 'Ubah Gelombang' : 'Tambah Gelombang' }}
        </DialogTitle>
        <DialogDescription class="sr-only">
          Isi data gelombang pendaftaran.
        </DialogDescription>
      </DialogHeader>

      <div class="min-h-0 flex-1 overflow-y-auto">
        <form
          id="wave-form"
          class="space-y-2 dialog-body"
          @submit.prevent="onSubmit"
        >
          <div
            class="grid grid-cols-1 items-start gap-x-4 gap-y-2 sm:grid-cols-2"
          >
            <FloatingField
              v-slot="{ componentField }"
              name="code"
              label="Kode"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="name"
              label="Nama Gelombang"
              required
            >
              <FormControl>
                <Input
                  v-bind="componentField"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="academicYearId"
              label="Tahun Ajaran"
              required
            >
              <Select
                :model-value="value"
                :disabled="isSaving || isEdit"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="year in academicYears"
                    :key="year.id"
                    :value="year.id"
                  >
                    {{ year.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingField>

            <FloatingField
              name="startDate"
              label="Rentang Tanggal"
              required
              always-float
              class="[&_button]:border-input [&_button]:bg-transparent [&_button:hover]:bg-transparent [&_button:hover]:text-foreground dark:[&_button]:bg-input/30 dark:[&_button:hover]:bg-input/30"
            >
              <FormControl>
                <DateRangePicker
                  aria-label="Rentang Tanggal"
                  :model-value="{
                    start: values.startDate ?? '',
                    end: values.endDate ?? '',
                  }"
                  :disabled="isSaving"
                  @update:model-value="handleRangeUpdate"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ value, setValue }"
              name="quota"
              label="Kuota"
              required
            >
              <FormControl>
                <FormattedNumberInput
                  name="quota"
                  :model-value="value"
                  suffix=" orang"
                  :max-digits="5"
                  :disabled="isSaving"
                  @update:model-value="setValue"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ value, setValue }"
              name="registrationFee"
              label="Biaya Pendaftaran"
              required
            >
              <FormControl>
                <FormattedNumberInput
                  name="registrationFee"
                  :model-value="value ?? 0"
                  prefix="Rp. "
                  suffix=",-"
                  thousands
                  numeric
                  :disabled="isSaving"
                  @update:model-value="setValue"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ componentField }"
              name="description"
              label="Ketentuan Khusus (tampil ke pendaftar)"
            >
              <FormControl>
                <Textarea
                  v-bind="componentField"
                  class="min-h-24"
                  :disabled="isSaving"
                />
              </FormControl>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="isActive"
              label="Status"
              hide-label
            >
              <div class="flex min-h-11 items-center gap-2">
                <FormControl>
                  <Checkbox
                    :model-value="Boolean(value)"
                    :disabled="isSaving"
                    aria-label="Aktifkan gelombang"
                    @update:model-value="handleChange"
                  />
                </FormControl>
                <span
                  class="text-[length:var(--text-control,0.75rem)] font-medium"
                  >Aktifkan</span
                >
              </div>
            </FloatingField>
          </div>
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
          form="wave-form"
          variant="default"
          :disabled="isSaving"
        >
          <Loader2
            v-if="isSaving"
            class="size-4 mr-1.5 animate-spin"
          />
          {{ isSaving ? 'Menyimpan...' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
