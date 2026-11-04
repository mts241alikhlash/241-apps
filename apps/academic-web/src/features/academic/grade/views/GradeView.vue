<script setup lang="ts">
import type { Grade } from '../types'
import { createGradeColumns } from '../components/columns'
import GradeFormDialog from '../components/GradeFormDialog.vue'
import { useGradeList } from '../composables/useGradeList'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { useRoleGuard } from '@/features/platform/auth'
import { onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

const { items, totalItems, loading, currentFilters, fetchGrades, deleteGrade } =
  useGradeList()
const searchKeyword = ref(currentFilters.value.search ?? '')

watchDebounced(
  searchKeyword,
  (val) => {
    void fetchGrades({
      search: val.trim() || '',
      page: 1,
    })
  },
  { debounce: 500 },
)

const isAddModalOpen = ref(false)
const editingItem = ref<Grade | null>(null)
const { can } = useRoleGuard()

const tableColumns = createGradeColumns({
  showActions: can('academic-years.update') || can('academic-years.delete'),
  canUpdate: can('academic-years.update'),
  canDelete: can('academic-years.delete'),
  onEdit: (item: Grade) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: Grade, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteGrade(item.id)
    if (result.success) {
      await fetchGrades()
      closeAlert()
    }
    setLoading(false)
  },
})

watch(isAddModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
  }
})

onMounted(() => {
  void fetchGrades()
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
        <CardTitle size="lg"> Tingkat Kelas </CardTitle>
        <Button
          v-if="can('academic-years.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="items"
          :total-items="totalItems"
          :page="currentFilters.page"
          :is-loading="loading"
          item-label="tingkat kelas"
          @update:page="(page) => fetchGrades({ page })"
          @update:page-size="(limit) => fetchGrades({ limit, page: 1 })"
        >
          <template #header-right>
            <SearchInput
              v-model="searchKeyword"
              label="Cari tingkat kelas"
            />
          </template>
        </DataTable>

        <GradeFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :edit-data="editingItem"
          @save-success="fetchGrades"
        />
      </CardContent>
    </Card>
  </div>
</template>
