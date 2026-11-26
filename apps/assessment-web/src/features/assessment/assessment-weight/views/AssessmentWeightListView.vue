<script setup lang="ts">
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { EVERY_CLASSROOM } from '@/features/lookup/teaching-assignment'
import {
  useAssessmentItem,
  type AssessmentType,
} from '@/features/assessment/assessment-item'
import { DataTable, DataTableEmpty, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { Filter } from '@lucide/vue'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { assessmentWeightApi } from '../api/assessmentWeightApi'
import AssessmentWeightDialog from '../components/AssessmentWeightDialog.vue'
import {
  createAssessmentWeightColumns,
  type AssessmentWeightRow,
} from '../components/columns'

const { can } = useRoleGuard()
const canUpdate = computed(() => can('assessment-items.update'))

const {
  classrooms,
  subjects,
  semesters,
  selectedSemesterId,
  assignments,
  fetchRelatedData,
  fetchAssignmentsForSemester,
} = useAssessmentItem()

const EVERY_SUBJECT = '__all__'
const selectedClassroomId = ref<string>(EVERY_CLASSROOM)
const selectedSubjectId = ref<string>(EVERY_SUBJECT)

const filterId = useId()
const mobileFilterId = useId()
const search = ref('')
const filterOpen = ref(false)
const relatedLoading = ref(false)
const weightsLoading = ref(false)
const page = ref(1)
const pageSize = ref(25)

const dialogOpen = ref(false)
const dialogAssignment = ref<AssessmentWeightRow | null>(null)

const weightsByAssignment = ref<Record<string, Record<AssessmentType, number>>>(
  {},
)

function emptyWeightMap(): Record<AssessmentType, number> {
  return {
    DAILY: 0,
    ASSIGNMENT: 0,
    PRACTICAL: 0,
    MIDTERM: 0,
    FINAL: 0,
  }
}

const classroomFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          selectedSubjectId.value === EVERY_SUBJECT ||
          a.subjectId === selectedSubjectId.value,
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
          selectedClassroomId.value === EVERY_CLASSROOM ||
          a.classroomId === selectedClassroomId.value,
      )
      .map((a) => a.subjectId),
  )
  return subjects.value
    .filter((s) => allowed.has(s.id))
    .map((s) => ({ value: s.id, label: s.name }))
})

const hasClassroomChoice = computed(
  () => classroomFilterOptions.value.length > 1,
)
const hasSubjectChoice = computed(() => subjectFilterOptions.value.length > 1)

const semesterModel = computed({
  get: () => selectedSemesterId.value ?? '',
  set: (value: string) => {
    selectedSemesterId.value = value || null
  },
})

const classroomModel = computed({
  get: () => selectedClassroomId.value,
  set: (value: string) => {
    selectedClassroomId.value = value || EVERY_CLASSROOM
  },
})

const subjectModel = computed({
  get: () => selectedSubjectId.value,
  set: (value: string) => {
    selectedSubjectId.value = value || EVERY_SUBJECT
  },
})

const subjectById = computed(
  () => new Map(subjects.value.map((s) => [s.id, s.name])),
)
const classroomById = computed(
  () => new Map(classrooms.value.map((c) => [c.id, c.code ?? c.name ?? '-'])),
)

const filteredRows = computed<AssessmentWeightRow[]>(() => {
  if (!selectedSemesterId.value) return []
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return assignments.value
    .filter(
      (a) =>
        (selectedClassroomId.value === EVERY_CLASSROOM ||
          a.classroomId === selectedClassroomId.value) &&
        (selectedSubjectId.value === EVERY_SUBJECT ||
          a.subjectId === selectedSubjectId.value),
    )
    .map((a) => ({
      id: a.id,
      classroomId: a.classroomId,
      subjectId: a.subjectId,
      classroomCode: classroomById.value.get(a.classroomId) ?? '-',
      subjectName: subjectById.value.get(a.subjectId) ?? '-',
      weights: weightsByAssignment.value[a.id] ?? null,
    }))
    .filter(
      (row) =>
        !keyword ||
        row.subjectName.toLocaleLowerCase('id').includes(keyword) ||
        row.classroomCode.toLocaleLowerCase('id').includes(keyword),
    )
    .sort(
      (left, right) =>
        left.subjectName.localeCompare(right.subjectName, 'id') ||
        left.classroomCode.localeCompare(right.classroomCode, 'id'),
    )
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (
    hasClassroomChoice.value &&
    selectedClassroomId.value !== EVERY_CLASSROOM
  ) {
    count += 1
  }
  if (hasSubjectChoice.value && selectedSubjectId.value !== EVERY_SUBJECT) {
    count += 1
  }
  return count
})

