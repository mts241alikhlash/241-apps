import { getIndonesianErrorMessage } from '@mts241alikhlash/web-shared/utils/error-handler'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'
import { toast } from 'vue-sonner'
import { referenceListApi } from './referenceListApi'
import type {
  ReferenceList,
  ReferenceListItem,
  ReferenceListPayload,
} from './lists'

export const referenceListService = {
  async list(list: ReferenceList): Promise<ReferenceListItem[]> {
    try {
      const res = await referenceListApi.list(list, {
        limit: PAGINATION.REFERENCE_LIMIT,
      })
      return res.data.data
    } catch (error: unknown) {
      notifyIfOutage(error)
      return []
    }
  },

  async create(list: ReferenceList, payload: ReferenceListPayload) {
    try {
      await referenceListApi.create(list, payload)
      toast.success(`${list.singular} berhasil ditambahkan`)
      return true
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(
          error,
          `Gagal menambahkan ${list.singular.toLowerCase()}`,
        ),
      )
      return false
    }
  },

  async update(list: ReferenceList, id: string, payload: ReferenceListPayload) {
    try {
      await referenceListApi.update(list, id, payload)
      toast.success(`${list.singular} berhasil diperbarui`)
      return true
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(
          error,
          `Gagal memperbarui ${list.singular.toLowerCase()}`,
        ),
      )
      return false
    }
  },

  async remove(
    list: ReferenceList,
    id: string,
    callbacks?: {
      closeAlert: () => void
      setLoading: (state: boolean) => void
    },
  ) {
    callbacks?.setLoading(true)
    try {
      await referenceListApi.remove(list, id)
      toast.success(`${list.singular} berhasil dihapus`)
      callbacks?.closeAlert()
      return true
    } catch (error: unknown) {
      toast.error(
        getIndonesianErrorMessage(
          error,
          `Gagal menghapus ${list.singular.toLowerCase()}`,
        ),
      )
      return false
    } finally {
      callbacks?.setLoading(false)
    }
  },
}
