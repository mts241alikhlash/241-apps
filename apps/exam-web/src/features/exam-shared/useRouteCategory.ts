import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { sectionPrefixOf, type ExamCategory } from './examType'

export function useRouteCategory() {
  const route = useRoute()
  const category = computed<ExamCategory | undefined>(() =>
    route.meta?.category === 'EXAM' || route.meta?.category === 'NON_EXAM'
      ? route.meta.category
      : undefined,
  )
  const sectionPrefix = computed(() => sectionPrefixOf(category.value))
  return { category, sectionPrefix }
}
