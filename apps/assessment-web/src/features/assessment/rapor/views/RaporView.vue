<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { Download, Filter, Loader2, ToggleLeft, ToggleRight } from '@lucide/vue'
import {
  ActionCell,
  DataTable,
  DataTableEmpty,
  SearchInput,
} from '@mts241alikhlash/ui'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { useRapor } from '../composables/useRapor'
import { columns } from '../components/columns'
import RaporFormDialog from '../components/RaporFormDialog.vue'
import RaporDetailDialog from '../components/RaporDetailDialog.vue'
import type { RaporData } from '../types'
import { useRoleGuard } from '@mts241alikhlash/platform/auth'
import { toast } from 'vue-sonner'

const {
  rapors,
  totalItems,
  summary,
  currentPage,
  pageSize,
  loading,
  isGenerating,
  classrooms,
  semesters,
  selectedClassroomId,
  selectedSemesterId,
  fetchFilterOptions,
  fetchRapors,
  bulkGenerateRapor,
  togglePublish,
  exportReportCard,
  setPage,
  setPageSize,
} = useRapor()

const filterId = useId()
const mobileFilterId = useId()
const search = ref('')
const filterOpen = ref(false)
const openForm = ref(false)
const openDetail = ref(false)
const editingData = ref<RaporData | null>(null)
const detailData = ref<RaporData | null>(null)
const showBulkConfirm = ref(false)
const { can } = useRoleGuard()

const isFilterReady = computed(
  () => Boolean(selectedClassroomId.value) && Boolean(selectedSemesterId.value),
)

const activeSemester = computed(
  () => semesters.value.find((s) => s.id === selectedSemesterId.value) ?? null,
)

const classroomOptions = computed(() =>
  classrooms.value
    .filter(
      (c) =>
        !activeSemester.value ||
        c.academicYearId === activeSemester.value.academicYearId,
    )
    .map((c) => ({
      value: c.id,
      label: c.code ?? c.displayName,
    })),
)

const semesterModel = computed({
  get: () => selectedSemesterId.value ?? '',
  set: (value: string) => {
    selectedSemesterId.value = value || null
  },
})

const classroomModel = computed({
  get: () => selectedClassroomId.value ?? '',
  set: (value: string) => {
    selectedClassroomId.value = value || null
  },
})

const stats = computed(() => ({
  total: totalItems.value,
  published: summary.value?.published ?? 0,
  draft: summary.value?.draft ?? 0,
  avgAll: summary.value?.averageScore ?? null,
}))

const activeFiltersCount = computed(
  () =>
    Number(Boolean(selectedSemesterId.value)) +
    Number(Boolean(selectedClassroomId.value)),
)

const filteredRapors = computed(() => {
  if (!isFilterReady.value) return []
  const keyword = search.value.trim().toLocaleLowerCase('id')
  if (!keyword) return rapors.value
  return rapors.value.filter((item) => {
    const name = item.enrollment?.student?.user?.profile?.name ?? ''
    const nis = item.enrollment?.student?.nis ?? ''
    return (
      name.toLocaleLowerCase('id').includes(keyword) ||
      nis.toLocaleLowerCase('id').includes(keyword)
    )
  })
})

const emptyMessage = computed(() => {
  if (!selectedSemesterId.value)
    return 'Pilih tahun ajaran dan semester terlebih dahulu.'
  if (!selectedClassroomId.value)
    return 'Pilih kelas untuk menampilkan data rapor.'
  if (search.value.trim()) return 'Tidak ada siswa yang cocok dengan pencarian.'
  return 'Belum ada data rapor untuk kelas ini.'
})

function openRaporDetail(rapor: RaporData) {
  detailData.value = rapor
  openDetail.value = true
}

const canEdit = computed(
  () => can('report-cards.update') || can('report-cards.delete'),
)

const tableColumns = computed(() => [
  ...columns,
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' as const },
    cell: ({ row }: { row: { original: RaporData } }) => {
      const rapor = row.original
      return h(ActionCell, {
        viewLabel: 'Lihat Detail',
        editLabel: 'Edit',
        hideEdit: !canEdit.value,
        hideDelete: true,
        onView: () => openRaporDetail(rapor),
        onEdit: () => {
          editingData.value = rapor
          openForm.value = true
        },
        items: [
          ...(canEdit.value
            ? [
                {
                  label: rapor.isPublished ? 'Unpublish' : 'Publish',
                  icon: rapor.isPublished ? ToggleLeft : ToggleRight,
                  onClick: () => {
                    if (!rapor.isPublished && rapor.totalAverage === null) {
                      toast.error(
                        'Rapor belum bisa dipublish karena nilai belum digenerate.',
                      )
                      return
                    }
                    void togglePublish(rapor.id, rapor.isPublished)
                  },
                },
              ]
            : []),
          ...(rapor.isPublished
            ? [
                {
                  label: 'Export PDF',
                  icon: Download,
                  onClick: () => {
                    const studentName =
                      rapor.enrollment?.student?.user?.profile?.name ?? 'Siswa'
                    void exportReportCard(rapor.id, studentName)
                  },
                },
              ]
            : []),
        ],
      })
    },
  },
])

