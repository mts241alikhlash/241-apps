<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { ColumnDef } from '@tanstack/vue-table'
import { Filter, PackagePlus, Plus } from '@lucide/vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { ActionCell, DataTable, SearchInput } from '@mts241alikhlash/ui'
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
import { useRouteCategory } from '@/features/exam-shared/useRouteCategory'
import { examTypeLabel } from '@/features/exam-shared/examType'
import { examActivityApi } from '../api/examActivityApi'
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
const canManage = computed(() => hasPermission('exam-schedules.manage'))
const heading = computed(() =>
  category.value === 'NON_EXAM' ? 'Kegiatan Non-ujian' : 'Kegiatan Ujian',
)

const activities = ref<ExamActivityRecord[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const attachTarget = ref<ExamActivityRecord | null>(null)

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

const filtered = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase('id')
  return activities.value.filter((item) => {
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
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const activeFilters = computed(() => Number(statusFilter.value !== 'ALL'))

function open(item: ExamActivityRecord) {
  void router.push(`${sectionPrefix.value}/activities/${item.id}`)
}

const columns = computed<ColumnDef<ExamActivityRecord>[]>(() => [
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
    id: 'startTime',
    header: 'Jam Mulai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Mulai',
      mobileValue: (row: ExamActivityRecord) => timeOf(row.startsAt),
    },
    cell: ({ row }) => timeOf(row.original.startsAt),
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
    id: 'endTime',
    header: 'Jam Selesai',
    meta: {
      align: 'center',
      mobileLabel: 'Jam Selesai',
      mobileValue: (row: ExamActivityRecord) => timeOf(row.endsAt),
    },
    cell: ({ row }) => timeOf(row.original.endsAt),
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
        items:
          row.original.packageId === null && canManage.value
            ? [
                {
                  label: 'Pasang Paket',
                  icon: PackagePlus,
                  onClick: () => {
                    attachTarget.value = row.original
                  },
                },
              ]
            : [],
        onManage: () => open(row.original),
      }),
  },
])

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

function resetAll() {
  search.value = ''
  statusFilter.value = 'ALL'
}

watch(
  [search, statusFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
watch(category, () => void load())
onMounted(load)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Card
      gap="none"
      class="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <CardHeader standard>
        <CardTitle class="font-semibold">{{ heading }}</CardTitle>
        <Button
          v-if="canManage"
          class="shrink-0"
          @click="router.push(`${sectionPrefix}/activities/new`)"
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
          :data="paged"
          :page="page"
          :page-size="pageSize"
          :total-items="filtered.length"
          :is-loading="loading"
          item-label="kegiatan"
          @update:page="page = $event"
          @update:page-size="changePageSize"
        >
          <template #filters>
            <FloatingLabelField
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
              v-model="search"
              class="sm:w-40"
              label="Cari mapel atau tingkat"
            />
          </template>
          <template #mobile-toolbar>
            <SearchInput
              v-model="search"
              label="Cari mapel atau tingkat"
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
                v-if="activeFilters"
                class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
              >
                {{ activeFilters }}
              </span>
            </Button>
          </template>
          <template #empty>
            <div class="space-y-3 text-center">
              <p>
                {{
                  search || activeFilters
                    ? 'Tidak ada kegiatan yang cocok dengan filter.'
                    : 'Belum ada kegiatan pada seksi ini.'
                }}
              </p>
              <Button
                v-if="search || activeFilters"
                variant="outline"
                @click="resetAll"
              >
                Atur Ulang
              </Button>
            </div>
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
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="statusFilter = 'ALL'"
          >
            Atur Ulang
          </Button>
          <Button @click="filterOpen = false">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AttachPackageDialog
      :open="attachTarget !== null"
      :activity="attachTarget"
      @update:open="(value: boolean) => value || (attachTarget = null)"
      @attached="load"
    />
  </div>
</template>
