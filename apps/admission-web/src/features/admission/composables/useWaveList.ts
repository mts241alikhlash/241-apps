import { computed, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { refDebounced } from '@vueuse/core'
import { admissionApi } from '../api/admissionApi'
import { waveService } from '../services/waveService'
import { useWaveStore } from '../stores/waveStore'
import { usePagedList } from './usePagedList'

export function useWaveList(
  search: Ref<string>,
  academicYearId: Ref<string>,
  isActive: Ref<string>,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const { academicYears, isSaving } = storeToRefs(useWaveStore())
  const debouncedSearch = refDebounced(search, 300)

  const list = usePagedList({
    page,
    pageSize,
    scope: ['admission', 'waves'],
    filters: { search: debouncedSearch, academicYearId, isActive },
    fetchPage: async (page, limit) =>
      (
        await admissionApi.getWaves({
          page,
          limit,
          search: debouncedSearch.value.trim() || undefined,
          academicYearId:
            academicYearId.value === 'ALL' ? undefined : academicYearId.value,
          isActive: isActive.value === 'ALL' ? undefined : isActive.value,
        })
      ).data,
    errorMessage: 'Gagal memuat gelombang.',
  })

  return {
    ...list,
    filtersPending: computed(
      () =>
        search.value !== debouncedSearch.value || list.isPlaceholderData.value,
    ),
    waves: list.items,
    academicYears,
    isSaving,
    fetchAcademicYears: waveService.fetchAcademicYears,
    saveWave: waveService.saveWave,
    deleteWave: waveService.deleteWave,
  }
}
