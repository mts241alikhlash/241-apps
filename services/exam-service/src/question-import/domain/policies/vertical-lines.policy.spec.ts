import { describe, expect, it } from 'vitest'
import {
  choiceMarker,
  readLabel,
  sectionType,
  stripChoiceMarker,
  stripQuestionNumber,
} from './vertical-lines.policy.js'

describe('sectionType', () => {
  it('reads the section headers', () => {
    expect(sectionType('BAGIAN PG')).toBe('MULTIPLE_CHOICE')
    expect(sectionType('BAGIAN PG KOMPLEKS')).toBe('MULTIPLE_RESPONSE')
    expect(sectionType('BAGIAN BENAR/SALAH')).toBe('TRUE_FALSE')
    expect(sectionType('BAGIAN ISIAN')).toBe('SHORT_ANSWER')
    expect(sectionType('BAGIAN URAIAN')).toBe('ESSAY')
  })

  it('ignores case, spaces around slash and trailing count', () => {
    expect(sectionType('Bagian Benar / Salah')).toBe('TRUE_FALSE')
    expect(sectionType('BAGIAN PG (20 soal)')).toBe('MULTIPLE_CHOICE')
  })

  it('returns null for other lines', () => {
    expect(sectionType('Bagian lain')).toBeNull()
    expect(sectionType('Soal 1')).toBeNull()
  })
})

describe('readLabel', () => {
  it('reads kunci, abaikan harakat and poin', () => {
    expect(readLabel('Kunci:A')).toEqual({ label: 'kunci', value: 'A' })
    expect(readLabel('Abaikan harakat: ya')).toEqual({
      label: 'abaikan harakat',
      value: 'ya',
    })
    expect(readLabel('poin : 1,5')).toEqual({ label: 'poin', value: '1,5' })
  })

  it('returns null for other lines', () => {
    expect(readLabel('Jawaban: A')).toBeNull()
  })
})

describe('choiceMarker', () => {
  it('reads the marker and upper-cases the key', () => {
    expect(choiceMarker('a. Merah')).toEqual({ key: 'A', rest: 'Merah' })
    expect(choiceMarker('B) Biru')).toEqual({ key: 'B', rest: 'Biru' })
    expect(choiceMarker('C: Hijau')).toEqual({ key: 'C', rest: 'Hijau' })
  })

  it('accepts a marker with no rest', () => {
    expect(choiceMarker('E.')).toEqual({ key: 'E', rest: '' })
  })

  it('returns null without a marker', () => {
    expect(choiceMarker('Abaikan')).toBeNull()
    expect(choiceMarker('F. Kuning')).toBeNull()
  })
})

describe('stripQuestionNumber', () => {
  it('keeps leading tags', () => {
    expect(stripQuestionNumber('<strong>1.</strong> Soal')).toBe(
      '<strong></strong>Soal',
    )
  })

  it('strips a plain number', () => {
    expect(stripQuestionNumber('3. Berapa')).toBe('Berapa')
  })

  it('leaves decimals unchanged', () => {
    expect(stripQuestionNumber('2,5 liter')).toBe('2,5 liter')
    expect(stripQuestionNumber('2.5 liter')).toBe('2.5 liter')
  })
})

describe('stripChoiceMarker', () => {
  it('strips the marker and keeps the rest', () => {
    expect(stripChoiceMarker('A. $x$')).toBe('$x$')
  })

  it('keeps leading tags', () => {
    expect(stripChoiceMarker('<em>B.</em> Biru')).toBe('<em></em>Biru')
  })
})
