import { describe, expect, it } from 'vitest'
import {
  applicationCompleteness,
  type CompletenessInput,
} from './applicationCompleteness'

const statuses = [{ id: 'alive', name: 'Masih hidup' }]
const year = String(new Date().getFullYear())

function complete() {
  return {
    personal: {
      fullName: 'Budi',
      nickname: '',
      gender: 'MALE',
      birthPlace: 'Garut',
      birthDate: '2014-05-05',
      nik: '3205010101140001',
      nisn: '',
      phone: '',
      hobby: '',
      aspiration: '',
      financingSourceId: 'fin-1',
      disabilityTypeId: '',
      specialNeedId: '',
      religionId: 'rel-1',
      childOrder: '',
      siblingCount: '',
    },
    parents: [
      {
        relation: 'FATHER' as const,
        name: 'Ahmad',
        nik: '3205010101800001',
        birthPlace: 'Garut',
        birthDate: '1980-01-01',
        phone: '081234567890',
        occupationId: 'occ-1',
        educationId: '',
        incomeRangeId: '',
        lifeStatusId: 'alive',
        domicileId: '',
        residenceId: '',
        sameAddressAsStudent: true,
        street: '',
        rt: '',
        rw: '',
        postalCode: '',
        provinceCode: '',
        regencyCode: '',
        districtCode: '',
        villageCode: '',
        isPrimary: true,
      },
    ],
    address: {
      street: 'Jl. Pesantren 1',
      rt: '1',
      rw: '2',
      postalCode: '44151',
      provinceCode: '32',
      regencyCode: '32.05',
      districtCode: '32.05.10',
      villageCode: '32.05.10.2001',
      studentResidenceId: 'sr-1',
      travelDistanceId: 'td-1',
      travelTimeId: 'tt-1',
      transportationId: 'tr-1',
    },
    school: {
      previousSchoolName: 'MI Al-Ikhlash',
      previousSchoolNpsn: '',
      previousSchoolAddress: '',
      graduationYear: year,
    },
    achievements: [],
    scholarships: [],
    lifeStatuses: statuses,
    scholarshipCategories: [],
    documentTypes: [
      { id: 'kk', name: 'Kartu Keluarga', requirement: 'REQUIRED' },
      { id: 'rapor', name: 'Rapor', requirement: 'OPTIONAL' },
    ] as CompletenessInput['documentTypes'],
    documents: [{ documentTypeId: 'kk', status: 'PENDING' }],
  }
}

describe('applicationCompleteness', () => {
  it('marks every step done for a complete application', () => {
    expect(
      applicationCompleteness(complete()).map((item) => [item.step, item.done]),
    ).toEqual([
      [0, true],
      [1, true],
      [2, true],
      [3, true],
      [4, true],
      [5, true],
    ])
  })

  it('flags each step that still fails its own rules', () => {
    const input = complete()
    input.personal.nik = ''
    input.parents[0].phone = ''
    input.address.villageCode = ''
    input.school.previousSchoolName = ''

    expect(
      applicationCompleteness(input)
        .filter((item) => !item.done)
        .map((item) => item.label),
    ).toEqual(['Data Diri', 'Orang Tua/Wali', 'Alamat', 'Sekolah Asal'])
  })

  it('names a required document that is missing or was rejected', () => {
    const input = complete()
    input.documents = [{ documentTypeId: 'kk', status: 'REJECTED' }]

    const documents = applicationCompleteness(input).find(
      (item) => item.step === 5,
    )!
    expect(documents.done).toBe(false)
    expect(documents.detail).toBe('Kartu Keluarga (ditolak, unggah ulang)')
  })

  it('flags a parent who shares the student NIK, which the server refuses', () => {
    const input = complete()
    input.parents[0].nik = input.personal.nik

    const parents = applicationCompleteness(input).find(
      (item) => item.step === 1,
    )!
    expect(parents.done).toBe(false)
    expect(parents.detail).toBe('NIK ayah sama dengan NIK santri')
  })

  it('a missing LATER type does not block', () => {
    const input = complete()
    input.documentTypes = [
      ...input.documentTypes,
      { id: 'ijazah', name: 'Ijazah', requirement: 'LATER' },
    ]
    expect(applicationCompleteness(input)[5].done).toBe(true)
  })

  it('a missing REQUIRED type does', () => {
    const input = complete()
    input.documents = []
    const berkas = applicationCompleteness(input)[5]
    expect(berkas.done).toBe(false)
    expect(berkas.detail).toContain('Kartu Keluarga')
  })
})
