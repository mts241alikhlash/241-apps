import { JsonObject } from '@mts241alikhlash/nest-core/domain'

export interface CreateAuditLogInput {
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  metadata?: JsonObject
  ipAddress?: string | null
  userAgent?: string | null
}
