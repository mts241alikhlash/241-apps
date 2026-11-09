<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ActivityCreatePayload,
  ActivityStatus,
  ActivityTokenMode,
  ClassroomOption,
  ExamActivityRecord,
  GradeOption,
  PackageOption,
  PresetName,
} from '../types'
import {
  ACTIVITY_STATUSES,
  ACTIVITY_TOKEN_MODES,
  activityStatusLabel,
  EXAM_TYPES,
  PRESET_LABELS,
} from '../types'

const props = defineProps<{
  semesterId: string
  grades: GradeOption[]
  classrooms: ClassroomOption[]
  packages: PackageOption[]
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

const gradeId = ref('')
const classroomIds = ref<string[]>([])
const packageId = ref('')
const type = ref<(typeof EXAM_TYPES)[number]>('UH')
const presetName = ref<PresetName>('UJIAN_KETAT')
const tokenMode = ref<ActivityTokenMode>('ROTATING')
const startsAt = ref('')
const endsAt = ref('')
const durationMinutes = ref(90)

const visibleClassrooms = computed(() =>
  props.classrooms.filter((room) => room.gradeId === gradeId.value),
)

const chosenPackage = computed(
  () => props.packages.find((item) => item.id === packageId.value) ?? null,
)

const canSubmit = computed(
  () =>
    gradeId.value !== '' &&
    classroomIds.value.length > 0 &&
    packageId.value !== '' &&
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
    gradeId: gradeId.value,
    subjectId: item.subjectId,
    packageId: item.id,
    type: type.value,
    classroomIds: [...classroomIds.value],
    presetName: presetName.value,
    tokenMode: tokenMode.value,
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
        <select v-model="gradeId">
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
        <select v-model="packageId">
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

      <label class="grid gap-1">
        <span>Jenis</span>
        <select v-model="type">
          <option
            v-for="value in EXAM_TYPES"
            :key="value"
            :value="value"
          >
            {{ value }}
          </option>
        </select>
      </label>

      <label class="grid gap-1">
        <span>Preset kebijakan</span>
        <select v-model="presetName">
          <option
            v-for="(label, name) in PRESET_LABELS"
            :key="name"
            :value="name"
          >
            {{ label }}
          </option>
        </select>
      </label>

      <label class="grid gap-1">
        <span>Jenis token</span>
        <select v-model="tokenMode">
          <option
            v-for="value in ACTIVITY_TOKEN_MODES"
            :key="value"
            :value="value"
          >
            {{ value === 'ROTATING' ? 'Berputar (ujian)' : 'Tetap (tugas)' }}
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
