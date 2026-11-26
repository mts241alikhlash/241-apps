<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import type { FilterOption } from '@mts241alikhlash/web-shared/types/filter.types'
import { useBreadcrumbs } from '@mts241alikhlash/web-shared/composables/useBreadcrumbs'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { EVERY_CLASSROOM } from '@/features/lookup/teaching-assignment'
import { createAssessmentItemColumns } from '../components/columns'
import { useAssessmentItem } from '../composables/useAssessmentItem'
import type { AssessmentItem, AssessmentType } from '../types'
import {
  ActionCell,
  BackButton,
  DataTable,
  DataTableEmpty,
  SearchInput,
} from '@mts241alikhlash/ui'
import { Badge, type BadgeVariants } from '@mts241alikhlash/ui/badge'
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
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ASSESSMENT_TYPE_LABELS,
  ASSESSMENT_TYPE_ORDER,
  buildGradeFilterOptions,
  categoryFromRoute,
  compareAssessmentItems,
  gradeIdOf,
  isTypeInCategory,
  summarizeGradingStatus,
} from '../constants/category'

interface TypeNode {
  type: AssessmentType
  label: string
  subjectCount: number
  itemCount: number
  doneCount: number
  statusLabel: string
  statusVariant: BadgeVariants['variant']
}

interface SubjectNode {
  subjectId: string
  subjectName: string
  classroomCount: number
  itemCount: number
  doneCount: number
  statusLabel: string
  statusVariant: BadgeVariants['variant']
}

type DrillRow = TypeNode | SubjectNode | AssessmentItem

const route = useRoute()
const router = useRouter()
const { can } = useRoleGuard()

const category = computed(() => categoryFromRoute(route.meta))
const isExam = computed(() => category.value === 'EXAM')
const baseTitle = computed(() =>
  isExam.value ? 'Butir Ujian' : 'Butir Penilaian',
)
const baseHref = computed(() =>
  isExam.value ? '/assessment/exam-items' : '/assessment/items',
)
const itemNoun = computed(() => (isExam.value ? 'ujian' : 'tugas'))

const {
  items,
  loading,
  classrooms,
  subjects,
  semesters,
  selectedSemesterId,
  assignments,
  fetchRelatedData,
  fetchAssignmentsForSemester,
  fetchGradingItems,
} = useAssessmentItem()

const EVERY_GRADE = '__all__'
const selectedGradeId = ref<string>(EVERY_GRADE)
const gradingClassroomId = ref<string>(EVERY_CLASSROOM)

const filterId = useId()
const mobileFilterId = useId()
const search = ref('')
const filterOpen = ref(false)
const relatedLoading = ref(false)
const page = ref(1)
const pageSize = ref(25)

const queryValue = (name: string): string | null => {
  const raw = route.query[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value !== '' ? value : null
}

const activeType = computed<AssessmentType | null>(() => {
  const raw = queryValue('tipe') as AssessmentType | null
  if (!raw || !(raw in ASSESSMENT_TYPE_LABELS)) return null
  return isTypeInCategory(raw, category.value) ? raw : null
})

const activeSubjectId = computed(() =>
  activeType.value ? queryValue('mapel') : null,
)

const level = computed<'type' | 'subject' | 'item'>(() => {
  if (!activeType.value) return 'type'
  if (!activeSubjectId.value) return 'subject'
  return 'item'
})

const classroomObjectById = computed(
  () => new Map(classrooms.value.map((c) => [c.id, c])),
)

const subjectById = computed(
  () => new Map(subjects.value.map((s) => [s.id, s.name])),
)

const classroomById = computed(
  () => new Map(classrooms.value.map((c) => [c.id, c.code ?? c.name ?? '-'])),
)

const assignmentById = computed(
  () => new Map(assignments.value.map((a) => [a.id, a])),
)

const subjectIdOf = (item: AssessmentItem): string =>
  item.teachingAssignment?.subject?.id ??
  assignmentById.value.get(item.teachingAssignmentId)?.subjectId ??
  ''

const classroomIdOf = (item: AssessmentItem): string =>
  item.teachingAssignment?.classroom?.id ??
  assignmentById.value.get(item.teachingAssignmentId)?.classroomId ??
  ''

const subjectName = (item: AssessmentItem): string =>
  item.teachingAssignment?.subject?.name ??
  subjectById.value.get(subjectIdOf(item)) ??
  '-'

const classroomName = (item: AssessmentItem): string =>
  item.teachingAssignment?.classroom?.code ??
  item.teachingAssignment?.classroom?.name ??
  classroomById.value.get(classroomIdOf(item)) ??
  '-'

const gradeFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) => !activeSubjectId.value || a.subjectId === activeSubjectId.value,
      )
      .map((a) => a.classroomId),
  )
  return buildGradeFilterOptions(classrooms.value, allowed)
})

