<script setup lang="ts">
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
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
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import { useRoleGuard } from '@/features/platform/auth'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { watchDebounced } from '@vueuse/core'
import { ArrowLeftRight, Plus, Filter } from '@lucide/vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@mts241alikhlash/ui/dropdown-menu'
import { onMounted, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { createColumns } from '../components/columns'
import EmployeeFormDialog from '../components/EmployeeFormDialog.vue'
import { ImportPreviewDialog } from '@/features/shared/import-preview'
import { employeeImportColumns } from '../importPreviewColumns'
import { ImportExportDialog } from '@/features/shared/import-export'
import { employeeImportExportLabels } from '../importExportLabels'
import { useEmployee } from '../composables/useEmployee'
import { useEmployeeImportExport } from '../composables/useEmployeeImportExport'
import type {
  Employee,
  EmployeeSavePayload,
  EmployeeUpdatePayload,
} from '../types'

const router = useRouter()

const {
  employees,
  positionCategories,
  loading,
  filters,
  totalEmployees,
  currentPage,
  pageSize,
  isSaving,
  formError,
  fetchEmployees,
  fetchPositionCategories,
  saveEmployee,
  savePosition,
  deletePosition,
  deleteEmployee,
  setPage,
  setPageSize,
} = useEmployee()

const {
  isImportExportOpen,
  isImporting,
  isConflictDialogOpen,
  isResolvingConflicts,
  conflictRows,
  downloadTemplate,
  exportData,
  handleFileUpload,
  handleResolveConflicts,
} = useEmployeeImportExport({
  employees: employees,
  onImportSuccess: () => {
    void fetchEmployees()
  },
})

const isModalOpen = ref(false)
const editingItem = ref<Employee | null>(null)
const { can } = useRoleGuard()

const canImport = computed(
  () => can('employees.create') && can('employees.update'),
)

async function handleSaveEmployee(
  payload: EmployeeSavePayload | EmployeeUpdatePayload,
) {
  const result = await saveEmployee(editingItem.value?.id ?? null, payload)
  if (result.success) {
    toast.success(
      editingItem.value
        ? 'Data guru berhasil diperbarui'
        : 'Pegawai baru berhasil ditambahkan',
    )
    isModalOpen.value = false
    await fetchEmployees()
  }
}

async function handleSavePosition(
  employeeId: string,
  positionId: string,
  oldPositionLinkId: string | null,
) {
  if (oldPositionLinkId) {
    await deletePosition(employeeId, oldPositionLinkId)
  }
  const today = new Date().toISOString().substring(0, 10)
  const result = await savePosition(employeeId, {
    positionId,
    hireDate: today,
    isPrimary: true,
  })
  if (result.success) {
    toast.success('Jabatan guru berhasil diperbarui')
    await fetchEmployees()
  }
}

const tableColumns = createColumns({
  showActions: can('employees.update') || can('employees.delete'),
  canUpdate: can('employees.update'),
  canDelete: can('employees.delete'),
  onViewDetail: (employee) => {
    if (employee?.user?.id) {
      void router.push(`/profile/EMPLOYEE/${employee.user.id}`)
    }
  },
  onEdit: (employee) => {
    if (employee?.id) {
      editingItem.value = employee
      isModalOpen.value = true
    }
  },
  onDelete: async (employee, { closeAlert, setLoading }) => {
    setLoading(true)
    try {
      await deleteEmployee(employee.id)
      toast.success('Pegawai berhasil dihapus')
      await fetchEmployees()
      closeAlert()
    } catch (e: unknown) {
      toast.error(getIndonesianErrorMessage(e, 'Gagal menghapus data guru'))
    } finally {
      setLoading(false)
    }
  },
})

watch(isModalOpen, (isOpen) => {
  if (!isOpen) {
    editingItem.value = null
    formError.value = null
  }
})

const isFilterDialogOpen = ref(false)

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.positionCategoryId) count++
  if (filters.value.statusFilter !== 'all') count++
  return count
})

function resetAllFilters() {
  filters.value.positionCategoryId = ''
  filters.value.statusFilter = 'all'
}

function handleFilterChange(
  key: 'positionCategoryId' | 'statusFilter',
  value: unknown,
) {
  if (key === 'positionCategoryId') {
    filters.value[key] =
      typeof value === 'string' && value !== 'all' ? value : ''
  } else {
    filters.value[key] = typeof value === 'string' ? value : 'all'
  }
}

watchDebounced(
  () => filters.value.keyword,
  () => {
    currentPage.value = 1
    void fetchEmployees()
  },
  { debounce: 400 },
)

watch(
  () => filters.value.positionCategoryId,
  () => {
    currentPage.value = 1
    void fetchEmployees()
  },
)

watch(
  () => filters.value.statusFilter,
  () => {
    currentPage.value = 1
    void fetchEmployees()
  },
)

