import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class RdmCandidatesQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teachingAssignmentId!: string
}
