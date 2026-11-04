import { describe, expect, it } from 'vitest'
import { classifySeat, SNAPSHOT_LIVE_MS, SNAPSHOT_STALE_MS } from './seatStatus'

const NOW = new Date('2026-11-02T01:10:00.000Z').getTime()

const ago = (ms: number) => new Date(NOW - ms).toISOString()

const seat = (
  overrides: Partial<{
    lastSnapshotAt: string | null
    cameraBlocked: string | null
  }> = {},
) => ({ lastSnapshotAt: ago(5_000), cameraBlocked: null, ...overrides })

describe('classifySeat', () => {
  it('is live while the newest snapshot is under 30 seconds old', () => {
    expect(classifySeat(seat(), NOW)).toBe('live')
    expect(
      classifySeat(seat({ lastSnapshotAt: ago(SNAPSHOT_LIVE_MS - 1) }), NOW),
    ).toBe('live')
  })

  it('is stale from 30 to 90 seconds', () => {
    expect(
      classifySeat(seat({ lastSnapshotAt: ago(SNAPSHOT_LIVE_MS) }), NOW),
    ).toBe('stale')
    expect(
      classifySeat(seat({ lastSnapshotAt: ago(SNAPSHOT_STALE_MS) }), NOW),
    ).toBe('stale')
  })

  it('is offline once the snapshot is older than 90 seconds', () => {
    expect(
      classifySeat(seat({ lastSnapshotAt: ago(SNAPSHOT_STALE_MS + 1) }), NOW),
    ).toBe('offline')
  })

  it('is offline when the session never sent a snapshot', () => {
    expect(classifySeat(seat({ lastSnapshotAt: null }), NOW)).toBe('offline')
  })

  it('is blocked whenever the camera reported a block reason', () => {
    expect(classifySeat(seat({ cameraBlocked: 'permission' }), NOW)).toBe(
      'blocked',
    )
    expect(
      classifySeat(
        seat({ cameraBlocked: 'hardware', lastSnapshotAt: null }),
        NOW,
      ),
    ).toBe('blocked')
  })

  it('treats an unparseable timestamp as offline', () => {
    expect(classifySeat(seat({ lastSnapshotAt: 'not-a-date' }), NOW)).toBe(
      'offline',
    )
  })
})