onMounted(() => {
  void fetchEmployees()
  void fetchPositionCategories()
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
          <CardTitle size="lg"> Daftar Pegawai </CardTitle>
        </div>
        <div class="flex items-center gap-2">
          <div class="hidden sm:flex items-center gap-2">
            <Button
              v-if="canImport"
              variant="outline"
              size="sm"
              class="h-10 px-4 bg-white"
              @click="isImportExportOpen = true"
            >
              <ArrowLeftRight class="size-4 mr-2" />
              Import / Export
            </Button>
            <Button
              v-if="can('employees.create')"
              size="sm"
              class="h-10 px-4"
              @click="router.push('/staff/create')"
            >
              <Plus class="size-4 mr-2" />
              Tambah Pegawai
            </Button>
          </div>

          <div
            v-if="can('employees.create')"
            class="flex sm:hidden"
          >
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  size="sm"
                  class="h-9 px-3 gap-1"
                >
                  <Plus class="size-4" />
                  Tambah
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                class="w-48"
              >
                <DropdownMenuItem @click="router.push('/staff/create')">
                  <Plus class="size-4 mr-2 text-muted-foreground" />
                  Tambah Pegawai
                </DropdownMenuItem>
                <DropdownMenuItem
                  v-if="canImport"
                  @click="isImportExportOpen = true"
                >
                  <ArrowLeftRight class="size-4 mr-2 text-muted-foreground" />
                  Import / Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent class="p-0 sm:px-0">
        <div class="mb-6">
          <div class="hidden lg:flex lg:flex-row lg:items-center gap-3">
            <Select
              :model-value="filters.positionCategoryId || 'all'"
              @update:model-value="
                handleFilterChange('positionCategoryId', $event)
              "
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[150px] px-3! gap-2!"
              >
                <SelectValue placeholder="Semua Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Semua Kategori </SelectItem>
                <SelectItem
                  v-for="cat in positionCategories"
                  :key="cat.id"
                  :value="cat.id"
                >
                  {{ cat.name }}
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              :model-value="filters.statusFilter"
              @update:model-value="handleFilterChange('statusFilter', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[140px] px-3! gap-2!"
              >
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Semua Status </SelectItem>
                <SelectItem value="active"> Aktif </SelectItem>
                <SelectItem value="inactive"> Nonaktif </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col lg:hidden gap-3">
            <Button
              variant="outline"
              class="w-full relative justify-center"
              @click="isFilterDialogOpen = true"
            >
              <Filter class="size-4 mr-2" />
              Filter Pegawai
              <span
                v-if="activeFiltersCount > 0"
                class="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {{ activeFiltersCount }}
              </span>
            </Button>
          </div>
        </div>

        <div class="mt-0">
          <DataTable
            :columns="tableColumns"
            :data="employees"
            :is-loading="loading"
            :total-items="totalEmployees"
            :page="currentPage"
            :page-size="pageSize"
            item-label="guru"
            @update:page="setPage"
            @update:page-size="setPageSize"
          >
            <template #header-right>
              <SearchInput
                v-model="filters.keyword"
                label="Cari guru"
              />
            </template>
          </DataTable>
        </div>
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="isFilterDialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Filter Pegawai</DialogTitle>
        <DialogDescription class="sr-only">
          Saring daftar guru berdasarkan kategori, jabatan, dan status.
        </DialogDescription>
      </DialogHeader>

      <div class="p-6 space-y-4">
        <FloatingLabelField
          label="Kategori"
          for="employee-filter-category"
          floating
        >
          <Select
            :model-value="filters.positionCategoryId || 'all'"
            @update:model-value="
              handleFilterChange('positionCategoryId', $event)
            "
          >
            <SelectTrigger
              id="employee-filter-category"
              class="w-full"
            >
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"> Semua Kategori </SelectItem>
              <SelectItem
                v-for="cat in positionCategories"
                :key="cat.id"
                :value="cat.id"
              >
                {{ cat.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          label="Status"
          for="employee-filter-status"
          floating
        >
          <Select
            :model-value="filters.statusFilter"
            @update:model-value="handleFilterChange('statusFilter', $event)"
          >
            <SelectTrigger
              id="employee-filter-status"
              class="w-full"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"> Semua Status </SelectItem>
              <SelectItem value="active"> Aktif </SelectItem>
              <SelectItem value="inactive"> Nonaktif </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>
      </div>

      <DialogFooter
        class="px-6 py-4 border-t bg-muted/20 flex flex-row items-center justify-end gap-2"
      >
        <Button
          variant="outline"
          size="sm"
          class="flex-1 sm:flex-none"
          @click="resetAllFilters"
        >
          Atur Ulang
        </Button>
        <Button
          size="sm"
          class="flex-1 sm:flex-none"
          @click="isFilterDialogOpen = false"
        >
          Tutup
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>

  <EmployeeFormDialog
    v-if="can('employees.update')"
    v-model:open="isModalOpen"
    :form-error="formError"
    :is-saving="isSaving"
    :edit-data="editingItem"
    @save="handleSaveEmployee"
    @save-position="handleSavePosition"
  />

  <ImportExportDialog
    v-if="canImport"
    v-model:open="isImportExportOpen"
    :is-processing="isImporting"
    :labels="employeeImportExportLabels"
    @download-template="downloadTemplate"
    @export-data="exportData"
    @import-data="handleFileUpload"
  />

  <ImportPreviewDialog
    v-model:open="isConflictDialogOpen"
    :rows="conflictRows"
    :columns="employeeImportColumns"
    :loading="isResolvingConflicts"
    @resolve="handleResolveConflicts"
  />
</template>