function resetFilters() {
  selectedClassroomId.value = null
}

async function handleGenerateBulk() {
  showBulkConfirm.value = false
  await bulkGenerateRapor()
}

watch(openForm, (isOpen) => {
  if (!isOpen) editingData.value = null
})

watch(openDetail, (isOpen) => {
  if (!isOpen) detailData.value = null
})

watch(classroomOptions, (options) => {
  if (
    selectedClassroomId.value &&
    !options.some((o) => o.value === selectedClassroomId.value)
  ) {
    selectedClassroomId.value = null
  }
  if (!selectedClassroomId.value && options.length === 1) {
    selectedClassroomId.value = options[0]?.value ?? null
  }
})

watch([selectedClassroomId, selectedSemesterId], () => {
  currentPage.value = 1
  if (isFilterReady.value) {
    void fetchRapors()
  } else {
    rapors.value = []
    totalItems.value = 0
    summary.value = null
  }
})

onMounted(async () => {
  await fetchFilterOptions()
  const defaultSemester =
    semesters.value.find((s) => s.isActive) ??
    semesters.value.find(
      (s) => s.type?.name === 'ODD' || s.type?.name === 'EVEN',
    ) ??
    semesters.value[0]
  if (!selectedSemesterId.value && defaultSemester) {
    selectedSemesterId.value = defaultSemester.id
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
        <CardTitle class="font-semibold">Rapor Siswa</CardTitle>
        <Button
          v-if="
            isFilterReady &&
            (can('report-cards.create') || can('report-cards.update'))
          "
          class="shrink-0"
          :disabled="isGenerating"
          @click="showBulkConfirm = true"
        >
          <Loader2
            v-if="isGenerating"
            class="size-4 animate-spin"
          />
          Generate Rapor Massal
        </Button>
      </CardHeader>

      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <dl
          v-if="isFilterReady && stats.total > 0"
          class="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 rounded-md border bg-muted/30 px-4 py-2"
        >
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Total Siswa</dt>
            <dd class="font-medium tabular-nums">{{ stats.total }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Published</dt>
            <dd class="font-medium tabular-nums text-success">
              {{ stats.published }}
            </dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Draft</dt>
            <dd class="font-medium tabular-nums text-warning">
              {{ stats.draft }}
            </dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-control text-muted-foreground">Rata-rata Kelas</dt>
            <dd class="font-medium tabular-nums">
              {{ stats.avgAll !== null ? stats.avgAll.toFixed(2) : '-' }}
            </dd>
          </div>
        </dl>

        <DataTable
          mobile="cards"
          :columns="tableColumns"
          :data="filteredRapors"
          :is-loading="loading"
          :total-items="totalItems"
          :page="currentPage"
          :page-size="pageSize"
          item-label="rapor"
          :row-clickable="() => true"
          @row-click="openRaporDetail"
          @update:page="setPage"
          @update:page-size="setPageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-model:semester-id="semesterModel"
              :semesters="semesters"
            />

            <FloatingLabelField
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
                  <SelectValue placeholder="Pilih kelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="c in classroomOptions"
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
              label="Cari nama atau NIS"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari nama atau NIS"
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
          <DialogTitle>Filter Rapor</DialogTitle>
          <DialogDescription>
            Pilih tahun ajaran, semester, dan kelas untuk menampilkan data
            rapor.
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <AcademicPeriodFilter
            v-model:semester-id="semesterModel"
            :semesters="semesters"
            full-width
          />

          <FloatingLabelField
            label="Kelas"
            :for="`${mobileFilterId}-classroom`"
            floating
          >
            <Select v-model="classroomModel">
              <SelectTrigger
                :id="`${mobileFilterId}-classroom`"
                class="w-full"
              >
                <SelectValue placeholder="Pilih kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in classroomOptions"
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
            :disabled="!selectedClassroomId"
            @click="resetFilters"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false"> Tutup </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <RaporFormDialog
      v-if="can('report-cards.create')"
      v-model:open="openForm"
      :rapor="editingData"
    />

    <RaporDetailDialog
      v-model:open="openDetail"
      :rapor="detailData"
    />

    <AlertDialog
      :open="showBulkConfirm"
      @update:open="showBulkConfirm = $event"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Generate Rapor Massal?</AlertDialogTitle>
          <AlertDialogDescription>
            Rapor akan di-generate untuk semua siswa di kelas ini. Nilai
            rata-rata dan peringkat akan dihitung otomatis berdasarkan data
            nilai yang sudah ada. Rapor yang sudah ada akan diperbarui.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction @click="handleGenerateBulk"
            >Ya, Generate</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
