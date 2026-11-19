const TZ = 'Asia/Jakarta'

const dateFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const startText = dateFormat.format(start)
  if (dayKeyFormat.format(start) === dayKeyFormat.format(end)) return startText
  return `${startText} – ${dateFormat.format(end)}`
}
