<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Filter, PackagePlus, Plus, SquarePen } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import {
  ActionCell,
  BackButton,
  DataTable,
  DataTableEmpty,
  SearchInput,
} from '@mts241alikhlash/ui'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { examEventService } from '@/features/exam-event/services/examEventService'
import type { ExamEvent } from '@/features/exam-event/types'
import {
  eventStatusLabel,
  eventStatusVariant,
} from '@/features/exam-event/types'
import { AcademicPeriodFilter } from '@/features/lookup/semester'
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { examTypeLabel } from '@/features/exam-shared/examType'
import { gradeNumberOf } from '@/features/exam-shared/classroomName'
import { examActivityApi } from '../api/examActivityApi'
import ActivityStatusDialog from '../components/ActivityStatusDialog.vue'
import AttachPackageDialog from '../components/AttachPackageDialog.vue'
import {
  ACTIVITY_STATUSES,
  activityStatusLabel,
  type ActivityStatus,
  type ExamActivityRecord,
} from '../types'

const router = useRouter()
const { hasPermission } = useAuthSession()

const { category, sectionPrefix } = useRouteCategory()
const canManage = computed(() =>
  category.value === 'EXAM'
    ? hasPermission('exam-schedules.manage-all') ||
      hasPermission('exam-events.manage')
    : hasPermission('exam-schedules.manage') ||
      hasPermission('exam-schedules.manage-all'),
)
const route = useRoute()
const NO_PERIOD = 'none'
const periodId = computed(() => {
  const raw = route.query.periode
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' && value !== '' ? value : null
})
const hierarchical = computed(() => category.value === 'EXAM')
const level = computed<'period' | 'activity'>(() =>
  hierarchical.value && periodId.value === null ? 'period' : 'activity',
)
const events = ref(new Map<string, ExamEvent>())
const semesterId = ref('')
const periodKey = (item: ExamActivityRecord): string =>
  item.eventId !== null && events.value.has(item.eventId)
    ? item.eventId
    : NO_PERIOD
const activeEvent = computed(() =>
  periodId.value === null ? null : (events.value.get(periodId.value) ?? null),
)
const heading = computed(() => {
  if (category.value === 'NON_EXAM') return 'Kegiatan Non-ujian'
  if (level.value === 'activity' && periodId.value !== null) {
    return periodId.value === NO_PERIOD
      ? 'Tanpa periode'
      : (activeEvent.value?.name ?? 'Kegiatan Ujian')
  }
  return 'Kegiatan Ujian'
})

const activities = ref<ExamActivityRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const attachTarget = ref<ExamActivityRecord | null>(null)
const statusTarget = ref<ExamActivityRecord | null>(null)

const search = ref('')
const statusFilter = ref<'ALL' | ActivityStatus>('ALL')
const statusFieldId = useId()
const mobileStatusFieldId = useId()
const filterOpen = ref(false)
const page = ref(1)
const pageSize = ref(25)

const STATUS_VARIANT = {
  DRAFT: 'outline',
  SCHEDULED: 'info',
  ACTIVE: 'success',
  CLOSED: 'secondary',
} as const satisfies Record<ActivityStatus, string>

const dateOnly = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const timeOnly = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})
const dateOf = (iso: string): string => dateOnly.format(new Date(iso))
const timeOf = (iso: string): string => timeOnly.format(new Date(iso))

const gradeNumber = (name: string | null): number =>
  gradeNumberOf(name) ?? Number.MAX_SAFE_INTEGER

const inScope = computed(() =>
  hierarchical.value
    ? activities.value.filter((item) => periodKey(item) === periodId.value)
    : activities.value,
)

const filtered = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return inScope.value
    .filter((item) => {
      if (statusFilter.value !== 'ALL' && item.status !== statusFilter.value) {
        return false
      }
      if (!keyword) return true
      return [
        item.subjectName ?? '',
        item.gradeName ?? '',
        item.type ? examTypeLabel(item.type) : '',
      ].some((value) => value.toLocaleLowerCase('id').includes(keyword))
    })
    .sort(
      (left, right) =>
        left.startsAt.localeCompare(right.startsAt) ||
        gradeNumber(left.gradeName) - gradeNumber(right.gradeName) ||
        (left.subjectName ?? '').localeCompare(right.subjectName ?? '', 'id'),
    )
})

