export interface AddressSavePayload {
  street: string
  rt?: string | null
  rw?: string | null
  village: string
  district: string
  city: string
  province: string
  provinceCode?: string | null
  regencyCode?: string | null
  districtCode?: string | null
  villageCode?: string | null
  postalCode?: string | null
  country: string
  isPrimary?: boolean
}
