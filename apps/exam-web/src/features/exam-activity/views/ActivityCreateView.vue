<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { toast } from 'vue-sonner'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@mts241alikhlash/ui/card'
import { classroomApi } from '@/features/lookup/classroom'
import { semesterApi } from '@/features/lookup/semester'
import { subjectApi } from '@/features/lookup/subject'
import { examPackageApi } from '@/features/exam-package/api/examPackageApi'
import { messageOf } from '@/features/exam-package/utils/messageOf'
import { examEventService } from '@/features/exam-event/services/examEventService'
import ActivityForm from '../components/ActivityForm.vue'
import { examActivityApi } from '../api/examActivityApi'
import type {
  ActivityCreatePayload,
  ClassroomOption,
  EventOption,
  GradeOption,
  PackageOption,
  SubjectOption,
} from '../types'

const { hasPermission } = useAuthSession()
const route = useRoute()
const { category } = useRouteCategory()
const fixedEventId = computed(() =>
  typeof route.query.periode === 'string' ? route.query.periode : '',
)
const semesterId = ref('')
const grades = ref<GradeOption[]>([])
const classrooms = ref<ClassroomOption[]>([])
const packages = ref<PackageOption[]>([])
const subjects = ref<SubjectOption[]>([])
const events = ref<EventOption[]>([])
const isAdmin = computed(() => hasPermission('exam-schedules.manage-all'))
const submitting = ref(false)
const error = ref<string | null>(null)

async function load(): Promise<void> {
  const [semesters, rooms, packs, subjectPage] = await Promise.all([
    semesterApi.getSemesters({ page: 1, limit: 20 }),
    classroomApi.getClassrooms({ page: 1, limit: 200 }),
    examPackageApi.getPackages({ page: 1, limit: 200 }),
    subjectApi.getSubjects({ page: 1, limit: 200 }),
  ])
  subjects.value = subjectPage.data.map((item) => ({
    id: item.id,
    label: item.name,
  }))

  const activeSemester =
    semesters.data.find((item) => item.isActive) ?? semesters.data[0]
  semesterId.value = activeSemester?.id ?? ''
  if (semesterId.value !== '') {
    const activeEvents = await examEventService.loadEventOptions(
      semesterId.value,
    )
    events.value = activeEvents.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
    }))
  }

  classrooms.value = rooms.data.map((room) => ({
    id: room.id,
    gradeId: room.gradeId,
    label: room.name ?? room.displayName,
  }))

  const seen = new Map<string, GradeOption>()
  for (const room of rooms.data) {
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

  packages.value = packs.data.map((item) => ({
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
  } catch (err: unknown) {
    error.value = messageOf(err, 'Kegiatan gagal disimpan.')
    toast.error(error.value)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Buat Kegiatan</CardTitle>
        <Button
          v-if="semesterId !== ''"
          type="submit"
          form="activity-form"
          class="shrink-0"
          :disabled="submitting"
        >
          Simpan
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <p
          v-if="error !== null"
          role="alert"
          class="text-control text-destructive"
        >
          {{ error }}
        </p>
        <ActivityForm
          v-if="semesterId !== ''"
          :semester-id="semesterId"
          :grades="grades"
          :classrooms="classrooms"
          :packages="packages"
          :subjects="subjects"
          :events="events"
          :category="category"
          :fixed-event-id="fixedEventId"
          :is-admin="isAdmin"
          :submitting="submitting"
          @submit="submit"
        />
        <p v-else>Memuat data tingkat, kelas, dan paket soal…</p>
      </CardContent>
      <CardFooter plain />
    </Card>
  </div>
</template>
