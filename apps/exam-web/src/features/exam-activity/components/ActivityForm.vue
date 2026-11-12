<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  categoryOf,
  examTypeLabel,
  typesFor,
  type ExamCategory,
  type ExamType,
} from '@/features/exam-shared/examType'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ActivityCreatePayload,
  ActivityStatus,
  ActivityTokenMode,
  ClassroomOption,
  EventOption,
  ExamActivityRecord,
  GradeOption,
  PackageOption,
  PresetName,
} from '../types'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TOKEN_MODES,
  activityStatusLabel,
} from '../types'

const props = defineProps<{
  semesterId: string
  grades: GradeOption[]
  classrooms: ClassroomOption[]
  packages: PackageOption[]
  events?: EventOption[]
  category?: ExamCategory
  isAdmin: boolean
  activity?: ExamActivityRecord | null
  submitting?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: ActivityCreatePayload]
  'status-saved': []
  'numbers-issued': [issued: boolean]
}>()

const isEdit = computed(
  () => props.activity !== null && props.activity !== undefined,
)

const status = ref<ActivityStatus>(props.activity?.status ?? 'DRAFT')
const savingStatus = ref(false)
const issuingNumbers = ref(false)
const statusError = ref<string | null>(null)

const outsideWindow = computed(() => {
  const item = props.activity
  if (item === null || item === undefined) return false
  const now = Date.now()
  return (
    now < new Date(item.startsAt).getTime() ||
    now >= new Date(item.endsAt).getTime()
  )
})

const statusWarning = computed(
  () => status.value === 'ACTIVE' && outsideWindow.value,
)

const midtermEventActive = computed(() =>
  (props.events ?? []).some((event) => event.type === 'MIDTERM'),
)

const availableTypes = computed<ExamType[]>(() => {
  if (props.category) {
    return typesFor(props.category, props.isAdmin, midtermEventActive.value)
  }
  return [
    ...typesFor('NON_EXAM', props.isAdmin, midtermEventActive.value),
    ...typesFor('EXAM', props.isAdmin, midtermEventActive.value),
  ]
})

const noTypeAvailable = computed(() => availableTypes.value.length === 0)

const nonExamPresetTypes: readonly PresetName[] = ['DAILY', 'ASSIGNMENT']

const gradeId = ref('')
const classroomIds = ref<string[]>([])
const packageId = ref('')
const eventId = ref('')
const type = ref<ExamType>(availableTypes.value[0] ?? 'DAILY')
const presetName = ref<PresetName>(type.value)
const tokenMode = ref<ActivityTokenMode>('ROTATING')
const startsAt = ref('')
const endsAt = ref('')
const durationMinutes = ref(90)

const isExamType = computed(() => categoryOf(type.value) === 'EXAM')

const filteredEvents = computed(() =>
  (props.events ?? []).filter((event) => event.type === type.value),
)

watch(
  availableTypes,
  (options) => {
    if (options.length > 0 && !options.includes(type.value)) {
      type.value = options[0]
    }
  },
  { immediate: true },
)

watch(
  type,
  (nextType) => {
    presetName.value = nextType
    if (categoryOf(nextType) === 'EXAM') {
      tokenMode.value = 'ROTATING'
      const matching = (props.events ?? []).filter(
        (event) => event.type === nextType,
      )
      if (!matching.some((event) => event.id === eventId.value)) {
        eventId.value = matching[0]?.id ?? ''
      }
    } else {
      eventId.value = ''
    }
  },
  { immediate: true },
)

const visibleClassrooms = computed(() =>
  props.classrooms.filter((room) => room.gradeId === gradeId.value),
)

const chosenPackage = computed(
  () => props.packages.find((item) => item.id === packageId.value) ?? null,
)

const canSubmit = computed(
  () =>
    !noTypeAvailable.value &&
    gradeId.value !== '' &&
    classroomIds.value.length > 0 &&
    packageId.value !== '' &&
    (!isExamType.value || eventId.value !== '') &&
    startsAt.value !== '' &&
    endsAt.value !== '' &&
    durationMinutes.value > 0,
)

