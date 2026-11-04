import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import type { SubmitResult } from '../../../application/use-cases/submit-exam-session/submit-exam-session.use-case.js'
import { SaveAnswerItemDto } from './save-answers-batch.dto.js'

export class SubmitSessionRequestDto {
  @ApiPropertyOptional({
    description:
      'Times the app saw the student leave the exam; four or more is what made the app hand the exam in',
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  violations?: number

  @ApiPropertyOptional({
    description:
      'How many questions the tablet believes it answered; a shortfall keeps the session open',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedAnswerCount?: number

  @ApiPropertyOptional({
    type: [SaveAnswerItemDto],
    description: 'Answers the tablet could not confirm before handing in',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(250)
  @ValidateNested({ each: true })
  @Type(() => SaveAnswerItemDto)
  pendingAnswers?: SaveAnswerItemDto[]
}

export class SubmitSessionResponseDto {
  @ApiProperty({ enum: ['SUBMITTED', 'EXPIRED', 'GRADED'] }) status!: string
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  submittedAt!: string | null
  @ApiProperty() confirmedAnswerCount!: number
  @ApiProperty({
    description:
      'False when the session was already closed, so the carried answers were not stored',
  })
  answersStored!: boolean
  @ApiProperty({ format: 'date-time' }) serverTime!: string

  static fromDomain(domain: SubmitResult): SubmitSessionResponseDto {
    const dto = new SubmitSessionResponseDto()
    dto.status = domain.status
    dto.submittedAt = domain.submittedAt?.toISOString() ?? null
    dto.confirmedAnswerCount = domain.confirmedAnswerCount
    dto.answersStored = domain.answersStored
    dto.serverTime = domain.serverTime.toISOString()
    return dto
  }
}
