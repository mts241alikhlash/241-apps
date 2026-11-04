const HHMM = /^(\d{2}):(\d{2})$/

export function toMinutes(hhmm: string): number | null {
  const match = HHMM.exec(hhmm)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function toHHMM(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(wrapped / 60)
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export function addMinutes(hhmm: string, minutes: number): string {
  const start = toMinutes(hhmm)
  if (start === null) return hhmm
  return toHHMM(start + minutes)
}

export function durationBetween(start: string, end: string): number | null {
  const from = toMinutes(start)
  const to = toMinutes(end)
  if (from === null || to === null) return null
  return to >= from ? to - from : to + 1440 - from
}

export function shiftEndWithStart(
  previousStart: string,
  nextStart: string,
  end: string,
): string {
  const length = durationBetween(previousStart, end)
  if (length === null || toMinutes(nextStart) === null) return end
  return addMinutes(nextStart, length)
}
