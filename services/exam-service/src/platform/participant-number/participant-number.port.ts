export abstract class IParticipantNumberPort {
  abstract findNumber(
    studentId: string,
    semesterId: string,
  ): Promise<string | null>
}
