import { useAuthSession } from '../auth'
import { computed } from 'vue'
import type { MenuSection } from '@mts241alikhlash/web-shared/types/menu.types'
import { useMenuVisibility as useSharedMenuVisibility } from '@mts241alikhlash/web-shared/composables/useMenuVisibility'

export function useMenuVisibility(
  menuSections: MenuSection[],
  permissionsFor: (codes: string[]) => string[] = (codes) => codes,
) {
  const { roles, permissions } = useAuthSession()
  return useSharedMenuVisibility(menuSections, {
    roles,
    permissions: computed(() => permissionsFor(permissions.value)),
  })
}
