import { ApiProperty } from '@nestjs/swagger'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import type { RdmSettingEntity } from '../../../../domain/rdm-setting.js'

export class RdmSettingResponseDto {
  @ApiProperty({
    enum: AssessmentType,
    isArray: true,
  })
  sumatifTypes!: AssessmentType[]

  @ApiProperty({
    enum: AssessmentType,
  })
  sasType!: AssessmentType

  static fromDomain(domain: RdmSettingEntity): RdmSettingResponseDto {
    const dto = new RdmSettingResponseDto()
    dto.sumatifTypes = [...domain.sumatifTypes]
    dto.sasType = domain.sasType
    return dto
  }
}
