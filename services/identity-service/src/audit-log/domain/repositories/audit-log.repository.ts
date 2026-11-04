import { JsonObject } from '@mts241alikhlash/nest-core/domain'
import {
  PaginatedResult,
  PaginationQueryInput,
} from '@mts241alikhlash/nest-core/domain'
import { AuditLogEntity } from '../entities/audit-log.entity.js'

export interface AuditLogQueryInput extends PaginationQueryInput {
  search?: string
  userId?: string
  action?: string
  resource?: string
}

export interface CreateAuditLogRepositoryInput {
  userId?: string | null
  action: string
  resource: string
  resourceId?: string | null
  metadata?: JsonObject
  ipAddress?: string | null
  userAgent?: string | null
}

export interface AuditLogSummary {
  total: number
  since: number
}

export abstract class IAuditLogRepository {
  abstract summarize(since: Date): Promise<AuditLogSummary>
  abstract findAll(
    query: AuditLogQueryInput,
  ): Promise<PaginatedResult<AuditLogEntity>>

  abstract create(data: CreateAuditLogRepositoryInput): Promise<AuditLogEntity>
}
