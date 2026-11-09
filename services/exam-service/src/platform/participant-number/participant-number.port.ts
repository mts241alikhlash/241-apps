export abstract class IParticipantNumberPort {
  abstract findNumber(
    studentId: string,
    semesterId: string,
  ): Promise<string | null>
  abstract issueNumbers(semesterId: string): Promise<void>
}
