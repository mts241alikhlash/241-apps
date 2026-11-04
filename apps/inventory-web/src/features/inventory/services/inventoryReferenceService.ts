import { inventoryApi } from '../api/inventoryApi'
import { useReferenceList } from '@/features/platform/reference-data'
import type { InventoryMetadata } from '../types'

export const inventoryReferenceService = {
  fetchMetadata: async (): Promise<InventoryMetadata | null> => {
    return useReferenceList().read('inventoryMetadata', async () => {
      const response = await inventoryApi.getInventoryMetadata()
      return response.data?.data ?? null
    })
  },

  invalidate: () => {
    useReferenceList().invalidate('inventoryMetadata')
  },
}
