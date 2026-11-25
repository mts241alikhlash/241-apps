import { ApiProperty } from '@nestjs/swagger'
import { IsIn, IsUUID } from 'class-validator'
import type { RdmKind } from '../../../../domain/rdm-rules.js'

export class DownloadRdmWorkbookQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  teachingAssignmentId!: string

  @ApiProperty({ enum: ['sumatif', 'sas'] })
  @IsIn(['sumatif', 'sas'])
  kind!: RdmKind
}
