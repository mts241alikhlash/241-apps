import { describe, expect, it } from 'vitest'
import { categoryOf } from './exam-category.policy'

describe('categoryOf', () => {
  it.each([
    ['DAILY', 'NON_EXAM'],
    ['ASSIGNMENT', 'NON_EXAM'],
    ['MIDTERM', 'EXAM'],
    ['FINAL', 'EXAM'],
  ] as const)('%s is %s', (type, category) => {
    expect(categoryOf(type)).toBe(category)
  })
})
