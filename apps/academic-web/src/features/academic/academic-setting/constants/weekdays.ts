export const WEEKDAYS = [
  { value: 0, short: 'Min', label: 'Minggu' },
  { value: 1, short: 'Sen', label: 'Senin' },
  { value: 2, short: 'Sel', label: 'Selasa' },
  { value: 3, short: 'Rab', label: 'Rabu' },
  { value: 4, short: 'Kam', label: 'Kamis' },
  { value: 5, short: 'Jum', label: "Jum'at" },
  { value: 6, short: 'Sab', label: 'Sabtu' },
] as const

export const DEFAULT_WEEKLY_HOLIDAY = 0

export function isWeeklyHoliday(
  date: Date,
  weeklyHolidays: readonly number[],
): boolean {
  return weeklyHolidays.includes(date.getDay())
}

export function formatWeeklyHolidays(
  weeklyHolidays: readonly number[],
): string {
  const named = WEEKDAYS.filter((day) =>
    weeklyHolidays.includes(day.value),
  ).map((day) => day.label)

  return named.length > 0 ? named.join(', ') : 'Tidak ada'
}
