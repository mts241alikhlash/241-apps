<script setup lang="ts">
import { BackButton } from '@mts241alikhlash/ui'
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type {
  ClassroomEnrollment,
  ClassroomSupervisorSavePayload,
  ClassroomStructureSavePayload,
} from '../types'
import { useClassroomList } from '../composables/useClassroomList'
import { useClassroomSupervisor } from '../composables/useClassroomSupervisor'
import { useClassroomEnrollment } from '../composables/useClassroomEnrollment'
import { useClassroomStructure } from '../composables/useClassroomStructure'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import ClassroomInfoCard from '../components/ClassroomInfoCard.vue'
import ClassroomStructureCard from '../components/ClassroomStructureCard.vue'
import ClassroomStudentsCard from '../components/ClassroomStudentsCard.vue'
import AddStudentDialog from '../components/AddStudentDialog.vue'
import TransferStudentDialog from '../components/TransferStudentDialog.vue'
import ClassroomStructureDialog from '../components/ClassroomStructureDialog.vue'
import ClassroomFormDialog from '../components/ClassroomFormDialog.vue'
import { useRoleGuard } from '@/features/platform/auth'

const route = useRoute()
const router = useRouter()
const classroomId = computed(() => route.params.id as string)

const {
  classrooms,
  semesters,
  academicYears,
  fetchClassrooms,
  fetchSemesters,
  fetchAcademicYears,
} = useClassroomList()

const { can } = useRoleGuard()

const {
  employees,
  isSupervisorSaving,
  classroomSupervisorAssignments,
  fetchEmployees,
  fetchClassroomSupervisors,
} = useClassroomSupervisor()

const {
  currentClassroom,
  classroomEnrollments,
  availableStudents,
  enrolling,
  transferring,
  manageLoading,
  fetchClassroomDetail,
  fetchClassroomEnrollments,
  fetchAvailableStudents,
  bulkEnrollToClassroom,
  unenrollStudents,
  transferOrBulkTransfer,
} = useClassroomEnrollment()

const {
  classroomStructure,
  isSaving,
  fetchClassroomStructure,
  saveClassroomStructureWithSupervisor,
} = useClassroomStructure()

const isAddStudentOpen = ref(false)
const isTransferOpen = ref(false)
const isStructureOpen = ref(false)
const isEditInfoOpen = ref(false)
const transferEnrollments = ref<ClassroomEnrollment[]>([])
const studentsCardRef = ref<{ resetSelection: () => void } | null>(null)

const activeSemester = computed(() => semesters.value.find((s) => s.isActive))
const activeSemesterId = computed(
  () => activeSemester.value?.id ?? semesters.value[0]?.id ?? '',
)
const remainingCapacity = computed(
  () =>
    (currentClassroom.value?.capacity ?? 0) - classroomEnrollments.value.length,
)
useBreadcrumbs(() => [
  { title: 'Akademik', href: '#' },
  { title: 'Kelas', href: '/academic/classroom' },
  { title: currentClassroom.value?.displayName ?? 'Kelola' },
])

const currentAssignment = computed(() => {
  if (!currentClassroom.value || !activeSemesterId.value) return null
  return (
    classroomSupervisorAssignments.value.find(
      (a) =>
        a.classroomId === currentClassroom.value?.id &&
        a.semesterId === activeSemesterId.value,
    ) ?? null
  )
})

const classroomSupervisorLabel = computed(() => {
  const empId = currentAssignment.value?.employeeId
  if (!empId) return '-'
  const emp = employees.value.find((e) => e.id === empId)
  if (!emp) return '-'
  return emp.user?.profile?.name ?? emp.nip ?? 'Tanpa nama'
})

async function handleSaveStructure(values: {
  supervisorId: string
  presidentId: string
  vicePresidentId: string
  secretaryId: string
  treasurerId: string
}) {
  if (!currentClassroom.value) return

  const supervisorPayload: ClassroomSupervisorSavePayload = {
    classroomId: currentClassroom.value.id,
    employeeId: values.supervisorId,
    semesterId: activeSemesterId.value,
  }

  const structurePayload: ClassroomStructureSavePayload = {
    classroomId: currentClassroom.value.id,
    semesterId: activeSemesterId.value,
    presidentId: values.presidentId || null,
    vicePresidentId: values.vicePresidentId || null,
    secretaryId: values.secretaryId || null,
    treasurerId: values.treasurerId || null,
  }

  const result = await saveClassroomStructureWithSupervisor(
    classroomStructure.value?.id ?? null,
    structurePayload,
    currentAssignment.value?.id ?? null,
    supervisorPayload,
  )

  if (result.success) {
    isStructureOpen.value = false
    await reloadData()
  }
}

