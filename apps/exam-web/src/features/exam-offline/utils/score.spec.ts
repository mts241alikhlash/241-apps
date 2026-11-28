import { describe, expect, it } from 'vitest'
import { parseScore, pastedColumn } from './score'

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
    expect(parseScore('1,000', 50)).toEqual({
      ok: false,
      error: 'Nilai paling banyak dua angka desimal',
    })
    expect(parseScore('1e1', 50)).toEqual({
      ok: false,
      error: 'Nilai harus berupa angka',
    })
    expect(parseScore('.5', 50)).toEqual({
      ok: false,
      error: 'Nilai harus berupa angka',
    })
    expect(parseScore('-0', 50)).toEqual({
      ok: false,
      error: 'Nilai tidak boleh kurang dari 0',
    })
  })
})

describe('pastedColumn', () => {
  it('splits a pasted column and drops the trailing blank lines', () => {
    expect(pastedColumn('40\r\n7,5\n\n41\n\n')).toEqual({
      ok: true,
      lines: ['40', '7,5', '', '41'],
    })
  })

  it('refuses more than one column', () => {
    expect(pastedColumn('40\tbaik\n41\t')).toEqual({
      ok: false,
      error: 'Tempel satu kolom nilai saja.',
    })
  })
})
