<script setup lang="ts">
import { computed, watch } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import * as z from 'zod'
import {
  AppCombobox,
  FormattedNumberInput,
  DatePicker,
} from '@mts241alikhlash/ui'
import { Alert, AlertDescription } from '@mts241alikhlash/ui/alert'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@mts241alikhlash/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mts241alikhlash/ui/popover'
import { Check, ChevronDown } from '@lucide/vue'
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
import {
  categoryOf,
  examTypeLabel,
  typesFor,
  type ExamCategory,
  type ExamType,
} from '@/features/exam-shared/examType'
import type {
  ActivityCreatePayload,
  ActivityTokenMode,
  ClassroomOption,
  EventOption,
  GradeOption,
  PackageOption,
  PresetName,
  SubjectOption,
} from '../types'
import { ACTIVITY_TOKEN_MODES } from '../types'

const props = defineProps<{
  semesterId: string
  grades: GradeOption[]
  classrooms: ClassroomOption[]
  packages: PackageOption[]
  subjects?: SubjectOption[]
  events?: EventOption[]
  category?: ExamCategory
  fixedEventId?: string
  isAdmin: boolean
  canManageEvents?: boolean
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: ActivityCreatePayload]
}>()

const midtermEventActive = computed(() =>
  (props.events ?? []).some((event) => event.type === 'MIDTERM'),
)

const availableTypes = computed<ExamType[]>(() => {
  if (props.category) {
    return typesFor(
      props.category,
      props.isAdmin,
      midtermEventActive.value,
      props.canManageEvents ?? false,
    )
  }
  return [
    ...typesFor(
      'NON_EXAM',
      props.isAdmin,
      midtermEventActive.value,
      props.canManageEvents ?? false,
    ),
    ...typesFor(
      'EXAM',
      props.isAdmin,
      midtermEventActive.value,
      props.canManageEvents ?? false,
    ),
  ]
})

const noTypeAvailable = computed(() => availableTypes.value.length === 0)

const nonExamPresetTypes: readonly PresetName[] = ['DAILY', 'ASSIGNMENT']

const combine = (date: string, time: string): number =>
  new Date(`${date}T${time}`).getTime()

const formSchema = toTypedSchema(
  z
    .object({
      gradeId: z.string().min(1, 'Tingkat wajib dipilih'),
      classroomIds: z.array(z.string()),
      packageId: z.string(),
      subjectId: z.string().min(1, 'Mata pelajaran wajib dipilih'),
      type: z.string().min(1, 'Jenis wajib dipilih'),
      eventId: z.string().optional(),
      presetName: z.string(),
      tokenMode: z.string(),
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
      if (value.packageId !== '' && value.classroomIds.length === 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['classroomIds'],
          message: 'Pilih minimal satu kelas',
        })
      }
      if (
        value.type !== '' &&
        categoryOf(value.type as ExamType) === 'EXAM' &&
        !value.eventId
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['eventId'],
          message: 'Periode ujian wajib dipilih',
        })
      }
      if (
        value.startDate !== '' &&
        value.startTime !== '' &&
        value.endDate !== '' &&
        value.endTime !== '' &&
        combine(value.endDate, value.endTime) <=
          combine(value.startDate, value.startTime)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['endTime'],
          message: 'Waktu selesai harus setelah waktu mulai',
        })
      }
    }),
)

const { handleSubmit, values, setFieldValue } = useForm({
  validationSchema: formSchema,
  initialValues: {
    gradeId: '',
    classroomIds: [] as string[],
    packageId: '',
    subjectId: '',
    type: availableTypes.value[0] ?? 'DAILY',
    eventId: props.fixedEventId ?? '',
    presetName: availableTypes.value[0] ?? 'DAILY',
    tokenMode: 'ROTATING',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    durationMinutes: 90,
  },
})

const isExamType = computed(
  () => categoryOf(values.type as ExamType) === 'EXAM',
)

const filteredEvents = computed(() =>
  (props.events ?? []).filter((event) => event.type === values.type),
)

