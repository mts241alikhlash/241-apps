import { ApiProperty } from '@nestjs/swagger'
import { IsUUID } from 'class-validator'

export class ImportRdmWorkbookDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teachingAssignmentId!: string
}
