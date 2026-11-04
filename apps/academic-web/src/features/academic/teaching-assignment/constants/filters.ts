export const EVERY_CLASSROOM = '__all__'

export function isEveryClassroom(value: string | null | undefined): boolean {
  return !value || value === EVERY_CLASSROOM
}
