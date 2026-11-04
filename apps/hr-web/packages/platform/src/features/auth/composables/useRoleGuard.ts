import { useAuthStore } from '../stores/authStore'
import { computed } from 'vue'

export function useRoleGuard() {
  const authStore = useAuthStore()
  const userPermissions = computed(() => authStore.user?.permissions ?? [])

  function can(...permissions: string[]): boolean {
    return permissions.some((p) => userPermissions.value.includes(p))
  }

  return { userPermissions, can }
}
