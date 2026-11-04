import { describe, expect, it } from 'vitest'
import { QUESTION_TYPES, typeLabel } from '.'

describe('question labels', () => {
  it('names every type in Indonesian', () => {
    expect(QUESTION_TYPES.map(typeLabel)).toEqual([
      'Pilihan Ganda',
      'Pilihan Ganda Kompleks',
      'Benar/Salah',
      'Isian Singkat',
      'Uraian',
    ])
  })
})
