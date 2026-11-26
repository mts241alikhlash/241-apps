import { ApiProperty } from '@nestjs/swagger'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import { IsArray, IsEnum } from 'class-validator'

export class ReplaceRdmSettingDto {
  @ApiProperty({
    enum: AssessmentType,
    isArray: true,
    description: 'Assessment types mapped to RDM Sumatif sheets',
  })
  @IsArray()
  @IsEnum(AssessmentType, { each: true })
  sumatifTypes!: AssessmentType[]

  @ApiProperty({
    enum: AssessmentType,
    description: 'Assessment type mapped to the RDM SAS sheet',
  })
  @IsEnum(AssessmentType)
  sasType!: AssessmentType
}
