<script setup lang="ts">
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { EVERY_CLASSROOM } from '@/features/lookup/teaching-assignment'
import AssessmentItemFormDialog from '../components/AssessmentItemFormDialog.vue'
import { createAssessmentItemColumns } from '../components/columns'
import { useAssessmentItem } from '../composables/useAssessmentItem'
import type { AssessmentItem } from '../types'
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
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { Filter, Plus } from '@lucide/vue'
import { computed, onMounted, ref, useId, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ASSESSMENT_TYPE_LABELS,
  buildGradeFilterOptions,
  CATEGORY_TYPES,
  categoryFromRoute,
  compareAssessmentItems,
  gradeIdOf,
  isTypeInCategory,
} from '../constants/category'

const route = useRoute()
const { can } = useRoleGuard()

const category = computed(() => categoryFromRoute(route.meta))
const isExam = computed(() => category.value === 'EXAM')
const pageTitle = computed(() =>
  isExam.value ? 'Daftar Ujian' : 'Daftar Tugas',
)
const itemNoun = computed(() => (isExam.value ? 'ujian' : 'tugas'))
const allowedTypes = computed(() =>
  category.value ? CATEGORY_TYPES[category.value] : undefined,
)

const {
  items,
  loading,
  formError,
  classrooms,
  subjects,
  semesters,
  selectedSemesterId,
  assignments,
  fetchRelatedData,
  fetchAssignmentsForSemester,
  fetchGradingItems,
  deleteItem,
} = useAssessmentItem()

const EVERY_GRADE = '__all__'
const EVERY_SUBJECT = '__all__'
const EVERY_TYPE = '__all__'
const selectedGradeId = ref<string>(EVERY_GRADE)
const taskClassroomId = ref<string>(EVERY_CLASSROOM)
const taskSubjectId = ref<string>(EVERY_SUBJECT)
const selectedType = ref<string>(EVERY_TYPE)

const filterId = useId()
const mobileFilterId = useId()
const search = ref('')
const filterOpen = ref(false)
const relatedLoading = ref(false)
const page = ref(1)
const pageSize = ref(25)

const openForm = ref(false)
const editingItem = ref<AssessmentItem | null>(null)

const classroomObjectById = computed(
  () => new Map(classrooms.value.map((c) => [c.id, c])),
)

const gradeFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          taskSubjectId.value === EVERY_SUBJECT ||
          a.subjectId === taskSubjectId.value,
      )
      .map((a) => a.classroomId),
  )
  return buildGradeFilterOptions(classrooms.value, allowed)
})

const classroomFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          taskSubjectId.value === EVERY_SUBJECT ||
          a.subjectId === taskSubjectId.value,
      )
      .map((a) => a.classroomId),
  )
  return classrooms.value
    .filter(
      (c) =>
        allowed.has(c.id) &&
        (selectedGradeId.value === EVERY_GRADE ||
          gradeIdOf(c) === selectedGradeId.value),
    )
    .map((c) => ({ value: c.id, label: c.code ?? '-' }))
})

const subjectFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) =>
          (selectedGradeId.value === EVERY_GRADE ||
            gradeIdOf(classroomObjectById.value.get(a.classroomId)) ===
              selectedGradeId.value) &&
          (taskClassroomId.value === EVERY_CLASSROOM ||
            a.classroomId === taskClassroomId.value),
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

const hasGradeChoice = computed(() => gradeFilterOptions.value.length > 1)
const hasClassroomChoice = computed(
  () => classroomFilterOptions.value.length > 1,
)
const hasSubjectChoice = computed(() => subjectFilterOptions.value.length > 1)

const typeFilterOptions = computed<FilterOption[]>(() => {
  const types = category.value
    ? CATEGORY_TYPES[category.value]
    : (Object.keys(ASSESSMENT_TYPE_LABELS) as AssessmentItem['type'][])
  return types.map((type) => ({
    value: type,
    label: ASSESSMENT_TYPE_LABELS[type],
  }))
})

