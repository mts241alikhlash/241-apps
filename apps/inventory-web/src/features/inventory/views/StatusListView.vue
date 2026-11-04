<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { DataTable, ActionCell, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import { Card, CardHeader, CardTitle } from '@mts241alikhlash/ui/card'
import { Badge } from '@mts241alikhlash/ui/badge'
import { Plus } from '@lucide/vue'
import { h } from 'vue'
import { useRoleGuard } from '@/features/platform/auth'
import { inventoryReferenceCrud } from '../services/inventoryReferenceCrudService'
import StatusFormDialog from '../components/StatusFormDialog.vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { InventoryReferenceItem, InventoryStatusKey } from '../types'

const { can } = useRoleGuard()
const reference = inventoryReferenceCrud('statuses')

const SYSTEM_KEY_LABELS: Record<InventoryStatusKey, string> = {
  AVAILABLE: 'Tersedia',
  LOAN_PENDING: 'Menunggu Persetujuan',
  LOAN_APPROVED: 'Pinjam Disetujui',
  LOANED: 'Sedang Dipinjam',
  LOAN_RETURNED: 'Baru Dikembalikan',
  LOAN_REJECTED: 'Pinjam Ditolak',
}

const dataItems = ref<InventoryReferenceItem[]>([])
const loading = ref(false)
const isSaving = ref(false)
const isFormOpen = ref(false)
const selectedItem = ref<InventoryReferenceItem | null>(null)
const searchQuery = ref('')

const columns = computed<ColumnDef<InventoryReferenceItem>[]>(() => {
  const baseColumns: ColumnDef<InventoryReferenceItem>[] = [
    {
      id: 'no',
      header: 'No',
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'code',
      header: 'Kode',
    },
    {
      accessorKey: 'name',
      header: 'Nama Status',
    },
    {
      accessorKey: 'allowTransactions',
      header: 'Bisa Dipinjam',
      cell: ({ row }) => {
        const allow = row.original.allowTransactions
        return h(Badge, { variant: allow ? 'default' : 'destructive' }, () =>
          allow ? 'Diizinkan' : 'Dilarang',
        )
      },
    },
    {
      accessorKey: 'systemKey',
      header: 'Peran Sistem',
      cell: ({ row }) => {
        const key = row.original.systemKey
        if (!key) {
          return h('span', { class: 'text-muted-foreground' }, '-')
        }
        return h(Badge, { variant: 'outline' }, () => SYSTEM_KEY_LABELS[key])
      },
    },
  ]

  if (
    can('inventory-reference-data.update') ||
    can('inventory-reference-data.delete')
  ) {
    baseColumns.push({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) =>
        h(ActionCell, {
          hideEdit: !can('inventory-reference-data.update'),
          hideDelete: !can('inventory-reference-data.delete'),
          onEdit: () => handleOpenEditForm(row.original),
          onDelete: () => handleDeleteItem(row.original.id),
        }),
      enableSorting: false,
      enableHiding: false,
    })
  }

  return baseColumns
})

async function fetchStatuses() {
  loading.value = true
  dataItems.value = await reference.list(searchQuery.value)
  loading.value = false
}

async function handleSaveStatus(payload: Omit<InventoryReferenceItem, 'id'>) {
  isSaving.value = true
  const saved = await reference.save(selectedItem.value?.id ?? null, payload)
  isSaving.value = false
  if (!saved) return
  isFormOpen.value = false
  await fetchStatuses()
}

async function handleDeleteItem(id: string) {
  if (!confirm('Apakah Anda yakin ingin menghapus data status ini?')) return

  if (await reference.remove(id)) await fetchStatuses()
}

function handleOpenCreateForm() {
  selectedItem.value = null
  isFormOpen.value = true
}

function handleOpenEditForm(item: InventoryReferenceItem) {
  selectedItem.value = item
  isFormOpen.value = true
}

watchDebounced(
  searchQuery,
  () => {
    void fetchStatuses()
  },
  { debounce: 300 },
)

onMounted(() => {
  void fetchStatuses()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <Card class="border-slate-200 shadow-sm">
      <CardHeader
        class="flex flex-row items-center justify-between pb-4 border-b"
      >
        <CardTitle size="lg">Status Aset</CardTitle>
        <Button
          v-if="can('inventory-reference-data.create')"
          size="sm"
          @click="handleOpenCreateForm"
        >
          <Plus class="w-4 h-4 mr-2" />
          Tambah Status
        </Button>
      </CardHeader>

      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <SearchInput
            v-model="searchQuery"
            label="Cari kode atau nama status"
          />
        </div>

        <DataTable
          :columns="columns"
          :data="dataItems"
          :loading="loading"
        />
      </div>
    </Card>

    <StatusFormDialog
      v-model:open="isFormOpen"
      :item="selectedItem"
      :is-saving="isSaving"
      :existing-statuses="dataItems"
      @save="handleSaveStatus"
    />
  </div>
</template>
