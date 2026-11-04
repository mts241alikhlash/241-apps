<script setup lang="ts">
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import AssessmentItemFormDialog from '../components/AssessmentItemFormDialog.vue'
import { createAssessmentItemColumns } from '../components/columns'
import { useAssessmentItem } from '../composables/useAssessmentItem'
import type { AssessmentItem } from '../types'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useRoleGuard } from '@/features/platform/auth'
import { AssessmentWeightDialog } from '@/features/assessment/assessment-weight'
import { Plus, Scale } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

const { can } = useRoleGuard()

const {
  items,
  loading,
  formError,
  classrooms,
  subjects,
  semesters,
  selectedClassroomId,
  selectedSubjectId,
  selectedSemesterId,
  assignments,
  teachingAssignment,
  fetchRelatedData,
  fetchItems,
  deleteItem,
} = useAssessmentItem()

const classroomFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          !selectedSubjectId.value || a.subjectId === selectedSubjectId.value,
      )
      .map((a) => a.classroomId),
  )
  return classrooms.value
    .filter((c) => allowed.has(c.id))
    .map((c) => ({ value: c.id, label: c.code ?? '-' }))
})

const subjectFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          !selectedClassroomId.value ||
          a.classroomId === selectedClassroomId.value,
      )
      .map((a) => a.subjectId),
  )
  return subjects.value
    .filter((s) => allowed.has(s.id))
    .map((s) => ({
      value: s.id,
      label: s.name,
    }))
})

const openForm = ref(false)
const editingItem = ref<AssessmentItem | null>(null)

const weightDialogOpen = ref(false)

const isFilterReady = computed(() =>
  Boolean(selectedClassroomId.value && selectedSubjectId.value),
)

const activeSemester = computed(
  () => semesters.value.find((s) => s.id === selectedSemesterId.value) ?? null,
)

const academicYearLabel = computed(
  () => activeSemester.value?.academicYear?.name ?? null,
)

const semesterLabel = computed(() => {
  const name = activeSemester.value?.type.name
  if (name === 'ODD') return 'Ganjil'
  if (name === 'EVEN') return 'Genap'
  return name ?? null
})

const hasSubjectChoice = computed(() => subjectFilterOptions.value.length > 1)

const waitingFor = computed(() => {
  if (!selectedSemesterId.value) {
    return 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
  }
  if (!selectedClassroomId.value) return 'Pilih kelas untuk menampilkan tugas.'
  if (!selectedSubjectId.value) return 'Pilih mata pelajaran terlebih dahulu.'
  if (!teachingAssignment.value) {
    return 'Tidak ada jadwal mengajar untuk kelas dan mata pelajaran ini di semester berjalan, jadi belum ada tugas yang bisa dibuat.'
  }
  return null
})
const selectedSubjectLabel = computed(
  () =>
    subjects.value.find((s) => s.id === selectedSubjectId.value)?.name ?? null,
)

const weightSubjectName = computed(
  () =>
    subjects.value.find((s) => s.id === selectedSubjectId.value)?.name ??
    undefined,
)
const weightClassroomName = computed(
  () =>
    classrooms.value.find((c) => c.id === selectedClassroomId.value)?.code ??
    undefined,
)

const canCreate = computed(() => can('assessment-items.create'))
const canUpdate = computed(() => can('assessment-items.update'))
const canDelete = computed(() => can('assessment-items.delete'))

const columns = computed(() =>
  createAssessmentItemColumns({
    canUpdate: canUpdate.value,
    canDelete: canDelete.value,
    onEdit: (item) => {
      editingItem.value = item
      openForm.value = true
    },
    onGrade: undefined,
    onDelete: async (item, { closeAlert, setLoading }) => {
      setLoading(true)
      const result = await deleteItem(item.id)
      setLoading(false)
      if (result.success) {
        closeAlert()
        void fetchItems()
      }
    },
  }),
)

async function handleFilter() {
  if (!isFilterReady.value) return
  await fetchItems()
}

function openAddForm() {
  editingItem.value = null
  openForm.value = true
}

