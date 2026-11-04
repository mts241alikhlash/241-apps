import { toast } from 'vue-sonner'
import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { inventoryApi } from '../api/inventoryApi'
import { inventoryReferenceService } from './inventoryReferenceService'
import type { InventoryReferenceItem } from '../types'

export type InventoryReferenceType =
  'categories' | 'conditions' | 'locations' | 'statuses' | 'funding-sources'

interface ReferenceLabels {
  noun: string
  Noun: string
}

const LABELS: Record<InventoryReferenceType, ReferenceLabels> = {
  categories: { noun: 'kategori aset', Noun: 'Kategori aset' },
  conditions: { noun: 'kondisi aset', Noun: 'Kondisi aset' },
  locations: { noun: 'lokasi', Noun: 'Lokasi' },
  statuses: { noun: 'status aset', Noun: 'Status aset' },
  'funding-sources': { noun: 'sumber dana', Noun: 'Sumber dana' },
}

export function inventoryReferenceCrud(type: InventoryReferenceType) {
  const { noun, Noun } = LABELS[type]

  return {
    list: async (search?: string): Promise<InventoryReferenceItem[]> => {
      try {
        const trimmed = search?.trim()
        const response = await inventoryApi.getReferences(
          type,
          trimmed === '' ? undefined : trimmed,
        )
        return response.data.data ?? []
      } catch (e) {
        toast.error(getIndonesianErrorMessage(e, `Gagal memuat data ${noun}.`))
        return []
      }
    },

    save: async (
      id: string | null,
      payload: Omit<InventoryReferenceItem, 'id'>,
    ): Promise<boolean> => {
      try {
        if (id) {
          await inventoryApi.updateReference(type, id, payload)
          toast.success(`Data ${noun} berhasil diperbarui.`)
        } else {
          await inventoryApi.createReference(type, payload)
          toast.success(`${Noun} baru berhasil ditambahkan.`)
        }
        inventoryReferenceService.invalidate()
        return true
      } catch (e) {
        toast.error(
          getIndonesianErrorMessage(e, `Gagal menyimpan data ${noun}.`),
        )
        return false
      }
    },

    remove: async (id: string): Promise<boolean> => {
      try {
        await inventoryApi.deleteReference(type, id)
        toast.success(`Data ${noun} berhasil dihapus.`)
        inventoryReferenceService.invalidate()
        return true
      } catch (e) {
        toast.error(
          getIndonesianErrorMessage(e, `Gagal menghapus data ${noun}.`),
        )
        return false
      }
    },
  }
}