const typeModel = computed({
  get: () => selectedType.value,
  set: (value: string) => {
    selectedType.value = value || EVERY_TYPE
  },
})

const semesterModel = computed({
  get: () => selectedSemesterId.value ?? '',
  set: (value: string) => {
    selectedSemesterId.value = value || null
  },
})

const gradeModel = computed({
  get: () => selectedGradeId.value,
  set: (value: string) => {
    selectedGradeId.value = value || EVERY_GRADE
  },
})

const classroomModel = computed({
  get: () => taskClassroomId.value,
  set: (value: string) => {
    taskClassroomId.value = value || EVERY_CLASSROOM
  },
})

const subjectModel = computed({
  get: () => taskSubjectId.value,
  set: (value: string) => {
    taskSubjectId.value = value || EVERY_SUBJECT
  },
})

const matchingAssignments = computed(() =>
  assignments.value.filter(
    (a) =>
      (selectedGradeId.value === EVERY_GRADE ||
        gradeIdOf(classroomObjectById.value.get(a.classroomId)) ===
          selectedGradeId.value) &&
      (taskClassroomId.value === EVERY_CLASSROOM ||
        a.classroomId === taskClassroomId.value) &&
      (taskSubjectId.value === EVERY_SUBJECT ||
        a.subjectId === taskSubjectId.value),
  ),
)

const subjectById = computed(
  () => new Map(subjects.value.map((s) => [s.id, s.name])),
)
const classroomById = computed(
  () => new Map(classrooms.value.map((c) => [c.id, c.code ?? c.name ?? '-'])),
)

const initialDialogClassroomId = computed(() =>
  taskClassroomId.value !== EVERY_CLASSROOM
    ? taskClassroomId.value
    : classroomFilterOptions.value.length === 1
      ? classroomFilterOptions.value[0].value
      : null,
)

const initialDialogSubjectId = computed(() =>
  taskSubjectId.value !== EVERY_SUBJECT
    ? taskSubjectId.value
    : subjectFilterOptions.value.length === 1
      ? subjectFilterOptions.value[0].value
      : null,
)

const isFilterReady = computed(() => Boolean(selectedSemesterId.value))

const waitingFor = computed(() => {
  if (relatedLoading.value) return null
  if (!selectedSemesterId.value) {
    return semesters.value.length === 0
      ? 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
      : 'Pilih tahun ajaran dan semester terlebih dahulu.'
  }
  if (matchingAssignments.value.length === 0) {
    return 'Tidak ada jadwal mengajar pada semester atau filter yang dipilih.'
  }
  return null
})

const subjectNameByAssignment = computed(
  () =>
    new Map(
      assignments.value.map((a) => [
        a.id,
        subjectById.value.get(a.subjectId) ?? '-',
      ]),
    ),
)

const classroomNameByAssignment = computed(
  () =>
    new Map(
      assignments.value.map((a) => [
        a.id,
        classroomById.value.get(a.classroomId) ?? '-',
      ]),
    ),
)

const subjectName = (item: AssessmentItem): string =>
  item.teachingAssignment?.subject?.name ??
  subjectNameByAssignment.value.get(item.teachingAssignmentId) ??
  '-'

const classroomName = (item: AssessmentItem): string =>
  item.teachingAssignment?.classroom?.code ??
  item.teachingAssignment?.classroom?.name ??
  classroomNameByAssignment.value.get(item.teachingAssignmentId) ??
  '-'

const canCreate = computed(() => can('assessment-items.create'))
const canUpdate = computed(() => can('assessment-items.update'))
const canDelete = computed(() => can('assessment-items.delete'))

const filteredItems = computed(() => {
  if (waitingFor.value) return []
  const byCategory = items.value.filter(
    (item) =>
      isTypeInCategory(item.type, category.value) &&
      (selectedType.value === EVERY_TYPE || item.type === selectedType.value),
  )
  const keyword = search.value.trim().toLocaleLowerCase('id')
  const matched = keyword
    ? byCategory.filter(
        (item) =>
          item.name.toLocaleLowerCase('id').includes(keyword) ||
          subjectName(item).toLocaleLowerCase('id').includes(keyword) ||
          classroomName(item).toLocaleLowerCase('id').includes(keyword),
      )
    : byCategory
  return matched.sort((left, right) =>
    compareAssessmentItems(left, right, subjectName, classroomName),
  )
})

const pagedItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (hasGradeChoice.value && selectedGradeId.value !== EVERY_GRADE) {
    count += 1
  }
  if (hasClassroomChoice.value && taskClassroomId.value !== EVERY_CLASSROOM) {
    count += 1
  }
  if (hasSubjectChoice.value && taskSubjectId.value !== EVERY_SUBJECT) {
    count += 1
  }
  if (selectedType.value !== EVERY_TYPE) {
    count += 1
  }
  return count
})

const emptyMessage = computed(() => {
  if (waitingFor.value) return waitingFor.value
  if (search.value.trim()) {
    return `Tidak ada ${itemNoun.value} yang cocok dengan pencarian.`
  }
  return isExam.value ? 'Belum ada butir ujian.' : 'Belum ada tugas.'
})

const columns = computed(() =>
  createAssessmentItemColumns({
    canUpdate: canUpdate.value,
    canDelete: canDelete.value,
    typeFirst: true,
    nameLabel: isExam.value ? 'Nama Ujian' : 'Nama Tugas',
    subjectName,
    classroomName,
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
        void handleFilter()
      }
    },
  }),
)

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function resetFilters() {
  if (hasGradeChoice.value) {
    selectedGradeId.value = EVERY_GRADE
  }
  if (hasClassroomChoice.value) {
    taskClassroomId.value = EVERY_CLASSROOM
  }
  if (hasSubjectChoice.value) {
    taskSubjectId.value = EVERY_SUBJECT
  }
  selectedType.value = EVERY_TYPE
}

