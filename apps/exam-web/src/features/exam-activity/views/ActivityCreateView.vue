<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { classroomApi } from '@/features/lookup/classroom'
import { semesterApi } from '@/features/lookup/semester'
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import ActivityForm from '../components/ActivityForm.vue'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ActivityCreatePayload,
  ClassroomOption,
  GradeOption,
  PackageOption,
} from '../types'

const semesterId = ref('')
const grades = ref<GradeOption[]>([])
const classrooms = ref<ClassroomOption[]>([])
const packages = ref<PackageOption[]>([])
const isAdmin = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)

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

onMounted(() => {
  void load()
})
</script>

<template>
  <section class="grid gap-4 p-4">
    <h1 class="text-lg font-semibold">Buat kegiatan ujian atau tugas</h1>
    <p
      v-if="error !== null"
      role="alert"
    >
      {{ error }}
    </p>
    <ActivityForm
      v-if="semesterId !== ''"
      :semester-id="semesterId"
      :grades="grades"
      :classrooms="classrooms"
      :packages="packages"
      :is-admin="isAdmin"
      :submitting="submitting"
      @submit="submit"
    />
    <p v-else>Memuat data tingkat, kelas, dan paket soal…</p>
  </section>
</template>
