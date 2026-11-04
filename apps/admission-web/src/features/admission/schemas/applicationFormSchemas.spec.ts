import { describe, expect, it } from 'vitest'
import { jakartaToday } from '../utils'
import {
  documentTypeSchema,
  achievementsSchema,
  achievementsSchemaFor,
  addressOwnerOf,
  addressSchema,
  parentsSchemaFor,
  paymentSchema,
  personalSchema,
  schoolSchema,
} from './applicationFormSchemas'

const statuses = [
  { id: 'alive', name: 'Masih hidup' },
  { id: 'dead', name: 'Meninggal' },
  { id: 'unknown', name: 'Tidak diketahui' },
]

let nikSeq = 0

function parent(overrides: Record<string, unknown>) {
  nikSeq += 1
  return {
    relation: 'FATHER',
    name: '',
    nik: `32050101018000${String(nikSeq).padStart(2, '0')}`,
    birthPlace: 'Garut',
    birthDate: '1980-01-01',
    occupationId: 'occ-1',
    phone: '081234567890',
    lifeStatusId: 'alive',
    isPrimary: false,
    sameAddressAsStudent: true,
    ...overrides,
  }
}

function errorsOf(parents: Record<string, unknown>[]) {
  const result = parentsSchemaFor(statuses).safeParse({ parents })
  return result.success
    ? []
    : result.error.issues.map((issue) => issue.path.join('.'))
}

describe('parentsSchemaFor', () => {
  it('lets an unknown father go without a name', () => {
    expect(
      errorsOf([
        parent({ relation: 'FATHER', lifeStatusId: 'unknown' }),
        parent({ relation: 'MOTHER', name: 'Siti', isPrimary: true }),
      ]),
    ).toEqual([])
  })

  it('still asks the name of a parent who died', () => {
    expect(
      errorsOf([
        parent({ relation: 'FATHER', lifeStatusId: 'dead' }),
        parent({ relation: 'MOTHER', name: 'Siti', isPrimary: true }),
      ]),
    ).toEqual(['parents.0.name'])
  })

  it('asks the name of a separate guardian', () => {
    expect(
      errorsOf([
        parent({ relation: 'FATHER', name: 'Budi', lifeStatusId: 'dead' }),
        parent({ relation: 'MOTHER', name: 'Siti', lifeStatusId: 'dead' }),
        parent({ relation: 'GUARDIAN', lifeStatusId: '', isPrimary: true }),
      ]),
    ).toEqual(['parents.2.name'])
  })

  it('refuses a father or mother as guardian unless alive', () => {
    expect(
      errorsOf([
        parent({
          relation: 'FATHER',
          name: 'Budi',
          lifeStatusId: 'dead',
          isPrimary: true,
        }),
        parent({ relation: 'MOTHER', name: 'Siti' }),
      ]),
    ).toEqual(['parents.0.lifeStatusId'])
  })

  it('asks the life status of a father or mother', () => {
    expect(
      errorsOf([
        parent({ name: 'Budi', lifeStatusId: '', isPrimary: true }),
        parent({ relation: 'MOTHER', name: 'Siti' }),
      ]),
    ).toEqual(['parents.0.lifeStatusId'])
  })
})

describe('parentsSchemaFor guardian and identity rules', () => {
  const mother = () => parent({ relation: 'MOTHER', name: 'Siti' })

  it('asks the guardian for NIK, birth place and date, occupation and phone', () => {
    expect(
      errorsOf([
        parent({
          name: 'Budi',
          isPrimary: true,
          nik: '',
          birthPlace: '',
          birthDate: '',
          occupationId: '',
          phone: '',
        }),
        mother(),
      ]),
    ).toEqual([
      'parents.0.nik',
      'parents.0.birthPlace',
      'parents.0.birthDate',
      'parents.0.occupationId',
      'parents.0.phone',
    ])
  })

  it('asks the NIK of a living father or mother who is not the guardian', () => {
    expect(
      errorsOf([
        parent({ name: 'Budi', isPrimary: true }),
        parent({ relation: 'MOTHER', name: 'Siti', nik: '' }),
      ]),
    ).toEqual(['parents.1.nik'])
  })

  it('does not ask the NIK of a parent who died', () => {
    expect(
      errorsOf([
        parent({ name: 'Budi', isPrimary: true }),
        parent({
          relation: 'MOTHER',
          name: 'Siti',
          nik: '',
          lifeStatusId: 'dead',
        }),
      ]),
    ).toEqual([])
  })

  it('refuses the same NIK for two people', () => {
    const father = parent({ name: 'Budi', isPrimary: true })
    expect(
      errorsOf([father, parent({ ...mother(), nik: father.nik })]),
    ).toEqual(['parents.1.nik'])
  })

  it('keeps a parent birth date between 1940 and fifteen years ago', () => {
    const year = new Date().getFullYear()
    expect(
      errorsOf([
        parent({ name: 'Budi', isPrimary: true, birthDate: '1939-12-31' }),
        parent({
          relation: 'MOTHER',
          name: 'Siti',
          birthDate: `${year - 10}-01-01`,
        }),
      ]),
    ).toEqual(['parents.0.birthDate', 'parents.1.birthDate'])
  })

  it('takes an Indonesian mobile number with spaces or dashes', () => {
    expect(
      errorsOf([
        parent({ name: 'Budi', isPrimary: true, phone: '0812-3456 7890' }),
        parent({ relation: 'MOTHER', name: 'Siti', phone: '0212345678' }),
      ]),
    ).toEqual(['parents.1.phone'])
  })
})