async function handleFilter() {
  if (!isFilterReady.value) return
  await fetchGradingItems(matchingAssignments.value.map((a) => a.id))
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

function reconcileGrade(options: FilterOption[]) {
  if (options.length === 1) {
    selectedGradeId.value = options[0].value
    return
  }
  if (
    selectedGradeId.value !== EVERY_GRADE &&
    !options.some((o) => o.value === selectedGradeId.value)
  ) {
    selectedGradeId.value = EVERY_GRADE
  }
}

function reconcileClassroom(options: FilterOption[]) {
  if (options.length === 1) {
    taskClassroomId.value = options[0].value
    return
  }
  if (
    taskClassroomId.value !== EVERY_CLASSROOM &&
    !options.some((o) => o.value === taskClassroomId.value)
  ) {
    taskClassroomId.value = EVERY_CLASSROOM
  }
}

function reconcileSubject(options: FilterOption[]) {
  if (options.length === 1) {
    taskSubjectId.value = options[0].value
    return
  }
  if (
    taskSubjectId.value !== EVERY_SUBJECT &&
    !options.some((o) => o.value === taskSubjectId.value)
  ) {
    taskSubjectId.value = EVERY_SUBJECT
  }
}

watch(gradeFilterOptions, reconcileGrade, { immediate: true })
watch(classroomFilterOptions, reconcileClassroom, { immediate: true })
watch(subjectFilterOptions, reconcileSubject, { immediate: true })

watch(category, () => {
  selectedType.value = EVERY_TYPE
})

watch(
  [
    search,
    selectedGradeId,
    taskClassroomId,
    taskSubjectId,
    selectedType,
    selectedSemesterId,
    category,
  ],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(selectedSemesterId, async (next) => {
  if (relatedLoading.value) return
  await fetchAssignmentsForSemester(next)
  reconcileGrade(gradeFilterOptions.value)
  reconcileClassroom(classroomFilterOptions.value)
  reconcileSubject(subjectFilterOptions.value)
  if (isFilterReady.value) {
    await handleFilter()
  }
})

watch([selectedGradeId, taskClassroomId, taskSubjectId], () => {
  if (relatedLoading.value) return
  if (isFilterReady.value) void handleFilter()
})

onMounted(async () => {
  relatedLoading.value = true
  try {
    await fetchRelatedData()
    reconcileGrade(gradeFilterOptions.value)
    reconcileClassroom(classroomFilterOptions.value)
    reconcileSubject(subjectFilterOptions.value)
  } finally {
    relatedLoading.value = false
  }
  if (isFilterReady.value) {
    await handleFilter()
  }
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        <Button
          v-if="!waitingFor && canCreate"
          class="shrink-0"
          @click="openAddForm"
        >
          <Plus class="size-4" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <DataTable
          mobile="cards"
          :columns="columns"
          :data="pagedItems"
          :page="page"
          :page-size="pageSize"
          :total-items="filteredItems.length"
          :is-loading="relatedLoading || loading"
          :item-label="itemNoun"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-model:semester-id="semesterModel"
              :semesters="semesters"
            />

            <FloatingLabelField
              v-if="hasGradeChoice"
              label="Tingkat"
              :for="`${filterId}-grade`"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="gradeModel">
                <SelectTrigger
                  :id="`${filterId}-grade`"
                  class="w-full"
                >
                  <SelectValue placeholder="Semua tingkat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="EVERY_GRADE"> Semua </SelectItem>
                  <SelectItem
                    v-for="g in gradeFilterOptions"
                    :key="g.value"
                    :value="g.value"
                  >
                    {{ g.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>

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

            <FloatingLabelField
              label="Tipe"
              :for="`${filterId}-type`"
              class="w-fit min-w-32"
              floating
            >
              <Select v-model="typeModel">
                <SelectTrigger
                  :id="`${filterId}-type`"
                  class="w-full"
                >
                  <SelectValue placeholder="Semua tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem :value="EVERY_TYPE"> Semua </SelectItem>
                  <SelectItem
                    v-for="t in typeFilterOptions"
                    :key="t.value"
                    :value="t.value"
                  >
                    {{ t.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-48"
              :label="`Cari nama ${itemNoun}`"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              :label="`Cari nama ${itemNoun}`"
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
          <DialogTitle>Filter {{ pageTitle }}</DialogTitle>
          <DialogDescription>
            Pilih periode, tingkat, kelas, mata pelajaran, dan tipe untuk
            menampilkan data.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="semesterModel"
            :semesters="semesters"
            full-width
          />

          <FloatingLabelField
            v-if="hasGradeChoice"
            label="Tingkat"
            :for="`${mobileFilterId}-grade`"
            floating
          >
            <Select v-model="gradeModel">
              <SelectTrigger
                :id="`${mobileFilterId}-grade`"
                class="w-full"
              >
                <SelectValue placeholder="Semua tingkat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EVERY_GRADE"> Semua </SelectItem>
                <SelectItem
                  v-for="g in gradeFilterOptions"
                  :key="g.value"
                  :value="g.value"
                >
                  {{ g.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>

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

          <FloatingLabelField
            label="Tipe"
            :for="`${mobileFilterId}-type`"
            floating
          >
            <Select v-model="typeModel">
              <SelectTrigger
                :id="`${mobileFilterId}-type`"
                class="w-full"
              >
                <SelectValue placeholder="Semua tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="EVERY_TYPE"> Semua </SelectItem>
                <SelectItem
                  v-for="t in typeFilterOptions"
                  :key="t.value"
                  :value="t.value"
                >
                  {{ t.label }}
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

    <AssessmentItemFormDialog
      v-if="canCreate || canUpdate"
      v-model:open="openForm"
      :assignments="assignments"
      :classrooms="classrooms"
      :subjects="subjects"
      :initial-classroom-id="initialDialogClassroomId"
      :initial-subject-id="initialDialogSubjectId"
      :edit-data="editingItem"
      :allowed-types="allowedTypes"
      :default-type="
        selectedType !== EVERY_TYPE
          ? (selectedType as AssessmentItem['type'])
          : undefined
      "
      @save-success="handleFilter"
    />
  </div>
</template>
