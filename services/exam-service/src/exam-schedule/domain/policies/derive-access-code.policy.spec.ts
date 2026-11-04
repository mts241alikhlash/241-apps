import {
  ACCESS_CODE_ALPHABET,
  ACCESS_CODE_LENGTH,
  ROLLOVER_GRACE_SECONDS,
  SLOT_DURATION_SECONDS,
  deriveAccessCode,
} from './derive-access-code.policy.js'

const SECRET = 'unit-test-secret-of-at-least-32-characters'
const SCHEDULE = '55555555-5555-4555-8555-555555555555'
const NOW = new Date('2026-11-02T10:00:00.000Z')

describe('deriveAccessCode', () => {
  it('keeps a ten minute slot and a ninety second grace', () => {
    expect(SLOT_DURATION_SECONDS).toBe(600)
    expect(ROLLOVER_GRACE_SECONDS).toBe(90)
  })

  it('is deterministic for the same inputs', () => {
    expect(deriveAccessCode(SECRET, SCHEDULE, 0, NOW)).toEqual(
      deriveAccessCode(SECRET, SCHEDULE, 0, NOW),
    )
  })

  it('differs by schedule', () => {
    const codes = new Set(
      Array.from(
        { length: 40 },
        (_, i) =>
          deriveAccessCode(
            SECRET,
            `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
            0,
            NOW,
          ).code,
      ),
    )
    expect(codes.size).toBeGreaterThan(35)
  })

  it('differs by rotation', () => {
    expect(deriveAccessCode(SECRET, SCHEDULE, 0, NOW).code).not.toBe(
      deriveAccessCode(SECRET, SCHEDULE, 1, NOW).code,
    )
  })

  it('differs by secret', () => {
    expect(deriveAccessCode(SECRET, SCHEDULE, 0, NOW).code).not.toBe(
      deriveAccessCode(`${SECRET}-other`, SCHEDULE, 0, NOW).code,
    )
  })

  it('has six characters', () => {
    expect(ACCESS_CODE_LENGTH).toBe(6)
    expect(deriveAccessCode(SECRET, SCHEDULE, 3, NOW).code).toHaveLength(6)
  })

  it('uses only the allowed alphabet without look-alike characters', () => {
    expect(ACCESS_CODE_ALPHABET).toBe('ABCDEFGHJKMNPQRSTUVWXYZ23456789')
    for (let rotation = 0; rotation < 200; rotation++) {
      const { code } = deriveAccessCode(SECRET, SCHEDULE, rotation, NOW)
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/)
    }
  })

  it('picks every alphabet character with the same probability', () => {
    const counts = new Map<string, number>()
    for (let rotation = 0; rotation < 60_000; rotation++) {
      for (const char of deriveAccessCode(SECRET, SCHEDULE, rotation, NOW)
        .code) {
        counts.set(char, (counts.get(char) ?? 0) + 1)
      }
    }
    const values = [...counts.values()]

    expect(counts.size).toBe(ACCESS_CODE_ALPHABET.length)
    expect(Math.max(...values) / Math.min(...values)).toBeLessThan(1.05)
  })

  it('yields the same code for every instant inside one ten minute window', () => {
    const start = deriveAccessCode(
      SECRET,
      SCHEDULE,
      0,
      new Date('2026-11-02T10:00:00.000Z'),
    )

    for (const instant of [
      '2026-11-02T10:00:00.000Z',
      '2026-11-02T10:00:01.000Z',
      '2026-11-02T10:05:30.000Z',
      '2026-11-02T10:09:50.000Z',
      '2026-11-02T10:09:59.999Z',
    ]) {
      expect(deriveAccessCode(SECRET, SCHEDULE, 0, new Date(instant))).toEqual(
        start,
      )
    }
  })

  it('yields another code ten minutes later', () => {
    const first = deriveAccessCode(SECRET, SCHEDULE, 0, NOW)
    const next = deriveAccessCode(
      SECRET,
      SCHEDULE,
      0,
      new Date('2026-11-02T10:10:00.000Z'),
    )

    expect(next.code).not.toBe(first.code)
    expect(next.slotIndex).toBe(first.slotIndex + 1)
  })

  it('expires at the end of its own slot', () => {
    expect(deriveAccessCode(SECRET, SCHEDULE, 0, NOW)).toMatchObject({
      expiresAt: new Date('2026-11-02T10:10:00.000Z'),
    })
    expect(
      deriveAccessCode(
        SECRET,
        SCHEDULE,
        0,
        new Date('2026-11-02T10:09:59.999Z'),
      ).expiresAt,
    ).toEqual(new Date('2026-11-02T10:10:00.000Z'))
    expect(
      deriveAccessCode(
        SECRET,
        SCHEDULE,
        0,
        new Date('2026-11-02T10:10:00.000Z'),
      ).expiresAt,
    ).toEqual(new Date('2026-11-02T10:20:00.000Z'))
  })
})
