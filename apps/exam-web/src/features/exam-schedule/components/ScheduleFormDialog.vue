<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import { toast } from 'vue-sonner'
import {
  AppCombobox,
  DatePicker,
  FormattedNumberInput,
} from '@mts241alikhlash/ui'
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
import {
  FloatingField,
  FloatingLabelField,
  FormControl,
} from '@mts241alikhlash/ui/form'
import { Input } from '@mts241alikhlash/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import type { ExamPackageSummary } from '@/features/exam-package/types'
import type { Classroom } from '@/features/lookup/classroom'
import type { ExamEvent } from '@/features/exam-event/types'
import {
  EXAM_TYPES,
  categoryOf,
  examTypeLabel,
  type ExamCategory,
} from '@/features/exam-shared/examType'
import { examScheduleService } from '../services/examScheduleService'
import type { ExamSchedule, ExamType } from '../types'
import { fromInstant, toInstant } from '../utils/instant'
import { validateSchedule } from '../utils/validateSchedule'

const props = defineProps<{
  open: boolean
  schedule?: ExamSchedule | null
  category?: ExamCategory
  eventId?: string
  date?: string
  packageId?: string
  packageGradeId?: string
  packageTitle?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  saved: [type: ExamType]
}>()

const existing = computed(() => props.schedule ?? null)
const isEdit = computed(() => existing.value !== null)

const allowedTypes = computed(() =>
  props.category
    ? EXAM_TYPES.filter((item) => categoryOf(item) === props.category)
    : EXAM_TYPES,
)

const typeLocked =
  props.schedule !== null &&
  props.schedule !== undefined &&
  (props.schedule.hasSessions || props.schedule.kind === 'MAKEUP')

const start = existing.value ? fromInstant(existing.value.startsAt) : null
const end = existing.value ? fromInstant(existing.value.endsAt) : null

const formSchema = toTypedSchema(
  z
    .object({
      eventId: z.string(),
      type: z.string().min(1, 'Jenis wajib dipilih'),
      packageId: z.string(),
      classroomId: z.string(),
      startDate: z.string().min(1, 'Tanggal mulai wajib diisi'),
      startTime: z.string().min(1, 'Jam mulai wajib diisi'),
      endDate: z.string().min(1, 'Tanggal selesai wajib diisi'),
      endTime: z.string().min(1, 'Jam selesai wajib diisi'),
      durationMinutes: z
        .number({ invalid_type_error: 'Durasi minimal 1 menit' })
        .int('Durasi minimal 1 menit')
        .min(1, 'Durasi minimal 1 menit')
        .max(1440, 'Durasi maksimal 1440 menit'),
    })
    .superRefine((value, ctx) => {
      if (!isEdit.value && value.packageId === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['packageId'],
          message: 'Paket wajib dipilih',
        })
      }
      if (!isEdit.value && value.classroomId === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['classroomId'],
          message: 'Kelas wajib dipilih',
        })
      }
      if (
        value.type !== '' &&
        categoryOf(value.type as ExamType) === 'EXAM' &&
        value.eventId === ''
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['eventId'],
          message: 'Periode ujian wajib dipilih',
        })
      }
      if (
        value.startDate &&
        value.startTime &&
        value.endDate &&
        value.endTime
      ) {
        const problem = validateSchedule({
          startDate: value.startDate,
          startTime: value.startTime,
          endDate: value.endDate,
          endTime: value.endTime,
          durationMinutes: value.durationMinutes,
        })
        if (problem !== null) {
          ctx.addIssue({ code: 'custom', path: ['endTime'], message: problem })
        }
      }
    }),
)

const { handleSubmit, isSubmitting, values, setFieldValue, resetForm } =
  useForm({
    validationSchema: formSchema,
    initialValues: {
      eventId: existing.value?.eventId ?? props.eventId ?? '',
      type: existing.value?.type ?? allowedTypes.value[0] ?? '',
      packageId: '',
      classroomId: '',
      startDate: start?.date ?? props.date ?? '',
      startTime: start?.time ?? '',
      endDate: end?.date ?? props.date ?? '',
      endTime: end?.time ?? '',
      durationMinutes: existing.value?.durationMinutes ?? 90,
    },
  })

