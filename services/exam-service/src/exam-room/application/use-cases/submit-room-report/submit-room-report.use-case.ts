import { Injectable } from '@nestjs/common'
import type { ExamRoomReport } from '../../../domain/entities/exam-room-report.entity.js'
import type { RoomStaffUser } from '../../room-access.service.js'
import { RoomReportService } from '../../room-report.service.js'

@Injectable()
export class SubmitRoomReportUseCase {
  constructor(private readonly reports: RoomReportService) {}

  async execute(
    user: RoomStaffUser,
    roomId: string,
    slotId: string,
    now: Date = new Date(),
  ): Promise<ExamRoomReport> {
    const context = await this.reports.loadEditable(user, roomId, slotId, now)
    return this.reports.submit(context, user.id, now)
  }
}
