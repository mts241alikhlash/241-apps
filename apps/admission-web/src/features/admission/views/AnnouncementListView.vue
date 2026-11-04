<script setup lang="ts">
import { computed, h, onMounted, ref, useId, watch } from 'vue'
import { DataTable, ActionCell, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
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
import { Filter, Plus } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import type { ColumnDef } from '@tanstack/vue-table'
import { useAnnouncementList } from '../composables/useAnnouncementList'
import AnnouncementFormDialog from '../components/AnnouncementFormDialog.vue'
import type { AdmissionAnnouncement, AnnouncementSavePayload } from '../types'
import { formatDateTime } from '../utils'

const search = ref('')
const statusFilter = ref('ALL')
const waveFilter = ref('ALL')
const statusFilterId = useId()
const waveFilterId = useId()
const mobileStatusFilterId = useId()
const mobileWaveFilterId = useId()
const filterOpen = ref(false)
const page = ref(1)
const pageSize = ref(10)

const {
  announcements,
  waves,
  totalItems,
  listError,
  loading,
  filtersPending,
  refresh,
  isSaving,
  fetchWaves,
  saveAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
} = useAnnouncementList(search, statusFilter, waveFilter, page, pageSize)
watch(
  [search, statusFilter, waveFilter],
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
  waveFilter.value = 'ALL'
}

const isFormOpen = ref(false)
const selected = ref<AdmissionAnnouncement | null>(null)
const pendingAction = ref<{ kind: 'publish' | 'delete'; id: string } | null>(
  null,
)

const columns = computed<ColumnDef<AdmissionAnnouncement>[]>(() => [
  {
    id: 'no',
    header: 'No',
    cell: ({ row }) => (page.value - 1) * pageSize.value + row.index + 1,
    enableSorting: false,
  },
  { accessorKey: 'title', header: 'Judul', meta: { strong: true } },
  {
    id: 'wave',
    header: 'Gelombang',
    cell: ({ row }) => row.original.wave?.name ?? 'Semua',
  },
  {
    id: 'isPublished',
    header: 'Status',
    meta: {
      mobileValue: (row: AdmissionAnnouncement) =>
        row.isPublished ? 'Terbit' : 'Draft',
    },
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.isPublished ? 'default' : 'secondary' },
        () => (row.original.isPublished ? 'Terbit' : 'Draft'),
      ),
  },
  {
    id: 'publishedAt',
    header: 'Terbit',
    cell: ({ row }) => formatDateTime(row.original.publishedAt),
  },
  {
    id: 'publish',
    header: 'Publikasi',
    cell: ({ row }) =>
      row.original.isPublished
        ? '-'
        : h(
            Button,
            {
              size: 'sm',
              variant: 'outline',
              onClick: () => {
                pendingAction.value = { kind: 'publish', id: row.original.id }
              },
            },
            () => 'Terbitkan',
          ),
    enableSorting: false,
  },
  {
    id: 'actions',
    header: 'Aksi',
    cell: ({ row }) =>
      h(ActionCell, {
        onEdit: () => openEditForm(row.original),
        onDelete: () => {
          pendingAction.value = { kind: 'delete', id: row.original.id }
        },
      }),
    enableSorting: false,
  },
])

onMounted(fetchWaves)

function openCreateForm() {
  selected.value = null
  isFormOpen.value = true
}

function openEditForm(announcement: AdmissionAnnouncement) {
  selected.value = announcement
  isFormOpen.value = true
}

async function handleSave(payload: AnnouncementSavePayload) {
  const result = await saveAnnouncement(selected.value?.id ?? null, payload)
  if (result.success) {
    isFormOpen.value = false
    await refresh()
  }
}

