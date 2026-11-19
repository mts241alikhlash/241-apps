import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICIES } from '../../../exam-activity/domain/policies/exam-policy.policy.js'
import { effectiveMinSubmit } from './effective-min-submit.policy.js'

const withMin = (minSubmitMinutes: number) => ({
  ...DEFAULT_POLICIES.MIDTERM,
  minSubmitMinutes,
})

describe('effectiveMinSubmit', () => {
  it('takes the policy minimum when it is above zero', () => {
    expect(effectiveMinSubmit(withMin(20), 45)).toBe(20)
  })

  it('falls back to the schedule minimum when the policy has none', () => {
    expect(effectiveMinSubmit(withMin(0), 20)).toBe(20)
  })

  it('falls back to the schedule minimum when there is no policy', () => {
    expect(effectiveMinSubmit(null, 20)).toBe(20)
    expect(effectiveMinSubmit(undefined, 20)).toBe(20)
  })

  it('is zero when neither side sets a minimum', () => {
    expect(effectiveMinSubmit(withMin(0), 0)).toBe(0)
  })
})
