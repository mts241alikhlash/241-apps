import { Injectable } from '@nestjs/common'
import { IEnrollmentRepository } from '../../../../enrollment/domain/repositories/enrollment.repository.js'
import { IParticipantNumberRepository } from '../../../domain/repositories/participant-number.repository.js'

@Injectable()
export class GetParticipantNumberUseCase {
  constructor(
    private readonly participantNumbers: IParticipantNumberRepository,
    private readonly enrollmentRepository: IEnrollmentRepository,
  ) {}

  async execute(
    studentId: string,
    semesterId?: string,
  ): Promise<string | null> {
    const semester =
      semesterId ??
      (await this.enrollmentRepository.findActiveEnrollment(studentId))
        ?.semesterId
    if (!semester) return null

    const row = await this.participantNumbers.findByStudent(studentId, semester)
    return row?.number ?? null
  }
}
