import { describe, expect, it } from 'vitest'
import { parseScore, pastedLines } from './score'

describe('parseScore', () => {
  it('reads whole numbers and both decimal separators', () => {
    expect(parseScore('40', 50)).toEqual({ ok: true, value: 40 })
    expect(parseScore(' 7,5 ', 50)).toEqual({ ok: true, value: 7.5 })
    expect(parseScore('12.25', 50)).toEqual({ ok: true, value: 12.25 })
    expect(parseScore('0', 50)).toEqual({ ok: true, value: 0 })
    expect(parseScore('50', 50)).toEqual({ ok: true, value: 50 })
  })

  it('reads an empty cell as no score', () => {
    expect(parseScore('  ', 50)).toEqual({ ok: true, value: null })
  })

  it('flags every invalid value in Indonesian', () => {
    expect(parseScore('abc', 50)).toEqual({
      ok: false,
      error: 'Nilai harus berupa angka',
    })
    expect(parseScore('-1', 50)).toEqual({
      ok: false,
      error: 'Nilai tidak boleh kurang dari 0',
    })
    expect(parseScore('50.5', 50)).toEqual({
      ok: false,
      error: 'Nilai maksimal 50',
    })
    expect(parseScore('1.234', 50)).toEqual({
      ok: false,
      error: 'Nilai paling banyak dua angka desimal',
    })
  })
})

describe('pastedLines', () => {
  it('splits a pasted column and drops the trailing blank lines', () => {
    expect(pastedLines('40\r\n7,5\n\n41\n\n')).toEqual(['40', '7,5', '', '41'])
  })

  it('keeps only the first cell of a pasted row', () => {
    expect(pastedLines('40\tbaik\n41\t')).toEqual(['40', '41'])
  })
})
