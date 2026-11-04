import { onMounted, ref } from 'vue'
import api from '@mts241alikhlash/web-shared/utils/api'
import { PAGINATION } from '@mts241alikhlash/web-shared/constants/pagination'
import type { EmploymentTypeOption } from '../types'
import { notifyIfOutage } from '@mts241alikhlash/web-shared/utils/notify-outage'

export function useEmploymentTypeOptions() {
  const employmentTypes = ref<EmploymentTypeOption[]>([])

  async function fetchEmploymentTypes() {
    try {
      const res = await api.get<{ data: EmploymentTypeOption[] }>(
        '/employment-types',
        { params: { limit: PAGINATION.REFERENCE_LIMIT } },
      )
      employmentTypes.value = res.data.data ?? []
    } catch (err) {
      notifyIfOutage(err)
    }
  }

  onMounted(fetchEmploymentTypes)

  return { employmentTypes, fetchEmploymentTypes }
}
