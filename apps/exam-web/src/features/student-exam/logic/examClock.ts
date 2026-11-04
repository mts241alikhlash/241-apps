export interface ServerClock {
  sync(serverTime: string | number): void
  now(): number
}

export function createServerClock(
  monotonic: () => number = () => performance.now(),
  wall: () => number = () => Date.now(),
): ServerClock {
  let baseServerMillis = 0
  let baseMonotonicMillis = 0
  let synced = false
  return {
    sync(serverTime) {
      const millis =
        typeof serverTime === 'number' ? serverTime : Date.parse(serverTime)
      if (!Number.isFinite(millis)) return
      baseServerMillis = millis
      baseMonotonicMillis = monotonic()
      synced = true
    },
    now() {
      if (!synced) return wall()
      return baseServerMillis + (monotonic() - baseMonotonicMillis)
    },
  }
}

export function secondsUntilSubmitAllowed(
  startedAt: string | number,
  minSubmitMinutes: number,
  deadline: number,
  now: number,
): number {
  if (minSubmitMinutes <= 0) return 0
  const startedMillis =
    typeof startedAt === 'number' ? startedAt : Date.parse(startedAt)
  if (!Number.isFinite(startedMillis)) return 0
  const earliestSubmitMillis = Math.min(
    startedMillis + minSubmitMinutes * 60_000,
    deadline,
  )
  return Math.max(0, Math.floor((earliestSubmitMillis - now) / 1000))
}