const emptyMessage = computed(() => {
  if (!selectedSemesterId.value) {
    return semesters.value.length === 0
      ? 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
      : 'Pilih tahun ajaran dan semester terlebih dahulu.'
  }
  if (search.value.trim()) {
    return 'Tidak ada mata pelajaran atau kelas yang cocok dengan pencarian.'
  }
  return 'Tidak ada jadwal mengajar pada semester atau filter yang dipilih.'
})

function openWeightDialog(row: AssessmentWeightRow) {
  dialogAssignment.value = row
  dialogOpen.value = true
}

const columns = computed(() =>
  createAssessmentWeightColumns({
    canUpdate: canUpdate.value,
    onEdit: openWeightDialog,
  }),
)

async function loadWeightFor(assignmentId: string) {
  const res = await assessmentWeightApi.getWeights(assignmentId)
  const map = emptyWeightMap()
  for (const row of res.data?.data ?? []) {
    map[row.type] = Math.round(Number(row.weight) * 100) / 100
  }
  return map
}

async function ensurePagedWeightsLoaded() {
  const missing = pagedRows.value
    .map((row) => row.id)
    .filter((id) => !weightsByAssignment.value[id])
  if (missing.length === 0) return

  weightsLoading.value = true
  try {
    const entries = await Promise.all(
      missing.map(async (id) => {
        try {
          return [id, await loadWeightFor(id)] as const
        } catch {
          return [id, emptyWeightMap()] as const
        }
      }),
    )
    weightsByAssignment.value = {
      ...weightsByAssignment.value,
      ...Object.fromEntries(entries),
    }
  } finally {
    weightsLoading.value = false
  }
}

