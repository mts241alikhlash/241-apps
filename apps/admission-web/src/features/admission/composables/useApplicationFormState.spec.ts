import { describe, it, expect } from 'vitest'
import type { AdmissionApplication, AdmissionApplicationParent } from '../types'
import {
  blankScholarship,
  useApplicationFormState,
  type ParentForm,
} from './useApplicationFormState'
import { useFormOptions } from './useFormOptions'

function makeApplication(
  overrides: Partial<AdmissionApplication> = {},
): AdmissionApplication {
  return {
    waveIsFull: false,
    id: 'app-1',
    userId: 'user-1',
    waveId: 'wave-1',
    registrationNumber: 'REG-001',
    status: 'DRAFT',
    fullName: 'Budi',
    nickname: null,
    gender: null,
    birthPlace: null,
    birthDate: null,
    nik: null,
    nisn: null,
    religionId: null,
    phone: null,
    email: null,
    childOrder: null,
    siblingCount: null,
    street: null,
    rt: null,
    rw: null,
    village: null,
    district: null,
    city: null,
    province: null,
    postalCode: null,
    previousSchoolName: null,
    previousSchoolNpsn: null,
    previousSchoolAddress: null,
    graduationYear: null,
    submittedAt: null,
    revisionNote: null,
    verifiedAt: null,
    decidedAt: null,
    decisionNote: null,
    enrolledAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    wave: {
      id: 'wave-1',
      name: 'Gelombang 1',
      code: 'W1',
      academicYearId: 'year-1',
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      quota: 100,
      registrationFee: 100000,
      description: null,
      isActive: true,
      lastRegistrationSeq: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    parents: [],
    documents: [],
    payment: null,
    documentTypes: [],
    ...overrides,
  }
}

function makeParent(
  overrides: Partial<AdmissionApplicationParent> = {},
): AdmissionApplicationParent {
  return {
    id: 'parent-1',
    applicationId: 'app-1',
    relation: 'FATHER',
    name: 'Budi',
    nik: null,
    birthPlace: null,
    birthDate: null,
    phone: null,
    occupationId: null,
    educationId: null,
    incomeRangeId: null,
    lifeStatusId: null,
    domicileId: null,
    residenceId: null,
    sameAddressAsStudent: true,
    street: null,
    rt: null,
    rw: null,
    village: null,
    district: null,
    city: null,
    province: null,
    postalCode: null,
    provinceCode: null,
    regencyCode: null,
    districtCode: null,
    villageCode: null,
    isPrimary: false,
    occupation: null,
    education: null,
    ...overrides,
  }
}

function expectedParent(relation: ParentForm['relation'], isPrimary = false) {
  return {
    relation,
    name: '',
    nik: '',
    birthPlace: '',
    birthDate: '',
    phone: '',
    occupationId: '',
    educationId: '',
    incomeRangeId: '',
    lifeStatusId: '',
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
    isPrimary,
  }
}

describe('useApplicationFormState', () => {
  it('hydrate fills personal/address/school from the application', () => {
    const { personal, address, school, hydrate } = useApplicationFormState()

    hydrate(
      makeApplication({
        fullName: 'Budi Santoso',
        birthDate: '2010-05-01T00:00:00.000Z',
        street: 'Jl. Merdeka',
        previousSchoolName: 'SD Negeri 1',
        graduationYear: 2023,
      }),
    )

    expect(personal.value.fullName).toBe('Budi Santoso')
    expect(personal.value.birthDate).toBe('2010-05-01')
    expect(address.value.street).toBe('Jl. Merdeka')
    expect(school.value.previousSchoolName).toBe('SD Negeri 1')
    expect(school.value.graduationYear).toBe('2023')
  })

  it('hydrate seeds a father and a mother when the application has none', () => {
    const { parents, hydrate } = useApplicationFormState()

    hydrate(makeApplication({ parents: [] }))

    expect(parents.value).toEqual([
      expectedParent('FATHER', true),
      expectedParent('MOTHER'),
    ])
  })

  it('hydrate keeps saved parents and adds the missing father or mother', () => {
    const { parents, hydrate } = useApplicationFormState()

    hydrate(
      makeApplication({
        parents: [
          makeParent({
            relation: 'MOTHER',
            name: 'Siti',
            isPrimary: true,
            occupationId: 'occ-1',
            educationId: 'edu-1',
            incomeRangeId: 'inc-1',
            lifeStatusId: 'life-1',
            domicileId: 'dom-1',
            residenceId: 'res-1',
            sameAddressAsStudent: false,
            street: 'Jl. Mawar',
            provinceCode: '32',
          }),
        ],
      }),
    )

    expect(parents.value).toEqual([
      expectedParent('FATHER'),
      {
        ...expectedParent('MOTHER', true),
        name: 'Siti',
        occupationId: 'occ-1',
        educationId: 'edu-1',
        incomeRangeId: 'inc-1',
        lifeStatusId: 'life-1',
        domicileId: 'dom-1',
        residenceId: 'res-1',
        sameAddressAsStudent: false,
        street: 'Jl. Mawar',
        provinceCode: '32',
      },
    ])
  })

  it('hydrate keeps a guardian after the father and mother', () => {
    const { parents, hydrate } = useApplicationFormState()

    hydrate(
      makeApplication({
        parents: [
          makeParent({ relation: 'GUARDIAN', name: 'Wali' }),
          makeParent({ relation: 'FATHER', name: 'Budi' }),
          makeParent({ relation: 'MOTHER', name: 'Siti' }),
        ],
      }),
    )

    expect(parents.value.map((p) => p.relation)).toEqual([
      'FATHER',
      'MOTHER',
      'GUARDIAN',
    ])
  })

  it('hydrate fills religion, child order and sibling count', () => {
    const { personal, hydrate } = useApplicationFormState()

    hydrate(
      makeApplication({ religionId: 'rel-1', childOrder: 2, siblingCount: 0 }),
    )

    expect(personal.value).toMatchObject({
      religionId: 'rel-1',
      childOrder: '2',
      siblingCount: '0',
    })
  })

  it('hydrate fills the new student fields', () => {
    const { personal, address, achievements, scholarships, hydrate } =
      useApplicationFormState()

    hydrate(
      makeApplication({
        hobby: 'Membaca',
        aspiration: 'Dokter',
        financingSourceId: 'fin-1',
        disabilityTypeId: 'dis-1',
        specialNeedId: 'need-1',
        studentResidenceId: 'sres-1',
        travelDistanceId: 'dist-1',
        travelTimeId: 'time-1',
        transportationId: 'trans-1',
        provinceCode: '32',
        regencyCode: '32.04',
        districtCode: '32.04.10',
        villageCode: '32.04.10.2001',
        achievements: [
          {
            id: 'a1',
            sortOrder: 0,
            year: 2025,
            competitionName: 'OSN',
            competitionFieldId: 'field-1',
            organizer: null,
            competitionLevelId: null,
            rank: 'Juara 1',
            fileId: 'f1',
            file: {
              id: 'f1',
              filename: 'a.pdf',
              originalName: 'piagam.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 1,
              storageKey: 'k',
            },
          },
        ],
        scholarships: [
          {
            id: 's1',
            sortOrder: 0,
            year: 2025,
            categoryId: 'cat-1',
            scholarshipName: 'PIP',
            providerName: null,
            providerTypeId: null,
            duration: '1 tahun',
            kipNumber: 'KIP123',
            amount: 450000,
            fileId: null,
            file: null,
          },
        ],
      }),
    )

    expect(personal.value).toMatchObject({
      hobby: 'Membaca',
      aspiration: 'Dokter',
      financingSourceId: 'fin-1',
      disabilityTypeId: 'dis-1',
      specialNeedId: 'need-1',
    })
    expect(address.value).toMatchObject({
      studentResidenceId: 'sres-1',
      travelDistanceId: 'dist-1',
      travelTimeId: 'time-1',
      transportationId: 'trans-1',
      provinceCode: '32',
      villageCode: '32.04.10.2001',
    })
    expect(achievements.value).toEqual([
      {
        year: '2025',
        competitionName: 'OSN',
        competitionFieldId: 'field-1',
        organizer: '',
        competitionLevelId: '',
        rank: 'Juara 1',
        fileId: 'f1',
        fileName: 'piagam.pdf',
      },
    ])
    expect(scholarships.value).toEqual([
      {
        year: '2025',
        categoryId: 'cat-1',
        scholarshipName: 'PIP',
        providerName: '',
        providerTypeId: '',
        duration: '1 tahun',
        kipNumber: 'KIP123',
        amount: '450000',
        fileId: '',
        fileName: '',
      },
    ])
  })

  it('hydrate only overwrites payment fields when payment is present', () => {
    const { payment, hydrate } = useApplicationFormState()

    hydrate(makeApplication({ payment: null }))
    expect(payment.value).toEqual({
      bankAccountId: '',
      bankName: '',
      senderAccountName: '',
      transferDate: '',
    })

    hydrate(
      makeApplication({
        payment: {
          id: 'pay-1',
          applicationId: 'app-1',
          amount: 100000,
          bankName: 'BSI',
          senderAccountName: 'Budi',
          transferDate: '2026-01-05T00:00:00.000Z',
          proofFileId: null,
          bankAccountId: null,
          status: 'PENDING',
          note: null,
          proofFile: null,
          verifiedAt: null,
          verifiedById: null,
          createdAt: '2026-01-05T00:00:00.000Z',
          updatedAt: '2026-01-05T00:00:00.000Z',
        },
      }),
    )
    expect(payment.value).toEqual({
      bankAccountId: '',
      bankName: 'BSI',
      senderAccountName: 'Budi',
      transferDate: '2026-01-05',
    })
  })

  it('makes the father the guardian of a fresh application', () => {
    const { parents, hydrate, guardianRelation } = useApplicationFormState()
    hydrate(makeApplication({ parents: [] }))

    expect(guardianRelation.value).toBe('FATHER')
    expect(parents.value.find((p) => p.isPrimary)?.relation).toBe('FATHER')
  })

  it('treats a saved guardian nobody marked as the guardian, keeping its data', () => {
    const { parents, hydrate, guardianRelation } = useApplicationFormState()
    hydrate(
      makeApplication({
        parents: [
          makeParent({ relation: 'FATHER', name: 'Budi' }),
          makeParent({ relation: 'GUARDIAN', name: 'Paman' }),
        ],
      }),
    )

    expect(guardianRelation.value).toBe('GUARDIAN')
    expect(parents.value.find((p) => p.relation === 'GUARDIAN')?.name).toBe(
      'Paman',
    )
  })

  it('setGuardian marks the mother and drops a separate guardian', () => {
    const { parents, hydrate, setGuardian, guardianRelation } =
      useApplicationFormState()
    hydrate(makeApplication({ parents: [] }))
    setGuardian('GUARDIAN')

    setGuardian('MOTHER')

    expect(guardianRelation.value).toBe('MOTHER')
    expect(parents.value.map((p) => [p.relation, p.isPrimary])).toEqual([
      ['FATHER', false],
      ['MOTHER', true],
    ])
    expect(parents.value[1].sameAddressAsStudent).toBe(true)
  })

  it('setGuardian adds one blank guardian as the guardian', () => {
    const { parents, hydrate, setGuardian } = useApplicationFormState()
    hydrate(makeApplication({ parents: [] }))

    setGuardian('GUARDIAN')
    setGuardian('GUARDIAN')

    const guardians = parents.value.filter((p) => p.relation === 'GUARDIAN')
    expect(guardians).toHaveLength(1)
    expect(guardians[0].isPrimary).toBe(true)
    expect(parents.value.filter((p) => p.isPrimary)).toHaveLength(1)
  })

  describe('buildStepPayload', () => {
    it('builds the personal-data payload for step 0, omitting empty fields', () => {
      const { personal, buildStepPayload } = useApplicationFormState()
      personal.value.fullName = 'Budi'

      expect(buildStepPayload(0)).toEqual({
        fullName: 'Budi',
        nickname: undefined,
        gender: undefined,
        birthPlace: undefined,
        birthDate: undefined,
        nik: undefined,
        nisn: undefined,
        phone: undefined,
        hobby: undefined,
        aspiration: undefined,
        financingSourceId: undefined,
        disabilityTypeId: undefined,
        specialNeedId: undefined,
        religionId: undefined,
        childOrder: undefined,
        siblingCount: undefined,
      })
    })

    it('sends religion, child order and sibling count as numbers for step 0', () => {
      const { personal, buildStepPayload } = useApplicationFormState()
      Object.assign(personal.value, {
        religionId: 'rel-1',
        childOrder: '2',
        siblingCount: '0',
      })

      expect(buildStepPayload(0)).toMatchObject({
        religionId: 'rel-1',
        childOrder: 2,
        siblingCount: 0,
      })
    })

    it('carries the hobby, aspiration and the three option ids for step 0', () => {
      const { personal, buildStepPayload } = useApplicationFormState()
      Object.assign(personal.value, {
        hobby: 'Membaca',
        aspiration: 'Dokter',
        financingSourceId: 'fin-1',
        disabilityTypeId: 'dis-1',
        specialNeedId: 'need-1',
      })

      expect(buildStepPayload(0)).toMatchObject({
        hobby: 'Membaca',
        aspiration: 'Dokter',
        financingSourceId: 'fin-1',
        disabilityTypeId: 'dis-1',
        specialNeedId: 'need-1',
      })
    })

    it('drops parents without a name from the step 1 payload', () => {
      const { parents, buildStepPayload } = useApplicationFormState()
      parents.value = [
        { ...expectedParent('FATHER', true), name: 'Budi', nik: '123' },
        expectedParent('MOTHER'),
      ]

      const payload = buildStepPayload(1) as { parents: unknown[] }
      expect(payload.parents).toHaveLength(1)
    })

    it('drops the phone, income, domicile and residence of a parent who died', () => {
      useFormOptions().options.value = {
        parentLifeStatuses: [{ id: 'dead', name: 'Meninggal' }],
      } as unknown as ReturnType<typeof useFormOptions>['options']['value']
      const { parents, hydrate, buildStepPayload } = useApplicationFormState()
      hydrate(makeApplication({ parents: [] }))
      Object.assign(parents.value[0], {
        name: 'Budi',
        lifeStatusId: 'dead',
        phone: '081234567890',
        incomeRangeId: 'inc-1',
        domicileId: 'dom-1',
        residenceId: 'res-1',
        occupationId: 'occ-1',
      })

      const payload = buildStepPayload(1) as {
        parents: Record<string, unknown>[]
      }
      useFormOptions().options.value = null

      expect(payload.parents[0]).toMatchObject({
        phone: undefined,
        incomeRangeId: undefined,
        domicileId: undefined,
        residenceId: undefined,
        occupationId: 'occ-1',
      })
    })

    it('sends the address owner as living at the student address', () => {
      const { parents, hydrate, setGuardian, buildStepPayload } =
        useApplicationFormState()
      hydrate(makeApplication({ parents: [] }))
      setGuardian('GUARDIAN')
      Object.assign(parents.value[0], {
        name: 'Budi',
        sameAddressAsStudent: false,
      })
      Object.assign(parents.value[2], {
        name: 'Paman',
        sameAddressAsStudent: false,
        street: 'Jl. Kenanga',
      })

      const sent = (
        buildStepPayload(2) as {
          parents: { relation: string; sameAddressAsStudent: boolean }[]
        }
      ).parents.map((p) => [p.relation, p.sameAddressAsStudent])

      expect(sent).toEqual([
        ['FATHER', true],
        ['GUARDIAN', false],
      ])
    })

    it('sends phone numbers without spaces or dashes', () => {
      const { personal, parents, hydrate, buildStepPayload } =
        useApplicationFormState()
      hydrate(makeApplication({ parents: [] }))
      personal.value.phone = '0812 3456-7890'
      Object.assign(parents.value[0], { name: 'Budi', phone: '0813-1111 2222' })

      expect(buildStepPayload(0)).toMatchObject({ phone: '081234567890' })
      expect(
        (buildStepPayload(1) as { parents: { phone?: string }[] }).parents[0]
          .phone,
      ).toBe('081311112222')
    })

    it('sends a father or mother with a life status even without a name', () => {
      const { parents, hydrate, buildStepPayload } = useApplicationFormState()
      hydrate(makeApplication({ parents: [] }))
      Object.assign(parents.value[0], { lifeStatusId: 'unknown' })
      Object.assign(parents.value[1], { name: 'Siti', lifeStatusId: 'alive' })

      const payload = buildStepPayload(1) as {
        parents: { relation: string; name: string }[]
      }

      expect(payload.parents.map((p) => [p.relation, p.name])).toEqual([
        ['FATHER', ''],
        ['MOTHER', 'Siti'],
      ])
    })

    it('sends every parent field on each save so a later save cannot lose them', () => {
      const { parents, buildStepPayload } = useApplicationFormState()
      parents.value = [
        {
          ...expectedParent('FATHER', true),
          name: ' Budi ',
          occupationId: 'occ-1',
          educationId: 'edu-1',
          incomeRangeId: 'inc-1',
          lifeStatusId: 'life-1',
          domicileId: 'dom-1',
          residenceId: 'res-1',
        },
      ]

      const payload = buildStepPayload(1) as { parents: unknown[] }

      expect(payload.parents[0]).toEqual({
        relation: 'FATHER',
        name: 'Budi',
        nik: undefined,
        birthPlace: undefined,
        birthDate: undefined,
        phone: undefined,
        occupationId: 'occ-1',
        educationId: 'edu-1',
        incomeRangeId: 'inc-1',
        lifeStatusId: 'life-1',
        domicileId: 'dom-1',
        residenceId: 'res-1',
        sameAddressAsStudent: true,
        isPrimary: true,
      })
    })

    it('sends the own address of a parent that does not share the student one', () => {
      const { parents, buildStepPayload } = useApplicationFormState()
      parents.value = [
        {
          ...expectedParent('MOTHER'),
          name: 'Siti',
          sameAddressAsStudent: false,
          street: 'Jl. Anggrek',
          rt: '01',
          rw: '02',
          postalCode: '10110',
          provinceCode: '31',
          regencyCode: '',
          districtCode: '',
          villageCode: '',
        },
      ]

      const payload = buildStepPayload(1) as {
        parents: Record<string, unknown>[]
      }

      expect(payload.parents[0]).toMatchObject({
        sameAddressAsStudent: false,
        street: 'Jl. Anggrek',
        rt: '01',
        rw: '02',
        postalCode: '10110',
        provinceCode: '31',
        regencyCode: '',
        districtCode: '',
        villageCode: '',
      })
    })

    it('builds the address payload for step 2 from codes, not names', () => {
      const { address, buildStepPayload } = useApplicationFormState()
      Object.assign(address.value, {
        street: 'Jl. Mawar',
        provinceCode: '32',
        regencyCode: '32.04',
        districtCode: '',
        villageCode: '',
        studentResidenceId: 'sres-1',
        travelDistanceId: 'dist-1',
        travelTimeId: 'time-1',
        transportationId: 'trans-1',
      })

      const payload = buildStepPayload(2)!
      expect(payload).toEqual({
        street: 'Jl. Mawar',
        rt: undefined,
        rw: undefined,
        postalCode: undefined,
        provinceCode: '32',
        regencyCode: '32.04',
        districtCode: '',
        villageCode: '',
        studentResidenceId: 'sres-1',
        travelDistanceId: 'dist-1',
        travelTimeId: 'time-1',
        transportationId: 'trans-1',
      })
      expect(payload).not.toHaveProperty('village')
      expect(payload).not.toHaveProperty('district')
      expect(payload).not.toHaveProperty('city')
      expect(payload).not.toHaveProperty('province')
    })

    it('sends the parents with step 2, where their addresses are filled in', () => {
      const { parents, hydrate, buildStepPayload } = useApplicationFormState()
      hydrate(
        makeApplication({
          parents: [
            makeParent({ relation: 'FATHER', name: 'Budi', isPrimary: true }),
            makeParent({ relation: 'MOTHER', name: 'Siti' }),
          ],
        }),
      )
      Object.assign(parents.value[1], {
        sameAddressAsStudent: false,
        street: 'Jl. Anggrek',
      })

      const payload = buildStepPayload(2) as {
        parents: { relation: string; street?: string }[]
      }

      expect(payload.parents.map((p) => [p.relation, p.street])).toEqual([
        ['FATHER', undefined],
        ['MOTHER', 'Jl. Anggrek'],
      ])
    })

    it('never sends an empty parent list from step 2, which would erase them', () => {
      const { buildStepPayload } = useApplicationFormState()

      expect(buildStepPayload(2)).not.toHaveProperty('parents')
    })

    it('builds the school payload for step 3, converting graduationYear to a number', () => {
      const { school, buildStepPayload } = useApplicationFormState()
      school.value.graduationYear = '2024'

      const payload = buildStepPayload(3)!
      expect(payload.graduationYear).toBe(2024)
    })

    it('sends a KIP number only on a KIP/PIP scholarship row', () => {
      useFormOptions().options.value = {
        scholarshipCategories: [
          { id: 'kip', name: 'KIP/PIP' },
          { id: 'cat-1', name: 'Prestasi' },
        ],
      } as unknown as ReturnType<typeof useFormOptions>['options']['value']
      const { scholarships, buildStepPayload } = useApplicationFormState()
      scholarships.value = [
        {
          ...blankScholarship(),
          year: '2025',
          scholarshipName: 'PIP',
          categoryId: 'kip',
          kipNumber: 'KIP123',
        },
        {
          ...blankScholarship(),
          year: '2025',
          scholarshipName: 'Prestasi',
          categoryId: 'cat-1',
          kipNumber: 'KIP999',
        },
      ]

      const rows = (
        buildStepPayload(4) as { scholarships: { kipNumber?: string }[] }
      ).scholarships
      useFormOptions().options.value = null

      expect(rows.map((row) => row.kipNumber)).toEqual(['KIP123', undefined])
      expect(buildStepPayload(4)).not.toHaveProperty('kipNumber')
    })

    it('builds the achievements and scholarships payload for step 4', () => {
      const { achievements, scholarships, buildStepPayload } =
        useApplicationFormState()
      achievements.value = [
        {
          year: '2025',
          competitionName: ' OSN ',
          competitionFieldId: 'field-1',
          organizer: '',
          competitionLevelId: 'level-1',
          rank: 'Juara 1',
          fileId: 'f1',
          fileName: 'piagam.pdf',
        },
        {
          year: '2024',
          competitionName: '  ',
          competitionFieldId: '',
          organizer: '',
          competitionLevelId: '',
          rank: '',
          fileId: '',
          fileName: '',
        },
      ]
      scholarships.value = [
        {
          year: '2025',
          categoryId: 'cat-1',
          scholarshipName: 'PIP',
          providerName: 'Kemenag',
          providerTypeId: 'prov-1',
          duration: '1 tahun',
          kipNumber: '',
          amount: '450000',
          fileId: '',
          fileName: '',
        },
      ]

      expect(buildStepPayload(4)).toEqual({
        achievements: [
          {
            year: 2025,
            competitionName: 'OSN',
            competitionFieldId: 'field-1',
            organizer: undefined,
            competitionLevelId: 'level-1',
            rank: 'Juara 1',
            fileId: 'f1',
          },
        ],
        scholarships: [
          {
            year: 2025,
            categoryId: 'cat-1',
            scholarshipName: 'PIP',
            providerName: 'Kemenag',
            providerTypeId: 'prov-1',
            duration: '1 tahun',
            amount: 450000,
            fileId: undefined,
          },
        ],
      })
    })

    it('returns null for steps with no dedicated payload', () => {
      const { buildStepPayload } = useApplicationFormState()
      expect(buildStepPayload(5)).toBeNull()
      expect(buildStepPayload(6)).toBeNull()
      expect(buildStepPayload(7)).toBeNull()
    })
  })
})