watch(gradeId, () => {
  classroomIds.value = []
})

function toggleClassroom(id: string, checked: boolean): void {
  classroomIds.value = checked
    ? [...classroomIds.value, id]
    : classroomIds.value.filter((item) => item !== id)
}

async function saveStatus(): Promise<void> {
  const item = props.activity
  if (item === null || item === undefined || savingStatus.value) return
  if (
    item.status === 'ACTIVE' &&
    status.value !== 'ACTIVE' &&
    !window.confirm(
      'Menghentikan kegiatan aktif akan mengumpulkan sesi yang masih berjalan. Lanjutkan?',
    )
  ) {
    return
  }
  savingStatus.value = true
  statusError.value = null
  try {
    await examActivityApi.updateStatus(item.id, status.value)
    emit('status-saved')
  } catch {
    statusError.value = 'Status kegiatan gagal disimpan.'
  } finally {
    savingStatus.value = false
  }
}

async function issueNumbers(): Promise<void> {
  const item = props.activity
  if (item === null || item === undefined || issuingNumbers.value) return
  issuingNumbers.value = true
  try {
    const response = await examActivityApi.issueParticipantNumbers(item.id)
    emit('numbers-issued', response.data.data.issued)
  } catch {
    emit('numbers-issued', false)
  } finally {
    issuingNumbers.value = false
  }
}

async function submit(): Promise<void> {
  if (isEdit.value) {
    await saveStatus()
    return
  }
  const item = chosenPackage.value
  if (!canSubmit.value || item === null) return
  emit('submit', {
    semesterId: props.semesterId,
    ...(isExamType.value && eventId.value !== ''
      ? { eventId: eventId.value }
      : {}),
    gradeId: gradeId.value,
    subjectId: item.subjectId,
    packageId: item.id,
    type: type.value,
    classroomIds: [...classroomIds.value],
    presetName: isExamType.value ? type.value : presetName.value,
    tokenMode: isExamType.value ? 'ROTATING' : tokenMode.value,
    startsAt: new Date(startsAt.value).toISOString(),
    endsAt: new Date(endsAt.value).toISOString(),
    durationMinutes: durationMinutes.value,
  })
}
</script>

