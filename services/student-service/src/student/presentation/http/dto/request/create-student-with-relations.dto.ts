import { ApiPropertyOptional } from '@nestjs/swagger'
import { ParentRelation } from '@mts241alikhlash/nest-core/domain'
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CreateStudentDto } from './create-student.dto.js'
import { CreateAddressDto } from '@mts241alikhlash/nest-core/dto'
import { CreateParentDto } from '../../../../../parent/presentation/http/dto/request/create-parent.dto.js'

export class ParentWithRelationDto extends CreateParentDto {
  @ApiPropertyOptional({ enum: ParentRelation, example: 'FATHER' })
  @IsEnum(ParentRelation)
  relation: ParentRelation = ParentRelation.FATHER

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

export class CreateStudentWithRelationsDto extends CreateStudentDto {
  @ApiPropertyOptional({ type: CreateAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto

  @ApiPropertyOptional({ type: [ParentWithRelationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParentWithRelationDto)
  parents?: ParentWithRelationDto[]
}
