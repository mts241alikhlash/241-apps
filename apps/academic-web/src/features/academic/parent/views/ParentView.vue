<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { AppCombobox } from '@mts241alikhlash/ui'
import type { ComboboxOption } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Label } from '@mts241alikhlash/ui/label'
import { Plus } from '@lucide/vue'
import { useParent } from '../composables/useParent'
import { useRoleGuard } from '@/features/platform/auth'
import { createParentColumns } from '../components/columns'
import ParentFormDialog from '../components/ParentFormDialog.vue'
import type { Parent, ParentSavePayload } from '../types'

const {
  items,
  totalItems,
  currentPage,
  pageSize,
  loading,
  isSaving,
  formError,
  occupations,
  searchQuery,
  selectedOccupationId,
  fetchFilterOptions,
  fetchParents,
  saveParent,
  deleteParent,
  setPage,
  setPageSize,
} = useParent()

const isAddModalOpen = ref(false)
const editingItem = ref<Parent | null>(null)
const { can } = useRoleGuard()
const canManageParents = computed(
  () => can('parents.create') || can('parents.update') || can('parents.delete'),
)

const occupationFilterOptions = computed<ComboboxOption[]>(() => [
  { value: '', label: 'Semua Pekerjaan' },
  ...occupations.value.map((o) => ({
    value: o.id,
    label: o.name,
  })),
])

const tableColumns = createParentColumns({
  showActions: can('parents.update') || can('parents.delete'),
  canUpdate: can('parents.update'),
  canDelete: can('parents.delete'),
  onEdit: (item: Parent) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: Parent, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteParent(item.id)
    setLoading(false)
    if (result.success) {
      closeAlert()
    }
  },
})

async function handleSaveParent(payload: ParentSavePayload) {
  const result = await saveParent(editingItem.value?.id ?? null, payload)
  if (result.success) {
    isAddModalOpen.value = false
  }
}

watch(isAddModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

watch(selectedOccupationId, () => {
  currentPage.value = 1
  void fetchParents()
})

watchDebounced(
  searchQuery,
  () => {
    currentPage.value = 1
    void fetchParents()
  },
  { debounce: 300 },
)

onMounted(async () => {
  await fetchFilterOptions()
  await fetchParents()
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
        <CardTitle size="lg"> Data Orang Tua </CardTitle>
        <Button
          v-if="can('parents.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div class="rounded-lg border bg-muted/20 p-4 max-w-md">
          <div class="grid gap-2">
            <Label>Pekerjaan</Label>
            <AppCombobox
              v-model="selectedOccupationId"
              :options="occupationFilterOptions"
              placeholder="Pilih Pekerjaan"
              search-placeholder="Cari pekerjaan..."
              empty-text="Pekerjaan tidak ditemukan."
            />
          </div>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="items"
          :is-loading="loading"
          :total-items="totalItems"
          :page="currentPage"
          :page-size="pageSize"
          item-label="orang tua"
          @update:page="setPage"
          @update:page-size="setPageSize"
        >
          <template #header-right>
            <SearchInput
              v-model="searchQuery"
              label="Cari orang tua"
            />
          </template>
        </DataTable>

        <ParentFormDialog
          v-if="canManageParents && isAddModalOpen"
          v-model:open="isAddModalOpen"
          :form-error="formError"
          :is-saving="isSaving"
          :edit-data="editingItem"
          :occupations="occupations"
          @save="handleSaveParent"
        />
      </CardContent>
    </Card>
  </div>
</template>
