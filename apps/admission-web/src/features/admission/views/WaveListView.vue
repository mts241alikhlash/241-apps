<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { DataTable, ActionCell, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Filter, Plus } from '@lucide/vue'
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
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@mts241alikhlash/ui/alert-dialog'
import type { ColumnDef } from '@tanstack/vue-table'
import { useWaveList } from '../composables/useWaveList'
import WaveFormDialog from '../components/WaveFormDialog.vue'
import type { AdmissionWaveSummary, WaveSavePayload } from '../types'
import { formatDate, formatIDR } from '../utils'

const search = ref('')
const yearFilter = ref('ALL')
const statusFilter = ref('ALL')
const statusFilterId = useId()
const yearFilterId = useId()
const mobileYearFilterId = useId()
const mobileStatusFilterId = useId()
const filterOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)

const {
  waves,
  totalItems,
  listError,
  academicYears,
  loading,
  filtersPending,
  refresh,
  isSaving,
  fetchAcademicYears,
  saveWave,
  deleteWave,
} = useWaveList(search, yearFilter, statusFilter, page, pageSize)
watch(
  [search, yearFilter, statusFilter],
  () => {
    page.value = 1
  },
  { flush: 'sync' },
)
watch([totalItems, loading, filtersPending], () => {
  if (loading.value || filtersPending.value) return
  const lastPage = Math.max(1, Math.ceil(totalItems.value / pageSize.value))
  if (page.value > lastPage) page.value = lastPage
})
function goToPage(next: number) {
  page.value = next
}
function changePageSize(size: number) {
  pageSize.value = size
  page.value = 1
}
function resetFilters() {
  statusFilter.value = 'ALL'
  yearFilter.value = 'ALL'
}
const activeFiltersCount = computed(
  () =>
    Number(statusFilter.value !== 'ALL') + Number(yearFilter.value !== 'ALL'),
)
function resetAllFilters() {
  resetFilters()
  search.value = ''
}

const isFormOpen = ref(false)
const selectedWave = ref<AdmissionWaveSummary | null>(null)
const pendingDeleteId = ref<string | null>(null)
const yearOptions = computed(() =>
  [...academicYears.value].sort((a, b) => b.name.localeCompare(a.name)),
)

const columns = computed<ColumnDef<AdmissionWaveSummary>[]>(() => [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => (page.value - 1) * pageSize.value + row.index + 1,
    enableSorting: false,
  },
  {
    accessorKey: 'code',
    header: 'Kode',
    meta: { align: 'center', mobile: 'hide' },
  },
  {
    accessorKey: 'name',
    header: 'Nama',
    meta: { align: 'left', strong: true },
  },
  {
    id: 'academicYear',
    header: 'Tahun Ajaran',
    meta: { align: 'center' },
    cell: ({ row }) => row.original.academicYear?.name ?? '-',
  },
  {
    id: 'period',
    header: 'Periode',
    meta: { align: 'center' },
    cell: ({ row }) =>
      `${formatDate(row.original.startDate)} – ${formatDate(row.original.endDate)}`,
  },
  {
    id: 'quota',
    header: 'Kuota',
    meta: { align: 'center' },
    cell: ({ row }) => quotaLabel(row.original),
  },
  {
    id: 'fee',
    header: 'Biaya',
    meta: { align: 'center' },
    cell: ({ row }) => formatIDR(Number(row.original.registrationFee)),
  },
  {
    id: 'isActive',
    header: 'Status',
    meta: {
      align: 'center',
      mobileValue: (row: AdmissionWaveSummary) =>
        row.isActive ? 'Aktif' : 'Nonaktif',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isActive ? 'default' : 'secondary' },
        () => (row.original.isActive ? 'Aktif' : 'Nonaktif'),
      ),
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) =>
      h(ActionCell, {
        onEdit: () => openEditForm(row.original),
        onDelete: () => {
          pendingDeleteId.value = row.original.id
        },
      }),
    enableSorting: false,
  },
])

onMounted(() => {
  void fetchAcademicYears()
})

function openCreateForm() {
  selectedWave.value = null
  isFormOpen.value = true
}

function openEditForm(wave: AdmissionWaveSummary) {
  selectedWave.value = wave
  isFormOpen.value = true
}

async function handleSave(payload: WaveSavePayload) {
  const result = await saveWave(selectedWave.value?.id ?? null, payload)
  if (result.success) {
    isFormOpen.value = false
    await refresh()
  }
}

async function confirmDelete() {
  const id = pendingDeleteId.value
  if (!id) return
  const result = await deleteWave(id)
  pendingDeleteId.value = null
  if (result.success) {
    await refresh()
  }
}