const activeFilters = computed(() => Number(statusFilter.value !== 'ALL'))

function open(item: ExamActivityRecord) {
  void router.push(`${sectionPrefix.value}/activities/${item.id}`)
}

const activityColumns = computed<ColumnDef<ExamActivityRecord>[]>(() => [
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileLabel: 'Jenis',
      mobileValue: (row: ExamActivityRecord) =>
        row.type ? examTypeLabel(row.type) : '-',
    },
    cell: ({ row }) =>
      row.original.type ? examTypeLabel(row.original.type) : '-',
  },
  {
    id: 'subject',
    header: 'Mata Pelajaran',
    meta: {
      mobile: 'title',
      mobileValue: (row: ExamActivityRecord) => row.subjectName ?? 'Kegiatan',
    },
    cell: ({ row }) => row.original.subjectName ?? 'Kegiatan',
  },
  {
    id: 'grade',
    header: 'Tingkat',
    meta: {
      align: 'center',
      mobileLabel: 'Tingkat',
      mobileValue: (row: ExamActivityRecord) => row.gradeName ?? '-',
    },
    cell: ({ row }) => row.original.gradeName ?? '-',
  },
  {
    id: 'startDate',
    header: 'Tanggal Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Mulai',
      mobileValue: (row: ExamActivityRecord) => dateOf(row.startsAt),
    },
    cell: ({ row }) => dateOf(row.original.startsAt),
  },
  {
    id: 'endDate',
    header: 'Tanggal Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Selesai',
      mobileValue: (row: ExamActivityRecord) => dateOf(row.endsAt),
    },
    cell: ({ row }) => dateOf(row.original.endsAt),
  },
  {
    id: 'time',
    header: 'Jam',
    meta: {
      align: 'center',
      mobileLabel: 'Jam',
      mobileValue: (row: ExamActivityRecord) =>
        `${timeOf(row.startsAt)} - ${timeOf(row.endsAt)}`,
    },
    cell: ({ row }) =>
      `${timeOf(row.original.startsAt)} - ${timeOf(row.original.endsAt)}`,
  },
  {
    id: 'duration',
    header: 'Durasi',
    meta: {
      align: 'center',
      mobileLabel: 'Durasi',
      mobileValue: (row: ExamActivityRecord) => `${row.durationMinutes} menit`,
    },
    cell: ({ row }) => `${row.original.durationMinutes} menit`,
  },
  {
    id: 'token',
    header: 'Token',
    meta: {
      align: 'center',
      mobileLabel: 'Token',
      mobileValue: (row: ExamActivityRecord) =>
        row.tokenMode === 'ROTATING' ? 'Berputar' : 'Tetap',
    },
    cell: ({ row }) =>
      row.original.tokenMode === 'ROTATING' ? 'Berputar' : 'Tetap',
  },
  {
    id: 'package',
    header: 'Paket',
    meta: {
      align: 'center',
      mobileLabel: 'Paket',
      mobileValue: (row: ExamActivityRecord) =>
        row.packageId === null ? 'Menunggu paket' : 'Terpasang',
    },
    cell: ({ row }) =>
      row.original.packageId === null
        ? h(Badge, { variant: 'warning' }, () => 'Menunggu paket')
        : h(Badge, { variant: 'success' }, () => 'Terpasang'),
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: ExamActivityRecord) => activityStatusLabel(row.status),
    },
    cell: ({ row }) =>
      h(Badge, { variant: STATUS_VARIANT[row.original.status] }, () =>
        activityStatusLabel(row.original.status),
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Detail',
        hideEdit: true,
        hideDelete: true,
        items: [
          ...(row.original.packageId === null && canManage.value
            ? [
                {
                  label: 'Pasang Paket',
                  icon: PackagePlus,
                  onClick: () => {
                    attachTarget.value = row.original
                  },
                },
              ]
            : []),
          ...(canManage.value
            ? [
                {
                  label: 'Ubah Status',
                  icon: SquarePen,
                  onClick: () => {
                    statusTarget.value = row.original
                  },
                },
              ]
            : []),
        ],
        onManage: () => open(row.original),
      }),
  },
])

const countOf = (id: string): number =>
  activities.value.filter((item) => periodKey(item) === id).length