const classroomFilterOptions = computed<FilterOption[]>(() => {
  const allowed = new Set(
    assignments.value
      .filter(
        (a) => !activeSubjectId.value || a.subjectId === activeSubjectId.value,
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

const hasGradeChoice = computed(() => gradeFilterOptions.value.length > 1)
const hasClassroomChoice = computed(
  () => classroomFilterOptions.value.length > 1,
)

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
  get: () => gradingClassroomId.value,
  set: (value: string) => {
    gradingClassroomId.value = value || EVERY_CLASSROOM
  },
})

const activeSubjectName = computed(() => {
  if (!activeSubjectId.value) return ''
  return subjectById.value.get(activeSubjectId.value) ?? 'Mata Pelajaran'
})

const pageTitle = computed(() => {
  if (level.value === 'item') {
    return `${activeSubjectName.value} — ${ASSESSMENT_TYPE_LABELS[activeType.value!]}`
  }
  if (level.value === 'subject') {
    return `${baseTitle.value} — ${ASSESSMENT_TYPE_LABELS[activeType.value!]}`
  }
  return baseTitle.value
})

const backLabel = computed(() =>
  level.value === 'item' ? 'Kembali ke daftar mapel' : 'Kembali ke daftar tipe',
)

useBreadcrumbs(() => [
  { title: 'Penilaian', href: '#' },
  { title: isExam.value ? 'Ujian' : 'Harian & Tugas', href: '#' },
  { title: baseTitle.value, href: baseHref.value },
  ...(activeType.value
    ? [
        {
          title: ASSESSMENT_TYPE_LABELS[activeType.value],
          href: activeSubjectId.value
            ? `${baseHref.value}?tipe=${activeType.value}`
            : '#',
        },
      ]
    : []),
  ...(activeSubjectId.value
    ? [{ title: activeSubjectName.value, href: '#' }]
    : []),
])

const isFilterReady = computed(() => Boolean(selectedSemesterId.value))

const waitingFor = computed(() => {
  if (relatedLoading.value) return null
  if (!selectedSemesterId.value) {
    return semesters.value.length === 0
      ? 'Belum ada semester aktif. Aktifkan satu lewat menu Periode Akademik.'
      : 'Pilih tahun ajaran dan semester terlebih dahulu.'
  }
  if (assignments.value.length === 0) {
    return 'Tidak ada jadwal mengajar pada semester yang dipilih.'
  }
  return null
})

const categoryItems = computed(() => {
  if (waitingFor.value) return []
  return items.value.filter((item) =>
    isTypeInCategory(item.type, category.value),
  )
})

const gradeMatchedItems = computed(() =>
  categoryItems.value.filter((item) => {
    if (
      level.value !== 'type' &&
      hasGradeChoice.value &&
      selectedGradeId.value !== EVERY_GRADE
    ) {
      const cls = classroomObjectById.value.get(classroomIdOf(item))
      if (gradeIdOf(cls) !== selectedGradeId.value) return false
    }
    return true
  }),
)

const typeRows = computed<TypeNode[]>(() => {
  const grouped = new Map<AssessmentType, AssessmentItem[]>()
  for (const item of categoryItems.value) {
    const list = grouped.get(item.type) ?? []
    list.push(item)
    grouped.set(item.type, list)
  }
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return [...grouped.entries()]
    .sort(([a], [b]) => ASSESSMENT_TYPE_ORDER[a] - ASSESSMENT_TYPE_ORDER[b])
    .map(([type, list]) => {
      const summary = summarizeGradingStatus(list)
      return {
        type,
        label: ASSESSMENT_TYPE_LABELS[type],
        subjectCount: new Set(list.map(subjectIdOf).filter(Boolean)).size,
        itemCount: list.length,
        doneCount: summary.doneCount,
        statusLabel: summary.label,
        statusVariant: summary.variant,
      }
    })
    .filter(
      (row) => !keyword || row.label.toLocaleLowerCase('id').includes(keyword),
    )
})

const subjectRows = computed<SubjectNode[]>(() => {
  if (!activeType.value) return []
  const grouped = new Map<string, AssessmentItem[]>()
  for (const item of gradeMatchedItems.value) {
    if (item.type !== activeType.value) continue
    const sid = subjectIdOf(item)
    if (!sid) continue
    const list = grouped.get(sid) ?? []
    list.push(item)
    grouped.set(sid, list)
  }
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return [...grouped.entries()]
    .map(([subjectId, list]) => {
      const summary = summarizeGradingStatus(list)
      return {
        subjectId,
        subjectName: subjectById.value.get(subjectId) ?? '-',
        classroomCount: new Set(list.map(classroomIdOf).filter(Boolean)).size,
        itemCount: list.length,
        doneCount: summary.doneCount,
        statusLabel: summary.label,
        statusVariant: summary.variant,
      }
    })
    .filter(
      (row) =>
        !keyword || row.subjectName.toLocaleLowerCase('id').includes(keyword),
    )
    .sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, 'id', { numeric: true }),
    )
})

