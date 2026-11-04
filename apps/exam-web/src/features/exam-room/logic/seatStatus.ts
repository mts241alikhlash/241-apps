export const SNAPSHOT_LIVE_MS = 30_000
export const SNAPSHOT_STALE_MS = 90_000

export type SeatStatus = 'live' | 'stale' | 'blocked' | 'offline'

export interface SeatSnapshotState {
  lastSnapshotAt: string | null
  cameraBlocked: string | null
}

export function classifySeat(seat: SeatSnapshotState, now: number): SeatStatus {
  if (seat.cameraBlocked !== null) return 'blocked'
  if (seat.lastSnapshotAt === null) return 'offline'
  const capturedAt = new Date(seat.lastSnapshotAt).getTime()
  if (Number.isNaN(capturedAt)) return 'offline'
  const age = now - capturedAt
  if (age < SNAPSHOT_LIVE_MS) return 'live'
  if (age <= SNAPSHOT_STALE_MS) return 'stale'
  return 'offline'
}
