import { employeeService } from '../services/employeeService'
import { useEmployeeStore } from '../stores/employeeStore'
import { storeToRefs } from 'pinia'

export function useEmployee() {
  const store = useEmployeeStore()

  const {
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
  } = storeToRefs(store)

  const setPage = async (page: number) => {
    store.currentPage = page
    await employeeService.fetchEmployees()
  }

  const setPageSize = async (size: number) => {
    store.pageSize = size
    store.currentPage = 1
    await employeeService.fetchEmployees()
  }

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
    fetchEmployees: employeeService.fetchEmployees,
    fetchPositions: employeeService.fetchPositions,
    fetchPositionCategories: employeeService.fetchPositionCategories,
    saveEmployee: employeeService.saveEmployee,
    savePosition: employeeService.savePosition,
    deletePosition: employeeService.deletePosition,
    getPositionsList: employeeService.getPositionsList,
    deleteEmployee: employeeService.deleteEmployee,
    toggleActive: employeeService.toggleActive,
    changePassword: employeeService.changePassword,
    setPage,
    setPageSize,
  }
}
