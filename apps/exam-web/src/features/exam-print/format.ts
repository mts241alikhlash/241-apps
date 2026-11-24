import { gradeNumberOf } from '@/features/exam-shared/classroomName'

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

export const formatEventPeriod = (startsAt: string) => {
  const date = new Date(startsAt)
  const odd = date.getMonth() >= 6
  const start = odd ? date.getFullYear() : date.getFullYear() - 1
  return `Semester ${odd ? 'Ganjil' : 'Genap'} Tahun Ajaran ${start}/${start + 1}`
}

export const gradeOf = (classroomName: string | null): string | null => {
  const grade = gradeNumberOf(classroomName)
  return grade === null ? null : String(grade)
}
