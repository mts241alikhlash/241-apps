<script setup lang="ts">
import type {
  TeachingAssignment,
  TeachingAssignmentCreatePayload,
  TeachingAssignmentUpdatePayload,
} from '../types'
import TeachingAssignmentFormDialog from '../components/TeachingAssignmentFormDialog.vue'
import { createTeachingAssignmentColumns } from '../components/columns'
import { useTeachingAssignment } from '../composables/useTeachingAssignment'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { EVERY_CLASSROOM } from '../constants/filters'

const {
  items,
  totalItems,
  currentPage,
  pageSize,
  loading,
  isSaving,
  formError,
  classrooms,
  selectedClassroomId,
  fetchFilterOptions,
  fetchTeachingAssignments,
  saveTeachingAssignment,
  deleteTeachingAssignment,
  setPage,
  setPageSize,
} = useTeachingAssignment()

const isAddModalOpen = ref(false)
const editingItem = ref<TeachingAssignment | null>(null)
const { can } = useRoleGuard()

const classroomFilterOptions = computed(() => [
  { value: EVERY_CLASSROOM, label: 'Semua Kelas' },
  ...classrooms.value.map((c) => ({
    value: c.id,
    label: c.code ?? '-',
  })),
])

const tableColumns = createTeachingAssignmentColumns({
  showActions:
    can('teaching-assignments.update') || can('teaching-assignments.delete'),
  canUpdate: can('teaching-assignments.update'),
  canDelete: can('teaching-assignments.delete'),
  onEdit: (item: TeachingAssignment) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: TeachingAssignment, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteTeachingAssignment(item.id)
    setLoading(false)
    if (result.success) {
      closeAlert()
    }
  },
})

async function handleSaveTeachingAssignment(
  payload: TeachingAssignmentCreatePayload | TeachingAssignmentUpdatePayload,
) {
  const result = await saveTeachingAssignment(
    editingItem.value?.id ?? null,
    payload,
  )
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

watch(selectedClassroomId, () => {
  currentPage.value = 1
  void fetchTeachingAssignments()
})

onMounted(async () => {
  if (!selectedClassroomId.value) {
    selectedClassroomId.value = EVERY_CLASSROOM
  }
  await fetchFilterOptions()
  await fetchTeachingAssignments()
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
        <CardTitle size="lg"> Penugasan Mengajar </CardTitle>
        <Button
          v-if="can('teaching-assignments.create')"
          @click="isAddModalOpen = true"
        >
          <Plus class="size-4 mr-2" />
          Tambah
        </Button>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <DataTable
          :columns="tableColumns"
          :data="items"
          :is-loading="loading"
          :total-items="totalItems"
          :page="currentPage"
          :page-size="pageSize"
          item-label="penugasan mengajar"
          filter-column="employee"
          filter-placeholder="Cari guru..."
          @update:page="setPage"
          @update:page-size="setPageSize"
        >
          <template #header-right>
            <Select v-model="selectedClassroomId">
              <SelectTrigger class="h-8 w-[160px] text-xs">
                <SelectValue placeholder="Semua Kelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in classroomFilterOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </template>
        </DataTable>

        <TeachingAssignmentFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :form-error="formError"
          :is-saving="isSaving"
          :edit-data="editingItem"
          @save="handleSaveTeachingAssignment"
        />
      </CardContent>
    </Card>
  </div>
</template>
