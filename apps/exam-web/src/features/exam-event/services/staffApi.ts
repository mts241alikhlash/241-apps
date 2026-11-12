import { unwrapPage } from '@mts241alikhlash/web-shared/utils/service-client'
import { identityClient } from '@/shared/api/clients'

export const staffApi = {
  getUsers: (query?: { roleCode?: string; search?: string; limit?: number }) =>
    unwrapPage(identityClient.GET('/users', { params: { query } })),
}
