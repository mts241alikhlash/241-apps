import { computed, type Ref } from 'vue'
import { refDebounced } from '@vueuse/core'
import { usePagedList } from '@/features/exam-bank/composables/usePagedList'
import { examPackageApi } from '../api/examPackageApi'
import type { ExamPackageStatus } from '../types'

export interface PackageFilters {
  search: Ref<string>
  subjectId: Ref<string>
  gradeId: Ref<string>
  status: Ref<string>
}

const unless = (value: string) => (value === 'ALL' ? undefined : value)

export function usePackageList(
  filters: PackageFilters,
  page: Ref<number>,
  pageSize: Ref<number>,
) {
  const debouncedSearch = refDebounced(filters.search, 300)

  const list = usePagedList({
    page,
    pageSize,
    scope: ['exam-package', 'packages'],
    filters: {
      search: debouncedSearch,
      subjectId: filters.subjectId,
      gradeId: filters.gradeId,
      status: filters.status,
    },
    fetchPage: async (current, limit) =>
      (
        await examPackageApi.getPackages({
          page: current,
          limit,
          search: debouncedSearch.value.trim() || undefined,
          subjectId: unless(filters.subjectId.value),
          gradeId: unless(filters.gradeId.value),
          status: unless(filters.status.value) as ExamPackageStatus | undefined,
        })
      ).data,
    errorMessage: 'Gagal memuat daftar paket.',
  })

  return {
    ...list,
    filtersPending: computed(
      () =>
        filters.search.value !== debouncedSearch.value ||
        list.isPlaceholderData.value,
    ),
    packages: list.items,
  }
}
