import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POLICIES,
  POLICY_KEYS,
  type ExamPolicy,
  parsePolicy,
  tryParsePolicy,
} from './exam-policy.policy.js'

const valid: ExamPolicy = {
  violationLimit: 4,
  focusThresholdMs: 12_000,
  heartbeatIntervalMs: 15_000,
  gapRecordedMs: 90_000,
  gapTokenMs: 480_000,
  gapViolationFrom: 2,
  tokenSlotSeconds: 600,
  lateToleranceMinutes: 15,
  minSubmitMinutes: 0,
  autoOpenLeadMinutes: 10,
  autoCloseGraceMinutes: 30,
  shuffleQuestions: true,
  shuffleChoices: true,
  allowWeb: true,
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

  it('fills the new fields with their defaults', () => {
    expect(parsePolicy({})).toEqual(DEFAULT_POLICIES.MIDTERM)
    const policy = parsePolicy({})
    expect(policy.lateToleranceMinutes).toBe(15)
    expect(policy.minSubmitMinutes).toBe(0)
    expect(policy.shuffleQuestions).toBe(true)
    expect(policy.shuffleChoices).toBe(true)
    expect(policy.allowWeb).toBe(true)
  })

  it('refuses a late tolerance and a minimum submit time out of range', () => {
    expect(() => parsePolicy({ lateToleranceMinutes: 121 })).toThrow(
      'lateToleranceMinutes harus 0 sampai 120',
    )
    expect(() => parsePolicy({ minSubmitMinutes: 181 })).toThrow(
      'minSubmitMinutes harus 0 sampai 180',
    )
  })

  it('gives every preset an automatic open lead of 5 and a close grace of 15', () => {
    for (const policy of Object.values(DEFAULT_POLICIES)) {
      expect(policy.autoOpenLeadMinutes).toBe(5)
      expect(policy.autoCloseGraceMinutes).toBe(15)
    }
    expect(parsePolicy({}).autoOpenLeadMinutes).toBe(5)
    expect(parsePolicy({}).autoCloseGraceMinutes).toBe(15)
  })

  it('refuses an automatic open lead and close grace out of range', () => {
    expect(() => parsePolicy({ autoOpenLeadMinutes: -1 })).toThrow(
      'autoOpenLeadMinutes harus 0 sampai 60',
    )
    expect(() => parsePolicy({ autoOpenLeadMinutes: 61 })).toThrow(
      'autoOpenLeadMinutes harus 0 sampai 60',
    )
    expect(() => parsePolicy({ autoCloseGraceMinutes: -1 })).toThrow(
      'autoCloseGraceMinutes harus 0 sampai 240',
    )
    expect(() => parsePolicy({ autoCloseGraceMinutes: 241 })).toThrow(
      'autoCloseGraceMinutes harus 0 sampai 240',
    )
    expect(
      parsePolicy({ autoOpenLeadMinutes: 0, autoCloseGraceMinutes: 240 }),
    ).toMatchObject({ autoOpenLeadMinutes: 0, autoCloseGraceMinutes: 240 })
  })

  it('refuses a boolean key given as a non-boolean', () => {
    expect(() => parsePolicy({ shuffleChoices: 'no' })).toThrow(
      'shuffleChoices harus true atau false',
    )
    expect(() => parsePolicy({ allowWeb: 0 })).toThrow(
      'allowWeb harus true atau false',
    )
  })

  it('keeps an explicit false for a boolean key', () => {
    expect(parsePolicy({ allowWeb: false }).allowWeb).toBe(false)
  })

  it('parses a legacy stored policy that lacks the new keys', () => {
    const legacy = {
      violationLimit: 3,
      focusThresholdMs: 10_000,
      heartbeatIntervalMs: 15_000,
      gapRecordedMs: 60_000,
      gapTokenMs: 300_000,
      gapViolationFrom: 2,
      tokenSlotSeconds: 600,
    }
    expect(() => parsePolicy(legacy)).not.toThrow()
    expect(parsePolicy(legacy)).toEqual(DEFAULT_POLICIES.MIDTERM)
  })

  it('parses a stored policy saved before the automatic status keys', () => {
    const stored = {
      violationLimit: 4,
      focusThresholdMs: 10_000,
      heartbeatIntervalMs: 15_000,
      gapRecordedMs: 60_000,
      gapTokenMs: 300_000,
      gapViolationFrom: 2,
      tokenSlotSeconds: 600,
      lateToleranceMinutes: 20,
      minSubmitMinutes: 0,
      shuffleQuestions: true,
      shuffleChoices: false,
      allowWeb: true,
    }
    expect(parsePolicy(stored, DEFAULT_POLICIES.FINAL)).toEqual({
      ...stored,
      autoOpenLeadMinutes: 5,
      autoCloseGraceMinutes: 15,
    })
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

describe('camera settings', () => {
  it('has no camera setting', () => {
    expect(POLICY_KEYS).not.toContain('snapshotIntervalMs')
    for (const policy of Object.values(DEFAULT_POLICIES)) {
      expect(policy).not.toHaveProperty('snapshotIntervalMs')
    }
  })
})
