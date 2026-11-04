import { admissionApi } from '../api/admissionApi'
import { useApplicationStore } from '../stores/applicationStore'
import { useReferenceList } from '@/features/platform/reference-data'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

export const applicationService = {
  fetchWaves: async () => {
    const store = useApplicationStore()
    try {
      store.waves = await useReferenceList().read(
        'admissionWaves',
        async () => {
          const res = await admissionApi.getWaves({ limit: 100 })
          return res.data.data ?? []
        },
      )
    } catch (err) {
      notifyIfOutage(err)
      store.waves = []
    }
  },
}
