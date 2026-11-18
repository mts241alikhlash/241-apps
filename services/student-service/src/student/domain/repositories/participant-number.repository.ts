export interface ParticipantNumberRow {
  studentId: string
  semesterId: string
  gradeLevel: number
  ordinal: number
  number: string
}

export abstract class IParticipantNumberRepository {
  abstract findByStudent(
    studentId: string,
    semesterId: string,
  ): Promise<ParticipantNumberRow | null>
  abstract findByStudents(
    studentIds: string[],
    semesterId: string,
  ): Promise<{ studentId: string; number: string }[]>
  abstract issue(
    semesterId: string,
    build: (
      existing: readonly ParticipantNumberRow[],
    ) => ParticipantNumberRow[],
  ): Promise<number>
}
