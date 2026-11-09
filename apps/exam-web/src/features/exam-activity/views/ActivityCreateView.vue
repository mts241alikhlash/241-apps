<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { toast } from 'vue-sonner'
import { classroomApi } from '@/features/lookup/classroom'
import { semesterApi } from '@/features/lookup/semester'
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import ActivityForm from '../components/ActivityForm.vue'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ActivityCreatePayload,
  ClassroomOption,
  ExamActivityRecord,
  GradeOption,
  PackageOption,
} from '../types'

const route = useRoute()
const editingId = computed(() =>
  typeof route.query.id === 'string' ? route.query.id : '',
)
const semesterId = ref('')
const grades = ref<GradeOption[]>([])
const classrooms = ref<ClassroomOption[]>([])
const packages = ref<PackageOption[]>([])
const isAdmin = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const activity = ref<ExamActivityRecord | null>(null)
const loadingActivity = ref(editingId.value !== '')

async function load(): Promise<void> {
  const [semesters, rooms, packs] = await Promise.all([
    semesterApi.getSemesters({ page: 1, limit: 20 }),
    classroomApi.getClassrooms({ page: 1, limit: 200 }),
    examPackageApi.getPackages({ page: 1, limit: 200 }),
  ])

  const activeSemester =
    semesters.data.data.find((item) => item.isActive) ?? semesters.data.data[0]
  semesterId.value = activeSemester?.id ?? ''

  classrooms.value = rooms.data.data.map((room) => ({
    id: room.id,
    gradeId: room.gradeId,
    label: room.displayName,
  }))

  const seen = new Map<string, GradeOption>()
  for (const room of rooms.data.data) {
    if (room.grade !== undefined && room.grade !== null) {
      seen.set(room.gradeId, {
        id: room.gradeId,
        label: room.grade.name,
      })
    }
  }
  grades.value = [...seen.values()].sort((left, right) =>
    left.label.localeCompare(right.label),
  )

  packages.value = packs.data.data.map((item) => ({
    id: item.id,
    subjectId: item.subjectId,
    label: item.title,
  }))
}

async function submit(payload: ActivityCreatePayload): Promise<void> {
  submitting.value = true
  error.value = null
  try {
    await examActivityApi.create(payload)
    toast.success('Kegiatan disimpan dan jadwal kelas dibuat')
  } catch {
    error.value = 'Kegiatan gagal disimpan.'
    toast.error(error.value)
  } finally {
    submitting.value = false
  }
}

async function loadActivity(): Promise<void> {
  loadingActivity.value = true
  try {
    const response = await examActivityApi.list()
    activity.value =
      response.data.data.find((item) => item.id === editingId.value) ?? null
    if (activity.value === null) error.value = 'Kegiatan tidak ditemukan.'
  } catch {
    error.value = 'Kegiatan gagal dimuat.'
  } finally {
    loadingActivity.value = false
  }
}

function statusSaved(): void {
  toast.success('Status kegiatan disimpan')
}

onMounted(() => {
  if (editingId.value !== '') void loadActivity()
  else void load()
})
</script>

<template>
  <section class="grid gap-4 p-4">
    <h1 class="text-lg font-semibold">
      {{
        editingId !== ''
          ? 'Status kegiatan ujian'
          : 'Buat kegiatan ujian atau tugas'
      }}
    </h1>
    <p
      v-if="error !== null"
      role="alert"
    >
      {{ error }}
    </p>
    <ActivityForm
      v-if="activity !== null"
      :semester-id="activity.semesterId"
      :grades="[]"
      :classrooms="[]"
      :packages="[]"
      :is-admin="true"
      :activity="activity"
      @status-saved="statusSaved"
    />
    <ActivityForm
      v-else-if="semesterId !== ''"
      :semester-id="semesterId"
      :grades="grades"
      :classrooms="classrooms"
      :packages="packages"
      :is-admin="isAdmin"
      :submitting="submitting"
      @submit="submit"
    />
    <p v-else-if="loadingActivity">Memuat kegiatan…</p>
    <p v-else>Memuat data tingkat, kelas, dan paket soal…</p>
  </section>
</template>
