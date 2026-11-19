export abstract class IParticipantNumberPort {
  abstract findNumber(
    studentId: string,
    semesterId: string,
  ): Promise<string | null>
  abstract findNumbers(
    studentIds: string[],
    semesterId: string,
  ): Promise<Map<string, string>>
  abstract issueNumbers(
    semesterId: string,
  ): Promise<{ issued: number; skipped: string[] }>
}
