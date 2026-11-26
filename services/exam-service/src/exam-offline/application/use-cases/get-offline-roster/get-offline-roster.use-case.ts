import { Injectable } from '@nestjs/common'
import type { GradingUser } from '../../../../exam-grading/application/grading-scope.service.js'
import type { OfflineRosterRow } from '../../../domain/entities/offline-result.entity.js'
import { OfflineRosterReader } from '../../offline-roster.reader.js'

@Injectable()
export class GetOfflineRosterUseCase {
  constructor(private readonly reader: OfflineRosterReader) {}

  async execute(
    user: GradingUser,
    scheduleId: string,
  ): Promise<OfflineRosterRow[]> {
    return (await this.reader.load(user, scheduleId, 'read')).rows
  }
}
