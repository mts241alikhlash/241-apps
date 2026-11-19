import { Injectable } from '@nestjs/common'
import { IParticipantNumberPort } from '../../../../platform/participant-number/participant-number.port.js'

@Injectable()
export class IssueSemesterParticipantNumbersUseCase {
  constructor(private readonly participants: IParticipantNumberPort) {}

  execute(semesterId: string): Promise<{ issued: number; skipped: string[] }> {
    return this.participants.issueNumbers(semesterId)
  }
}
