<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { DataTable, SearchInput } from '@mts241alikhlash/ui'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mts241alikhlash/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mts241alikhlash/ui/select'
import { getColumns } from '../components/columns'
import { useUserRole } from '../composables/useUserRole'
import { userRoleApi } from '../api/userRoleApi'
import { watchDebounced } from '@vueuse/core'

import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'

const {
  users,
  isLoading,
  paginationMeta,
  currentFilters,
  fetchTableData,
  handleUpdateFilters,
} = useUserRole()

const allRoles = ref<{ id: string; code: string; name: string }[]>([])
const columns = computed(() => getColumns(allRoles.value))

const searchKeyword = ref(currentFilters.value.search ?? '')

watchDebounced(
  searchKeyword,
  (val) => {
    handleUpdateFilters({
      ...currentFilters.value,
      search: val.trim() || undefined,
      page: 1,
    })
  },
  { debounce: 500 },
)

onMounted(async () => {
  void fetchTableData()
  try {
    const res = await userRoleApi.getRoles()
    allRoles.value = res.data?.data ?? []
  } catch (err) {
    toast.error(getIndonesianErrorMessage(err, 'Gagal memuat data role.'))
  }
})

const handlePageChange = (page: number) => {
  handleUpdateFilters({ ...currentFilters.value, page })
}

const handlePageSizeChange = (limit: number) => {
  handleUpdateFilters({ ...currentFilters.value, limit, page: 1 })
}

const handleRoleFilterChange = (val: string) => {
  const roleCode = val === 'ALL' ? undefined : val
  handleUpdateFilters({ ...currentFilters.value, roleCode, page: 1 })
}
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
          <CardTitle size="lg"> Kelola Pengguna </CardTitle>
        </div>
      </CardHeader>

      <CardContent class="space-y-6 p-0 sm:px-0">
        <div class="flex flex-col gap-4">
          <div class="hidden lg:flex lg:flex-row lg:items-center gap-3">
            <Select
              :model-value="currentFilters.roleCode ?? 'ALL'"
              @update:model-value="
                (val) => handleRoleFilterChange(val as string)
              "
            >
              <SelectTrigger
                class="w-full lg:w-fit lg:min-w-[150px] px-3! gap-2!"
              >
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL"> Semua Role </SelectItem>
                <SelectItem
                  v-for="role in allRoles"
                  :key="role.id"
                  :value="role.code"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex flex-col lg:hidden gap-3">
            <Select
              :model-value="currentFilters.roleCode ?? 'ALL'"
              @update:model-value="
                (val) => handleRoleFilterChange(val as string)
              "
            >
              <SelectTrigger class="w-fit min-w-[150px] px-3! gap-2!">
                <SelectValue placeholder="Semua Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL"> Semua Role </SelectItem>
                <SelectItem
                  v-for="role in allRoles"
                  :key="role.id"
                  :value="role.code"
                >
                  {{ role.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          :columns="columns"
          :data="users"
          :is-loading="isLoading"
          :total-items="paginationMeta.total"
          :page="paginationMeta.page"
          item-label="pengguna"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        >
          <template #header-right>
            <SearchInput
              v-model="searchKeyword"
              label="Cari pengguna"
            />
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </div>
</template>
