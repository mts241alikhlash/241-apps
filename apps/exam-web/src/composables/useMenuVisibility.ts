import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { useMenuVisibility as useSharedMenuVisibility } from '@mts241alikhlash/web-shared/composables/useMenuVisibility'
import { menuSections } from '@/config/menuConfig'

export function useMenuVisibility() {
  const { roles, permissions } = useAuthSession()
  return useSharedMenuVisibility(menuSections, {
    roles,
    permissions,
  })
}
