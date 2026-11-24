const ROMAN_GRADES: Record<string, number> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10,
  XI: 11,
  XII: 12,
}

const ROMAN_PATTERN =
  /(?:^|[^A-Za-z0-9])(XII|XI|VIII|VII|IX|X|VI|IV|V|III|II|I)(?=$|[^A-Za-z])/

export const gradeNumberOf = (name: string | null): number | null => {
  const text = name ?? ''
  const roman = ROMAN_PATTERN.exec(text)
  if (roman !== null) return ROMAN_GRADES[roman[1]] ?? null
  const digits = /(\d+)/.exec(text)
  return digits === null ? null : Number(digits[1])
}

export const gradeOfClassroom = (name: string | null): string => {
  const grade = gradeNumberOf(name)
  return grade === null ? '-' : `Kelas ${grade}`
}

export const classOfClassroom = (name: string | null): string =>
  name === null || name.trim() === '' ? '-' : name

const gradeRank = (name: string | null): number =>
  gradeNumberOf(name) ?? Number.MAX_SAFE_INTEGER

export const compareGrade = (
  left: string | null,
  right: string | null,
): number =>
  gradeRank(left) - gradeRank(right) ||
  (left ?? '').localeCompare(right ?? '', 'id', { numeric: true })

export const compareClassroom = (
  left: string | null,
  right: string | null,
): number =>
  gradeRank(left) - gradeRank(right) ||
  (left ?? '').localeCompare(right ?? '', 'id', { numeric: true })
