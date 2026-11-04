import { ApiProperty } from '@nestjs/swagger'
import type { AbsenteeRow } from '../../../../application/use-cases/list-absentees/list-absentees.use-case.js'
import {
  MAKEUP_REASONS,
  type MakeupReason,
} from '../../../../domain/entities/exam-schedule.entity.js'

export const MAKEUP_REFUSALS = [
  'ALREADY_SAT',
  'IN_PROGRESS',
  'ON_LIVE_MAKEUP',
] as const

export class AbsenteeDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty({ type: String, nullable: true }) name!: string | null
  @ApiProperty({ type: String, nullable: true }) nis!: string | null
  @ApiProperty() eligible!: boolean
  @ApiProperty({ enum: MAKEUP_REFUSALS, nullable: true })
  reason!: (typeof MAKEUP_REFUSALS)[number] | null
  @ApiProperty({ enum: MAKEUP_REASONS, nullable: true })
  reportedReason!: MakeupReason | null
  @ApiProperty({ type: String, nullable: true }) reportedNote!: string | null

  static fromDomain(domain: AbsenteeRow): AbsenteeDto {
    const dto = new AbsenteeDto()
    dto.studentId = domain.studentId
    dto.name = domain.name
    dto.nis = domain.nis
    dto.eligible = domain.eligibility.eligible
    dto.reason = domain.eligibility.eligible ? null : domain.eligibility.reason
    dto.reportedReason = domain.reportedReason
    dto.reportedNote = domain.reportedNote
    return dto
  }
}
