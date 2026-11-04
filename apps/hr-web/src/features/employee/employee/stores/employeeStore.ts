import type { Employee, PositionListItem } from '../types'
import type { PositionCategory } from '../../position-category/types'
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<Employee[]>([])
  const positions = ref<PositionListItem[]>([])
  const positionCategories = ref<PositionCategory[]>([])
  const totalEmployees = ref(0)

  const currentPage = ref(1)
  const pageSize = ref(10)

  const filters = ref({
    keyword: '',
    positionCategoryId: '',
    statusFilter: 'all',
    categoryFilter: 'all',
    positionFilter: 'all',
  })

  const loading = ref(false)
  const isSaving = ref(false)
  const isSavingPosition = ref(false)
  const formError = ref<string | null>(null)

  const filteredEmployees = computed(() => {
    return employees.value.filter((t) => {
      const kw = filters.value.keyword.toLowerCase()
      const matchKeyword =
        !kw ||
        (t.user?.profile?.name.toLowerCase().includes(kw) ?? false) ||
        (t.nip?.toLowerCase().includes(kw) ?? false)

      const matchStatus =
        filters.value.statusFilter === 'all' ||
        (filters.value.statusFilter === 'active' &&
          t.user?.isActive === true) ||
        (filters.value.statusFilter === 'inactive' &&
          t.user?.isActive === false)

      const matchCategory =
        filters.value.categoryFilter === 'all' ||
        t.positions?.some(
          (tp) => tp.position?.category?.id === filters.value.categoryFilter,
        )

      const matchPosition =
        filters.value.positionFilter === 'all' ||
        t.positions?.some(
          (tp) => tp.position?.id === filters.value.positionFilter,
        )

      return matchKeyword && matchStatus && matchCategory && matchPosition
    })
  })

  return {
    employees,
    positions,
    positionCategories,
    totalEmployees,
    currentPage,
    pageSize,
    filters,
    filteredEmployees,
    loading,
    isSaving,
    isSavingPosition,
    formError,
  }
})
