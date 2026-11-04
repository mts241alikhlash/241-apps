import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { inventoryApi } from '../api/inventoryApi'
import type { InventoryHistory, InventoryLoan } from '../types'

export const loanService = {
  list: async (): Promise<InventoryLoan[]> => {
    const response = await inventoryApi.getLoans()
    return response.data?.data ?? []
  },

  listHistories: async (): Promise<InventoryHistory[]> => {
    const response = await inventoryApi.getHistories({ limit: 100, page: 1 })
    return response.data?.data ?? []
  },

  create: async (payload: {
    purpose: string
    expectedReturnDate: string
    unitIds: string[]
  }): Promise<boolean> => {
    try {
      await inventoryApi.createLoan(payload)
      toast.success('Pengajuan peminjaman berhasil dikirim.')
      return true
    } catch (error) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal mengajukan peminjaman.'),
      )
      return false
    }
  },

  returnLoan: async (
    id: string,
    payload: Parameters<typeof inventoryApi.returnLoan>[1],
  ): Promise<boolean> => {
    try {
      await inventoryApi.returnLoan(id, payload)
      toast.success('Pengembalian aset berhasil diproses.')
      return true
    } catch (error) {
      toast.error(
        getIndonesianErrorMessage(error, 'Gagal memproses pengembalian.'),
      )
      return false
    }
  },
}