async function confirmPendingAction() {
  const action = pendingAction.value
  if (!action) return
  pendingAction.value = null
  const result =
    action.kind === 'publish'
      ? await publishAnnouncement(action.id)
      : await deleteAnnouncement(action.id)
  if (result.success) await refresh()
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
            :data="filtersPending ? [] : announcements"
            :page="page"
            :page-size="pageSize"
            :total-items="totalItems"
            :is-loading="loading || filtersPending"
            item-label="pengumuman"
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
                        <SelectItem value="true">Terbit</SelectItem>
                        <SelectItem value="false">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </FloatingLabelField>
                  <FloatingLabelField
                    label="Gelombang"
                    :for="waveFilterId"
                    class="w-fit min-w-28"
                    floating
                  >
                    <Select v-model="waveFilter">
                      <SelectTrigger
                        :id="waveFilterId"
                        class="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Semua</SelectItem>
                        <SelectItem
                          v-for="wave in waves"
                          :key="wave.id"
                          :value="wave.id"
                        >
                          {{ wave.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FloatingLabelField>
                </div>
                <SearchInput
                  v-model="search"
                  class="sm:w-40"
                  label="Cari pengumuman"
                />
              </div>
            </template>
            <template #mobile-toolbar>
              <SearchInput
                v-model="search"
                label="Cari pengumuman"
                class="w-full"
              />
            </template>
            <template #mobile-filter>
              <Button
                variant="outline"
                class="shrink-0"
                @click="filterOpen = true"
                ><Filter class="mr-1.5 size-4" />Filter</Button
              >
            </template>
            <template #mobile-chips>
              <div
                v-if="statusFilter !== 'ALL' || waveFilter !== 'ALL'"
                class="flex flex-wrap gap-2"
              >
                <Button
                  v-if="statusFilter !== 'ALL'"
                  variant="outline"
                  @click="statusFilter = 'ALL'"
                  >Hapus filter status</Button
                >
                <Button
                  v-if="waveFilter !== 'ALL'"
                  variant="outline"
                  @click="waveFilter = 'ALL'"
                  >Hapus filter gelombang</Button
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
          ><DialogTitle>Filter Pengumuman</DialogTitle
          ><DialogDescription class="sr-only"
            >Pilih status dan gelombang.</DialogDescription
          ></DialogHeader
        >
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
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
                ><SelectItem value="true">Terbit</SelectItem
                ><SelectItem value="false">Draft</SelectItem></SelectContent
              ></Select
            >
          </FloatingLabelField>
          <FloatingLabelField
            label="Gelombang"
            :for="mobileWaveFilterId"
            floating
          >
            <Select v-model="waveFilter"
              ><SelectTrigger
                :id="mobileWaveFilterId"
                class="w-full"
                ><SelectValue /></SelectTrigger
              ><SelectContent
                ><SelectItem value="ALL">Semua</SelectItem
                ><SelectItem
                  v-for="wave in waves"
                  :key="wave.id"
                  :value="wave.id"
                  >{{ wave.name }}</SelectItem
                ></SelectContent
              ></Select
            >
          </FloatingLabelField>
        </div>
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

    <AnnouncementFormDialog
      v-model:open="isFormOpen"
      :announcement="selected"
      :is-saving="isSaving"
      :waves="waves"
      @save="handleSave"
    />
    <AlertDialog
      :open="pendingAction !== null"
      @update:open="
        (open) => {
          if (!open) pendingAction = null
        }
      "
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{
            pendingAction?.kind === 'publish'
              ? 'Terbitkan pengumuman?'
              : 'Hapus pengumuman?'
          }}</AlertDialogTitle>
          <AlertDialogDescription>{{
            pendingAction?.kind === 'publish'
              ? 'Pendaftar dalam cakupan pengumuman akan menerima notifikasi.'
              : 'Pengumuman ini akan dihapus.'
          }}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="pendingAction = null"
            >Batal</AlertDialogCancel
          >
          <AlertDialogAction
            data-test="confirm-announcement-action"
            @click="confirmPendingAction"
            >{{
              pendingAction?.kind === 'publish' ? 'Terbitkan' : 'Hapus'
            }}</AlertDialogAction
          >
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
