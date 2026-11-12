import { ApiProperty } from '@nestjs/swagger'
import {
  EXAM_CATEGORIES,
  EXAM_TYPES,
  type ExamCategory,
  type ExamType,
} from '../../../../exam-schedule/domain/entities/exam-schedule.entity.js'
import { categoryOf } from '../../../../exam-schedule/domain/policies/exam-category.policy.js'
import type { ExamPolicy } from '../../../domain/policies/exam-policy.policy.js'
import { ExamPolicyDto } from './exam-activity.dto.js'

export class ExamPolicyPresetDto {
  @ApiProperty({ enum: EXAM_TYPES }) type!: ExamType
  @ApiProperty({ enum: EXAM_CATEGORIES }) category!: ExamCategory
  @ApiProperty({ type: () => ExamPolicyDto }) policy!: ExamPolicyDto
  @ApiProperty({ format: 'date-time' }) updatedAt!: string

  static of(domain: {
    type: ExamType
    policy: ExamPolicy
    updatedAt: Date
  }): ExamPolicyPresetDto {
    const dto = new ExamPolicyPresetDto()
    dto.type = domain.type
    dto.category = categoryOf(domain.type)
    dto.policy = { ...domain.policy }
    dto.updatedAt = domain.updatedAt.toISOString()
    return dto
  }
}
