import type { AddressEntity } from '../../../../../shared/domain/entities/address.entity.js'
import { ApiProperty } from '@nestjs/swagger'
import type { SchoolUnitWithDetails } from '../../../../domain/entities/school-unit.entity.js'

function formatAddress(address: AddressEntity | undefined): string {
  if (address === undefined) return ''
  return [
    address.street === '' ? '' : `Jl. ${address.street}`,
    address.rt === '' || address.rw === ''
      ? ''
      : `RT ${address.rt}/RW ${address.rw}`,
    address.village,
    address.district,
    address.city,
    address.province,
    address.postalCode,
  ]
    .filter((part) => part.trim() !== '')
    .join(', ')
}

export class SchoolUnitLetterheadResponseDto {
  @ApiProperty({ example: 'MTs Negeri 1' })
  name!: string

  @ApiProperty({ example: 'Jl. Pendidikan No. 1, Sukamaju, Cibadak' })
  address!: string

  @ApiProperty({ type: String, nullable: true, example: '121233456789' })
  nsm!: string | null

  @ApiProperty({ type: String, nullable: true, example: '20212345' })
  npsn!: string | null

  static fromDomain(
    domain: SchoolUnitWithDetails,
  ): SchoolUnitLetterheadResponseDto {
    const dto = new SchoolUnitLetterheadResponseDto()
    const addresses = domain.addresses ?? []
    const primary =
      addresses.find((address) => address.isPrimary) ?? addresses[0]
    dto.name = domain.name
    dto.address = formatAddress(primary)
    dto.nsm = domain.nsm ?? null
    dto.npsn = domain.npsn ?? null
    return dto
  }
}
