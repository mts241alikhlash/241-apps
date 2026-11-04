<script setup lang="ts">
import type { StudentGraduation, StudentGraduationSavePayload } from '../types'
import StudentGraduationFormDialog from '../components/StudentGraduationFormDialog.vue'
import { createStudentGraduationColumns } from '../components/columns'
import { useStudentGraduation } from '../composables/useStudentGraduation'
import { DataTable } from '@mts241alikhlash/ui'
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
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { computed, onMounted, ref, watch } from 'vue'

const {
  items,
  totalItems,
  currentPage,
  pageSize,
  loading,
  isSaving,
  formError,
  academicYears,
  selectedAcademicYearId,
  fetchReferenceData,
  fetchStudentGraduations,
  saveStudentGraduation,
  deleteStudentGraduation,
  setPage,
  setPageSize,
} = useStudentGraduation()

const { can } = useRoleGuard()
const isAddModalOpen = ref(false)
const editingItem = ref<StudentGraduation | null>(null)

const academicYearFilterOptions = computed<ComboboxOption[]>(() => [
  { value: '', label: 'Semua Tahun Ajaran' },
  ...academicYears.value.map((ay) => ({
    value: ay.id,
    label: `${ay.name}${ay.isActive ? ' (Aktif)' : ''}`,
  })),
])

const tableColumns = createStudentGraduationColumns({
  showActions: can('graduations.update') || can('graduations.delete'),
  canUpdate: can('graduations.update'),
  canDelete: can('graduations.delete'),
  onEdit: (item: StudentGraduation) => {
    editingItem.value = item
    isAddModalOpen.value = true
  },
  onDelete: async (item: StudentGraduation, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteStudentGraduation(item.id)
    if (result.success) {
      await fetchStudentGraduations()
      closeAlert()
    }
    setLoading(false)
  },
})

async function handleSave(payload: StudentGraduationSavePayload) {
  const result = await saveStudentGraduation(
    editingItem.value?.id ?? null,
    payload,
  )
  if (result.success) {
    isAddModalOpen.value = false
    await fetchStudentGraduations()
  }
}

watch(isAddModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

watch(selectedAcademicYearId, () => {
  currentPage.value = 1
  void fetchStudentGraduations()
})

onMounted(async () => {
  selectedAcademicYearId.value = ''
  await fetchReferenceData()
  void fetchStudentGraduations()
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
        <CardTitle size="lg"> Alumni </CardTitle>
        <div class="flex gap-2">
          <Button
            v-if="can('graduations.create')"
            variant="outline"
            @click="isAddModalOpen = true"
          >
            <Plus class="size-4 mr-2" />
            Tambah
          </Button>
        </div>
      </CardHeader>

      <CardContent class="space-y-4 p-0 sm:px-0">
        <div class="rounded-lg border bg-muted/20 p-4">
          <div class="grid items-end gap-4 sm:grid-cols-1">
            <div class="grid gap-2 max-w-xs">
              <Label>Tahun Ajaran</Label>
              <AppCombobox
                v-model="selectedAcademicYearId"
                :options="academicYearFilterOptions"
                placeholder="Semua Tahun Ajaran"
                search-placeholder="Cari tahun ajaran..."
                empty-text="Tahun ajaran tidak ditemukan."
              />
            </div>
          </div>
        </div>

        <DataTable
          :columns="tableColumns"
          :data="items"
          :is-loading="loading"
          :total-items="totalItems"
          :page="currentPage"
          :page-size="pageSize"
          item-label="alumni"
          filter-column="studentName"
          filter-placeholder="Cari nama siswa..."
          @update:page="setPage"
          @update:page-size="setPageSize"
        />

        <StudentGraduationFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :edit-data="editingItem"
          :form-error="formError"
          :is-saving="isSaving"
          @save="handleSave"
        />
      </CardContent>
    </Card>
  </div>
</template>
