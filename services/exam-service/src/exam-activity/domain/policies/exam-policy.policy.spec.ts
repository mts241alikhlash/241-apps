import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICIES,
  type ExamPolicy,
  parsePolicy,
  tryParsePolicy,
} from './exam-policy.policy.js'

const valid: ExamPolicy = {
  violationLimit: 4,
  focusThresholdMs: 12_000,
  snapshotIntervalMs: 20_000,
  heartbeatIntervalMs: 15_000,
  gapRecordedMs: 90_000,
  gapTokenMs: 480_000,
  gapViolationFrom: 2,
  tokenSlotSeconds: 600,
}

describe('parsePolicy', () => {
  it('keeps the values it is given', () => {
    expect(parsePolicy(valid)).toEqual(valid)
  })

  it('fills the missing fields from the exam default', () => {
    expect(parsePolicy({ violationLimit: 5 })).toEqual({
      ...DEFAULT_POLICIES.MIDTERM,
      violationLimit: 5,
    })
  })

  it('refuses a violation limit outside the allowed range', () => {
    expect(() => parsePolicy({ violationLimit: 0 })).toThrow()
    expect(() => parsePolicy({ violationLimit: 11 })).toThrow()
  })

  it('refuses a gap that would never require the token again', () => {
    expect(() => parsePolicy({ gapTokenMs: 10 })).toThrow()
    expect(() =>
      parsePolicy({ gapRecordedMs: 600_000, gapTokenMs: 300_000 }),
    ).toThrow()
  })

  it('refuses a timestamp that is not a whole number of milliseconds', () => {
    expect(() => parsePolicy({ focusThresholdMs: 1_500.5 })).toThrow()
    expect(() => parsePolicy({ focusThresholdMs: 'ten' })).toThrow()
  })

  it('gives each preset its own values', () => {
    expect(DEFAULT_POLICIES.MIDTERM.gapTokenMs).toBe(300_000)
    expect(DEFAULT_POLICIES.FINAL.gapTokenMs).toBe(300_000)
    expect(DEFAULT_POLICIES.ASSIGNMENT.gapRecordedMs).toBe(300_000)
    expect(DEFAULT_POLICIES.ASSIGNMENT.gapViolationFrom).toBe(3)
    expect(DEFAULT_POLICIES.DAILY.violationLimit).toBe(3)
  })

  it('returns null instead of throwing for a corrupted stored policy', () => {
    expect(tryParsePolicy({ violationLimit: 0 })).toBeNull()
    expect(tryParsePolicy({ violationLimit: 5 })?.violationLimit).toBe(5)
    expect(tryParsePolicy(null)?.violationLimit).toBe(3)
  })
})
