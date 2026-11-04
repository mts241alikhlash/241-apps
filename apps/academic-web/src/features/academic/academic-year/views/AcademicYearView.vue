<script setup lang="ts">
import type { AcademicYear } from '../types'
import AcademicYearFormDialog from '../components/AcademicYearFormDialog.vue'
import { createAcademicYearColumns } from '../components/columns'
import { useAcademicYearList } from '../composables/useAcademicYearList'
import { DataTable } from '@mts241alikhlash/ui'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@mts241alikhlash/ui/alert-dialog'
import { useRoleGuard } from '@/features/platform/auth'
import { Plus } from '@lucide/vue'
import { onMounted, ref, watch } from 'vue'

const {
  academicYears,
  loading,
  fetchAcademicYears,
  deleteAcademicYear,
  activateAcademicYear,
  deactivateAcademicYear,
} = useAcademicYearList()

const isAddModalOpen = ref(false)
const editingItem = ref<AcademicYear | null>(null)
const { can } = useRoleGuard()

const confirmAction = ref<{
  type: 'activate' | 'deactivate'
  item: AcademicYear
} | null>(null)
const isProcessing = ref(false)

const tableColumns = createAcademicYearColumns({
  showActions: can('academic-years.update') || can('academic-years.delete'),
  canUpdate: can('academic-years.update'),
  canDelete: can('academic-years.delete'),
  onEdit: (academicYear: AcademicYear) => {
    editingItem.value = academicYear
    isAddModalOpen.value = true
  },
  onDelete: async (academicYear: AcademicYear, { closeAlert, setLoading }) => {
    setLoading(true)
    const result = await deleteAcademicYear(academicYear.id)
    if (result.success) {
      await fetchAcademicYears()
      closeAlert()
    }
    setLoading(false)
  },
  onActivate: (academicYear: AcademicYear) => {
    confirmAction.value = { type: 'activate', item: academicYear }
  },
  onDeactivate: (academicYear: AcademicYear) => {
    confirmAction.value = { type: 'deactivate', item: academicYear }
  },
})

async function handleConfirmAction() {
  if (!confirmAction.value) return
  isProcessing.value = true
  const { type, item } = confirmAction.value
  const result =
    type === 'activate'
      ? await activateAcademicYear(item.id)
      : await deactivateAcademicYear(item.id)
  if (result.success) {
    await fetchAcademicYears()
  }
  isProcessing.value = false
  confirmAction.value = null
}

watch(isAddModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
  }
})

onMounted(() => {
  void fetchAcademicYears()
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
        <CardTitle size="lg"> Tahun Ajaran </CardTitle>
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
          :data="academicYears"
          :is-loading="loading"
          item-label="tahun ajaran"
          filter-column="name"
          filter-placeholder="Cari tahun ajaran..."
        />

        <AcademicYearFormDialog
          v-if="isAddModalOpen"
          v-model:open="isAddModalOpen"
          :edit-data="editingItem"
          @save-success="fetchAcademicYears"
        />
      </CardContent>
    </Card>
  </div>

  <AlertDialog :open="!!confirmAction">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{
            confirmAction?.type === 'activate'
              ? 'Aktifkan Tahun Ajaran?'
              : 'Nonaktifkan Tahun Ajaran?'
          }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{
            confirmAction?.type === 'activate'
              ? 'Mengaktifkan tahun ajaran ini akan menonaktifkan semua tahun ajaran lainnya. Lanjutkan?'
              : 'Apakah Anda yakin ingin menonaktifkan tahun ajaran ini?'
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel
          :disabled="isProcessing"
          @click="confirmAction = null"
        >
          Batal
        </AlertDialogCancel>
        <AlertDialogAction
          :disabled="isProcessing"
          @click="handleConfirmAction"
        >
          {{ isProcessing ? 'Memproses...' : 'Ya, Lanjutkan' }}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