const visibleClassrooms = computed(() =>
  props.classrooms.filter((room) => room.gradeId === values.gradeId),
)

const chosenPackage = computed(
  () => props.packages.find((item) => item.id === values.packageId) ?? null,
)

watch(
  availableTypes,
  (options) => {
    if (options.length > 0 && !options.includes(values.type as ExamType)) {
      setFieldValue('type', options[0])
    }
  },
  { immediate: true },
)

const fixedEvent = computed(
  () =>
    (props.events ?? []).find((event) => event.id === props.fixedEventId) ??
    null,
)

watch(
  fixedEvent,
  (event) => {
    if (event !== null) {
      setFieldValue('type', event.type)
      setFieldValue('eventId', event.id)
    }
  },
  { immediate: true },
)

watch(
  () => values.type,
  (nextType) => {
    if (fixedEvent.value !== null) return
    setFieldValue('presetName', nextType ?? 'DAILY')
    if (categoryOf(nextType as ExamType) === 'EXAM') {
      setFieldValue('tokenMode', 'ROTATING')
      const matching = (props.events ?? []).filter(
        (event) => event.type === nextType,
      )
      if (!matching.some((event) => event.id === values.eventId)) {
        setFieldValue('eventId', matching[0]?.id ?? '')
      }
    } else {
      setFieldValue('eventId', '')
    }
  },
  { immediate: true },
)

watch(
  () => values.subjectId,
  () => setFieldValue('packageId', ''),
)

watch(
  () => values.gradeId,
  () => setFieldValue('classroomIds', []),
)

const periodOptions = computed(() =>
  filteredEvents.value.map((event) => ({ value: event.id, label: event.name })),
)
const packageOptions = computed(() =>
  props.packages
    .filter((item) => !values.subjectId || item.subjectId === values.subjectId)
    .map((item) => ({ value: item.id, label: item.label })),
)
const subjectOptions = computed(() =>
  (props.subjects ?? []).map((item) => ({ value: item.id, label: item.label })),
)

function classroomSummary(ids: string[]): string {
  if (values.gradeId === '') return 'Pilih tingkat dulu'
  if (visibleClassrooms.value.length === 0) return 'Belum ada kelas aktif'
  if (ids.length === 0) return 'Pilih kelas'
  return props.classrooms
    .filter((room) => ids.includes(room.id))
    .map((room) => room.label)
    .join(', ')
}

function toggleClassroom(
  current: string[],
  id: string,
  checked: boolean,
  update: (next: string[]) => void,
) {
  update(checked ? [...current, id] : current.filter((item) => item !== id))
}

const onSubmit = handleSubmit((form) => {
  const item = chosenPackage.value
  const exam = categoryOf(form.type as ExamType) === 'EXAM'
  emit('submit', {
    semesterId: props.semesterId,
    ...(exam && form.eventId ? { eventId: form.eventId } : {}),
    gradeId: form.gradeId,
    subjectId: item?.subjectId ?? form.subjectId,
    ...(item !== null ? { packageId: item.id } : {}),
    type: form.type as ExamType,
    classroomIds: [...form.classroomIds],
    presetName: (exam ? form.type : form.presetName) as PresetName,
    tokenMode: (exam ? 'ROTATING' : form.tokenMode) as ActivityTokenMode,
    startsAt: new Date(`${form.startDate}T${form.startTime}`).toISOString(),
    endsAt: new Date(`${form.endDate}T${form.endTime}`).toISOString(),
    durationMinutes: form.durationMinutes,
  })
})
</script>

