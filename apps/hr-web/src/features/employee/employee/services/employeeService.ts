import { employeeApi } from '../api/employeeApi'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { addressApi } from '@/features/platform/address'
import { useEmployeeStore } from '../stores/employeeStore'
import { positionCategoryApi } from '../../position-category/api/positionCategoryApi'
import type {
  EmployeeQueryParams,
  EmployeeExportParams,
  EmployeeSavePayload,
  EmployeeUpdatePayload,
  EmployeePositionSavePayload,
  EmployeePositionUpdatePayload,
  CreateEmployeeWithRelationsInput,
  CreateEmployeeWithRelationsResult,
  ResolveBulkImportConflict,
} from '../types'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { toast } from 'vue-sonner'
import { useReferenceList } from '@/features/platform/reference-data'

export const employeeService = {
  fetchEmployees: async () => {
    const store = useEmployeeStore()
    store.loading = true
    try {
      const params: EmployeeQueryParams = {
        page: store.currentPage,
        limit: store.pageSize,
      }
      if (store.filters.keyword.trim())
        params.search = store.filters.keyword.trim()
      const categoryId =
        store.filters.positionCategoryId ||
        (store.filters.categoryFilter !== 'all'
          ? store.filters.categoryFilter
          : '')
      if (categoryId) params.positionCategoryId = categoryId
      const statusFilter = store.filters.statusFilter
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active'

      const res = await employeeApi.getEmployees(params)
      store.employees = res.data.data
      store.totalEmployees = res.data.meta?.total ?? res.data.data.length
    } catch (error: unknown) {
      toast.error(getIndonesianErrorMessage(error, 'Gagal memuat data guru.'))
    } finally {
      store.loading = false
    }
  },

  fetchPositions: async () => {
    const store = useEmployeeStore()
    try {
      store.positions = await useReferenceList().read('positions', async () => {
        const res = await employeeApi.getPositions({
          limit: PAGINATION.REFERENCE_LIMIT,
          isActive: true,
        })
        return res.data.data
      })
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data jabatan.'),
      )
    }
  },

  fetchPositionCategories: async () => {
    const store = useEmployeeStore()
    try {
      store.positionCategories = await useReferenceList().read(
        'positionCategories',
        async () => {
          const res = await positionCategoryApi.getPositionCategories({
            limit: PAGINATION.REFERENCE_LIMIT,
          })
          return res.data.data
        },
      )
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat kategori jabatan.'),
      )
    }
  },

  saveEmployee: async (
    id: string | null,
    payload: EmployeeSavePayload | EmployeeUpdatePayload,
  ) => {
    const store = useEmployeeStore()
    store.isSaving = true
    store.formError = null
    try {
      if (id) {
        await employeeApi.updateEmployee(id, payload)
      } else {
        await employeeApi.createEmployee(payload as EmployeeSavePayload)
      }
      useReferenceList().invalidate('employees')
      return { success: true }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan data guru.',
      )
      return { success: false, error: store.formError }
    } finally {
      store.isSaving = false
    }
  },

  createEmployeeWithRelations: async (
    input: CreateEmployeeWithRelationsInput,
  ): Promise<CreateEmployeeWithRelationsResult> => {
    const store = useEmployeeStore()
    store.isSaving = true
    store.formError = null
    const warnings: string[] = []
    try {
      const res = await employeeApi.createEmployee(input.core)
      const employee = res.data.data
      const employeeId = employee.id
      const userId = employee.user?.id

      if (input.address && userId) {
        try {
          await addressApi.createAddressForUser(userId, input.address)
        } catch (error: unknown) {
          warnings.push(
            getIndonesianErrorMessage(error, 'Alamat gagal disimpan.'),
          )
        }
      }

      for (const position of input.positions ?? []) {
        try {
          await employeeApi.createPosition(employeeId, {
            positionId: position.positionId,
            hireDate: position.hireDate,
            isPrimary: position.isPrimary,
          })
        } catch (error: unknown) {
          warnings.push(
            getIndonesianErrorMessage(
              error,
              'Sebagian jabatan gagal disimpan.',
            ),
          )
        }
      }

      useReferenceList().invalidate('employees')
      return { success: true, employeeId, userId, warnings }
    } catch (error: unknown) {
      store.formError = getIndonesianErrorMessage(
        error,
        'Gagal menyimpan data guru.',
      )
      return { success: false, warnings }
    } finally {
      store.isSaving = false
    }
  },

  deleteEmployee: async (id: string) => {
    const result = await employeeApi.deleteEmployee(id)
    useReferenceList().invalidate('employees')
    return result
  },

  toggleActive: async (id: string, isActive: boolean) => {
    const result = await employeeApi.toggleActive(id, isActive)
    useReferenceList().invalidate('employees')
    return result
  },

  exportEmployees: async () => {
    const store = useEmployeeStore()
    const params: EmployeeExportParams = {}
    if (store.filters.keyword.trim())
      params.search = store.filters.keyword.trim()
    return employeeApi.exportEmployees(params)
  },

  getImportTemplate: async () => {
    return employeeApi.getImportTemplate()
  },

  bulkImport: async (file: File) => {
    const result = await employeeApi.bulkImport(file)
    useReferenceList().invalidate('employees')
    return result
  },

  resolveBulkImportConflicts: async (
    conflicts: ResolveBulkImportConflict[],
  ) => {
    const result = await employeeApi.resolveBulkImportConflicts(conflicts)
    useReferenceList().invalidate('employees')
    return result
  },

  savePosition: async (
    employeeId: string,
    payload: EmployeePositionSavePayload | EmployeePositionUpdatePayload,
    editingItem?: { id: string },
  ) => {
    const store = useEmployeeStore()
    store.isSavingPosition = true
    try {
      if (editingItem) {
        await employeeApi.updatePosition(employeeId, editingItem.id, payload)
        toast.success('Jabatan berhasil diperbarui')
      } else {
        await employeeApi.createPosition(
          employeeId,
          payload as EmployeePositionSavePayload,
        )
        toast.success('Jabatan berhasil ditambahkan')
      }
      useReferenceList().invalidate('employees')
      return { success: true }
    } catch (error: unknown) {
      toast.error('Gagal menyimpan jabatan', {
        description: getIndonesianErrorMessage(error, 'Terjadi kesalahan.'),
      })
      return { success: false }
    } finally {
      store.isSavingPosition = false
    }
  },

  deletePosition: async (employeeId: string, positionId: string) => {
    try {
      await employeeApi.deletePosition(employeeId, positionId)
      toast.success('Riwayat jabatan berhasil dihapus')
      useReferenceList().invalidate('employees')
      return { success: true }
    } catch (error: unknown) {
      toast.error('Gagal menghapus jabatan', {
        description: getIndonesianErrorMessage(error, 'Terjadi kesalahan.'),
      })
      return { success: false }
    }
  },

  getPositionsList: async () => {
    try {
      const res = await employeeApi.getPositions({
        limit: PAGINATION.REFERENCE_LIMIT,
        isActive: true,
      })
      const raw = res.data?.data ?? []
      return Array.isArray(raw) ? raw : []
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memuat data jabatan.'),
      )
      return []
    }
  },

  changePassword: async (payload: { userId: string; password: string }) => {
    const { accountService } = await import('@/features/platform/auth')
    return accountService.changePassword(payload.userId, {
      password: payload.password,
    })
  },
}
