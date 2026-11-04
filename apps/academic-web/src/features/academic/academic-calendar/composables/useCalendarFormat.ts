export function useCalendarFormat() {
  const padZero = (num: number) => num.toString().padStart(2, '0')

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${padZero(d.getHours())}:${padZero(d.getMinutes())}`
  }

  const formatDateStr = (dateStr: string) => {
    const d = new Date(dateStr)
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ]
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  }

  const formatLongDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatClock = (value?: string | null) =>
    value ? value.slice(11, 16) : null

  const formatHourRange = (
    startTime?: string | null,
    endTime?: string | null,
  ) => {
    const start = formatClock(startTime)
    const end = formatClock(endTime)
    if (!start || !end) return null
    return `${start} – ${end}`
  }

  const formatEventType = (type: string) => {
    const map: Record<string, string> = {
      SEMESTER_START: 'Awal Semester',
      SEMESTER_END: 'Akhir Semester',
      EXAM_MID: 'UTS',
      EXAM_FINAL: 'UAS',
      REGISTRATION: 'Registrasi',
      HOLIDAY_NATIONAL: 'Libur Nasional',
      HOLIDAY_WEEKLY: 'Libur Mingguan',
      HOLIDAY_SCHOOL: 'Libur Sekolah',
      STUDY: 'KBM',
    }
    return map[type] ?? 'Kegiatan'
  }

  return {
    formatTime,
    formatClock,
    formatHourRange,
    formatDateStr,
    formatLongDate,
    formatEventType,
  }
}