describe('personalSchema', () => {
  const valid = {
    fullName: 'Budi',
    gender: 'MALE',
    birthPlace: 'Garut',
    birthDate: '2014-05-05',
    nik: '3205010101140001',
    religionId: 'rel-1',
    financingSourceId: 'fin-1',
  }

  function errorsOf(overrides: Record<string, unknown>) {
    const result = personalSchema.safeParse({ ...valid, ...overrides })
    return result.success
      ? []
      : result.error.issues.map((issue) => issue.path.join('.'))
  }

  it('accepts a complete applicant', () => {
    expect(errorsOf({})).toEqual([])
  })

  it('asks the NIK, sixteen digits', () => {
    expect(errorsOf({ nik: '' })).toEqual(['nik'])
    expect(errorsOf({ nik: '32050101011400AB' })).toEqual(['nik'])
  })

  it('asks the religion', () => {
    expect(errorsOf({ religionId: '' })).toEqual(['religionId'])
  })

  it('takes a NISN of ten digits or none', () => {
    expect(errorsOf({ nisn: '' })).toEqual([])
    expect(errorsOf({ nisn: '0123456789' })).toEqual([])
    expect(errorsOf({ nisn: '12345' })).toEqual(['nisn'])
  })

  it('refuses a birth date in the future or before 2000', () => {
    expect(errorsOf({ birthDate: '2999-01-01' })).toEqual(['birthDate'])
    expect(errorsOf({ birthDate: '1999-12-31' })).toEqual(['birthDate'])
  })

  it('keeps child order from 1 and sibling count from 0, both up to 30', () => {
    expect(errorsOf({ childOrder: '1', siblingCount: '0' })).toEqual([])
    expect(errorsOf({ childOrder: '0', siblingCount: '31' })).toEqual([
      'childOrder',
      'siblingCount',
    ])
    expect(errorsOf({ childOrder: '1.5' })).toEqual(['childOrder'])
  })
})

function issuesOf(
  schema: {
    safeParse: (value: unknown) => {
      success: boolean
      error?: { issues: { path: (string | number)[] }[] }
    }
  },
  value: unknown,
) {
  const result = schema.safeParse(value)
  return result.success
    ? []
    : (result.error?.issues ?? []).map((issue) => issue.path.join('.'))
}

const thisYear = new Date().getFullYear()

describe('addressSchema', () => {
  const valid = {
    street: 'Jl. Pesantren 1',
    rt: '1',
    rw: '012',
    postalCode: '44151',
    provinceCode: '32',
    regencyCode: '32.05',
    districtCode: '32.05.10',
    villageCode: '32.05.10.2001',
    studentResidenceId: 'sr-1',
    travelDistanceId: 'td-1',
    travelTimeId: 'tt-1',
    transportationId: 'tr-1',
  }

  it('accepts a complete address', () => {
    expect(issuesOf(addressSchema, valid)).toEqual([])
  })

  it('asks the village and the four travel and residence choices', () => {
    expect(
      issuesOf(addressSchema, {
        ...valid,
        villageCode: '',
        studentResidenceId: '',
        travelDistanceId: '',
        travelTimeId: '',
        transportationId: '',
      }),
    ).toEqual([
      'villageCode',
      'studentResidenceId',
      'travelDistanceId',
      'travelTimeId',
      'transportationId',
    ])
  })

  it('takes RT and RW of up to three digits and a five-digit postal code', () => {
    expect(
      issuesOf(addressSchema, {
        ...valid,
        rt: '01/02',
        rw: '1234',
        postalCode: '4415',
      }),
    ).toEqual(['rt', 'rw', 'postalCode'])
  })
})

