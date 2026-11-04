<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Plus } from '@lucide/vue'
import { useStudentParent } from '../composables/useStudentParent'
import { useRoleGuard } from '@/features/platform/auth'
import { createStudentParentColumns } from '../components/columns'
import StudentParentFormDialog from '../components/StudentParentFormDialog.vue'
import type { StudentParent, StudentParentFormPayload } from '../types'

const {
  items,
  totalItems,
  currentPage,
  pageSize,
  loading,
  isSaving,
  formError,
  students,
  parents,
  fetchAll,
  save,
  deleteStudentParent,
  fetchStudents,
  fetchParents,
  setPage,
  setPageSize,
} = useStudentParent()

const isFormOpen = ref(false)
const editingItem = ref<StudentParent | null>(null)
const { can } = useRoleGuard()

const columns = createStudentParentColumns({
  onEdit: (item: StudentParent) => {
    editingItem.value = item
    isFormOpen.value = true
  },
  onDelete: (item: StudentParent, { setLoading, closeAlert }) => {
    setLoading(true)
    void deleteStudentParent(item.id)
      .then((result) => {
        if (result.success) {
          closeAlert()
          void fetchAll()
        }
      })
      .finally(() => {
        setLoading(false)
      })
  },
})

async function handleSave(payload: StudentParentFormPayload) {
  const result = await save(editingItem.value?.id ?? null, payload)
  if (result.success) {
    isFormOpen.value = false
    await fetchAll()
  }
}

watch(isFormOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

onMounted(async () => {
  await Promise.all([fetchStudents(), fetchParents()])
  await fetchAll()
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
        <CardTitle size="lg"> Relasi Siswa – Orang Tua </CardTitle>
        <Button
          v-if="can('students.create')"
          @click="isFormOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <DataTable
          :columns="columns"
          :data="items"
          :is-loading="loading"
          :total-items="totalItems"
          :page="currentPage"
          :page-size="pageSize"
          item-label="relasi"
          @update:page="setPage"
          @update:page-size="setPageSize"
        />

        <StudentParentFormDialog
          v-if="isFormOpen"
          v-model:open="isFormOpen"
          :edit-data="editingItem"
          :form-error="formError"
          :is-saving="isSaving"
          :students="students"
          :parents="parents"
          @save="handleSave"
        />
      </CardContent>
    </Card>
  </div>
</template>