const itemRows = computed<AssessmentItem[]>(() => {
  if (!activeType.value || !activeSubjectId.value) return []
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return gradeMatchedItems.value
    .filter((item) => {
      if (item.type !== activeType.value) return false
      if (subjectIdOf(item) !== activeSubjectId.value) return false
      if (
        hasClassroomChoice.value &&
        gradingClassroomId.value !== EVERY_CLASSROOM &&
        classroomIdOf(item) !== gradingClassroomId.value
      ) {
        return false
      }
      if (!keyword) return true
      return (
        item.name.toLocaleLowerCase('id').includes(keyword) ||
        classroomName(item).toLocaleLowerCase('id').includes(keyword)
      )
    })
    .sort((left, right) =>
      compareAssessmentItems(left, right, subjectName, classroomName),
    )
})

const levelRows = computed<DrillRow[]>(() => {
  if (level.value === 'item') return itemRows.value
  if (level.value === 'subject') return subjectRows.value
  return typeRows.value
})

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return levelRows.value.slice(start, start + pageSize.value)
})

const currentItemLabel = computed(() => {
  if (level.value === 'type') return 'tipe'
  if (level.value === 'subject') return 'mapel'
  return itemNoun.value
})

const searchLabel = computed(() => {
  if (level.value === 'type') return 'Cari tipe'
  if (level.value === 'subject') return 'Cari mata pelajaran'
  return `Cari ${itemNoun.value} atau kelas`
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (
    level.value !== 'type' &&
    hasGradeChoice.value &&
    selectedGradeId.value !== EVERY_GRADE
  ) {
    count += 1
  }
  if (
    level.value === 'item' &&
    hasClassroomChoice.value &&
    gradingClassroomId.value !== EVERY_CLASSROOM
  ) {
    count += 1
  }
  return count
})

const emptyMessage = computed(() => {
  if (waitingFor.value) return waitingFor.value
  if (search.value.trim()) {
    return `Tidak ada ${currentItemLabel.value} yang cocok dengan pencarian.`
  }
  return isExam.value
    ? 'Belum ada butir ujian untuk dinilai.'
    : 'Belum ada tugas untuk dinilai.'
})

const canGrade = computed(() => can('student-scores.manage'))

