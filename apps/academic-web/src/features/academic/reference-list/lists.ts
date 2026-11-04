export interface ReferenceList {
  key: string
  path: string
  singular: string
}

export interface ReferenceListItem {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface ReferenceListPayload {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

export const REFERENCE_LISTS: ReferenceList[] = [
  { key: 'occupations', path: 'occupations', singular: 'Pekerjaan' },
  { key: 'educations', path: 'educations', singular: 'Pendidikan' },
  {
    key: 'incomeRanges',
    path: 'income-ranges',
    singular: 'Rentang Penghasilan',
  },
  {
    key: 'financingSources',
    path: 'financing-sources',
    singular: 'Pembiaya Sekolah',
  },
  {
    key: 'disabilityTypes',
    path: 'disability-types',
    singular: 'Jenis Disabilitas',
  },
  { key: 'specialNeeds', path: 'special-needs', singular: 'Kebutuhan Khusus' },
  {
    key: 'studentResidences',
    path: 'student-residences',
    singular: 'Status Tempat Tinggal Santri',
  },
  {
    key: 'parentResidences',
    path: 'parent-residences',
    singular: 'Status Tempat Tinggal Orang Tua',
  },
  { key: 'transportations', path: 'transportations', singular: 'Transportasi' },
  {
    key: 'travelDistances',
    path: 'travel-distances',
    singular: 'Jarak Tempat Tinggal',
  },
  { key: 'travelTimes', path: 'travel-times', singular: 'Waktu Tempuh' },
  {
    key: 'parentLifeStatuses',
    path: 'parent-life-statuses',
    singular: 'Status Orang Tua',
  },
  { key: 'domiciles', path: 'domiciles', singular: 'Domisili' },
  {
    key: 'scholarshipCategories',
    path: 'scholarship-categories',
    singular: 'Kategori Beasiswa',
  },
  {
    key: 'scholarshipProviderTypes',
    path: 'scholarship-provider-types',
    singular: 'Jenis Instansi Pemberi Beasiswa',
  },
  {
    key: 'competitionFields',
    path: 'competition-fields',
    singular: 'Bidang Lomba',
  },
  {
    key: 'competitionLevels',
    path: 'competition-levels',
    singular: 'Tingkat Lomba',
  },
]

export const OCCUPATIONS = REFERENCE_LISTS[0]
