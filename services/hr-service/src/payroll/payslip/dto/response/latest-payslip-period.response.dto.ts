import { ApiProperty } from '@nestjs/swagger'

export class LatestPayslipPeriodResponseDto {
  @ApiProperty({ type: Number })
  year!: number

  @ApiProperty({ type: Number })
  month!: number

  static fromDomain(
    domain: { year: number; month: number } | null,
  ): LatestPayslipPeriodResponseDto | null {
    if (!domain) return null
    const dto = new LatestPayslipPeriodResponseDto()
    dto.year = domain.year
    dto.month = domain.month
    return dto
  }
}