watch(openForm, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

function reconcile(
  selected: typeof selectedSubjectId,
  options: FilterOption[],
) {
  if (selected.value && !options.some((o) => o.value === selected.value)) {
    selected.value = null
  }
  if (!selected.value && options.length === 1) {
    selected.value = options[0].value
  }
}

watch(classroomFilterOptions, (options) =>
  reconcile(selectedClassroomId, options),
)
watch(subjectFilterOptions, (options) => reconcile(selectedSubjectId, options))

watch([selectedClassroomId, selectedSubjectId, selectedSemesterId], () => {
  if (isFilterReady.value) void handleFilter()
})

onMounted(fetchRelatedData)
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <CardTitle size="lg"> Tugas </CardTitle>
        <div class="flex items-center gap-2">
          <Button
            v-if="teachingAssignment && canCreate"
            variant="outline"
            size="icon"
            class="sm:hidden"
            @click="weightDialogOpen = true"
          >
            <Scale class="size-4" />
          </Button>
          <Button
            v-if="teachingAssignment && canCreate"
            variant="outline"
            class="hidden sm:inline-flex"
            @click="weightDialogOpen = true"
          >
            <Scale class="size-4 mr-2" />
            Bobot Penilaian
          </Button>
          <Button
            v-if="!waitingFor && canCreate"
            size="icon"
            class="sm:hidden"
            @click="openAddForm"
          >
            <Plus class="size-4" />
          </Button>
          <Button
            v-if="!waitingFor && canCreate"
            class="hidden sm:inline-flex"
            @click="openAddForm"
          >
            <Plus class="size-4 mr-2" />
            Tambah Tugas
          </Button>
        </div>
      </CardHeader>

      <div class="space-y-4 p-0 sm:px-0">
        <div class="hidden lg:flex lg:flex-row lg:items-center gap-3 mb-6">
          <template v-if="academicYearLabel">
            <div
              class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 min-h-[var(--control-h-lg,2rem)] whitespace-nowrap text-[length:var(--text-control,0.75rem)]"
            >
              <span class="text-muted-foreground">Tahun Ajaran</span>
              <span class="font-semibold">{{ academicYearLabel }}</span>
            </div>
            <div
              class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 min-h-[var(--control-h-lg,2rem)] whitespace-nowrap text-[length:var(--text-control,0.75rem)]"
            >
              <span class="text-muted-foreground">Semester</span>
              <span class="font-semibold">{{ semesterLabel }}</span>
            </div>
          </template>
          <div
            v-else
            class="flex items-center rounded-md border border-destructive/40 bg-destructive/5 px-3 min-h-[var(--control-h-lg,2rem)] whitespace-nowrap text-[length:var(--text-control,0.75rem)] text-destructive"
          >
            Belum ada semester aktif
          </div>

          <Select v-model="selectedClassroomId">
            <SelectTrigger class="w-[92px]">
              <SelectValue placeholder="Kelas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="c in classroomFilterOptions"
                :key="c.value"
                :value="c.value"
              >
                {{ c.label }}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select
            v-if="hasSubjectChoice"
            v-model="selectedSubjectId"
          >
            <SelectTrigger class="w-[220px]">
              <SelectValue placeholder="Pilih Mata Pelajaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="sub in subjectFilterOptions"
                :key="sub.value"
                :value="sub.value"
              >
                {{ sub.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <div
            v-else-if="selectedSubjectLabel"
            class="flex items-center gap-2 rounded-md border bg-muted/30 px-3 min-h-[var(--control-h-lg,2rem)] whitespace-nowrap text-[length:var(--text-control,0.75rem)]"
          >
            <span class="text-muted-foreground">Mapel</span>
            <span class="font-semibold">{{ selectedSubjectLabel }}</span>
          </div>
        </div>

        <div class="flex lg:hidden flex-col gap-3 mb-6">
          <div
            v-if="academicYearLabel"
            class="flex items-center justify-center gap-2"
          >
            <div
              class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs"
            >
              <span class="text-muted-foreground">Tahun Ajaran</span>
              <span class="font-semibold">{{ academicYearLabel }}</span>
            </div>
            <div
              class="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 h-8 text-xs"
            >
              <span class="text-muted-foreground">Semester</span>
              <span class="font-semibold">{{ semesterLabel }}</span>
            </div>
          </div>
          <div
            v-else
            class="flex items-center rounded-md border border-destructive/40 bg-destructive/5 px-2.5 h-8 text-xs text-destructive"
          >
            Belum ada semester aktif
          </div>

          <div class="flex justify-center">
            <Select v-model="selectedClassroomId">
              <SelectTrigger class="rounded-r-none border-r-0 min-w-0">
                <SelectValue placeholder="Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in classroomFilterOptions"
                  :key="c.value"
                  :value="c.value"
                >
                  {{ c.label }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              v-if="hasSubjectChoice"
              v-model="selectedSubjectId"
            >
              <SelectTrigger class="rounded-l-none min-w-0">
                <SelectValue placeholder="Mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="sub in subjectFilterOptions"
                  :key="sub.value"
                  :value="sub.value"
                >
                  {{ sub.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <div
              v-else-if="selectedSubjectLabel"
              class="flex items-center gap-2 rounded-l-none rounded-r-md border bg-muted/30 px-3 min-h-[var(--control-h-lg,2rem)] whitespace-nowrap text-[length:var(--text-control,0.75rem)] min-w-0"
            >
              <span class="text-muted-foreground shrink-0">Mapel</span>
              <span class="font-semibold truncate">{{
                selectedSubjectLabel
              }}</span>
            </div>
          </div>
        </div>

        <DataTable
          v-if="!waitingFor"
          :columns="columns"
          :data="items"
          :is-loading="loading"
          item-label="tugas"
          filter-column="name"
          filter-placeholder="Cari nama tugas..."
        />

        <div
          v-else
          class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted/20 px-6 py-16 text-center"
        >
          <h3 class="text-lg font-semibold text-foreground">Belum ada tugas</h3>
          <p class="mt-2 max-w-md text-sm text-muted-foreground">
            {{ waitingFor }}
          </p>
        </div>

        <AssessmentItemFormDialog
          v-if="canCreate || canUpdate"
          v-model:open="openForm"
          :teaching-assignment-id="teachingAssignment?.id ?? null"
          :edit-data="editingItem"
          @save-success="fetchItems"
        />

        <AssessmentWeightDialog
          v-if="teachingAssignment"
          v-model:open="weightDialogOpen"
          :teaching-assignment-id="teachingAssignment.id"
          :subject-name="weightSubjectName"
          :classroom-name="weightClassroomName"
        />
      </div>
    </Card>
  </div>
</template>
