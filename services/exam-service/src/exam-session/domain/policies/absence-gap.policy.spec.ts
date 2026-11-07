import { describe, expect, it } from 'vitest'
import { DEFAULT_POLICIES } from '../../../exam-activity/domain/policies/exam-policy.policy.js'
import { evaluateAbsenceGap } from './absence-gap.policy.js'

const policy = DEFAULT_POLICIES.UJIAN_KETAT
const seen = new Date('2026-11-10T02:00:00Z')

const at = (secondsAhead: number, priorGaps = 0) =>
  evaluateAbsenceGap({
    lastSeenAt: seen,
    now: new Date(seen.getTime() + secondsAhead * 1000),
    policy,
    priorGaps,
  })

describe('evaluateAbsenceGap', () => {
  it('says nothing when the tablet only hiccuped', () => {
    expect(at(30)).toEqual({
      record: false,
      seconds: 0,
      requireToken: false,
      countsAsViolation: false,
    })
  })

  it('records a gap of ninety seconds without punishing it', () => {
    expect(at(90)).toEqual({
      record: true,
      seconds: 90,
      requireToken: false,
      countsAsViolation: false,
    })
  })

  it('demands the token once the gap passes five minutes', () => {
    expect(at(360)).toMatchObject({
      requireToken: true,
      countsAsViolation: false,
    })
  })

  it('counts the second long gap as a violation', () => {
    expect(at(360, 1).countsAsViolation).toBe(true)
  })

  it('ignores a session that never reported', () => {
    expect(
      evaluateAbsenceGap({ lastSeenAt: null, now: seen, policy, priorGaps: 0 })
        .record,
    ).toBe(false)
  })

  it('uses the task thresholds when the activity is a task', () => {
    expect(
      evaluateAbsenceGap({
        lastSeenAt: seen,
        now: new Date(seen.getTime() + 240_000),
        policy: DEFAULT_POLICIES.TUGAS,
        priorGaps: 0,
      }).record,
    ).toBe(false)
  })
})