const packages = ref<ExamPackageSummary[]>([])
const classrooms = ref<Classroom[]>([])
const events = ref<ExamEvent[]>([])
const classroomsLoaded = ref(false)
const saveError = ref<string | null>(null)
let classroomRequest = 0

const isExamType = computed(
  () => values.type !== '' && categoryOf(values.type as ExamType) === 'EXAM',
)

const periodOptions = computed(() =>
  events.value
    .filter((item) => item.type === values.type)
    .map((item) => ({ value: item.id, label: item.name })),
)

const packageOptions = computed(() =>
  packages.value.map((item) => ({ value: item.id, label: item.title })),
)

const packageName = computed(
  () =>
    packages.value.find((item) => item.id === values.packageId)?.title ??
    props.packageTitle ??
    '',
)

function gradeOf(id: string): string | undefined {
  if (id === props.packageId && props.packageGradeId) {
    return props.packageGradeId
  }
  return packages.value.find((item) => item.id === id)?.gradeId
}

watch(
  () => values.type,
  (next) => {
    if (props.eventId && !isEdit.value) return
    if (next && categoryOf(next as ExamType) === 'EXAM') {
      const matching = events.value.filter((item) => item.type === next)
      if (!matching.some((item) => item.id === values.eventId)) {
        setFieldValue('eventId', matching[0]?.id ?? '')
      }
    } else if (!isEdit.value) {
      setFieldValue('eventId', '')
    }
  },
)

watch(
  () => values.packageId,
  async (id) => {
    const request = ++classroomRequest
    setFieldValue('classroomId', '')
    classrooms.value = []
    classroomsLoaded.value = false
    const gradeId = gradeOf(id ?? '')
    if (!gradeId) return
    const loaded = await examScheduleService.loadClassrooms(gradeId)
    if (request !== classroomRequest) return
    classrooms.value = loaded
    classroomsLoaded.value = true
  },
)

onMounted(async () => {
  events.value = await examScheduleService.loadEvents()
  const fixed = events.value.find((item) => item.id === props.eventId)
  if (fixed && !isEdit.value) setFieldValue('type', fixed.type)
  if (isExamType.value && values.eventId === '') {
    setFieldValue(
      'eventId',
      events.value.find((item) => item.type === values.type)?.id ?? '',
    )
  }
  if (isEdit.value) return
  if (props.packageId && props.packageGradeId) {
    setFieldValue('packageId', props.packageId)
    return
  }
  packages.value = await examScheduleService.loadPackages()
  if (props.packageId) setFieldValue('packageId', props.packageId)
})

const onSubmit = handleSubmit(async (form) => {
  saveError.value = null
  const window = {
    type: (typeLocked && existing.value
      ? existing.value.type
      : form.type) as ExamType,
    startsAt: toInstant(form.startDate, form.startTime),
    endsAt: toInstant(form.endDate, form.endTime),
    durationMinutes: form.durationMinutes,
    ...(form.eventId !== '' || isEdit.value
      ? { eventId: form.eventId || null }
      : {}),
  }
  const result = existing.value
    ? await examScheduleService.saveSchedule(
        { mode: 'edit', id: existing.value.id },
        window,
      )
    : await examScheduleService.saveSchedule(
        { mode: 'create' },
        {
          packageId: form.packageId,
          classroomId: form.classroomId,
          ...window,
        },
      )
  if (!result.success) {
    saveError.value = result.error
    return
  }
  toast.success(
    existing.value ? 'Perubahan jadwal disimpan.' : 'Jadwal ditambahkan.',
  )
  emit('saved', form.type as ExamType)
  emit('update:open', false)
})