const ORPHAN = {
  id: NO_PERIOD,
  name: 'Tanpa periode',
  type: null,
  status: null,
  startsAt: '',
  endsAt: '',
} as unknown as ExamEvent

const periodRows = computed<ExamEvent[]>(() => {
  const rows = [...events.value.values()].sort((left, right) =>
    right.startsAt.localeCompare(left.startsAt),
  )
  return countOf(NO_PERIOD) > 0 ? [...rows, ORPHAN] : rows
})

function openPeriod(id: string) {
  page.value = 1
  void router.push({ path: route.path, query: { periode: id } })
}

function goBack() {
  page.value = 1
  void router.push({ path: route.path })
}

function openCreate() {
  const query =
    periodId.value !== null && periodId.value !== NO_PERIOD
      ? { periode: periodId.value }
      : undefined
  void router.push({ path: `${sectionPrefix.value}/activities/new`, query })
}

const longDate = (event: ExamEvent, iso: string): string =>
  event.id === NO_PERIOD
    ? '-'
    : new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'long',
      }).format(new Date(iso))

const periodColumns: ColumnDef<ExamEvent>[] = [
  {
    id: 'type',
    header: 'Jenis',
    meta: {
      align: 'center',
      mobileLabel: 'Jenis',
      mobileValue: (row: ExamEvent) =>
        row.id === NO_PERIOD ? '-' : examTypeLabel(row.type),
    },
    cell: ({ row }) =>
      row.original.id === NO_PERIOD ? '-' : examTypeLabel(row.original.type),
  },
  {
    id: 'name',
    header: 'Periode Ujian',
    meta: {
      align: 'left',
      strong: true,
      mobile: 'title',
      mobileValue: (row: ExamEvent) => row.name,
    },
    cell: ({ row }) => row.original.name,
  },
  {
    id: 'startDate',
    header: 'Tanggal Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Mulai',
      mobileValue: (row: ExamEvent) => longDate(row, row.startsAt),
    },
    cell: ({ row }) => longDate(row.original, row.original.startsAt),
  },
  {
    id: 'endDate',
    header: 'Tanggal Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Tanggal Selesai',
      mobileValue: (row: ExamEvent) => longDate(row, row.endsAt),
    },
    cell: ({ row }) => longDate(row.original, row.original.endsAt),
  },
  {
    id: 'count',
    header: 'Jumlah Kegiatan',
    meta: {
      align: 'center',
      mobileLabel: 'Jumlah Kegiatan',
      mobileValue: (row: ExamEvent) => countOf(row.id),
    },
    cell: ({ row }) => String(countOf(row.original.id)),
  },
  {
    id: 'status',
    header: 'Status',
    meta: {
      align: 'center',
      mobileLabel: 'Status',
      mobileValue: (row: ExamEvent) =>
        row.id === NO_PERIOD ? '-' : eventStatusLabel(row.status),
    },
    cell: ({ row }) =>
      row.original.id === NO_PERIOD
        ? '-'
        : h(Badge, { variant: eventStatusVariant(row.original.status) }, () =>
            eventStatusLabel(row.original.status),
          ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    enableSorting: false,
    meta: { align: 'center' },
    cell: ({ row }) =>
      h(ActionCell, {
        manageLabel: 'Lihat',
        hideEdit: true,
        hideDelete: true,
        onManage: () => openPeriod(row.original.id),
      }),
  },
]

const rows = computed<(ExamEvent | ExamActivityRecord)[]>(() =>
  level.value === 'period' ? periodRows.value : filtered.value,
)

const columns = computed(
  () =>
    (level.value === 'period'
      ? periodColumns
      : activityColumns.value) as unknown as ColumnDef<
      ExamEvent | ExamActivityRecord
    >[],
)

const total = computed(() =>
  level.value === 'period' ? periodRows.value.length : filtered.value.length,
)

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return rows.value.slice(start, start + pageSize.value)
})

async function loadEvents(): Promise<void> {
  if (semesterId.value === '') return
  const result = await examEventService.loadEvents({
    semesterId: semesterId.value,
    limit: 1000,
  })
  if (result.success) {
    events.value = new Map(result.data.map((event) => [event.id, event]))
  }
}

async function load(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const response = await examActivityApi.list(
      category.value ? { category: category.value } : undefined,
    )
    activities.value = response
  } catch {
    error.value = 'Gagal memuat daftar kegiatan.'
  } finally {
    loading.value = false
  }
}

