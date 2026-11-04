import type { JsonObject } from '../domain/index.js'

export interface CreateAuditLogInput {
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  metadata?: JsonObject
  ipAddress?: string | null
  userAgent?: string | null
}

export abstract class IAuditLogPort {
  abstract create(data: CreateAuditLogInput): Promise<void>
}
