import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { IExamScheduleRepository } from '../../../domain/repositories/exam-schedule.repository.js'
import { AccessCodeService } from '../../access-code.service.js'
import { CANCELLED_MESSAGE } from '../update-exam-schedule/update-exam-schedule.use-case.js'

export interface AccessCodeResult {
  accessCode: string
  rotation: number
  expiresAt: Date
  slotIndex: number
}

@Injectable()
export class GetAccessCodeUseCase {
  constructor(
    private readonly schedules: IExamScheduleRepository,
    private readonly codes: AccessCodeService,
  ) {}

  async execute(id: string, now: Date = new Date()): Promise<AccessCodeResult> {
    const found = await this.schedules.findById(id)
    if (found === null) throw new NotFoundException('Jadwal tidak ditemukan')
    if (found.status !== 'SCHEDULED') {
      throw new ConflictException(CANCELLED_MESSAGE)
    }
    const derived = this.codes.codeFor(found.id, found.tokenRotation, now)
    return {
      accessCode: derived.code,
      rotation: found.tokenRotation,
      expiresAt: derived.expiresAt,
      slotIndex: derived.slotIndex,
    }
  }
}
