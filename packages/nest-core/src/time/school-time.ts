import { z } from 'zod'

interface LocalParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function localParts(at: Date, timeZone: string): LocalParts {
  let formatter = formatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, formatter)
  }
  const values: Record<string, number> = {}
  for (const part of formatter.formatToParts(at)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value)
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

export function schoolDate(at: Date, timeZone: string): Date {
  const { year, month, day } = localParts(at, timeZone)
  return new Date(Date.UTC(year, month - 1, day))
}

export function schoolYearMonth(
  at: Date,
  timeZone: string,
): { year: number; month: number } {
  const { year, month } = localParts(at, timeZone)
  return { year, month }
}

function offsetAt(at: Date, timeZone: string): number {
  const p = localParts(at, timeZone)
  return (
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) -
    Math.floor(at.getTime() / 1000) * 1000
  )
}

export function schoolDayRange(
  date: Date,
  timeZone: string,
): { from: Date; to: Date } {
  const localMidnight = date.getTime()
  let from = localMidnight - offsetAt(new Date(localMidnight), timeZone)
  from = localMidnight - offsetAt(new Date(from), timeZone)
  const next = new Date(localMidnight + 86_400_000)
  let end = next.getTime() - offsetAt(next, timeZone)
  end = next.getTime() - offsetAt(new Date(end), timeZone)
  return { from: new Date(from), to: new Date(end - 1) }
}

export const schoolTimeZone = z
  .string()
  .refine((value) => Intl.supportedValuesOf('timeZone').includes(value), {
    message: 'SCHOOL_TIME_ZONE must be an IANA time zone such as Asia/Jakarta',
  })

export function schoolMinutesOfDay(at: Date, timeZone: string): number {
  const { hour, minute } = localParts(at, timeZone)
  return hour * 60 + minute
}
