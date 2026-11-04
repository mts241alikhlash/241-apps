import { computed } from 'vue'
import { useAuthSession } from '@mts241alikhlash/platform/auth'
import { effectivePermissions } from '@/app/providers/router/home-route'
import { useMenuVisibility as useSharedMenuVisibility } from '@mts241alikhlash/web-shared/composables/useMenuVisibility'
import { menuSections } from '@/config/menuConfig'

export function useMenuVisibility() {
  const { roles, permissions } = useAuthSession()
  return useSharedMenuVisibility(menuSections, {
    roles,
    permissions: computed(() => effectivePermissions(permissions.value)),
  })
}
