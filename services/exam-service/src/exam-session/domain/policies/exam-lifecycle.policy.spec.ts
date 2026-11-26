import { examLifecycle, scheduleLifecycle } from './exam-lifecycle.policy.js'
import { myExamStatus } from './my-exam-status.policy.js'

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

describe('scheduleLifecycle', () => {
  const activityWindow = {
    startsAt: new Date('2026-11-09T02:00:00Z'),
    endsAt: new Date('2026-11-09T05:00:00Z'),
  }
  const makeup = {
    kind: 'MAKEUP' as const,
    deliveryMode: 'ONLINE' as const,
    packageId: 'pkg-1',
    startsAt: new Date('2026-11-12T02:00:00Z'),
    endsAt: new Date('2026-11-12T04:00:00Z'),
  }
  const offline = {
    kind: 'REGULAR' as const,
    deliveryMode: 'OFFLINE' as const,
    packageId: null,
    ...activityWindow,
  }

  it('opens a makeup in its own window while its original activity is closed', () => {
    const activity = { ...activityWindow, status: 'CLOSED' as const }
    expect(
      scheduleLifecycle(makeup, activity, new Date('2026-11-12T03:00:00Z')),
    ).toBe('OPEN')
    expect(
      scheduleLifecycle(makeup, activity, new Date('2026-11-12T01:59:59Z')),
    ).toBe('UPCOMING')
    expect(
      scheduleLifecycle(makeup, activity, new Date('2026-11-12T04:00:00Z')),
    ).toBe('FINISHED')
  })

  it('keeps a regular schedule gated by its activity status', () => {
    const regular = {
      kind: 'REGULAR' as const,
      deliveryMode: 'ONLINE' as const,
      packageId: 'pkg-1',
      ...activityWindow,
    }
    const now = new Date('2026-11-09T03:00:00Z')
    expect(
      scheduleLifecycle(regular, { ...activityWindow, status: 'ACTIVE' }, now),
    ).toBe('OPEN')
    expect(
      scheduleLifecycle(regular, { ...activityWindow, status: 'CLOSED' }, now),
    ).toBe('FINISHED')
    expect(scheduleLifecycle(regular, null, now)).toBe('OPEN')
  })

  it('never opens an offline schedule: upcoming before its start, finished from then on', () => {
    for (const status of ['SCHEDULED', 'ACTIVE'] as const) {
      const activity = { ...activityWindow, status }
      expect(
        scheduleLifecycle(offline, activity, new Date('2026-11-09T01:59:59Z')),
      ).toBe('UPCOMING')
      expect(
        scheduleLifecycle(offline, activity, new Date('2026-11-09T02:00:00Z')),
      ).toBe('FINISHED')
      expect(
        scheduleLifecycle(offline, activity, new Date('2026-11-09T05:00:00Z')),
      ).toBe('FINISHED')
    }
    expect(
      scheduleLifecycle(
        offline,
        { ...activityWindow, status: 'CLOSED' },
        new Date('2026-11-09T01:59:59Z'),
      ),
    ).toBe('FINISHED')
  })

  it('never shows an offline schedule without a session as open to the student', () => {
    const now = new Date('2026-11-09T03:00:00Z')
    const lifecycle = scheduleLifecycle(
      offline,
      { ...activityWindow, status: 'ACTIVE' },
      now,
    )
    expect(myExamStatus(offline, null, now, lifecycle)).toBe('FINISHED')
  })

  const online = {
    kind: 'REGULAR' as const,
    deliveryMode: 'ONLINE' as const,
    packageId: 'pkg-1',
    ...activityWindow,
  }
  const before = new Date('2026-11-09T01:59:59Z')
  const inside = new Date('2026-11-09T03:00:00Z')
  const after = new Date('2026-11-09T05:00:00Z')

  it('keeps a scheduled activity upcoming until its window ends, then finished', () => {
    const activity = { ...activityWindow, status: 'SCHEDULED' as const }
    expect(scheduleLifecycle(online, activity, before)).toBe('UPCOMING')
    expect(scheduleLifecycle(online, activity, inside)).toBe('UPCOMING')
    expect(scheduleLifecycle(online, activity, after)).toBe('FINISHED')
  })

  it('never opens an online schedule without a package', () => {
    const unpackaged = { ...online, packageId: null }
    for (const status of ['SCHEDULED', 'ACTIVE'] as const) {
      const activity = { ...activityWindow, status }
      expect(scheduleLifecycle(unpackaged, activity, before)).toBe('UPCOMING')
      expect(scheduleLifecycle(unpackaged, activity, inside)).toBe('UPCOMING')
      expect(scheduleLifecycle(unpackaged, activity, after)).toBe('FINISHED')
    }
    expect(
      scheduleLifecycle(
        unpackaged,
        { ...activityWindow, status: 'CLOSED' },
        inside,
      ),
    ).toBe('FINISHED')
  })

  it('shows a scheduled activity as upcoming to the student inside its window', () => {
    const lifecycle = scheduleLifecycle(
      online,
      { ...activityWindow, status: 'SCHEDULED' },
      inside,
    )
    expect(myExamStatus(online, null, inside, lifecycle)).toBe('UPCOMING')
  })
})
