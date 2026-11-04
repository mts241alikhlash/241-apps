export function gradeLabel(grade: {
  level: number | null
  name: string | null
}): string {
  if (grade.name) return grade.name
  return grade.level === null ? '-' : `Kelas ${grade.level}`
}