describe('parent addresses', () => {
  const people = [
    parent({ name: 'Budi', isPrimary: true }),
    parent({ relation: 'MOTHER', name: 'Siti', sameAddressAsStudent: false }),
  ]

  it('asks street, RT, RW and village of a parent living elsewhere', () => {
    expect(
      issuesOf(parentsSchemaFor(statuses, 'addresses'), { parents: people }),
    ).toEqual([
      'parents.1.street',
      'parents.1.rt',
      'parents.1.rw',
      'parents.1.villageCode',
    ])
  })

  it('leaves addresses to the address step', () => {
    expect(issuesOf(parentsSchemaFor(statuses), { parents: people })).toEqual(
      [],
    )
  })

  it('never asks a separate address of the father, who sets the student address', () => {
    expect(
      issuesOf(parentsSchemaFor(statuses, 'addresses'), {
        parents: [
          parent({
            name: 'Budi',
            isPrimary: true,
            sameAddressAsStudent: false,
          }),
        ],
      }),
    ).toEqual([])
  })

  it('leaves the people rules to the parents step', () => {
    expect(
      issuesOf(parentsSchemaFor(statuses, 'addresses'), {
        parents: [parent({ name: '', isPrimary: true, phone: '' })],
      }),
    ).toEqual([])
  })
})

describe('schoolSchema', () => {
  it('asks the school name and a graduation year from five years ago to now', () => {
    expect(
      issuesOf(schoolSchema, {
        previousSchoolName: 'MI Al-Ikhlash',
        graduationYear: String(thisYear),
      }),
    ).toEqual([])
    expect(
      issuesOf(schoolSchema, { previousSchoolName: '', graduationYear: '' }),
    ).toEqual(['previousSchoolName', 'graduationYear'])
    expect(
      issuesOf(schoolSchema, {
        previousSchoolName: 'MI',
        graduationYear: String(thisYear + 1),
      }),
    ).toEqual(['graduationYear'])
    expect(
      issuesOf(schoolSchema, {
        previousSchoolName: 'MI',
        graduationYear: String(thisYear - 6),
      }),
    ).toEqual(['graduationYear'])
  })

  it('takes an NPSN of eight digits or none', () => {
    const school = {
      previousSchoolName: 'MI',
      graduationYear: String(thisYear),
    }
    expect(
      issuesOf(schoolSchema, { ...school, previousSchoolNpsn: '' }),
    ).toEqual([])
    expect(
      issuesOf(schoolSchema, { ...school, previousSchoolNpsn: '20212345' }),
    ).toEqual([])
    expect(
      issuesOf(schoolSchema, { ...school, previousSchoolNpsn: 'MI-123' }),
    ).toEqual(['previousSchoolNpsn'])
  })
})

const achievement = {
  year: String(thisYear),
  competitionName: 'OSN',
  competitionFieldId: 'field-1',
  competitionLevelId: 'level-1',
  rank: 'Juara 1',
}
const scholarship = {
  year: String(thisYear),
  scholarshipName: 'PIP',
  categoryId: 'cat-1',
  providerName: 'Kemenag',
  providerTypeId: 'prov-1',
}

describe('achievementsSchema', () => {
  it('asks the field, level and rank of an achievement as EMIS records them', () => {
    expect(
      issuesOf(achievementsSchema, {
        achievements: [
          {
            ...achievement,
            competitionFieldId: '',
            competitionLevelId: '',
            rank: '',
          },
        ],
        scholarships: [],
      }),
    ).toEqual([
      'achievements.0.competitionFieldId',
      'achievements.0.competitionLevelId',
      'achievements.0.rank',
    ])
  })

  it('asks the category, provider and provider type of a scholarship', () => {
    expect(
      issuesOf(achievementsSchema, {
        achievements: [],
        scholarships: [
          {
            ...scholarship,
            categoryId: '',
            providerName: '',
            providerTypeId: '',
          },
        ],
      }),
    ).toEqual([
      'scholarships.0.categoryId',
      'scholarships.0.providerName',
      'scholarships.0.providerTypeId',
    ])
  })

  it('keeps achievement and scholarship years from 2015 to this year', () => {
    expect(
      issuesOf(achievementsSchema, {
        achievements: [
          { ...achievement, year: String(thisYear) },
          { ...achievement, year: String(thisYear + 1) },
        ],
        scholarships: [{ ...scholarship, year: '2014' }],
      }),
    ).toEqual(['achievements.1.year', 'scholarships.0.year'])
  })
})

