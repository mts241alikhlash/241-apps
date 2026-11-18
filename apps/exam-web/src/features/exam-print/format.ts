const dateFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
})

export const formatPrintDate = (iso: string) => dateFormat.format(new Date(iso))

export const formatPrintTime = (iso: string) =>
  timeFormat.format(new Date(iso)).replace('.', ':')

export const formatPrintRange = (startsAt: string, endsAt: string) =>
  `${formatPrintTime(startsAt)} - ${formatPrintTime(endsAt)}`
