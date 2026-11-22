<script setup lang="ts">
import { ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { FormattedNumberInput } from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingField, FormControl } from '@mts241alikhlash/ui/form'
import { Switch } from '@mts241alikhlash/ui/switch'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examActivityApi } from '../api/examActivityApi'
import type { ExamPolicy } from '../types'

const props = defineProps<{
  open: boolean
  activityId: string
  policy: ExamPolicy
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [policy: ExamPolicy]
}>()

type NumberKey =
  | 'violationLimit'
  | 'focusThresholdMs'
  | 'heartbeatIntervalMs'
  | 'gapRecordedMs'
  | 'gapTokenMs'
  | 'gapViolationFrom'
  | 'tokenSlotSeconds'
  | 'lateToleranceMinutes'
  | 'minSubmitMinutes'

type SwitchKey = 'shuffleQuestions' | 'shuffleChoices' | 'allowWeb'

interface NumberField {
  key: NumberKey
  label: string
  suffix: string
  min: number
  max: number
  fallback: number
}

const NUMBER_FIELDS: NumberField[] = [
  {
    key: 'violationLimit',
    label: 'Batas pelanggaran',
    suffix: '',
    min: 1,
    max: 10,
    fallback: 3,
  },
  {
    key: 'focusThresholdMs',
    label: 'Ambang hilang fokus',
    suffix: ' ms',
    min: 3000,
    max: 60000,
    fallback: 15000,
  },
  {
    key: 'heartbeatIntervalMs',
    label: 'Interval detak sesi',
    suffix: ' ms',
    min: 10000,
    max: 120000,
    fallback: 30000,
  },
  {
    key: 'gapRecordedMs',
    label: 'Jeda tercatat putus',
    suffix: ' ms',
    min: 30000,
    max: 600000,
    fallback: 60000,
  },
  {
    key: 'gapTokenMs',
    label: 'Jeda wajib token ulang',
    suffix: ' ms',
    min: 30000,
    max: 3600000,
    fallback: 300000,
  },
  {
    key: 'gapViolationFrom',
    label: 'Putus ke-berapa jadi pelanggaran',
    suffix: '',
    min: 1,
    max: 5,
    fallback: 2,
  },
  {
    key: 'tokenSlotSeconds',
    label: 'Masa berlaku slot token',
    suffix: ' detik',
    min: 300,
    max: 3600,
    fallback: 900,
  },
  {
    key: 'lateToleranceMinutes',
    label: 'Toleransi terlambat',
    suffix: ' menit',
    min: 0,
    max: 120,
    fallback: 15,
  },
  {
    key: 'minSubmitMinutes',
    label: 'Minimal sebelum kumpul',
    suffix: ' menit',
    min: 0,
    max: 180,
    fallback: 0,
  },
]

const SWITCH_FIELDS: { key: SwitchKey; label: string }[] = [
  { key: 'shuffleQuestions', label: 'Acak urutan soal' },
  { key: 'shuffleChoices', label: 'Acak urutan pilihan' },
  { key: 'allowWeb', label: 'Izinkan lewat web (SEB)' },
]

const rangeOf = (field: NumberField) =>
  z.coerce
    .number({ invalid_type_error: `${field.label} wajib diisi` })
    .int(`${field.label} harus bilangan bulat`)
    .min(field.min, `Minimal ${field.min}`)
    .max(field.max, `Maksimal ${field.max}`)

const formSchema = toTypedSchema(
  z.object({
    ...(Object.fromEntries(
      NUMBER_FIELDS.map((field) => [field.key, rangeOf(field)]),
    ) as Record<NumberKey, ReturnType<typeof rangeOf>>),
    shuffleQuestions: z.boolean(),
    shuffleChoices: z.boolean(),
    allowWeb: z.boolean(),
  }),
)

function initialValues(policy: ExamPolicy) {
  const numbers = Object.fromEntries(
    NUMBER_FIELDS.map((field) => [
      field.key,
      policy[field.key] ?? field.fallback,
    ]),
  ) as Record<NumberKey, number>
  return {
    ...numbers,
    shuffleQuestions: policy.shuffleQuestions ?? true,
    shuffleChoices: policy.shuffleChoices ?? true,
    allowWeb: policy.allowWeb ?? true,
  }
}

const { handleSubmit, isSubmitting, values, setFieldValue, resetForm } =
  useForm({
    validationSchema: formSchema,
    initialValues: initialValues(props.policy),
  })

const saveError = ref<string | null>(null)

watch(
  () => [props.open, props.policy] as const,
  () => {
    saveError.value = null
    resetForm({ values: initialValues(props.policy) })
  },
)

const onSubmit = handleSubmit(async (form) => {
  saveError.value = null
  try {
    const response = await examActivityApi.updatePolicy(props.activityId, {
      ...form,
    })
    emit('saved', response.policy)
    emit('update:open', false)
  } catch (err: unknown) {
    saveError.value = messageOf(err, 'Kebijakan kegiatan gagal disimpan.')
  }
})
</script>

<template>
  <Dialog
    :open="open"
    @update:open="emit('update:open', $event)"
  >
    <DialogContent
      size="xl"
      @open-auto-focus.prevent
    >
      <DialogHeader standard>
        <DialogTitle>Ubah Kebijakan Kegiatan</DialogTitle>
        <DialogDescription>
          Sesuaikan angka pengawasan dan batas pelanggaran untuk kegiatan ini.
        </DialogDescription>
      </DialogHeader>
      <DialogBody class="space-y-4">
        <Alert
          v-if="saveError"
          variant="destructive"
        >
          <AlertDescription>{{ saveError }}</AlertDescription>
        </Alert>

        <form
          id="activity-policy-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-for="field in NUMBER_FIELDS"
            :key="field.key"
            v-slot="{ value, handleChange }"
            :name="field.key"
            :label="field.label"
            required
          >
            <div class="content-start">
              <FormControl>
                <FormattedNumberInput
                  :model-value="value"
                  :suffix="field.suffix"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <label
            v-for="field in SWITCH_FIELDS"
            :key="field.key"
            class="flex items-center gap-2 text-control"
          >
            <Switch
              :model-value="values[field.key]"
              :aria-label="field.label"
              @update:model-value="setFieldValue(field.key, $event)"
            />
            <span>{{ field.label }}</span>
          </label>
        </form>
      </DialogBody>
      <DialogFooter standard>
        <Button
          type="button"
          variant="outline"
          :disabled="isSubmitting"
          @click="emit('update:open', false)"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="activity-policy-form"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
