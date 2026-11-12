const TZ = 'Asia/Jakarta'

const dayFormat = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ,
  day: 'numeric',
  month: 'short',
})

const dayKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatWindow(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  const startPart = `${dayFormat.format(start)} ${timeFormat.format(start)}`
  const endDay =
    dayKeyFormat.format(end) === dayKeyFormat.format(start)
      ? ''
      : `${dayFormat.format(end)} `
  return `${startPart} – ${endDay}${timeFormat.format(end)} WIB`
}