function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}

function openActivityRow(row: ExamEvent | ExamActivityRecord) {
  if ('subjectName' in row) {
    open(row)
    return
  }
  openPeriod(row.id)
}

watch(
  [search, statusFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
watch(category, () => void load())
watch(periodId, () => {
  page.value = 1
})
watch(semesterId, () => {
  page.value = 1
  if (hierarchical.value) void loadEvents()
})
onMounted(load)
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
            v-if="hierarchical && level === 'activity'"
            label="Kembali ke Periode Ujian"
            @click="goBack"
          />
          <CardTitle class="font-semibold">{{ heading }}</CardTitle>
        </div>
        <Button
          v-if="canManage && level === 'activity'"
          class="shrink-0"
          @click="openCreate"
        >
          <Plus class="size-4" />
          Tambah
        </Button>
      </CardHeader>
      <CardContent
        class="flex min-h-0 flex-1 flex-col space-y-4 overflow-auto pt-2 px-4 pb-4"
      >
        <div
          v-if="error !== null"
          role="alert"
          class="space-y-3 rounded-md border p-4"
        >
          <p class="text-control">{{ error }}</p>
          <Button
            variant="outline"
            @click="load"
          >
            Coba lagi
          </Button>
        </div>

        <DataTable
          v-else
          mobile="cards"
          :columns="columns"
          :data="pagedRows"
          :page="page"
          :page-size="pageSize"
          :total-items="total"
          :is-loading="loading"
          :item-label="level === 'period' ? 'periode ujian' : 'kegiatan'"
          @row-click="openActivityRow"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <AcademicPeriodFilter
              v-if="level === 'period'"
              v-model:semester-id="semesterId"
            />
            <FloatingLabelField
              v-if="level === 'activity'"
              label="Status"
              :for="statusFieldId"
              class="w-fit min-w-28"
              floating
            >
              <Select v-model="statusFilter">
                <SelectTrigger
                  :id="statusFieldId"
                  class="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem
                    v-for="status in ACTIVITY_STATUSES"
                    :key="status"
                    :value="status"
                  >
                    {{ activityStatusLabel(status) }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FloatingLabelField>
          </template>
          <template #header-right>
            <SearchInput
              v-if="level === 'activity'"
              v-model="search"
              class="sm:w-40"
              label="Cari mapel atau tingkat"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-if="level === 'activity'"
              v-model="search"
              label="Cari mapel atau tingkat"
              class="w-full"
            />
          </template>
          <template #mobile-filter>
            <Button
              v-if="level === 'activity'"
              variant="outline"
              class="relative shrink-0"
              @click="filterOpen = true"
            >
              <Filter class="size-4" />
              Filter
              <span
                v-if="activeFilters"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                {{ activeFilters }}
              </span>
            </Button>
          </template>
          <template #empty>
            <DataTableEmpty
              :message="
                search || activeFilters
                  ? 'Tidak ada kegiatan yang cocok dengan filter.'
                  : 'Belum ada kegiatan pada seksi ini.'
              "
            />
          </template>
        </DataTable>
      </CardContent>
      <CardFooter plain />
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard>
          <DialogTitle>Filter Kegiatan</DialogTitle>
          <DialogDescription>
            Filter kegiatan berdasarkan status
          </DialogDescription>
        </DialogHeader>
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="mobileStatusFieldId"
            floating
          >
            <Select v-model="statusFilter">
              <SelectTrigger
                :id="mobileStatusFieldId"
                class="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua</SelectItem>
                <SelectItem
                  v-for="status in ACTIVITY_STATUSES"
                  :key="status"
                  :value="status"
                >
                  {{ activityStatusLabel(status) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter standard>
          <Button
            variant="outline"
            :disabled="statusFilter === 'ALL'"
            @click="statusFilter = 'ALL'"
          >
            Atur Ulang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ActivityStatusDialog
      :open="statusTarget !== null"
      :activity="statusTarget"
      @update:open="(value: boolean) => value || (statusTarget = null)"
      @saved="load"
    />

    <AttachPackageDialog
      :open="attachTarget !== null"
      :activity="attachTarget"
      @update:open="(value: boolean) => value || (attachTarget = null)"
      @attached="load"
    />
  </div>
</template>