async function handleEnroll(studentIds: string[]) {
  if (!activeSemesterId.value) return
  const result = await bulkEnrollToClassroom(
    classroomId.value,
    activeSemesterId.value,
    studentIds,
  )
  if (result.success) {
    isAddStudentOpen.value = false
  }
}

function handleTransferStudents(enrollments: ClassroomEnrollment[]) {
  transferEnrollments.value = enrollments
  isTransferOpen.value = true
}

async function handleUnenrollStudents(enrollments: ClassroomEnrollment[]) {
  const ids = enrollments.map((e) => e.id)
  await unenrollStudents(ids, classroomId.value, activeSemesterId.value)
  studentsCardRef.value?.resetSelection()
  await reloadData()
}

async function handleTransfer(targetClassroomId: string, note?: string) {
  const ids = transferEnrollments.value.map((e) => e.id)
  if (ids.length === 0) return

  const result = await transferOrBulkTransfer(ids, targetClassroomId, note)

  if (result.success) {
    isTransferOpen.value = false
    studentsCardRef.value?.resetSelection()
    await reloadData()
  }
}

async function openAddStudentDialog() {
  if (!activeSemesterId.value || !currentClassroom.value) return
  await fetchAvailableStudents(classroomId.value, activeSemesterId.value)
  isAddStudentOpen.value = true
}

async function reloadData() {
  await fetchSemesters()

  const semId =
    semesters.value.find((s) => s.isActive)?.id ?? semesters.value[0]?.id ?? ''

  await Promise.all([
    fetchClassroomDetail(classroomId.value),
    fetchClassrooms(),
    fetchEmployees(),
    fetchClassroomSupervisors(classroomId.value),
    fetchAcademicYears(),
    ...(semId
      ? [
          fetchClassroomEnrollments(classroomId.value, semId),
          fetchClassroomStructure(classroomId.value, semId),
        ]
      : []),
  ])
}

onMounted(async () => {
  await reloadData()
})
</script>

<template>
  <div class="space-y-6 p-4 sm:p-6">
    <Card
      gap="none"
      class="overflow-hidden"
    >
      <CardHeader standard>
        <div class="flex items-center gap-3">
          <BackButton
            label="Kembali ke daftar kelas"
            @click="router.push('/academic/classroom')"
          />
          <div>
            <CardTitle size="lg">
              Kelola Kelas {{ currentClassroom?.displayName ?? '' }}
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent
        variant="standard"
        class="space-y-6"
      >
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ClassroomInfoCard
            :current-classroom="currentClassroom"
            :active-semester="activeSemester ?? null"
            :is-admin="can('classrooms.update') || can('classrooms.delete')"
            @manage="isEditInfoOpen = true"
          />

          <ClassroomStructureCard
            :classroom-supervisor-label="classroomSupervisorLabel"
            :classroom-structure="classroomStructure"
            @manage="isStructureOpen = true"
          />
        </div>

        <ClassroomStudentsCard
          ref="studentsCardRef"
          :classroom-enrollments="classroomEnrollments"
          :capacity="currentClassroom?.capacity ?? 0"
          :manage-loading="manageLoading"
          @add-student="openAddStudentDialog"
          @transfer-students="handleTransferStudents"
          @unenroll-students="handleUnenrollStudents"
        />
      </CardContent>
    </Card>

    <AddStudentDialog
      v-model:open="isAddStudentOpen"
      :class-name="currentClassroom?.displayName ?? ''"
      :students="availableStudents"
      :loading="manageLoading"
      :enrolling="enrolling"
      :remaining-capacity="remainingCapacity"
      @enroll="handleEnroll"
    />

    <TransferStudentDialog
      v-model:open="isTransferOpen"
      :enrollments="transferEnrollments"
      :current-classroom-id="classroomId"
      :classrooms="classrooms"
      :loading="transferring"
      @transfer="handleTransfer"
    />

    <ClassroomStructureDialog
      v-model:open="isStructureOpen"
      :employees="employees"
      :enrollments="classroomEnrollments"
      :classroom-structure="classroomStructure"
      :current-employee-id="currentAssignment?.employeeId ?? null"
      :is-saving="isSaving || isSupervisorSaving"
      @save="handleSaveStructure"
    />

    <ClassroomFormDialog
      v-if="can('classrooms.update') && isEditInfoOpen"
      v-model:open="isEditInfoOpen"
      :academic-years="academicYears"
      :edit-data="currentClassroom"
      @save-success="reloadData"
    />
  </div>
</template>
