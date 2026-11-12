// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import {
  EXAM_CATEGORY_LABEL,
  EXAM_TYPE_LABEL,
  examCategoryLabel,
  examTypeLabel,
  sectionPrefixOf,
  typesFor,
} from './examType'

describe('examType', () => {
  it('labels exam types and categories in Indonesian', () => {
    expect(EXAM_TYPE_LABEL).toEqual({
      DAILY: 'Ulangan Harian',
      ASSIGNMENT: 'Tugas',
      MIDTERM: 'UTS',
      FINAL: 'UAS',
    })
    expect(EXAM_CATEGORY_LABEL).toEqual({
      EXAM: 'Ujian',
      NON_EXAM: 'Non-ujian',
    })
    expect(examTypeLabel('MIDTERM')).toBe('UTS')
    expect(examCategoryLabel('NON_EXAM')).toBe('Non-ujian')
  })

  it('returns allowed types for category, manageAll and active midterm event', () => {
    expect(typesFor('NON_EXAM', false, false)).toEqual(['DAILY', 'ASSIGNMENT'])
    expect(typesFor('EXAM', false, false)).toEqual([])
    expect(typesFor('EXAM', false, true)).toEqual(['MIDTERM'])
    expect(typesFor('EXAM', true, false)).toEqual(['MIDTERM', 'FINAL'])
  })

  it('maps a category to its menu section', () => {
    expect(sectionPrefixOf('EXAM')).toBe('/exam')
    expect(sectionPrefixOf('NON_EXAM')).toBe('/classwork')
    expect(sectionPrefixOf(undefined)).toBe('/exam')
  })
})