function goTo(tipe: AssessmentType | null, mapel: string | null = null) {
  const query: Record<string, string> = {}
  if (tipe) query.tipe = tipe
  if (tipe && mapel) query.mapel = mapel
  void router.push({ path: baseHref.value, query })
}

function goBack() {
  if (level.value === 'item') {
    goTo(activeType.value)
    return
  }
  goTo(null)
}

function openGrading(item: AssessmentItem) {
  void router.push({
    name: 'student-score-grading',
    params: { assessmentItemId: item.id },
    query: {
      ...(isExam.value ? { category: 'exam' } : {}),
      ...(activeType.value ? { tipe: activeType.value } : {}),
      ...(activeSubjectId.value ? { mapel: activeSubjectId.value } : {}),
    },
  })
}

function openDrillRow(row: DrillRow) {
  if ('itemCount' in row && 'type' in row) {
    goTo(row.type)
    return
  }
  if ('subjectId' in row) {
    goTo(activeType.value, row.subjectId)
    return
  }
  if (canGrade.value) {
    openGrading(row)
  }
}

const typeColumns = computed<ColumnDef<TypeNode>[]>(() => [
  {
    accessorKey: 'label',
    header: 'Tipe',
    meta: { align: 'left', strong: true, mobileLabel: 'Tipe' },
    cell: ({ row }) => row.original.label,
  },
  {
    accessorKey: 'subjectCount',
    header: 'Mata Pelajaran',
    meta: {
      align: 'center',
      mobileLabel: 'Mata Pelajaran',
      mobileValue: (row: TypeNode) => `${row.subjectCount} mapel`,
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums' },
        `${row.original.subjectCount} mapel`,
      ),
  },
  {
    accessorKey: 'itemCount',
    header: isExam.value ? 'Jumlah Ujian' : 'Jumlah Tugas',
    meta: {
      align: 'center',
      mobileLabel: isExam.value ? 'Jumlah Ujian' : 'Jumlah Tugas',
      mobileValue: (row: TypeNode) => row.itemCount,
    },
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums' }, String(row.original.itemCount)),
  },
  {
    id: 'progress',
    header: 'Selesai Dinilai',
    meta: {
      align: 'center',
      mobileLabel: 'Selesai Dinilai',
      mobileValue: (row: TypeNode) => `${row.doneCount}/${row.itemCount}`,
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums' },
        `${row.original.doneCount}/${row.original.itemCount}`,
      ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: TypeNode) => row.statusLabel,
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.statusVariant },
        () => row.original.statusLabel,
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Buka',
        hideEdit: true,
        hideDelete: true,
        onView: () => goTo(row.original.type),
      }),
  },
])

const subjectColumns = computed<ColumnDef<SubjectNode>[]>(() => [
  {
    accessorKey: 'subjectName',
    header: 'Mata Pelajaran',
    meta: { align: 'left', strong: true, mobileLabel: 'Mata Pelajaran' },
    cell: ({ row }) => row.original.subjectName,
  },
  {
    accessorKey: 'classroomCount',
    header: 'Jumlah Kelas',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Kelas',
      mobileValue: (row: SubjectNode) => `${row.classroomCount} kelas`,
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums' },
        `${row.original.classroomCount} kelas`,
      ),
  },
  {
    accessorKey: 'itemCount',
    header: isExam.value ? 'Jumlah Ujian' : 'Jumlah Tugas',
    meta: {
      align: 'center',
      mobileLabel: isExam.value ? 'Jumlah Ujian' : 'Jumlah Tugas',
      mobileValue: (row: SubjectNode) => row.itemCount,
    },
    cell: ({ row }) =>
      h('span', { class: 'tabular-nums' }, String(row.original.itemCount)),
  },
  {
    id: 'progress',
    header: 'Selesai Dinilai',
    meta: {
      align: 'center',
      mobileLabel: 'Selesai Dinilai',
      mobileValue: (row: SubjectNode) => `${row.doneCount}/${row.itemCount}`,
    },
    cell: ({ row }) =>
      h(
        'span',
        { class: 'tabular-nums' },
        `${row.original.doneCount}/${row.original.itemCount}`,
      ),
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: SubjectNode) => row.statusLabel,
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.statusVariant },
        () => row.original.statusLabel,
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        viewLabel: 'Buka',
        hideEdit: true,
        hideDelete: true,
        onView: () => goTo(activeType.value, row.original.subjectId),
      }),
  },
])

