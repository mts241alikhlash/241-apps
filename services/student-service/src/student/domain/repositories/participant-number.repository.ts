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
  abstract issue(
    semesterId: string,
    build: (
      existing: readonly ParticipantNumberRow[],
    ) => ParticipantNumberRow[],
  ): Promise<number>
}