function quotaLabel(wave: { filledCount: number; quota: number }) {
  const label = `${wave.filledCount} / ${wave.quota}`
  return wave.filledCount >= wave.quota ? `${label} · Penuh` : label
}
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <div class="space-y-4 p-0 sm:px-0">
        <div
          v-if="listError"
          class="space-y-3 rounded-md border p-4"
          role="alert"
        >
          <p class="text-[length:var(--text-control,0.75rem)]">
            {{ listError }}
          </p>
          <Button
            variant="outline"
            @click="refresh()"
          >
            Coba lagi
          </Button>
        </div>
        <template v-else>
          <DataTable
            mobile="cards"
            :columns="columns"
            :data="filtersPending ? [] : waves"
            :page="page"
            :page-size="pageSize"
            :total-items="totalItems"
            :is-loading="loading || filtersPending"
            item-label="gelombang"
            @update:page="goToPage"
            @update:page-size="changePageSize"
          >
            <template #header-left>
              <Button
                class="shrink-0"
                @click="openCreateForm"
              >
                <Plus class="mr-1.5 size-4" />
                Tambah
              </Button>
            </template>
            <template #header-right>
              <div
                class="flex items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
              >
                <div
                  class="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-0 sm:[&>*:not(:first-child)]:-ml-px sm:[&>*:not(:first-child)_:is(button,input)]:rounded-l-none sm:[&>*:not(:last-child)_:is(button,input)]:rounded-r-none sm:[&>*:focus-within]:z-10"
                >
                  <FloatingLabelField
                    label="Status"
                    :for="statusFilterId"
                    class="w-fit min-w-28"
                    floating
                  >
                    <Select v-model="statusFilter">
                      <SelectTrigger
                        :id="statusFilterId"
                        class="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem value="true">Aktif</SelectItem>
                        <SelectItem value="false">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                  </FloatingLabelField>
                  <FloatingLabelField
                    label="Tahun Ajaran"
                    :for="yearFilterId"
                    class="w-fit min-w-28"
                    floating
                  >
                    <Select v-model="yearFilter">
                      <SelectTrigger
                        :id="yearFilterId"
                        class="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem
                          v-for="year in yearOptions"
                          :key="year.id"
                          :value="year.id"
                        >
                          {{ year.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FloatingLabelField>
                </div>
                <SearchInput
                  v-model="search"
                  class="sm:w-40"
                  label="Cari gelombang"
                />
              </div>
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                label="Cari gelombang"
                class="w-full"
              />
            </template>
            <template #mobile-filter>
              <Button
                variant="outline"
                class="relative shrink-0"
                @click="filterOpen = true"
              >
                <Filter class="mr-1.5 size-4" />
                Filter
                <span
                  v-if="activeFiltersCount"
                  class="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
                >
                  {{ activeFiltersCount }}
                </span>
              </Button>
            </template>
            <template #mobile-chips>
              <div
                v-if="activeFiltersCount"
                class="flex flex-wrap gap-2 text-[length:var(--text-control,0.75rem)]"
              >
                <Button
                  v-if="statusFilter !== 'ALL'"
                  variant="outline"
                  @click="statusFilter = 'ALL'"
                >
                  Hapus filter status:
                  {{ statusFilter === 'true' ? 'Aktif' : 'Nonaktif' }}
                </Button>
                <Button
                  v-if="yearFilter !== 'ALL'"
                  variant="outline"
                  @click="yearFilter = 'ALL'"
                >
                  Hapus filter tahun ajaran:
                  {{
                    yearOptions.find((year) => year.id === yearFilter)?.name ??
                    yearFilter
                  }}
                </Button>
              </div>
            </template>
            <template #empty>
              <div class="space-y-3">
                <p>
                  {{
                    activeFiltersCount || search
                      ? 'Tidak ada gelombang yang cocok dengan filter.'
                      : 'Tidak ada data.'
                  }}
                </p>
                <Button
                  v-if="activeFiltersCount || search"
                  variant="outline"
                  @click="resetAllFilters"
                  >Atur Ulang</Button
                >
              </div>
            </template>
          </DataTable>
        </template>
      </div>
    </Card>

    <Dialog v-model:open="filterOpen">
      <DialogContent size="md">
        <DialogHeader standard
          ><DialogTitle>Filter Gelombang</DialogTitle
          ><DialogDescription class="sr-only"
            >Pilih status dan tahun ajaran.</DialogDescription
          ></DialogHeader
        >
        <DialogBody class="space-y-4">
          <FloatingLabelField
            label="Status"
            :for="mobileStatusFilterId"
            floating
          >
            <Select v-model="statusFilter"
              ><SelectTrigger
                :id="mobileStatusFilterId"
                class="w-full"
                ><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="ALL">Semua</SelectItem
                ><SelectItem value="true">Aktif</SelectItem
                ><SelectItem value="false">Nonaktif</SelectItem></SelectContent
              ></Select
            >
          </FloatingLabelField>
          <FloatingLabelField
            label="Tahun Ajaran"
            :for="mobileYearFilterId"
            floating
          >
            <Select v-model="yearFilter"
              ><SelectTrigger
                :id="mobileYearFilterId"
                class="w-full"
                ><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="ALL">Semua</SelectItem
                ><SelectItem
                  v-for="year in yearOptions"
                  :key="year.id"
                  :value="year.id"
                  >{{ year.name }}</SelectItem
                ></SelectContent
              ></Select
            >
          </FloatingLabelField>
        </DialogBody>
        <DialogFooter
          standard
          class="justify-between"
        >
          <Button
            variant="outline"
            @click="resetFilters"
            >Atur Ulang</Button
          >
          <Button @click="filterOpen = false">Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <WaveFormDialog
      v-model:open="isFormOpen"
      :wave="selectedWave"
      :is-saving="isSaving"
      :academic-years="academicYears"
      @save="handleSave"
    />
    <AlertDialog
      :open="pendingDeleteId !== null"
      @update:open="
        (open) => {
          if (!open) pendingDeleteId = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus gelombang?</AlertDialogTitle>
          <AlertDialogDescription
            >Gelombang yang dihapus tidak lagi tersedia di
            daftar.</AlertDialogDescription
          >
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingDeleteId = null"
            >Batal</AlertDialogCancel
          >
          <AlertDialogAction
            data-test="confirm-wave-delete"
            @click="confirmDelete"
            >Hapus</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
