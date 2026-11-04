<script setup lang="ts">
import type { Subject, SubjectSavePayload } from '../types'
import SubjectFormDialog from '../components/SubjectFormDialog.vue'
import { createSubjectColumns } from '../components/columns'
import { useSubjectList } from '../composables/useSubjectList'
import { useSubjectDelete } from '../composables/useSubjectDelete'
import { useSubjectForm } from '../composables/useSubjectForm'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'

const { subjects, totalSubjects, loading, currentFilters, fetchSubjects } =
  useSubjectList()
const searchKeyword = ref(currentFilters.value.search ?? '')

watchDebounced(
  searchKeyword,
  (val) => {
    void fetchSubjects({
      search: val.trim() || '',
      page: 1,
    })
  },
  { debounce: 500 },
)
const { deleteSubject } = useSubjectDelete()
const { isSaving, formError, saveSubject } = useSubjectForm()

const isAddModalOpen = ref(false)
const editingItem = ref<Subject | null>(null)
const { can } = useRoleGuard()

const tableColumns = createSubjectColumns({
  showActions: can('subjects.update') || can('subjects.delete'),
  canUpdate: can('subjects.update'),
  canDelete: can('subjects.delete'),
  onEdit: (item: Subject) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: Subject, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteSubject(item.id)
    setLoading(false)
    if (result.success) {
      closeAlert()
    }
  },
})

async function handleSaveSubject(payload: SubjectSavePayload) {
  const result = await saveSubject(editingItem.value?.id ?? null, payload)
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

onMounted(() => {
  void fetchSubjects()
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
        <CardTitle size="lg"> Mata Pelajaran </CardTitle>
        <Button
          v-if="can('subjects.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="subjects"
          :total-items="totalSubjects"
          :page="currentFilters.page"
          :is-loading="loading"
          item-label="mata pelajaran"
          @update:page="(page) => fetchSubjects({ page })"
          @update:page-size="(limit) => fetchSubjects({ limit, page: 1 })"
        >
          <template #header-right>
            <SearchInput
              v-model="searchKeyword"
              label="Cari mata pelajaran"
            />
          </template>
        </DataTable>

        <SubjectFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :form-error="formError"
          :is-saving="isSaving"
          :edit-data="editingItem"
          @save="handleSaveSubject"
        />
      </CardContent>
    </Card>
  </div>
</template>
