import { ApiProperty } from '@nestjs/swagger'
import { Equals } from 'class-validator'
import type {
  ResetEventCredentialsItem,
  ResetEventCredentialsResult,
} from '../../../application/use-cases/reset-event-credentials/reset-event-credentials.use-case.js'

export class ResetCredentialsBodyDto {
  @ApiProperty({
    enum: [true],
    description: 'Must be true: the old passwords stop working at once',
  })
  @Equals(true)
  confirm!: true
}

export class ResetCredentialsItemDto {
  @ApiProperty({ format: 'uuid' }) studentId!: string
  @ApiProperty() identifier!: string
  @ApiProperty({ description: 'Shown once; never stored' })
  password!: string

  static fromDomain(
    domain: ResetEventCredentialsItem,
  ): ResetCredentialsItemDto {
    const dto = new ResetCredentialsItemDto()
    dto.studentId = domain.studentId
    dto.identifier = domain.identifier
    dto.password = domain.password
    return dto
  }
}

export class ResetCredentialsDto {
  @ApiProperty({ type: () => [ResetCredentialsItemDto] })
  items!: ResetCredentialsItemDto[]

  @ApiProperty({ type: [String], format: 'uuid' })
  skipped!: string[]

  static fromDomain(domain: ResetEventCredentialsResult): ResetCredentialsDto {
    const dto = new ResetCredentialsDto()
    dto.items = domain.items.map((item) =>
      ResetCredentialsItemDto.fromDomain(item),
    )
    dto.skipped = domain.skipped
    return dto
  }
}
