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
import ConditionFormDialog from '../components/ConditionFormDialog.vue'
import type { ColumnDef } from '@tanstack/vue-table'
import type { InventoryReferenceItem } from '../types'

const { can } = useRoleGuard()
const reference = inventoryReferenceCrud('conditions')

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
      header: 'Nama Kondisi',
    },
    {
      accessorKey: 'isUsable',
      header: 'Kelayakan Pakai',
      cell: ({ row }) => {
        const isUsable = row.original.isUsable
        return h(
          Badge,
          { variant: isUsable ? 'default' : 'destructive' },
          () => (isUsable ? 'Layak Pakai' : 'Tidak Layak Pakai'),
        )
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

async function fetchConditions() {
  loading.value = true
  dataItems.value = await reference.list(searchQuery.value)
  loading.value = false
}

async function handleSaveCondition(
  payload: Omit<InventoryReferenceItem, 'id'>,
) {
  isSaving.value = true
  const saved = await reference.save(selectedItem.value?.id ?? null, payload)
  isSaving.value = false
  if (!saved) return
  isFormOpen.value = false
  await fetchConditions()
}

async function handleDeleteItem(id: string) {
  if (!confirm('Apakah Anda yakin ingin menghapus data kondisi ini?')) return

  if (await reference.remove(id)) await fetchConditions()
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
    void fetchConditions()
  },
  { debounce: 300 },
)

onMounted(() => {
  void fetchConditions()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <Card class="border-slate-200 shadow-sm">
      <CardHeader
        class="flex flex-row items-center justify-between pb-4 border-b"
      >
        <CardTitle size="lg">Kondisi Aset</CardTitle>
        <Button
          v-if="can('inventory-reference-data.create')"
          size="sm"
          @click="handleOpenCreateForm"
        >
          <Plus class="w-4 h-4 mr-2" />
          Tambah Kondisi
        </Button>
      </CardHeader>

      <div class="p-6 space-y-4">
        <div class="flex items-center justify-between gap-4">
          <SearchInput
            v-model="searchQuery"
            label="Cari kode atau nama kondisi"
          />
        </div>

        <DataTable
          :columns="columns"
          :data="dataItems"
          :loading="loading"
        />
      </div>
    </Card>

    <ConditionFormDialog
      v-model:open="isFormOpen"
      :item="selectedItem"
      :is-saving="isSaving"
      @save="handleSaveCondition"
    />
  </div>
</template>
