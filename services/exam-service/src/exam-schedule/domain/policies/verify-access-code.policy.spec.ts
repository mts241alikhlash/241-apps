import { deriveAccessCode } from './derive-access-code.policy.js'
import { verifyAccessCode } from './verify-access-code.policy.js'

const SECRET = 'unit-test-secret-of-at-least-32-characters'
const SCHEDULE = '55555555-5555-4555-8555-555555555555'
const NOW = new Date('2026-11-02T10:00:00.000Z')
const code = deriveAccessCode(SECRET, SCHEDULE, 2, NOW).code

describe('verifyAccessCode', () => {
  it('accepts the current code', () => {
    expect(verifyAccessCode(code, SECRET, SCHEDULE, 2, NOW)).toBe(true)
  })

  it('ignores case and surrounding spaces', () => {
    expect(
      verifyAccessCode(`  ${code.toLowerCase()} `, SECRET, SCHEDULE, 2, NOW),
    ).toBe(true)
  })

  it('rejects a wrong code, an empty one and one of another length', () => {
    expect(verifyAccessCode('AAAAAA', SECRET, SCHEDULE, 2, NOW)).toBe(false)
    expect(verifyAccessCode('', SECRET, SCHEDULE, 2, NOW)).toBe(false)
    expect(verifyAccessCode(`${code}A`, SECRET, SCHEDULE, 2, NOW)).toBe(false)
    expect(verifyAccessCode(code.slice(0, 5), SECRET, SCHEDULE, 2, NOW)).toBe(
      false,
    )
  })

  it('rejects the code of an earlier rotation', () => {
    expect(verifyAccessCode(code, SECRET, SCHEDULE, 3, NOW)).toBe(false)
  })

  it('rejects the code of another schedule', () => {
    expect(
      verifyAccessCode(
        code,
        SECRET,
        '66666666-6666-4666-8666-666666666666',
        2,
        NOW,
      ),
    ).toBe(false)
  })

  it('rejects the code of the previous slot without the grace flag', () => {
    const previous = deriveAccessCode(
      SECRET,
      SCHEDULE,
      2,
      new Date('2026-11-02T10:09:50.000Z'),
    ).code

    expect(
      verifyAccessCode(
        previous,
        SECRET,
        SCHEDULE,
        2,
        new Date('2026-11-02T10:10:45.000Z'),
      ),
    ).toBe(false)
  })

  it('accepts the previous slot inside the first ninety seconds of the new one', () => {
    const previous = deriveAccessCode(
      SECRET,
      SCHEDULE,
      2,
      new Date('2026-11-02T10:09:50.000Z'),
    ).code
    const inside = new Date('2026-11-02T10:10:45.000Z')

    expect(verifyAccessCode(previous, SECRET, SCHEDULE, 2, inside, true)).toBe(
      true,
    )
    expect(
      verifyAccessCode(
        previous,
        SECRET,
        SCHEDULE,
        2,
        new Date('2026-11-02T10:11:29.999Z'),
        true,
      ),
    ).toBe(true)
  })

  it('rejects the previous slot once the grace has run out', () => {
    const previous = deriveAccessCode(
      SECRET,
      SCHEDULE,
      2,
      new Date('2026-11-02T10:09:50.000Z'),
    ).code

    expect(
      verifyAccessCode(
        previous,
        SECRET,
        SCHEDULE,
        2,
        new Date('2026-11-02T10:11:30.000Z'),
        true,
      ),
    ).toBe(false)
    expect(
      verifyAccessCode(
        previous,
        SECRET,
        SCHEDULE,
        2,
        new Date('2026-11-02T10:12:00.000Z'),
        true,
      ),
    ).toBe(false)
  })

  it('drops the previous slot the moment the rotation is bumped', () => {
    const previous = deriveAccessCode(
      SECRET,
      SCHEDULE,
      2,
      new Date('2026-11-02T10:09:50.000Z'),
    ).code
    const inside = new Date('2026-11-02T10:10:45.000Z')

    expect(verifyAccessCode(previous, SECRET, SCHEDULE, 3, inside, true)).toBe(
      false,
    )
    expect(
      verifyAccessCode(
        deriveAccessCode(SECRET, SCHEDULE, 2, inside).code,
        SECRET,
        SCHEDULE,
        3,
        inside,
        true,
      ),
    ).toBe(false)
  })

  it('rejects a two slot old code even with the grace flag', () => {
    const older = deriveAccessCode(
      SECRET,
      SCHEDULE,
      2,
      new Date('2026-11-02T09:59:50.000Z'),
    ).code

    expect(
      verifyAccessCode(
        older,
        SECRET,
        SCHEDULE,
        2,
        new Date('2026-11-02T10:10:45.000Z'),
        true,
      ),
    ).toBe(false)
  })
})
