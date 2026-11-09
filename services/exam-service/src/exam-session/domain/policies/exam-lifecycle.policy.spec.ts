import { examLifecycle } from './exam-lifecycle.policy.js'

describe('examLifecycle', () => {
  it('opens only for an active activity inside its window', () => {
    const window = {
      startsAt: new Date('2026-11-09T02:00:00Z'),
      endsAt: new Date('2026-11-09T05:00:00Z'),
    }
    expect(
      examLifecycle('ACTIVE', window, new Date('2026-11-09T02:00:00Z')),
    ).toBe('OPEN')
    expect(
      examLifecycle('ACTIVE', window, new Date('2026-11-09T04:59:59Z')),
    ).toBe('OPEN')
    expect(
      examLifecycle('ACTIVE', window, new Date('2026-11-09T05:00:00Z')),
    ).toBe('FINISHED')
    expect(
      examLifecycle('ACTIVE', window, new Date('2026-11-09T01:59:59Z')),
    ).toBe('UPCOMING')
    expect(
      examLifecycle('SCHEDULED', window, new Date('2026-11-09T03:00:00Z')),
    ).toBe('FINISHED')
    expect(
      examLifecycle('CLOSED', window, new Date('2026-11-09T03:00:00Z')),
    ).toBe('FINISHED')
    expect(
      examLifecycle('DRAFT', window, new Date('2026-11-09T03:00:00Z')),
    ).toBe('FINISHED')
  })
})