async function handleSaved(assignmentId: string) {
  try {
    const next = await loadWeightFor(assignmentId)
    weightsByAssignment.value = {
      ...weightsByAssignment.value,
      [assignmentId]: next,
    }
  } catch {
    const copy = { ...weightsByAssignment.value }
    delete copy[assignmentId]
    weightsByAssignment.value = copy
  }
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function resetFilters() {
  if (hasClassroomChoice.value) {
    selectedClassroomId.value = EVERY_CLASSROOM
  }
  if (hasSubjectChoice.value) {
    selectedSubjectId.value = EVERY_SUBJECT
  }
}

function reconcileClassroom(options: FilterOption[]) {
  if (options.length === 1) {
    selectedClassroomId.value = options[0].value
    return
  }
  if (
    selectedClassroomId.value !== EVERY_CLASSROOM &&
    !options.some((o) => o.value === selectedClassroomId.value)
  ) {
    selectedClassroomId.value = EVERY_CLASSROOM
  }
}

function reconcileSubject(options: FilterOption[]) {
  if (options.length === 1) {
    selectedSubjectId.value = options[0].value
    return
  }
  if (
    selectedSubjectId.value !== EVERY_SUBJECT &&
    !options.some((o) => o.value === selectedSubjectId.value)
  ) {
    selectedSubjectId.value = EVERY_SUBJECT
  }
}

watch(classroomFilterOptions, reconcileClassroom, { immediate: true })
watch(subjectFilterOptions, reconcileSubject, { immediate: true })

watch(
  [search, selectedClassroomId, selectedSubjectId, selectedSemesterId],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(pagedRows, () => {
  if (!relatedLoading.value) {
    void ensurePagedWeightsLoaded()
  }
})

watch(selectedSemesterId, async (next) => {
  if (relatedLoading.value) return
  weightsByAssignment.value = {}
  await fetchAssignmentsForSemester(next)
  reconcileClassroom(classroomFilterOptions.value)
  reconcileSubject(subjectFilterOptions.value)
  await ensurePagedWeightsLoaded()
})

onMounted(async () => {
  relatedLoading.value = true
  try {
    await fetchRelatedData()
    reconcileClassroom(classroomFilterOptions.value)
    reconcileSubject(subjectFilterOptions.value)
  } finally {
    relatedLoading.value = false
  }
  await ensurePagedWeightsLoaded()
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">Bobot Penilaian</CardTitle>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <DataTable
          mobile="cards"
          :columns="columns"
          :data="pagedRows"
          :page="page"
          :page-size="pageSize"
          :total-items="filteredRows.length"
          :is-loading="relatedLoading || weightsLoading"
          item-label="mapel"
          :row-clickable="() => canUpdate"
          @row-click="(row) => canUpdate && openWeightDialog(row)"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-model:semester-id="semesterModel"
              :semesters="semesters"
            />

            <FloatingLabelField
              v-if="hasClassroomChoice"
              label="Kelas"
              :for="`${filterId}-classroom`"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="classroomModel">
                <SelectTrigger
                  :id="`${filterId}-classroom`"
                  class="w-full"
                >
                  <SelectValue placeholder="Semua kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="EVERY_CLASSROOM"> Semua </SelectItem>
                  <SelectItem
                    v-for="c in classroomFilterOptions"
                    :key="c.value"
                    :value="c.value"
                  >
                    {{ c.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>

            <FloatingLabelField
              v-if="hasSubjectChoice"
              label="Mata Pelajaran"
              :for="`${filterId}-subject`"
              class="w-fit min-w-44"
              floating
            >
              <Select v-model="subjectModel">
                <SelectTrigger
                  :id="`${filterId}-subject`"
                  class="w-full"
                >
                  <SelectValue placeholder="Semua mapel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="EVERY_SUBJECT"> Semua </SelectItem>
                  <SelectItem
                    v-for="sub in subjectFilterOptions"
                    :key="sub.value"
                    :value="sub.value"
                  >
                    {{ sub.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-48"
              label="Cari mapel atau kelas"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari mapel atau kelas"
              class="w-full"
            />
          </template>
          <template #mobile-filter>
            <Button
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="size-4" />
              Filter
              <span
                v-if="activeFiltersCount"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                {{ activeFiltersCount }}
              </span>
            </Button>
          </template>
          <template #empty>
            <DataTableEmpty :message="emptyMessage" />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Bobot Penilaian</DialogTitle>
          <DialogDescription>
            Pilih periode, kelas, dan mata pelajaran untuk menampilkan data.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="semesterModel"
            :semesters="semesters"
            full-width
          />

          <FloatingLabelField
            v-if="hasClassroomChoice"
            label="Kelas"
            :for="`${mobileFilterId}-classroom`"
            floating
          >
            <Select v-model="classroomModel">
              <SelectTrigger
                :id="`${mobileFilterId}-classroom`"
                class="w-full"
              >
                <SelectValue placeholder="Semua kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EVERY_CLASSROOM"> Semua </SelectItem>
                <SelectItem
                  v-for="c in classroomFilterOptions"
                  :key="c.value"
                  :value="c.value"
                >
                  {{ c.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

          <FloatingLabelField
            v-if="hasSubjectChoice"
            label="Mata Pelajaran"
            :for="`${mobileFilterId}-subject`"
            floating
          >
            <Select v-model="subjectModel">
              <SelectTrigger
                :id="`${mobileFilterId}-subject`"
                class="w-full"
              >
                <SelectValue placeholder="Semua mapel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EVERY_SUBJECT"> Semua </SelectItem>
                <SelectItem
                  v-for="sub in subjectFilterOptions"
                  :key="sub.value"
                  :value="sub.value"
                >
                  {{ sub.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            :disabled="activeFiltersCount === 0"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false"> Tutup </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AssessmentWeightDialog
      v-model:open="dialogOpen"
      :teaching-assignment-id="dialogAssignment?.id ?? null"
      :subject-name="dialogAssignment?.subjectName"
      :classroom-code="dialogAssignment?.classroomCode"
      @saved="handleSaved"
    />
  </div>
</template>
