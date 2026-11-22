export const gradeOfClassroom = (name: string | null): string => {
  const match = /(\d+)/.exec(name ?? '')
  return match === null ? '-' : `Kelas ${match[1]}`
}

export const classOfClassroom = (name: string | null): string =>
  name === null || name.trim() === '' ? '-' : name