function close() {
  resetForm()
  saveError.value = null
  emit('update:open', false)
}
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
        <DialogTitle>{{
          isEdit ? 'Ubah Jadwal' : 'Tambah Jadwal'
        }}</DialogTitle>
        <DialogDescription>
          Atur periode, paket, kelas, waktu, dan durasi ujian.
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
          id="schedule-form"
          class="grid gap-4 sm:grid-cols-2"
          @submit.prevent="onSubmit"
        >
          <FloatingField
            v-if="isExamType"
            v-slot="{ value, handleChange }"
            name="eventId"
            label="Periode ujian"
            required
          >
            <div class="content-start">
              <FormControl>
                <AppCombobox
                  :model-value="value"
                  :options="periodOptions"
                  :disabled="!isEdit && Boolean(props.eventId)"
                  placeholder="Pilih periode ujian"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="type"
            label="Jenis"
            required
            :class="isExamType ? '' : 'sm:col-span-2'"
          >
            <div class="content-start">
              <Select
                :model-value="value || undefined"
                :disabled="typeLocked || (!isEdit && Boolean(props.eventId))"
                @update:model-value="handleChange"
              >
                <FormControl>
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Pilih jenis" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem
                    v-for="option in allowedTypes"
                    :key="option"
                    :value="option"
                  >
                    {{ examTypeLabel(option) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </FloatingField>

          <template v-if="!isEdit">
            <FloatingLabelField
              v-if="props.packageId"
              label="Paket"
              for="schedule-package-fixed"
              floating
            >
              <Input
                id="schedule-package-fixed"
                :model-value="packageName"
                disabled
              />
            </FloatingLabelField>
            <FloatingField
              v-else
              v-slot="{ value, handleChange }"
              name="packageId"
              label="Paket"
              required
              always-float
            >
              <div class="content-start">
                <FormControl>
                  <AppCombobox
                    :model-value="value"
                    :options="packageOptions"
                    placeholder="Pilih paket"
                    @update:model-value="handleChange"
                  />
                </FormControl>
              </div>
            </FloatingField>

            <FloatingField
              v-slot="{ value, handleChange }"
              name="classroomId"
              label="Kelas"
              required
            >
              <div class="content-start">
                <Select
                  :model-value="value || undefined"
                  :disabled="!values.packageId"
                  @update:model-value="handleChange"
                >
                  <FormControl>
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="Pilih kelas" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem
                      v-for="classroom in classrooms"
                      :key="classroom.id"
                      :value="classroom.id"
                    >
                      {{ classroom.name ?? classroom.displayName }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FloatingField>
            <p
              v-if="classroomsLoaded && classrooms.length === 0"
              class="text-control text-muted-foreground sm:col-span-2"
            >
              Tidak ada kelas aktif untuk tingkat ini. Pastikan semester aktif
              sudah diatur.
            </p>
          </template>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="startDate"
            label="Tanggal mulai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  :disabled="!isEdit && Boolean(props.date)"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="startTime"
            label="Jam mulai"
            required
            always-float
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="time"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="endDate"
            label="Tanggal selesai"
            required
          >
            <div class="content-start">
              <FormControl>
                <DatePicker
                  :model-value="value"
                  allow-future-dates
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ componentField }"
            name="endTime"
            label="Jam selesai"
            required
            always-float
          >
            <div class="content-start">
              <FormControl>
                <Input
                  v-bind="componentField"
                  type="time"
                />
              </FormControl>
            </div>
          </FloatingField>

          <FloatingField
            v-slot="{ value, handleChange }"
            name="durationMinutes"
            label="Durasi"
            required
          >
            <div class="content-start">
              <FormControl>
                <FormattedNumberInput
                  :model-value="value"
                  numeric
                  suffix=" menit"
                  :max-digits="4"
                  @update:model-value="handleChange"
                />
              </FormControl>
            </div>
          </FloatingField>
        </form>
      </DialogBody>
      <DialogFooter
        standard
        class="justify-between"
      >
        <Button
          type="button"
          variant="outline"
          @click="close"
        >
          Batal
        </Button>
        <Button
          type="submit"
          form="schedule-form"
          :disabled="isSubmitting"
        >
          {{ isSubmitting ? 'Menyimpan…' : 'Simpan' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
