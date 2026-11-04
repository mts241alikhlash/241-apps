<script setup lang="ts">
import { useEmployee } from '../composables/useEmployee'
import { createAccountColumns } from '../components/columns'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@mts241alikhlash/ui/card'
import { Button } from '@mts241alikhlash/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { FloatingLabelField } from '@mts241alikhlash/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@mts241alikhlash/ui/dialog'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { watchDebounced } from '@vueuse/core'
import { Filter } from '@lucide/vue'
import { onMounted, ref, computed } from 'vue'
import { toast } from 'vue-sonner'
import { useRoleGuard } from '@/features/platform/auth'

const { can } = useRoleGuard()

const {
  filters,
  loading,
  employees,
  totalEmployees,
  currentPage,
  pageSize,
  fetchEmployees,
  toggleActive,
  deleteEmployee,
  positions,
  positionCategories,
  fetchPositions,
  fetchPositionCategories,
  setPage,
  setPageSize,
} = useEmployee()

const tableColumns = createAccountColumns({
  canUpdate: can('employees.update'),
  canDelete: can('employees.delete'),
  onToggleActive: async (employee, isActive) => {
    try {
      await toggleActive(employee.id, isActive)
      toast.success(
        `Status akun berhasil diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}`,
      )
      await fetchEmployees()
    } catch (e: unknown) {
      toast.error(
        getIndonesianErrorMessage(e, 'Gagal mengubah status akun guru'),
      )
    }
  },
  onDelete: async (employee, { closeAlert, setLoading }) => {
    setLoading(true)
    try {
      await deleteEmployee(employee.id)
      toast.success('Akun guru berhasil dihapus')
      await fetchEmployees()
      closeAlert()
    } catch (e: unknown) {
      toast.error(getIndonesianErrorMessage(e, 'Gagal menghapus akun guru'))
    } finally {
      setLoading(false)
    }
  },
})

const isFilterDialogOpen = ref(false)

const activeFiltersCount = computed(() => {
  let count = 0
  if (filters.value.categoryFilter !== 'all') count++
  if (filters.value.positionFilter !== 'all') count++
  if (filters.value.statusFilter !== 'all') count++
  return count
})

function resetAllFilters() {
  filters.value.categoryFilter = 'all'
  filters.value.positionFilter = 'all'
  filters.value.statusFilter = 'all'
  currentPage.value = 1
  void fetchEmployees()
}

function handleFilterChange(
  key: 'categoryFilter' | 'positionFilter' | 'statusFilter',
  value: unknown,
) {
  filters.value[key] = typeof value === 'string' ? value : 'all'
  currentPage.value = 1
  void fetchEmployees()
}
watchDebounced(
  () => filters.value.keyword,
  () => {
    currentPage.value = 1
    void fetchEmployees()
  },
  { debounce: 400 },
)

onMounted(() => {
  void fetchEmployees()
  void fetchPositions()
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
          <CardTitle size="lg"> Akun Pegawai </CardTitle>
        </div>
      </CardHeader>
      <CardContent
        variant="standard"
        class="w-full"
      >
        <div class="mb-6">
          <div class="hidden lg:flex lg:flex-row lg:items-center gap-3">
            <Select
              :model-value="filters.categoryFilter"
              @update:model-value="handleFilterChange('categoryFilter', $event)"
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
              :model-value="filters.positionFilter"
              @update:model-value="handleFilterChange('positionFilter', $event)"
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[150px] px-3! gap-2!"
              >
                <SelectValue placeholder="Semua Jabatan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all"> Semua Jabatan </SelectItem>
                <SelectItem
                  v-for="pos in positions"
                  :key="pos.id"
                  :value="pos.id"
                >
                  {{ pos.name }}
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

        <DataTable
          :columns="tableColumns"
          :data="employees"
          :is-loading="loading"
          :total-items="totalEmployees"
          :page="currentPage"
          :page-size="pageSize"
          item-label="akun guru"
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
      </CardContent>
    </Card>
  </div>

  <Dialog v-model:open="isFilterDialogOpen">
    <DialogContent class="sm:max-w-md flex flex-col gap-0 p-0 overflow-hidden">
      <DialogHeader class="px-6 py-5 border-b shrink-0 bg-muted/20">
        <DialogTitle>Filter Akun Pegawai</DialogTitle>
        <DialogDescription class="sr-only">
          Saring daftar akun guru berdasarkan kategori, jabatan, dan status.
        </DialogDescription>
      </DialogHeader>

      <div class="p-6 space-y-4">
        <FloatingLabelField
          label="Kategori"
          for="employee-account-filter-category"
          floating
        >
          <Select
            :model-value="filters.categoryFilter"
            @update:model-value="handleFilterChange('categoryFilter', $event)"
          >
            <SelectTrigger
              id="employee-account-filter-category"
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
          label="Jabatan"
          for="employee-account-filter-position"
          floating
        >
          <Select
            :model-value="filters.positionFilter"
            @update:model-value="handleFilterChange('positionFilter', $event)"
          >
            <SelectTrigger
              id="employee-account-filter-position"
              class="w-full"
            >
              <SelectValue placeholder="Semua Jabatan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"> Semua Jabatan </SelectItem>
              <SelectItem
                v-for="pos in positions"
                :key="pos.id"
                :value="pos.id"
              >
                {{ pos.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </FloatingLabelField>

        <FloatingLabelField
          label="Status"
          for="employee-account-filter-status"
          floating
        >
          <Select
            :model-value="filters.statusFilter"
            @update:model-value="handleFilterChange('statusFilter', $event)"
          >
            <SelectTrigger
              id="employee-account-filter-status"
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
</template>
