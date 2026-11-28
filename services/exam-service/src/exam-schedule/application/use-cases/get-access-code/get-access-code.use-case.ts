import { codeScopeOf } from '../../../domain/policies/access-code-scope.policy.js'
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import type { ExamSchedule } from '../../../domain/entities/exam-schedule.entity.js'
import { IExamScheduleRepository } from '../../../domain/repositories/exam-schedule.repository.js'
import { AccessCodeService } from '../../access-code.service.js'
import { CANCELLED_MESSAGE } from '../update-exam-schedule/update-exam-schedule.use-case.js'

export interface AccessCodeResult {
  accessCode: string
  rotation: number
  expiresAt: Date
  slotIndex: number
}

export function assertUsesToken(
  schedule: Pick<ExamSchedule, 'deliveryMode' | 'packageId'>,
): void {
  if (schedule.deliveryMode === 'OFFLINE') {
    throw new ApiConflictException(
      'OFFLINE_NO_TOKEN',
      'Ujian ini tidak memakai token',
    )
  }
  if (schedule.packageId === null) {
    throw new ApiConflictException(
      'PACKAGE_MISSING',
      'Paket soal belum dipasang',
    )
  }
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
    assertUsesToken(found)
    const codeScope = codeScopeOf(found, now)
    const derived = this.codes.codeFor(
      codeScope.scope,
      codeScope.rotation,
      codeScope.at,
    )
    return {
      accessCode: derived.code,
      rotation: codeScope.rotation,
      expiresAt: derived.expiresAt,
      slotIndex: derived.slotIndex,
    }
  }
}
