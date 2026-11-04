<script setup lang="ts">
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import PositionFormDialog from '../components/PositionFormDialog.vue'
import { usePosition } from '../composables/usePosition'
import { useRoleGuard } from '@/features/platform/auth'
import { createColumns } from '../components/columns'
import type { Position } from '../types'
import { watchDebounced } from '@vueuse/core'

const { items, loading, searchQuery, fetchPositions, deletePosition } =
  usePosition()

const isAddOpen = ref(false)
const isEditDialogOpen = ref(false)
const selectedItem = ref<Position | null>(null)

const { can } = useRoleGuard()

const columns = createColumns({
  showActions: can('positions.update') || can('positions.delete'),
  canUpdate: can('positions.update'),
  canDelete: can('positions.delete'),
  onEdit: (item: Position) => {
    selectedItem.value = item
    isEditDialogOpen.value = true
  },
  onDelete: async (item: Position, { closeAlert, setLoading }) => {
    setLoading(true)
    const success = await deletePosition(item.id)
    setLoading(false)
    if (success) {
      closeAlert()
    }
  },
})

watchDebounced(
  searchQuery,
  () => {
    void fetchPositions({ search: searchQuery.value })
  },
  { debounce: 400 },
)

onMounted(() => {
  void fetchPositions()
})
</script>

<template>
  <div class="px-4 pb-4 pt-1 sm:px-6 sm:pb-6 sm:pt-2">
    <Card
      gap="none"
      class="overflow-visible rounded-none border-0 bg-transparent shadow-none ring-0"
    >
      <CardHeader
        standard
        class="min-h-0 border-b-0 bg-transparent px-0 pt-0 pb-3 sm:px-0"
      >
        <div>
          <CardTitle size="lg"> Daftar Jabatan </CardTitle>
        </div>
        <div
          v-if="can('positions.create')"
          class="flex flex-col sm:flex-row w-full sm:w-auto gap-2"
        >
          <Button @click="isAddOpen = true">
            <Plus class="mr-2 h-4 w-4" /> Tambah Jabatan
          </Button>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="items"
          :is-loading="loading"
          item-label="jabatan"
        >
          <template #header-right>
            <SearchInput
              v-model="searchQuery"
              label="Cari jabatan"
            />
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <PositionFormDialog
      v-if="can('positions.create')"
      v-model:open="isAddOpen"
      @success="fetchPositions"
    />

    <PositionFormDialog
      v-if="can('positions.update')"
      v-model:open="isEditDialogOpen"
      :initial-data="selectedItem"
      @success="fetchPositions"
    />
  </div>
</template>
