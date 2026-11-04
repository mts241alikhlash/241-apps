import api from '@mts241alikhlash/web-shared/utils/api'
import type { ApiEnvelope } from '@mts241alikhlash/web-shared/types/api'
import type { SsoApp } from '../types'

export const ssoApi = {
  apps: () => api.get<ApiEnvelope<SsoApp[]>>('/sso/apps'),
}
