import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { accountService } from '../services/accountService'

export function useAuthSession() {
  const store = useAuthStore()
  const { user } = storeToRefs(store)

  const isAuthenticated = computed(() => !!user.value)

  const roles = computed(() => user.value?.roles ?? [])
  const permissions = computed(() => user.value?.permissions ?? [])

  const hasPermission = (permission: string) =>
    permissions.value.includes(permission)

  const hasAnyPermission = (...perms: string[]) =>
    perms.some((p) => permissions.value.includes(p))

  return {
    user,
    roles,
    permissions,
    isAuthenticated,
    hasPermission,
    hasAnyPermission,
    logoutUser: authService.logoutUser,
    syncAuthenticatedUserProfile: authService.syncAuthenticatedUserProfile,
    changePassword: accountService.changePassword,
  }
}
