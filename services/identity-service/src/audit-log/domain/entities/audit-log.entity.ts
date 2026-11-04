import { JsonValue } from '@mts241alikhlash/nest-core/domain'
export interface AuditLogEntity {
  id: string
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  metadata?: JsonValue | null
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: Date
}