<template>
  <form
    class="grid gap-4"
    @submit.prevent="submit"
  >
    <template v-if="isEdit">
      <label class="grid gap-1">
        <span>Status kegiatan</span>
        <select
          id="activity-status"
          v-model="status"
        >
          <option
            v-for="value in ACTIVITY_STATUSES"
            :key="value"
            :value="value"
          >
            {{ activityStatusLabel(value) }}
          </option>
        </select>
      </label>

      <p
        v-if="statusWarning"
        role="status"
      >
        Kegiatan aktif, tetapi sekarang di luar jendela waktu. Siswa belum bisa
        masuk sampai jendela dibuka.
      </p>

      <p
        v-if="statusError !== null"
        role="alert"
      >
        {{ statusError }}
      </p>

      <button
        type="button"
        :disabled="issuingNumbers"
        @click="issueNumbers"
      >
        {{ issuingNumbers ? 'Menerbitkan…' : 'Terbitkan nomor peserta' }}
      </button>
    </template>

    <template v-else>
      <label class="grid gap-1">
        <span>Tingkat</span>
        <select
          id="activity-grade"
          v-model="gradeId"
        >
          <option value="">Pilih tingkat</option>
          <option
            v-for="grade in grades"
            :key="grade.id"
            :value="grade.id"
          >
            {{ grade.label }}
          </option>
        </select>
      </label>

      <fieldset class="grid gap-1">
        <legend>Kelas yang ikut</legend>
        <p v-if="gradeId === ''">Pilih tingkat dulu.</p>
        <p v-else-if="visibleClassrooms.length === 0">
          Belum ada kelas aktif pada tingkat ini.
        </p>
        <label
          v-for="room in visibleClassrooms"
          :key="room.id"
          class="flex items-center gap-2"
        >
          <input
            type="checkbox"
            :value="room.id"
            :checked="classroomIds.includes(room.id)"
            @change="
              toggleClassroom(
                room.id,
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
          <span>{{ room.label }}</span>
        </label>
      </fieldset>

      <label class="grid gap-1">
        <span>Paket soal</span>
        <select
          id="activity-package"
          v-model="packageId"
        >
          <option value="">Pilih paket</option>
          <option
            v-for="item in packages"
            :key="item.id"
            :value="item.id"
          >
            {{ item.label }}
          </option>
        </select>
      </label>

      <p
        v-if="noTypeAvailable"
        role="alert"
      >
        Belum ada periode UTS yang aktif. Minta tata usaha atau kurikulum
        membuka periode UTS sebelum membuat kegiatan ujian.
      </p>

      <label class="grid gap-1">
        <span>Jenis</span>
        <select
          id="activity-type"
          v-model="type"
        >
          <option
            v-for="value in availableTypes"
            :key="value"
            :value="value"
          >
            {{ examTypeLabel(value) }}
          </option>
        </select>
      </label>

      <label
        v-if="isExamType"
        class="grid gap-1"
      >
        <span>Periode ujian</span>
        <select
          id="activity-event"
          v-model="eventId"
        >
          <option value="">Pilih periode ujian</option>
          <option
            v-for="event in filteredEvents"
            :key="event.id"
            :value="event.id"
          >
            {{ event.name }}
          </option>
        </select>
      </label>

      <div
        v-if="isExamType"
        class="grid gap-1"
      >
        <span>Preset kebijakan</span>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Kebijakan {{ examTypeLabel(type) }}
        </p>
      </div>
      <label
        v-else
        class="grid gap-1"
      >
        <span>Preset kebijakan</span>
        <select
          id="activity-preset"
          v-model="presetName"
        >
          <option
            v-for="name in nonExamPresetTypes"
            :key="name"
            :value="name"
          >
            {{ examTypeLabel(name) }}
          </option>
        </select>
      </label>

      <div
        v-if="isExamType"
        class="grid gap-1"
      >
        <span>Jenis token</span>
        <p
          class="text-[length:var(--text-control,0.75rem)] text-muted-foreground"
        >
          Token berputar
        </p>
      </div>
      <label
        v-else
        class="grid gap-1"
      >
        <span>Jenis token</span>
        <select
          id="activity-token-mode"
          v-model="tokenMode"
        >
          <option
            v-for="value in ACTIVITY_TOKEN_MODES"
            :key="value"
            :value="value"
          >
            {{ value === 'ROTATING' ? 'Token berputar' : 'Token tetap' }}
          </option>
        </select>
      </label>

      <div class="grid gap-4 sm:grid-cols-3">
        <label class="grid gap-1">
          <span>Mulai</span>
          <input
            v-model="startsAt"
            type="datetime-local"
          />
        </label>
        <label class="grid gap-1">
          <span>Selesai</span>
          <input
            v-model="endsAt"
            type="datetime-local"
          />
        </label>
        <label class="grid gap-1">
          <span>Durasi (menit)</span>
          <input
            v-model.number="durationMinutes"
            type="number"
            min="1"
            max="1440"
          />
        </label>
      </div>

      <fieldset
        v-if="isAdmin"
        class="grid gap-1"
      >
        <legend>Lanjutan (admin)</legend>
        <p>Angka penegakan diubah lewat preset atau sesudah kegiatan dibuat.</p>
      </fieldset>
    </template>

    <button
      type="submit"
      :disabled="isEdit ? savingStatus : !canSubmit || submitting === true"
    >
      {{ isEdit ? 'Simpan status' : 'Simpan kegiatan' }}
    </button>
  </form>
</template>
