import { AccessCodeService } from './access-code.service.js'

const SCHEDULE = '55555555-5555-4555-8555-555555555555'
const NOW = new Date('2026-11-02T10:00:00.000Z')
const codes = new AccessCodeService(
  'unit-test-secret-of-at-least-32-characters',
)

describe('AccessCodeService.matches', () => {
  it('accepts the current code in any case', () => {
    const code = codes.codeFor(SCHEDULE, 1, NOW).code

    expect(codes.matches(SCHEDULE, 1, code, NOW)).toBe(true)
    expect(codes.matches(SCHEDULE, 1, code.toLowerCase(), NOW)).toBe(true)
  })

  it('rejects a code of an earlier rotation and a made up one', () => {
    expect(
      codes.matches(SCHEDULE, 2, codes.codeFor(SCHEDULE, 1, NOW).code, NOW),
    ).toBe(false)
    expect(codes.matches(SCHEDULE, 1, 'AAAAAA', NOW)).toBe(false)
  })

  it('moves to a new code every ten minutes', () => {
    const next = new Date('2026-11-02T10:10:00.000Z')

    expect(codes.codeFor(SCHEDULE, 1, next).code).not.toBe(
      codes.codeFor(SCHEDULE, 1, NOW).code,
    )
    expect(
      codes.matches(SCHEDULE, 1, codes.codeFor(SCHEDULE, 1, NOW).code, next),
    ).toBe(false)
  })

  it('honours the rollover grace only when asked to', () => {
    const previous = codes.codeFor(
      SCHEDULE,
      1,
      new Date('2026-11-02T10:09:50.000Z'),
    ).code
    const inside = new Date('2026-11-02T10:10:45.000Z')

    expect(codes.matches(SCHEDULE, 1, previous, inside)).toBe(false)
    expect(codes.matches(SCHEDULE, 1, previous, inside, true)).toBe(true)
  })
})
