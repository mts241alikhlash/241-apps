import { Injectable } from '@nestjs/common'
import { IParticipantNumberRepository } from '../../../domain/repositories/participant-number.repository.js'

@Injectable()
export class ListParticipantNumbersUseCase {
  constructor(
    private readonly participantNumbers: IParticipantNumberRepository,
  ) {}

  async execute(
    studentIds: string[],
    semesterId: string,
  ): Promise<{ studentId: string; number: string }[]> {
    if (studentIds.length === 0) return []
    return this.participantNumbers.findByStudents(studentIds, semesterId)
  }
}
