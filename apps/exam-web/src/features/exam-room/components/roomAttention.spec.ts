import { describe, expect, it } from 'vitest'
import { attentionOf } from './roomAttention'
import type { RoomMonitorParticipant, RoomMonitorSession } from '../types'

const NOW = Date.parse('2026-11-23T02:00:00.000Z')

const session = (
  overrides: Partial<RoomMonitorSession> = {},
): RoomMonitorSession =>
  ({
    status: 'IN_PROGRESS',
    lockedByViolation: false,
    requiresTokenReentry: false,
    lastSeenAt: new Date(NOW - 5_000).toISOString(),
    unsyncedCount: 0,
    batteryLevel: 80,
    isCharging: false,
    ...overrides,
  }) as RoomMonitorSession

const participant = (
  id: string,
  sessionValue: RoomMonitorSession | null,
): RoomMonitorParticipant =>
  ({
    studentId: id,
    seatNumber: 1,
    studentName: id,
    absence: null,
    session: sessionValue,
  }) as RoomMonitorParticipant

describe('attentionOf', () => {
  it('lists the problems, the locked ones before the ones with no news', () => {
    const rows = attentionOf(
      [
        participant(
          'quiet',
          session({ lastSeenAt: new Date(NOW - 5 * 60_000).toISOString() }),
        ),
        participant('locked', session({ lockedByViolation: true })),
        participant('fine', session()),
        participant('idle', null),
      ],
      NOW,
    )

    expect(rows.map((row) => row.row.studentId)).toEqual(['locked', 'quiet'])
    expect(rows[0].reason).toBe('Terkunci pelanggaran')
    expect(rows[1].reason).toBe('Tidak ada kabar 5 menit')
  })
})
