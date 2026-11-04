import { describe, it, expect } from 'vitest'
import { useAddressSubform } from './useAddressSubform'

describe('useAddressSubform', () => {
  it('defaults to no address (street empty)', () => {
    const { hasAddress } = useAddressSubform()
    expect(hasAddress.value).toBe(false)
  })

  it('defaults country to Indonesia', () => {
    const { address } = useAddressSubform()
    expect(address.value.country).toBe('Indonesia')
  })

  it('treats a whitespace-only street as no address', () => {
    const { address, hasAddress } = useAddressSubform()
    address.value.street = '   '
    expect(hasAddress.value).toBe(false)
  })

  it('considers an address present once street is filled', () => {
    const { address, hasAddress } = useAddressSubform()
    address.value.street = 'Jl. Merdeka'
    expect(hasAddress.value).toBe(true)
  })

  it('validateAddress passes when no address is entered', () => {
    const { validateAddress } = useAddressSubform()
    expect(validateAddress()).toBe(true)
  })

  it('validateAddress fails when address is entered but required fields are missing', () => {
    const { address, validateAddress } = useAddressSubform()
    address.value.street = 'Jl. Merdeka'
    expect(validateAddress()).toBe(false)
  })

  it('defaults every region code to empty', () => {
    const { address } = useAddressSubform()
    expect(address.value.provinceCode).toBe('')
    expect(address.value.regencyCode).toBe('')
    expect(address.value.districtCode).toBe('')
    expect(address.value.villageCode).toBe('')
  })

  it('validateAddress passes once the four region codes are chosen', () => {
    const { address, validateAddress } = useAddressSubform()
    address.value.street = 'Jl. Merdeka'
    address.value.provinceCode = '32'
    address.value.regencyCode = '32.04'
    address.value.districtCode = '32.04.01'
    address.value.villageCode = '32.04.01.2001'
    expect(validateAddress()).toBe(true)
  })

  it.each([
    'provinceCode',
    'regencyCode',
    'districtCode',
    'villageCode',
  ] as const)(
    'validateAddress fails without %s even when the names are typed',
    (missing) => {
      const { address, validateAddress } = useAddressSubform()
      address.value.street = 'Jl. Merdeka'
      address.value.province = 'Jawa Barat'
      address.value.city = 'Bandung'
      address.value.district = 'Cikole'
      address.value.village = 'Sukamaju'
      address.value.provinceCode = '32'
      address.value.regencyCode = '32.04'
      address.value.districtCode = '32.04.01'
      address.value.villageCode = '32.04.01.2001'
      address.value[missing] = ''
      expect(validateAddress()).toBe(false)
    },
  )
})
