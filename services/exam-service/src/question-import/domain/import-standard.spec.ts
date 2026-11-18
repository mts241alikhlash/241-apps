import { describe, expect, it } from 'vitest'
import { STANDARD_COUNTS, countWarnings } from './import-standard.js'

describe('countWarnings', () => {
  it('warns when PG differs from the standard', () => {
    expect(countWarnings({ ...STANDARD_COUNTS, MULTIPLE_CHOICE: 18 })).toEqual([
      'PG 18 dari 20',
    ])
  })

  it('returns nothing when every count equals the standard', () => {
    expect(countWarnings({ ...STANDARD_COUNTS })).toEqual([])
  })

  it('warns when PG is above the standard', () => {
    expect(countWarnings({ ...STANDARD_COUNTS, MULTIPLE_CHOICE: 25 })).toEqual([
      'PG 25 dari 20',
    ])
  })

  it('does not warn for Isian when its standard is 0', () => {
    expect(countWarnings({ ...STANDARD_COUNTS, SHORT_ANSWER: 3 })).toEqual([])
  })

  it('labels each type in Indonesian', () => {
    const counts = {
      MULTIPLE_CHOICE: 0,
      MULTIPLE_RESPONSE: 0,
      TRUE_FALSE: 0,
      SHORT_ANSWER: 0,
      ESSAY: 0,
    }
    expect(countWarnings(counts)).toEqual([
      'PG 0 dari 20',
      'PG Kompleks 0 dari 10',
      'Benar/Salah 0 dari 10',
      'Uraian 0 dari 5',
    ])
  })
})
