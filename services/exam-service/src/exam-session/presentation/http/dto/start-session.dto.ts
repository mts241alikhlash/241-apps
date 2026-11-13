import { ExamPolicyDto } from '../../../../exam-activity/presentation/http/dto/exam-activity.dto.js'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { SebProofDto } from '../../../../seb/presentation/http/dto/seb-config.dto.js'
import type { StartedSession } from '../../../application/use-cases/start-exam-session/start-exam-session.use-case.js'

export class StartSessionDto {
  @ApiProperty({ example: 'K7M2QX' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  accessCode!: string

  @ApiProperty({ description: 'Identifier of the tablet starting the exam' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  deviceId!: string

  @ApiPropertyOptional({ type: SebProofDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SebProofDto)
  seb?: SebProofDto
}

export class StartedSessionDto {
  @ApiProperty({ format: 'uuid' }) sessionId!: string
  @ApiProperty({ description: 'End of the working time, epoch milliseconds' })
  deadline!: number
  @ApiProperty({ description: 'Server clock, epoch milliseconds' })
  serverTime!: number

  @ApiProperty({ type: ExamPolicyDto })
  policy!: ExamPolicyDto

  static fromDomain(domain: StartedSession): StartedSessionDto {
    const dto = new StartedSessionDto()
    dto.sessionId = domain.sessionId
    dto.deadline = domain.deadline.getTime()
    dto.serverTime = domain.serverTime.getTime()
    dto.policy = { ...domain.policy }
    return dto
  }
}
