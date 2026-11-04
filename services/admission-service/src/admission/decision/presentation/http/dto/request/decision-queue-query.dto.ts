import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator'
import { PaginationQueryDto } from '@mts241alikhlash/nest-core/dto'

export class DecisionQueueQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ['waiting', 'accepted', 'rejected'],
    default: 'waiting',
  })
  @IsOptional()
  @IsIn(['waiting', 'accepted', 'rejected'])
  tab?: 'waiting' | 'accepted' | 'rejected'

  @ApiPropertyOptional({
    description: 'Search by applicant name or registration number',
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  waveId?: string
}