<template>
  <form
    id="activity-form"
    class="grid gap-4 sm:grid-cols-2"
    @submit.prevent="onSubmit"
  >
    <Alert
      v-if="noTypeAvailable"
      variant="destructive"
      class="sm:col-span-2"
    >
      <AlertDescription>
        Belum ada periode UTS yang aktif. Minta tata usaha atau kurikulum
        membuka periode UTS sebelum membuat kegiatan ujian.
      </AlertDescription>
    </Alert>

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
            :disabled="fixedEvent !== null"
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
    >
      <div class="content-start">
        <Select
          :model-value="value"
          :disabled="fixedEvent !== null"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="option in availableTypes"
              :key="option"
              :value="option"
            >
              {{ examTypeLabel(option) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>

    <FloatingField
      v-if="!isExamType"
      v-slot="{ value, handleChange }"
      name="presetName"
      label="Preset kebijakan"
      required
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="name in nonExamPresetTypes"
              :key="name"
              :value="name"
            >
              {{ examTypeLabel(name) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="gradeId"
      label="Tingkat"
      required
    >
      <div class="content-start">
        <Select
          :model-value="value || undefined"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="grade in grades"
              :key="grade.id"
              :value="grade.id"
            >
              {{ grade.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="classroomIds"
      label="Kelas yang ikut"
      always-float
    >
      <div class="content-start">
        <Popover>
          <PopoverTrigger as-child>
            <FormControl>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                :disabled="visibleClassrooms.length === 0"
                :class="[
                  'h-[var(--control-h-md,2rem)] w-full justify-between border-input bg-transparent font-normal hover:bg-transparent',
                  (value ?? []).length === 0 && 'text-muted-foreground',
                ]"
              >
                <span class="truncate">{{
                  classroomSummary(value ?? [])
                }}</span>
                <ChevronDown class="ml-2 size-3.5 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent
            class="w-[var(--reka-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Cari kelas..." />
              <CommandList>
                <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="Pilih semua"
                    @select.prevent="
                      handleChange(
                        (value ?? []).length === visibleClassrooms.length
                          ? []
                          : visibleClassrooms.map((room) => room.id),
                      )
                    "
                  >
                    <Check
                      :class="[
                        'size-3.5',
                        visibleClassrooms.length > 0 &&
                        (value ?? []).length === visibleClassrooms.length
                          ? 'opacity-100'
                          : 'opacity-0',
                      ]"
                    />
                    Pilih semua
                  </CommandItem>
                  <CommandItem
                    v-for="room in visibleClassrooms"
                    :key="room.id"
                    :value="room.label"
                    @select.prevent="
                      toggleClassroom(
                        value ?? [],
                        room.id,
                        !(value ?? []).includes(room.id),
                        handleChange,
                      )
                    "
                  >
                    <Check
                      :class="[
                        'size-3.5',
                        (value ?? []).includes(room.id)
                          ? 'opacity-100'
                          : 'opacity-0',
                      ]"
                    />
                    {{ room.label }}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="subjectId"
      label="Mata pelajaran"
      required
      always-float
    >
      <div class="content-start">
        <FormControl>
          <AppCombobox
            :model-value="value"
            :options="subjectOptions"
            placeholder="Pilih mata pelajaran"
            @update:model-value="handleChange"
          />
        </FormControl>
      </div>
    </FloatingField>

    <FloatingField
      v-slot="{ value, handleChange }"
      name="packageId"
      label="Paket soal"
      always-float
    >
      <div class="content-start">
        <FormControl>
          <AppCombobox
            :model-value="value"
            :options="packageOptions"
            placeholder="Boleh dikosongkan, paket bisa dipasang nanti"
            @update:model-value="handleChange"
          />
        </FormControl>
      </div>
    </FloatingField>

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

    <FloatingLabelField
      v-if="isExamType"
      label="Jenis token"
      for="activity-token-fixed"
      floating
    >
      <Input
        id="activity-token-fixed"
        model-value="Token berputar"
        disabled
      />
    </FloatingLabelField>
    <FloatingField
      v-else
      v-slot="{ value, handleChange }"
      name="tokenMode"
      label="Jenis token"
      required
    >
      <div class="content-start">
        <Select
          :model-value="value"
          @update:model-value="handleChange"
        >
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="mode in ACTIVITY_TOKEN_MODES"
              :key="mode"
              :value="mode"
            >
              {{ mode === 'ROTATING' ? 'Token berputar' : 'Token tetap' }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </FloatingField>
  </form>
</template>
