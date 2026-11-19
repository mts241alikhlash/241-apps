import { Injectable } from '@nestjs/common'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'

@Injectable()
export class LookupParticipantNumbersUseCase {
  constructor(private readonly participants: IParticipantNumberPort) {}

  async execute(
    semesterId: string,
    studentIds: string[],
  ): Promise<{ items: { studentId: string; number: string }[] }> {
    const numbers = await this.participants.findNumbers(studentIds, semesterId)
    return {
      items: [...numbers].map(([studentId, number]) => ({ studentId, number })),
    }
  }
}
