import { Injectable } from '@nestjs/common'
import { ApiConflictException } from '../../../../core/filters/api-exception.js'
import type { GradingUser } from '../../../../exam-grading/application/grading-scope.service.js'
import { IOfflineResultRepository } from '../../../domain/repositories/offline-result.repository.js'
import { OfflineRosterReader } from '../../offline-roster.reader.js'

export interface OfflinePublicationCounts {
  queued: number
  missing: number
  absent: number
}

@Injectable()
export class RequestOfflinePublicationUseCase {
  constructor(
    private readonly reader: OfflineRosterReader,
    private readonly results: IOfflineResultRepository,
  ) {}

  async execute(
    user: GradingUser,
    scheduleId: string,
    options: { confirmMissing: boolean },
  ): Promise<OfflinePublicationCounts> {
    const { schedule, rows } = await this.reader.load(user, scheduleId, 'write')
    const missing = rows.filter((row) => row.state === 'MISSING')
    if (missing.length > 0 && !options.confirmMissing) {
      const names = missing.map(
        (row) => row.name ?? row.participantNumber ?? 'tanpa nama',
      )
      throw new ApiConflictException(
        'OFFLINE_SCORES_MISSING',
        `Nilai ${missing.length} siswa belum diisi: ${names.join(', ')}. Konfirmasi untuk tetap mengirim tanpa mereka.`,
      )
    }
    const queued = await this.results.queue(
      schedule.id,
      rows.filter((row) => row.state === 'SCORED').map((row) => row.studentId),
    )
    return {
      queued,
      missing: missing.length,
      absent: rows.filter((row) => row.state === 'ABSENT').length,
    }
  }
}
