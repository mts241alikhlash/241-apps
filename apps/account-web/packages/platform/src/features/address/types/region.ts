export type RegionLevelName = 'PROVINCE' | 'REGENCY' | 'DISTRICT' | 'VILLAGE'

export interface RegionNode {
  code: string
  name: string
  level: RegionLevelName
  parentCode: string | null
}

export interface RegionCodes {
  provinceCode: string
  regencyCode: string
  districtCode: string
  villageCode: string
}

export interface RegionNames {
  province: string
  city: string
  district: string
  village: string
}

export const EMPTY_REGION_CODES: RegionCodes = {
  provinceCode: '',
  regencyCode: '',
  districtCode: '',
  villageCode: '',
}

export const EMPTY_REGION_NAMES: RegionNames = {
  province: '',
  city: '',
  district: '',
  village: '',
}
