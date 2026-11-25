import { BadRequestException } from '@nestjs/common'
import {
  detectRdmKind,
  fromRdmValue,
  isRdmNoOp,
  matchStudents,
  normalizeStudentId,
  sameName,
  toRdmValue,
  type RosterStudent,
} from './rdm-rules.js'

describe('toRdmValue', () => {
  it('converts and rounds half-up to the 0..100 scale', () => {
    expect(toRdmValue(17.5, 20)).toBe(88)
    expect(toRdmValue(84.5, 100)).toBe(85)
    expect(toRdmValue(120, 100)).toBe(100)
  })

  it('clamps negative values to 0 and avoids floating-point rounding drift', () => {
    expect(toRdmValue(-5, 100)).toBe(0)
    expect(toRdmValue(0, 100)).toBe(0)
    expect(toRdmValue(20, 20)).toBe(100)
    expect(toRdmValue(29, 100)).toBe(29)
    expect(toRdmValue(0.575, 1)).toBe(58)
  })

  it('returns 0 when maxScore is not positive or inputs are not finite', () => {
    expect(toRdmValue(15, 0)).toBe(0)
    expect(toRdmValue(15, -10)).toBe(0)
    expect(toRdmValue(Number.NaN, 100)).toBe(0)
  })
})

describe('fromRdmValue', () => {
  it('converts an RDM 0..100 value back to the item maxScore scale', () => {
    expect(fromRdmValue(88, 20)).toBe(17.6)
    expect(fromRdmValue(14, 100)).toBe(14)
    expect(fromRdmValue(0, 20)).toBe(0)
    expect(fromRdmValue(100, 20)).toBe(20)
  })
})

describe('isRdmNoOp', () => {
  it('detects whether the stored score already maps to the imported RDM value', () => {
    expect(isRdmNoOp(17.5, 88, 20)).toBe(true)
    expect(isRdmNoOp(null, 88, 20)).toBe(false)
    expect(isRdmNoOp(17.4, 88, 20)).toBe(false)
  })
})

describe('detectRdmKind', () => {
  it('detects SAS and Sumatif sheet layouts', () => {
    expect(detectRdmKind(['SAS 1'])).toBe('sas')
    expect(detectRdmKind(['SUM 1', 'SUM 2'])).toBe('sumatif')
    expect(
      detectRdmKind(Array.from({ length: 15 }, (_, i) => `SUM ${i + 1}`)),
    ).toBe('sumatif')
  })

  it.each([
    [['Sheet1']],
    [['SUM 16']],
    [['SUM 0']],
    [['SUM 01']],
    [[]],
    [['SAS 1', 'SUM 1']],
    [['SAS 1', 'Extra']],
    [['SUM 1', 'Sheet1']],
    [['SUM 1', 'SUM 1']],
  ])('refuses non-RDM sheet list %j', (sheetNames) => {
    expect(() => detectRdmKind(sheetNames)).toThrow(BadRequestException)
    try {
      detectRdmKind(sheetNames)
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException)
      expect((error as BadRequestException).message).toBe(
        'File ini bukan template RDM',
      )
    }
  })
})

describe('normalizeStudentId', () => {
  it('normalizes numbers without exponent and preserves leading zeros on text', () => {
    expect(normalizeStudentId(260002)).toBe('260002')
    expect(normalizeStudentId(' 0143909888 ')).toBe('0143909888')
    expect(normalizeStudentId(143909888)).toBe('143909888')
    expect(normalizeStudentId(1e21)).toBe('1000000000000000000000')
  })

  it('returns empty string for null, undefined, empty, or whitespace input', () => {
    expect(normalizeStudentId(null)).toBe('')
    expect(normalizeStudentId(undefined)).toBe('')
    expect(normalizeStudentId('')).toBe('')
    expect(normalizeStudentId('   \t\n ')).toBe('')
    expect(normalizeStudentId(Number.NaN)).toBe('')
  })
})

describe('matchStudents', () => {
  const roster: RosterStudent[] = [
    {
      enrollmentId: 'enr-1',
      nis: '260001',
      nisn: '0143909888',
      name: 'Aisyah',
    },
    { enrollmentId: 'enr-2', nis: '260002', nisn: '0143909889', name: 'Budi' },
    { enrollmentId: 'enr-3', nis: null, nisn: '0143909890', name: 'Citra' },
    { enrollmentId: 'enr-4', nis: undefined, nisn: undefined, name: 'Dedi' },
  ]

  it('matches by NIS, matches NIS-as-number against text roster, and falls back to NISN', () => {
    const result = matchStudents(
      [
        { row: 7, nis: '260001', nisn: '' },
        { row: 8, nis: normalizeStudentId(260002), nisn: '' },
        { row: 9, nis: '', nisn: '0143909890' },
      ],
      roster,
    )

    expect(result.matched.get(7)).toBe('enr-1')
    expect(result.matched.get(8)).toBe('enr-2')
    expect(result.matched.get(9)).toBe('enr-3')
    expect(result.unmatchedRows).toEqual([])
    expect(result.ambiguousRows).toEqual([])
    expect(result.missing).toEqual([roster[3]])
  })

  it('does not pad numeric NISN and treats empty or absent keys as non-matching', () => {
    const withEmptyKeys: RosterStudent[] = [
      { enrollmentId: 'enr-a', nis: '', nisn: null, name: 'A' },
      { enrollmentId: 'enr-b', nis: null, nisn: undefined, name: 'B' },
      { enrollmentId: 'enr-c', nis: '260003', nisn: '0143909888', name: 'C' },
    ]

    const result = matchStudents(
      [
        { row: 7, nis: '', nisn: '' },
        { row: 8, nis: '', nisn: normalizeStudentId(143909888) },
        { row: 9, nis: '999999', nisn: '0143909888' },
      ],
      withEmptyKeys,
    )

    expect(result.matched.size).toBe(1)
    expect(result.matched.get(9)).toBe('enr-c')
    expect(result.unmatchedRows).toEqual([7, 8])
    expect(result.ambiguousRows).toEqual([])
    expect(result.missing).toEqual([withEmptyKeys[0], withEmptyKeys[1]])
  })

  it('reports rows whose NIS or NISN is shared by multiple roster students as ambiguous', () => {
    const duplicated: RosterStudent[] = [
      { enrollmentId: 'enr-1', nis: '260001', nisn: '0100000001', name: 'A' },
      { enrollmentId: 'enr-2', nis: '260001', nisn: '0100000002', name: 'B' },
      { enrollmentId: 'enr-3', nis: '260003', nisn: '0100000009', name: 'C' },
      { enrollmentId: 'enr-4', nis: '260004', nisn: '0100000009', name: 'D' },
    ]

    const result = matchStudents(
      [
        { row: 7, nis: '260001', nisn: '0100000001' },
        { row: 8, nis: '', nisn: '0100000009' },
      ],
      duplicated,
    )

    expect(result.matched.size).toBe(0)
    expect(result.unmatchedRows).toEqual([])
    expect(result.ambiguousRows).toEqual([7, 8])
    expect(result.missing).toEqual(duplicated)
  })
})

describe('sameName', () => {
  it('compares names trimmed and case-insensitively', () => {
    expect(sameName('  Sumatif 1 ', 'sumatif 1')).toBe(true)
    expect(sameName('UH 1', 'UH 2')).toBe(false)
  })
})