describe('paymentSchema', () => {
  it('asks the destination account, bank, sender and a transfer date no later than today', () => {
    const today = jakartaToday()
    expect(
      issuesOf(paymentSchema, {
        bankAccountId: 'acc-1',
        bankName: 'BSI',
        senderAccountName: 'Budi',
        transferDate: today,
      }),
    ).toEqual([])
    expect(
      issuesOf(paymentSchema, {
        bankAccountId: '',
        bankName: '',
        senderAccountName: '',
        transferDate: '',
      }),
    ).toEqual([
      'bankAccountId',
      'bankName',
      'senderAccountName',
      'transferDate',
    ])
    expect(
      issuesOf(paymentSchema, {
        bankAccountId: 'acc-1',
        bankName: 'BSI',
        senderAccountName: 'Budi',
        transferDate: '2999-01-01',
      }),
    ).toEqual(['transferDate'])
  })
})

describe('addressOwnerOf', () => {
  const lifeStatuses = [
    { id: 'alive', name: 'Masih hidup' },
    { id: 'dead', name: 'Meninggal' },
    { id: 'unknown', name: 'Tidak diketahui' },
  ]
  const people = (fatherStatus: string, guardian: string) => [
    {
      relation: 'FATHER' as const,
      lifeStatusId: fatherStatus,
      isPrimary: guardian === 'FATHER',
    },
    {
      relation: 'MOTHER' as const,
      lifeStatusId: 'alive',
      isPrimary: guardian === 'MOTHER',
    },
    {
      relation: 'GUARDIAN' as const,
      lifeStatusId: '',
      isPrimary: guardian === 'GUARDIAN',
    },
  ]

  it('is the father while he is alive or his status is not chosen yet, whoever the guardian is', () => {
    expect(addressOwnerOf(people('alive', 'GUARDIAN'), lifeStatuses)).toBe(
      'FATHER',
    )
    expect(addressOwnerOf(people('', 'FATHER'), lifeStatuses)).toBe('FATHER')
  })

  it('is the guardian once the father died or is unknown', () => {
    expect(addressOwnerOf(people('dead', 'MOTHER'), lifeStatuses)).toBe(
      'MOTHER',
    )
    expect(addressOwnerOf(people('unknown', 'GUARDIAN'), lifeStatuses)).toBe(
      'GUARDIAN',
    )
  })
})

describe('achievementsSchemaFor', () => {
  const categories = [
    { id: 'kip', name: 'KIP/PIP' },
    { id: 'cat-1', name: 'Prestasi' },
  ]

  it('asks the KIP number only when a scholarship is KIP/PIP', () => {
    expect(
      issuesOf(achievementsSchemaFor(categories), {
        achievements: [],
        scholarships: [{ ...scholarship, categoryId: 'cat-1' }],
      }),
    ).toEqual([])
    expect(
      issuesOf(achievementsSchemaFor(categories), {
        achievements: [],
        scholarships: [
          { ...scholarship, categoryId: 'cat-1' },
          { ...scholarship, categoryId: 'kip', kipNumber: '' },
        ],
      }),
    ).toEqual(['scholarships.1.kipNumber'])
  })
})

describe('documentTypeSchema', () => {
  const base = { name: 'Ijazah', isActive: true }

  it('LATER requires a limit from 1 to 12 months', () => {
    for (const lateDueMonths of [null, '', 0, 13, 1.5]) {
      const result = documentTypeSchema.safeParse({
        ...base,
        requirement: 'LATER',
        lateDueMonths,
      })
      expect(result.success).toBe(false)
    }
    const ok = documentTypeSchema.safeParse({
      ...base,
      requirement: 'LATER',
      lateDueMonths: '3',
    })
    expect(ok.success && ok.data.lateDueMonths).toBe(3)
  })

  it('a limit is ignored for WAJIB and OPSIONAL', () => {
    for (const requirement of ['REQUIRED', 'OPTIONAL']) {
      const result = documentTypeSchema.safeParse({
        ...base,
        requirement,
        lateDueMonths: 5,
      })
      expect(result.success && result.data.lateDueMonths).toBe(null)
    }
  })
})
