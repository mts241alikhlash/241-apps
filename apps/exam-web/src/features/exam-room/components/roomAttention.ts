import { isLowBattery } from './roomParticipantColumns'
import type { RoomMonitorParticipant } from '../types'

export interface AttentionEntry {
  id: string
  row: RoomMonitorParticipant
  reason: string
  tone: 'destructive' | 'warning'
  primary: 'reopen' | 'release' | 'timeline'
}

const OFFLINE_MS = 60_000

export function attentionOf(
  participants: RoomMonitorParticipant[],
  now: number = Date.now(),
): AttentionEntry[] {
  const found = participants.flatMap((row): AttentionEntry[] => {
    const session = row.session
    if (session === null || row.absence !== null) return []
    const base = { id: row.studentId, row }
    if (session.lockedByViolation) {
      return [
        {
          ...base,
          reason: 'Terkunci pelanggaran',
          tone: 'destructive',
          primary: 'reopen',
        },
      ]
    }
    if (session.requiresTokenReentry) {
      return [
        {
          ...base,
          reason: 'Menunggu token ulang',
          tone: 'destructive',
          primary: 'release',
        },
      ]
    }
    if (
      session.status === 'IN_PROGRESS' &&
      session.lastSeenAt !== null &&
      now - Date.parse(session.lastSeenAt) > OFFLINE_MS
    ) {
      const minutes = Math.floor(
        (now - Date.parse(session.lastSeenAt)) / 60_000,
      )
      return [
        {
          ...base,
          reason:
            minutes < 1
              ? 'Tidak ada kabar'
              : `Tidak ada kabar ${minutes} menit`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    if (session.unsyncedCount > 0) {
      return [
        {
          ...base,
          reason: `${session.unsyncedCount} jawaban tertunda di HP`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    if (isLowBattery(session)) {
      return [
        {
          ...base,
          reason: `Baterai ${session.batteryLevel}%`,
          tone: 'warning',
          primary: 'timeline',
        },
      ]
    }
    return []
  })
  return [
    ...found.filter((entry) => entry.tone === 'destructive'),
    ...found.filter((entry) => entry.tone === 'warning'),
  ]
}
