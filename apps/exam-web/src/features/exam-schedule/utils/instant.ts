const pad = (value: number) => String(value).padStart(2, '0')

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

export function toInstant(date: string, time: string): string {
  return new Date(`${date}T${time}:00+07:00`).toISOString()
}

export function fromInstant(iso: string): { date: string; time: string } {
  const value = new Date(new Date(iso).getTime() + WIB_OFFSET_MS)
  return {
    date: `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`,
    time: `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}`,
  }
}