const itemColumns = computed(() =>
  createAssessmentItemColumns({
    canUpdate: false,
    canDelete: false,
    typeFirst: true,
    hideType: true,
    nameLabel: isExam.value ? 'Nama Ujian' : 'Nama Tugas',
    classroomName,
    showStatus: true,
    onGrade: canGrade.value ? openGrading : undefined,
  }).filter((column) => canGrade.value || column.id !== 'actions'),
)

const columns = computed<ColumnDef<DrillRow>[]>(() => {
  if (level.value === 'item') {
    return itemColumns.value as ColumnDef<DrillRow>[]
  }
  if (level.value === 'subject') {
    return subjectColumns.value as ColumnDef<DrillRow>[]
  }
  return typeColumns.value as ColumnDef<DrillRow>[]
})

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function resetFilters() {
  if (hasGradeChoice.value) {
    selectedGradeId.value = EVERY_GRADE
  }
  if (hasClassroomChoice.value) {
    gradingClassroomId.value = EVERY_CLASSROOM
  }
}

async function loadItems() {
  if (!isFilterReady.value) return
  await fetchGradingItems(assignments.value.map((a) => a.id))
}

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
    gradingClassroomId.value = options[0].value
    return
  }
  if (
    gradingClassroomId.value !== EVERY_CLASSROOM &&
    !options.some((o) => o.value === gradingClassroomId.value)
  ) {
    gradingClassroomId.value = EVERY_CLASSROOM
  }
}

watch(gradeFilterOptions, reconcileGrade, { immediate: true })
watch(classroomFilterOptions, reconcileClassroom, { immediate: true })

watch(category, () => {
  selectedGradeId.value = EVERY_GRADE
  gradingClassroomId.value = EVERY_CLASSROOM
  search.value = ''
  page.value = 1
})

watch(
  [
    search,
    selectedGradeId,
    gradingClassroomId,
    selectedSemesterId,
    activeType,
    activeSubjectId,
  ],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)

watch(level, () => {
  search.value = ''
})

watch(selectedSemesterId, async (next) => {
  if (relatedLoading.value) return
  await fetchAssignmentsForSemester(next)
  reconcileGrade(gradeFilterOptions.value)
  reconcileClassroom(classroomFilterOptions.value)
  if (isFilterReady.value) {
    await loadItems()
  }
})

onMounted(async () => {
  relatedLoading.value = true
  try {
    await fetchRelatedData()
    reconcileGrade(gradeFilterOptions.value)
    reconcileClassroom(classroomFilterOptions.value)
  } finally {
    relatedLoading.value = false
  }
  if (isFilterReady.value) {
    await loadItems()
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
        <div class="flex min-w-0 items-center gap-3">
          <BackButton
            v-if="level !== 'type'"
            :label="backLabel"
            @click="goBack"
          />
          <CardTitle class="font-semibold">{{ pageTitle }}</CardTitle>
        </div>
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
          :total-items="levelRows.length"
          :is-loading="relatedLoading || loading"
          :item-label="currentItemLabel"
          :row-clickable="() => level !== 'item' || canGrade"
          @row-click="openDrillRow"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-model:semester-id="semesterModel"
              :semesters="semesters"
            />

            <FloatingLabelField
              v-if="level !== 'type' && hasGradeChoice"
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
              v-if="level === 'item' && hasClassroomChoice"
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
          </template>
          <template #header-right>
            <SearchInput
              v-model="search"
              class="sm:w-48"
              :label="searchLabel"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              :label="searchLabel"
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
            Pilih periode dan filter lain untuk menampilkan data.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="semesterModel"
            :semesters="semesters"
            full-width
          />

          <FloatingLabelField
            v-if="level !== 'type' && hasGradeChoice"
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
            v-if="level === 'item' && hasClassroomChoice"
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
  </div>
</template>
