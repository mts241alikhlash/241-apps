import { ApiProperty } from '@nestjs/swagger'
import { AssessmentType } from '@mts241alikhlash/nest-core/domain'
import type {
  GetRdmCandidatesResult,
  RdmCandidateItem,
} from '../../../../application/rdm.types.js'

export class RdmCandidateItemDto {
  @ApiProperty({ type: String })
  id!: string

  @ApiProperty({ type: String })
  name!: string

  @ApiProperty({ enum: AssessmentType })
  type!: `${AssessmentType}`

  @ApiProperty({ type: Number })
  maxScore!: number

  @ApiProperty({ type: String, nullable: true })
  material!: string | null

  @ApiProperty({ type: Number, nullable: true })
  kktp!: number | null

  static fromDomain(domain: RdmCandidateItem): RdmCandidateItemDto {
    const dto = new RdmCandidateItemDto()
    dto.id = domain.id
    dto.name = domain.name
    dto.type = domain.type
    dto.maxScore = domain.maxScore
    dto.material = domain.material
    dto.kktp = domain.kktp
    return dto
  }
}

export class RdmCandidatesResponseDto {
  @ApiProperty({ type: () => [RdmCandidateItemDto] })
  sumatif!: RdmCandidateItemDto[]

  @ApiProperty({ type: () => [RdmCandidateItemDto] })
  sas!: RdmCandidateItemDto[]

  static fromDomain(domain: GetRdmCandidatesResult): RdmCandidatesResponseDto {
    const dto = new RdmCandidatesResponseDto()
    dto.sumatif = domain.sumatif.map((item) =>
      RdmCandidateItemDto.fromDomain(item),
    )
    dto.sas = domain.sas.map((item) => RdmCandidateItemDto.fromDomain(item))
    return dto
  }
}
